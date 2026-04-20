import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso);
  return d.toISOString().slice(0, 10);
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const assessment_id = body?.assessment_id as string | undefined;

    if (!assessment_id) {
      return NextResponse.json({ ok: false, error: "assessment_id ausente" }, { status: 400 });
    }

    console.log("[/api/report] start assessment_id=", assessment_id);

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
      .select("athlete_id, full_name, birth_date, sex, sport_primary, team, email")
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

    // 4) gerar PDF (Node puro - compatível Vercel)
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([595.28, 841.89]); // A4
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

    const marginX = 48;
    let y = 790;

    const title = "ENDURE — Relatório (MVP)";
    page.drawText(title, { x: marginX, y, size: 20, font: fontBold, color: rgb(0.07, 0.09, 0.16) });
    y -= 28;

    const sub = `Assessment: ${assessment_id}`;
    page.drawText(sub, { x: marginX, y, size: 10, font, color: rgb(0.35, 0.4, 0.45) });
    y -= 22;

    const lines: string[] = [
      `Atleta: ${ath?.full_name ?? "—"}`,
      `Email: ${ath?.email ?? "—"}`,
      `Equipe: ${ath?.team ?? "—"}`,
      `Esporte: ${ath?.sport_primary ?? "—"}`,
      `Instrumento: ${a?.instrument_version ?? "—"}`,
      `Criado: ${fmtDate(a?.created_at ?? null)}   |   Submetido: ${fmtDate(a?.submitted_at ?? null)}`,
      `Readiness: ${sc?.readiness_score ?? "—"}`,
    ];

    for (const ln of lines) {
      page.drawText(ln, { x: marginX, y, size: 12, font, color: rgb(0.07, 0.09, 0.16) });
      y -= 18;
    }

    y -= 10;
    page.drawText("Resumo de escores (json):", { x: marginX, y, size: 12, font: fontBold, color: rgb(0.07, 0.09, 0.16) });
    y -= 16;

    const jsonText = JSON.stringify(sc?.scores_json ?? {}, null, 2);
    const chunk = jsonText.slice(0, 2200); // evita estourar a página no MVP
    const wrapped = chunk.split("\n").slice(0, 90);

    for (const ln of wrapped) {
      page.drawText(ln, { x: marginX, y, size: 8, font, color: rgb(0.15, 0.18, 0.23) });
      y -= 10;
      if (y < 60) break;
    }

    const pdfBytes = await pdf.save();

    // 5) upload no Storage
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

    console.log("[/api/report] ok pdf_path=", storagePath);
    return NextResponse.json({ ok: true, pdf_path: storagePath });
  } catch (e: any) {
    console.log("[/api/report] error", e?.message ?? String(e));
    return NextResponse.json({ ok: false, error: e.message ?? String(e) }, { status: 500 });
  }
}
