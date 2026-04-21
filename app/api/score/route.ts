import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { scoreEndureAssessment } from "@/src/lib/endure/scoring";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const assessment_id = body?.assessment_id;
    if (!assessment_id) {
      return NextResponse.json({ error: "assessment_id ausente" }, { status: 400 });
    }

    // 1) assessment + raw_responses
    const { data: a, error: eA } = await supabaseAdmin
      .from("assessments")
      .select("assessment_id, athlete_id, instrument_version, raw_responses, created_at, submitted_at")
      .eq("assessment_id", assessment_id)
      .single();
    if (eA) throw eA;

    const instrument_version: string = a.instrument_version;
    const raw_responses: Record<string, any> = (a.raw_responses ?? {}) as any;

    // 2) reference data (Supabase por enquanto)
    const { data: items, error: eI } = await supabaseAdmin
      .from("instrument_items")
      .select("instrument_version,itemcode,quest_section,scale,factor,key,opt_json,type")
      .eq("instrument_version", instrument_version);
    if (eI) throw eI;

    const { data: norms, error: eN } = await supabaseAdmin
      .from("scale_norms")
      .select("instrument_version,score_scale,raw_score,theta_hat,percentile,t_score")
      .eq("instrument_version", instrument_version);
    if (eN) throw eN;

    const { data: bandTexts, error: eT } = await supabaseAdmin
      .from("factor_band_texts")
      .select("instrument_version,factor,band,text_port,band_label,score_scale")
      .eq("instrument_version", instrument_version);
    if (eT) throw eT;

    // 3) scoring
    const scored = scoreEndureAssessment({
      instrument_version,
      raw_responses,
      instrument_items: (items ?? []) as any,
      scale_norms: (norms ?? []) as any,
      factor_band_texts: (bandTexts ?? []) as any,
    });

    // 4) (por ora) readiness_score: opcional — manter null ou calcular depois com regra mais sofisticada
    const readiness_score = null;

    const scores_json = {
      instrument_version,
      scoring_version: "ENDURE_score_v2_local_engine",
      factors: scored.factors,
      factors_by_key: scored.factors_by_key,
    };

    const { error: eUp } = await supabaseAdmin.from("assessment_scores").upsert(
      {
        assessment_id,
        scores_json,
        readiness_score,
        scoring_version: "ENDURE_score_v2_local_engine",
        computed_at: new Date().toISOString(),
      },
      { onConflict: "assessment_id" }
    );
    if (eUp) throw eUp;

    return NextResponse.json({
      ok: true,
      n_factors: scored.factors.length,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? String(e) }, { status: 500 });
  }
}
