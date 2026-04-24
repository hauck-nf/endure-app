import { NextResponse } from "next/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { scoreEndureAssessment } from "@/src/lib/endure/scoring";

function json(status: number, body: any) {
  return NextResponse.json(body, { status });
}

export async function POST(req: Request) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!url || !serviceKey) {
      return json(500, { ok: false, error: "missing SUPABASE env vars" });
    }

    const supabaseAdmin = createSupabaseAdmin(url, serviceKey);

    const body = await req.json().catch(() => ({}));
    const assessment_id = String(body?.assessment_id ?? "").trim();

    if (!assessment_id) {
      return json(400, { ok: false, error: "missing assessment_id" });
    }

    const { data: assessment, error: eA } = await supabaseAdmin
      .from("assessments")
      .select("*")
      .eq("assessment_id", assessment_id)
      .maybeSingle();

    if (eA || !assessment) {
      return json(404, { ok: false, error: "assessment not found" });
    }

    const instrument_version = String(assessment.instrument_version ?? "").trim();
    if (!instrument_version) {
      return json(400, { ok: false, error: "assessment missing instrument_version" });
    }

    const { data: items, error: eI } = await supabaseAdmin
      .from("instrument_items")
      .select("*");
    if (eI) throw eI;

    const { data: norms, error: eN } = await supabaseAdmin
      .from("scale_norms")
      .select("*");
    if (eN) throw eN;

    const { data: bandTexts, error: eT } = await supabaseAdmin
      .from("factor_band_texts")
      .select("*");
    if (eT) throw eT;

    const scored = scoreEndureAssessment({
      instrument_version,
      raw_responses: (assessment.raw_responses ?? {}) as any,
      instrument_items: (items ?? []) as any,
      scale_norms: (norms ?? []) as any,
      factor_band_texts: (bandTexts ?? []) as any,
    });

    const { error: eUp } = await supabaseAdmin
      .from("assessment_scores")
      .upsert(
        {
          assessment_id,
          scores_json: scored,
        } as any,
        { onConflict: "assessment_id" }
      );

    if (eUp) throw eUp;

    return json(200, { ok: true, scores: scored });
  } catch (e: any) {
    return json(500, { ok: false, error: e?.message ?? String(e) });
  }
}
