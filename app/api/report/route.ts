import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import os from "os";

const execFileAsync = promisify(execFile);

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { assessment_id } = await req.json();
    if (!assessment_id) {
      return NextResponse.json({ error: "assessment_id ausente" }, { status: 400 });
    }

    // 1) carregar assessment
    const { data: a, error: eA } = await supabaseAdmin
      .from("assessments")
      .select("assessment_id, athlete_id, instrument_version, created_at, submitted_at")
      .eq("assessment_id", assessment_id)
      .single();
    if (eA) throw eA;

    // 2) carregar athlete
    const { data: ath, error: eB } = await supabaseAdmin
      .from("athletes")
      .select("athlete_id, full_name, birth_date, sex, sport_primary, team")
      .eq("athlete_id", a.athlete_id)
      .single();
    if (eB) throw eB;

    // 3) carregar scores
    const { data: sc, error: eC } = await supabaseAdmin
      .from("assessment_scores")
      .select("readiness_score, scores_json")
      .eq("assessment_id", assessment_id)
      .maybeSingle();
    if (eC) throw eC;

    // --- 3.1) carregar textos qualitativos por fator/faixa ---
    const factorsObj =
      (sc?.scores_json as any)?.factors ??
      (sc?.scores_json as any)?.scales ??
      {};
    const factorNames = Object.keys(factorsObj);

    const qual_texts: Record<string, Record<string, string>> = {};

    if (factorNames.length > 0) {
      const { data: txtRows, error: eT } = await supabaseAdmin
        .from("factor_band_texts")
        .select("factor, band, text_port")
        .eq("instrument_version", a.instrument_version)
        .in("factor", factorNames);

      if (eT) throw eT;

      for (const r of (txtRows ?? []) as any[]) {
        qual_texts[r.factor] ??= {};
        qual_texts[r.factor][r.band] = r.text_port;
      }
    }

    // 3.2) montar payload (AGORA qual_texts já existe)
    const payload = {
      athlete: ath,
      assessment: a,
      readiness_score: sc?.readiness_score ?? null,
      scores: sc?.scores_json ?? {},
      qual_texts, // ✅ agora correto
    };

    // 4) gerar PDF via python
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "endure-"));
    const inJson = path.join(tmpDir, `${assessment_id}.json`);
    const outPdf = path.join(tmpDir, `${assessment_id}.pdf`);
    fs.writeFileSync(inJson, JSON.stringify(payload), "utf-8");

    const py = process.env.PYTHON_BIN || "python";
    const script = path.join(process.cwd(), "scripts", "generate_report.py");
    await execFileAsync(py, [script, inJson, outPdf], { windowsHide: true });

    const pdfBytes = fs.readFileSync(outPdf);

    // 5) upload storage
    const storagePath = `${a.athlete_id}/${assessment_id}.pdf`;
    const { error: eUp } = await supabaseAdmin.storage
      .from("reports")
      .upload(storagePath, pdfBytes, {
        upsert: true,
        contentType: "application/pdf",
      });
    if (eUp) throw eUp;

    // 6) registrar em assessment_reports
    const { error: eR } = await supabaseAdmin
      .from("assessment_reports")
      .upsert(
        { assessment_id, pdf_path: storagePath, generated_at: new Date().toISOString() },
        { onConflict: "assessment_id" }
      );
    if (eR) throw eR;

    return NextResponse.json({ ok: true, pdf_path: storagePath });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? String(e) }, { status: 500 });
  }
}