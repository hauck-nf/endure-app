import { NextResponse } from "next/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { scoreEndureAssessment } from "@/src/lib/endure/scoring";
import { buildEndurePremiumPdf } from "@/src/lib/reportPdfPremium";

export const dynamic = "force-dynamic";

function json(status: number, body: any) {
  return NextResponse.json(body, { status });
}

function getBearerToken(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : "";
}

export async function POST(req: Request) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const bucket = process.env.SUPABASE_REPORTS_BUCKET || "reports";

    if (!url || !anonKey || !serviceKey) {
      return json(500, { ok: false, error: "missing SUPABASE env vars" });
    }

    const supabaseAdmin = createSupabaseAdmin(url, serviceKey);

    const accessToken = getBearerToken(req);
    if (!accessToken) {
      return json(401, { ok: false, error: "not authenticated: missing bearer token" });
    }

    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(accessToken);
    if (userErr || !userData?.user) {
      return json(401, { ok: false, error: "not authenticated" });
    }

    const body = await req.json().catch(() => ({}));
    const assessment_id = String(body?.assessment_id ?? "").trim();

    if (!assessment_id) {
      return json(400, { ok: false, error: "missing assessment_id" });
    }

    const { data: existingV2, error: eExistingV2 } = await supabaseAdmin
      .from("assessment_reports_v2")
      .select("assessment_id, pdf_path, report_version, generated_at")
      .eq("assessment_id", assessment_id)
      .maybeSingle();

    if (eExistingV2) {
      return json(500, { ok: false, error: `failed to read assessment_reports_v2: ${eExistingV2.message}` });
    }

    if (existingV2?.pdf_path) {
      return json(200, { ok: true, pdf_path: existingV2.pdf_path, cached: true });
    }

    const { data: assessment, error: eAss } = await supabaseAdmin
      .from("assessments")
      .select("assessment_id, athlete_id, request_id, instrument_version, reference_window, status, raw_responses, created_at, submitted_at")
      .eq("assessment_id", assessment_id)
      .maybeSingle();

    if (eAss || !assessment?.assessment_id) {
      return json(404, { ok: false, error: "assessment not found" });
    }

    if (assessment.status !== "submitted") {
      return json(400, { ok: false, error: "assessment is not submitted" });
    }

    const { data: athlete, error: eAth } = await supabaseAdmin
      .from("athletes")
      .select("athlete_id, user_id, full_name, email, team, sport_primary, birth_date, sex, gender")
      .eq("athlete_id", assessment.athlete_id)
      .maybeSingle();

    if (eAth || !athlete?.athlete_id) {
      return json(404, { ok: false, error: "athlete not found" });
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("user_id", userData.user.id)
      .maybeSingle();

    const role = String(profile?.role ?? "");
    const isOwner = athlete.user_id === userData.user.id;
    const isStaff = role === "admin" || role === "coach";

    if (!isOwner && !isStaff) {
      return json(403, { ok: false, error: "forbidden" });
    }

    const instrument_version = String(assessment.instrument_version ?? "").trim();
    if (!instrument_version) {
      return json(400, { ok: false, error: "assessment missing instrument_version" });
    }

    const { data: instrument_items, error: eItems } = await supabaseAdmin
      .from("instrument_items")
      .select("itemcode, key, scale, factor, quest_section, instrument_version, opt_json")
      .eq("instrument_version", instrument_version);

    if (eItems || !instrument_items) {
      return json(500, { ok: false, error: "failed to load instrument_items" });
    }

    const { data: scale_norms, error: eNorms } = await supabaseAdmin
      .from("scale_norms")
      .select("instrument_version, score_scale, raw_score, theta_hat, percentile, t_score")
      .eq("instrument_version", instrument_version);

    if (eNorms || !scale_norms) {
      return json(500, { ok: false, error: "failed to load scale_norms" });
    }

    const { data: factor_band_texts, error: eBands } = await supabaseAdmin
      .from("factor_band_texts")
      .select("instrument_version, score_scale, band, band_label, text_port")
      .eq("instrument_version", instrument_version);

    if (eBands || !factor_band_texts) {
      return json(500, { ok: false, error: "failed to load factor_band_texts" });
    }

    const scored = scoreEndureAssessment({
      instrument_version,
      raw_responses: (assessment.raw_responses ?? {}) as any,
      instrument_items: instrument_items as any,
      scale_norms: scale_norms as any,
      factor_band_texts: factor_band_texts as any,
    });

    await supabaseAdmin
      .from("assessment_scores")
      .upsert(
        {
          assessment_id,
          scores_json: scored,
          scoring_version: "ENDURE_score_v3_premium_report",
          computed_at: new Date().toISOString(),
        } as any,
        { onConflict: "assessment_id" }
      );

    const factors = ((scored?.factors ?? []) as any[]).map((f) => ({
      score_scale: String(f.score_scale ?? ""),
      raw_score: f.raw_score == null ? null : Number(f.raw_score),
      t_score: f.t_score == null ? null : Number(f.t_score),
      percentile: f.percentile == null ? null : Number(f.percentile),
      theta_hat: f.theta_hat == null ? null : Number(f.theta_hat),
      band: f.band == null ? null : String(f.band),
      band_label: f.band_label == null ? null : String(f.band_label),
      text_port: f.text_port == null ? null : String(f.text_port),
      n_items_scored: f.n_items_scored == null ? null : Number(f.n_items_scored),
    }));

    const pdfBytes = await buildEndurePremiumPdf({
      athlete: athlete as any,
      assessment: assessment as any,
      factors,
    });

    const pdfPath = `${athlete.athlete_id}/${assessment_id}.pdf`;

    const up = await supabaseAdmin.storage.from(bucket).upload(pdfPath, pdfBytes, {
      contentType: "application/pdf",
      upsert: true,
    });

    if (up.error) {
      return json(500, { ok: false, error: `upload failed: ${up.error.message}` });
    }

    const now = new Date().toISOString();

    const { error: eRepV2 } = await supabaseAdmin
      .from("assessment_reports_v2")
      .upsert(
        {
          assessment_id,
          pdf_path: pdfPath,
          report_version: "premium_v1",
          scoring_version: "ENDURE_score_v3_premium_report",
          generated_at: now,
          updated_at: now,
        } as any,
        { onConflict: "assessment_id" }
      );

    if (eRepV2) {
      return json(500, { ok: false, error: `assessment_reports_v2 upsert failed: ${eRepV2.message}` });
    }

    return json(200, { ok: true, pdf_path: pdfPath, cached: false });
  } catch (e: any) {
    return json(500, { ok: false, error: e?.message ?? String(e) });
  }
}
