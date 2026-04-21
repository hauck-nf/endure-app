import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabaseServer";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { buildEndurePdf } from "@/src/lib/reportPdf";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { assessment_id } = (await req.json().catch(() => ({}))) as { assessment_id?: string };
    if (!assessment_id) {
      return NextResponse.json({ ok: false, error: "missing assessment_id" }, { status: 400 });
    }

    // precisa estar autenticado (cookies)
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return NextResponse.json({ ok: false, error: "not authenticated" }, { status: 401 });

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const bucket = process.env.SUPABASE_REPORTS_BUCKET || "reports";
    const supabaseAdmin = createSupabaseAdmin(url, serviceKey);

    // role
    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("user_id", auth.user.id)
      .maybeSingle();

    // assessment
    const { data: ass, error: eAss } = await supabaseAdmin
      .from("assessments")
      .select("assessment_id, athlete_id, instrument_version, reference_window, created_at, submitted_at")
      .eq("assessment_id", assessment_id)
      .maybeSingle();

    if (eAss || !ass?.assessment_id) {
      return NextResponse.json({ ok: false, error: "assessment not found" }, { status: 404 });
    }

    // atleta sÃ³ pode gerar relatÃ³rio do prÃ³prio assessment
    if (prof?.role !== "admin") {
      const { data: myAth } = await supabaseAdmin
        .from("athletes")
        .select("athlete_id")
        .eq("user_id", auth.user.id)
        .maybeSingle();

      if (!myAth?.athlete_id || myAth.athlete_id !== ass.athlete_id) {
        return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
      }
    }

    // athlete
    const { data: athlete } = await supabaseAdmin
      .from("athletes")
      .select("athlete_id, full_name, email, team, sport_primary, birth_date, sex, gender")
      .eq("athlete_id", ass.athlete_id)
      .maybeSingle();

    if (!athlete?.athlete_id) {
      return NextResponse.json({ ok: false, error: "athlete not found" }, { status: 404 });
    }

    // scores_json (se faltar, chama /api/score para calcular)
    let { data: scoreRow } = await supabaseAdmin
      .from("assessment_scores")
      .select("scores_json")
      .eq("assessment_id", assessment_id)
      .maybeSingle();

    if (!scoreRow?.scores_json) {
      const base = process.env.NEXT_PUBLIC_BASE_URL || new URL(req.url).origin;

      const rScore = await fetch(`${base}/api/score`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: req.headers.get("cookie") ?? "",
        },
        body: JSON.stringify({ assessment_id }),
        cache: "no-store",
      });

      const jScore: any = await rScore.json().catch(() => ({}));
      if (!rScore.ok || !jScore?.ok) {
        return NextResponse.json({ ok: false, error: jScore?.error ?? "failed to score" }, { status: 500 });
      }

      ({ data: scoreRow } = await supabaseAdmin
        .from("assessment_scores")
        .select("scores_json")
        .eq("assessment_id", assessment_id)
        .maybeSingle());
    }

    const scoresJson: any = scoreRow?.scores_json ?? {};
    const factors: any[] = Array.isArray(scoresJson?.factors) ? scoresJson.factors : [];

    // o PDF atual usa a forma "ScoreRow[]" (vinda do scores_json)
    const scores = factors
      .map((f) => ({
        score_scale: String(f.score_scale ?? ""),
        raw_score: Number(f.raw_score ?? 0),
        t_score: Number(f.t_score ?? 0),
        percentile: Number(f.percentile ?? 0),
        band: String(f.band ?? ""),
        band_label: String(f.band_label ?? ""),
        theta_hat: f.theta_hat == null ? null : Number(f.theta_hat),
        n_items_scored: Number(f.n_items_scored ?? 0),
        text_port: String(f.text_port ?? ""),
      }))
      .filter((s) => s.score_scale);

    const pdfBytes = await buildEndurePdf({
      athlete,
      assessment: {
        assessment_id: ass.assessment_id,
        instrument_version: ass.instrument_version ?? "ENDURE_v1",
        reference_window: ass.reference_window ?? null,
        created_at: ass.created_at,
        submitted_at: ass.submitted_at ?? null,
      },
      scores,
    });

    const pdf_path = `${athlete.athlete_id}/${assessment_id}.pdf`;

    const { error: eUp } = await supabaseAdmin.storage.from(bucket).upload(pdf_path, pdfBytes, {
      contentType: "application/pdf",
      upsert: true,
    } as any);

    if (eUp) {
      return NextResponse.json({ ok: false, error: eUp.message ?? "failed to upload pdf" }, { status: 500 });
    }

    const { error: eDb } = await supabaseAdmin.from("assessment_reports").upsert(
      { assessment_id, pdf_path, generated_at: new Date().toISOString() },
      { onConflict: "assessment_id" } as any
    );

    if (eDb) {
      return NextResponse.json({ ok: false, error: eDb.message ?? "failed to save report row" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, pdf_path });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}

