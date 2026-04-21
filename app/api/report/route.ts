import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabaseServer";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { computeEndureScores } from "@/src/lib/endure/scoring";
import { buildEndurePdf } from "@/src/lib/reportPdf";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const assessment_id = body?.assessment_id;

    if (!assessment_id) {
      return NextResponse.json({ ok: false, error: "missing assessment_id" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return NextResponse.json({ ok: false, error: "not authenticated" }, { status: 401 });

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const bucket = process.env.SUPABASE_REPORTS_BUCKET || "reports";
    const supabaseAdmin = createSupabaseAdmin(url, serviceKey);

    // 1) fetch assessment (raw_responses) + athlete
    const { data: ass, error: eAss } = await supabaseAdmin
      .from("assessments")
      .select("assessment_id, athlete_id, request_id, instrument_version, reference_window, raw_responses, raw_meta, created_at, submitted_at")
      .eq("assessment_id", assessment_id)
      .maybeSingle();

    if (eAss || !ass) {
      return NextResponse.json({ ok: false, error: "assessment not found" }, { status: 404 });
    }

    const { data: athlete, error: eAth } = await supabaseAdmin
      .from("athletes")
      .select("athlete_id, full_name, email, birth_date, sex, gender, team, sport_primary")
      .eq("athlete_id", ass.athlete_id)
      .maybeSingle();

    if (eAth || !athlete) {
      return NextResponse.json({ ok: false, error: "athlete not found" }, { status: 404 });
    }

    // 2) ensure scores_json exists (reproducível via raw_responses)
    const { data: scoreRow } = await supabaseAdmin
      .from("assessment_scores")
      .select("scores_json")
      .eq("assessment_id", assessment_id)
      .maybeSingle();

    let scores_json: any = scoreRow?.scores_json ?? null;

    if (!scores_json) {
      // carrega tabelas do supabase
      const [{ data: items }, { data: norms }, { data: bands }] = await Promise.all([
        supabaseAdmin.from("instrument_items").select("*").eq("instrument_version", ass.instrument_version),
        supabaseAdmin.from("scale_norms").select("instrument_version,score_scale,raw_score,theta_hat,percentile,t_score").eq("instrument_version", ass.instrument_version),
        supabaseAdmin.from("factor_band_texts").select("instrument_version,factor,band,text_port,band_label,score_scale").eq("instrument_version", ass.instrument_version),
      ]);

      const computed = computeEndureScores({
        instrument_version: ass.instrument_version,
        raw_responses: ass.raw_responses ?? {},
        instrument_items: items ?? [],
        scale_norms: norms ?? [],
        factor_band_texts: bands ?? [],
      });

      scores_json = computed;

      // upsert cache
      await supabaseAdmin.from("assessment_scores").upsert({
        assessment_id,
        athlete_id: ass.athlete_id,
        scores_json,
        computed_at: new Date().toISOString(),
      });
    }

    // 3) normalize para array de scales
    const scoresArr = (scores_json?.factors ?? []).map((x: any) => ({
      score_scale: x.score_scale,
      raw_score: x.raw_score,
      t_score: x.t_score,
      percentile: x.percentile,
      band_label: x.band_label,
      band: x.band,
      text_port: x.text_port,
      theta_hat: x.theta_hat,
      n_items_scored: x.n_items_scored,
    }));

    // 4) build pdf
    const pdfBytes = await buildEndurePdf({
      athlete,
      assessment: {
        assessment_id: ass.assessment_id,
        athlete_id: ass.athlete_id,
        instrument_version: ass.instrument_version,
        reference_window: ass.reference_window ?? null,
        created_at: ass.created_at ?? null,
        submitted_at: ass.submitted_at ?? null,
        raw_meta: ass.raw_meta ?? null,
      } as any,
      scores: scoresArr,
    });

    // 5) save to storage + db
    const pdfPath = `${ass.athlete_id}/${ass.assessment_id}.pdf`;
    const up = await supabaseAdmin.storage.from(bucket).upload(pdfPath, pdfBytes, {
      contentType: "application/pdf",
      upsert: true,
    });

    if (up.error) {
      return NextResponse.json({ ok: false, error: up.error.message }, { status: 500 });
    }

    await supabaseAdmin.from("assessment_reports").upsert({
      assessment_id: ass.assessment_id,
      pdf_path: pdfPath,
      generated_at: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true, pdf_path: pdfPath });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}