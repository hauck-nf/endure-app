import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabaseServer";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { scoreEndureAssessment } from "@/src/lib/endure/scoring";
import { buildEndurePdf } from "@/src/lib/reportPdf";

export const dynamic = "force-dynamic";

function json(status: number, body: any) {
  return NextResponse.json(body, { status });
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();

    // 1) auth
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return json(401, { ok: false, error: "not authenticated" });

    // 2) service role (para storage + leitura ampla)
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const bucket = process.env.SUPABASE_REPORTS_BUCKET || "reports";
    if (!url || !serviceKey) return json(500, { ok: false, error: "missing SUPABASE env vars" });

    const supabaseAdmin = createSupabaseAdmin(url, serviceKey);

    // 3) input
    const body = await req.json().catch(() => ({}));
    const assessment_id = String(body?.assessment_id ?? "").trim();
    if (!assessment_id) return json(400, { ok: false, error: "missing assessment_id" });

    // 4) pega assessment (raw_responses é a fonte da verdade)
    const { data: assessment, error: eAss } = await supabaseAdmin
      .from("assessments")
      .select("assessment_id, athlete_id, request_id, instrument_version, reference_window, status, raw_responses, created_at, submitted_at")
      .eq("assessment_id", assessment_id)
      .maybeSingle();

    if (eAss || !assessment?.assessment_id) {
      return json(404, { ok: false, error: "assessment not found" });
    }

    // 5) atleta
    const { data: athlete, error: eAth } = await supabaseAdmin
      .from("athletes")
      .select("athlete_id, full_name, email, team, sport_primary, birth_date, sex, gender")
      .eq("athlete_id", assessment.athlete_id)
      .maybeSingle();

    if (eAth || !athlete?.athlete_id) {
      return json(404, { ok: false, error: "athlete not found" });
    }

    // 6) baixa objetos necessários para scoring
    const instrument_version = String(assessment.instrument_version ?? "").trim();
    if (!instrument_version) return json(400, { ok: false, error: "assessment missing instrument_version" });

    const { data: instrument_items, error: eItems } = await supabaseAdmin
      .from("instrument_items")
      .select("itemcode, key, scale, factor, quest_section, instrument_version, opt_json")
      .eq("instrument_version", instrument_version);

    if (eItems || !instrument_items) return json(500, { ok: false, error: "failed to load instrument_items" });

    const { data: scale_norms, error: eNorms } = await supabaseAdmin
      .from("scale_norms")
      .select("instrument_version, score_scale, raw_score, theta_hat, percentile, t_score")
      .eq("instrument_version", instrument_version);

    if (eNorms || !scale_norms) return json(500, { ok: false, error: "failed to load scale_norms" });

    const { data: factor_band_texts, error: eBands } = await supabaseAdmin
      .from("factor_band_texts")
      .select("instrument_version, score_scale, band, band_label, text_port")
      .eq("instrument_version", instrument_version);

    if (eBands || !factor_band_texts) return json(500, { ok: false, error: "failed to load factor_band_texts" });

    // 7) roda scoring reprodutível (raw_responses -> factors)
    const scored = scoreEndureAssessment({
      instrument_version,
      raw_responses: (assessment.raw_responses ?? {}) as any,
      instrument_items: instrument_items as any,
      scale_norms: scale_norms as any,
      factor_band_texts: factor_band_texts as any,
    });

    // 8) salva cache (scores_json) no assessment_scores (sem depender de colunas por escala)
    await supabaseAdmin
      .from("assessment_scores")
      .upsert(
        {
          assessment_id,
          scores_json: scored,
          scoring_version: "ENDURE_score_v2_local_engine",
          computed_at: new Date().toISOString(),
        } as any,
        { onConflict: "assessment_id" }
      );

    // 9) prepara lista para o PDF (tabela síntese)
    const scores = (scored?.factors ?? []).map((f: any) => ({
      score_scale: String(f.score_scale ?? ""),
      raw_score: Number(f.raw_score ?? 0),
      t_score: (f.t_score == null ? null : Number(f.t_score)),
      percentile: (f.percentile == null ? null : Number(f.percentile)),
      band_label: String(f.band_label ?? ""),
    }));

    // 10) gera PDF
    const pdfBytes = await buildEndurePdf({
      athlete: athlete as any,
      assessment: assessment as any,
      scores: scores as any,
    });

    const pdfPath = `${athlete.athlete_id}/${assessment_id}.pdf`;

    // 11) upload no bucket reports
    const up = await supabaseAdmin.storage.from(bucket).upload(pdfPath, pdfBytes, {
      contentType: "application/pdf",
      upsert: true,
    });

    if (up.error) {
      return json(500, { ok: false, error: `upload failed: ${up.error.message}` });
    }

    // 12) grava tabela de reports
    const { error: eRep } = await supabaseAdmin
      .from("assessment_reports")
      .upsert(
        { assessment_id, pdf_path: pdfPath, generated_at: new Date().toISOString() } as any,
        { onConflict: "assessment_id" }
      );

    if (eRep) return json(500, { ok: false, error: `assessment_reports upsert failed: ${eRep.message}` });

    return json(200, { ok: true, pdf_path: pdfPath });
  } catch (e: any) {
    return json(500, { ok: false, error: e?.message ?? String(e) });
  }
}