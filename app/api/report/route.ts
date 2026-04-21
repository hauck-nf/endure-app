import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabaseServer";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { buildEndurePdf } from "@/src/lib/reportPdf";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { assessment_id } = await req.json();
    if (!assessment_id) return NextResponse.json({ ok: false, error: "missing assessment_id" }, { status: 400 });

    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return NextResponse.json({ ok: false, error: "not authenticated" }, { status: 401 });

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const bucket = process.env.SUPABASE_REPORTS_BUCKET || "reports";
    const supabaseAdmin = createSupabaseAdmin(url, serviceKey);

    // assessment (admin-only endpoint)
    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("user_id", auth.user.id)
      .maybeSingle();

    if (prof?.role !== "admin") {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const { data: a, error: eA } = await supabaseAdmin
      .from("assessments")
      .select("assessment_id, athlete_id, instrument_version, reference_window, created_at, submitted_at")
      .eq("assessment_id", assessment_id)
      .maybeSingle();
    if (eA) throw eA;
    if (!a) return NextResponse.json({ ok: false, error: "assessment not found" }, { status: 404 });

    const { data: athlete, error: eAth } = await supabaseAdmin
      .from("athletes")
      .select("full_name, email, team, sport_primary, birth_date, sex, gender")
      .eq("athlete_id", a.athlete_id)
      .maybeSingle();
    if (eAth) throw eAth;

    const { data: scores, error: eS } = await supabaseAdmin
      .from("assessment_scores")
      .select("score_scale, raw_score, t_score, percentile, band_label")
      .eq("assessment_id", assessment_id);
    if (eS) throw eS;

    const pdfBytes = await buildEndurePdf({
      athlete: athlete ?? {
        full_name: null, email: null, team: null, sport_primary: null, birth_date: null, sex: null, gender: null
      },
      assessment: a,
      scores: (scores ?? []) as any,
    });

    const storagePath = `${a.athlete_id}/${assessment_id}.pdf`;

    const { error: eUp } = await supabaseAdmin.storage
      .from(bucket)
      .upload(storagePath, pdfBytes, { upsert: true, contentType: "application/pdf" });
    if (eUp) throw eUp;

    const { error: eR } = await supabaseAdmin
      .from("assessment_reports")
      .upsert(
        { assessment_id, pdf_path: storagePath, generated_at: new Date().toISOString() },
        { onConflict: "assessment_id" }
      );
    if (eR) throw eR;

    return NextResponse.json({ ok: true, pdf_path: storagePath });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}
