import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabaseServer";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { buildEndurePdf } from "@/src/lib/reportPdf";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const assessment_id = searchParams.get("assessment_id");
    if (!assessment_id) return NextResponse.json({ ok: false, error: "missing assessment_id" }, { status: 400 });

    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return NextResponse.json({ ok: false, error: "not authenticated" }, { status: 401 });

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const bucket = process.env.SUPABASE_REPORTS_BUCKET || "reports";
    const supabaseAdmin = createSupabaseAdmin(url, serviceKey);

    // resolve athlete do user logado
    const { data: ath } = await supabaseAdmin
      .from("athletes")
      .select("athlete_id")
      .eq("user_id", auth.user.id)
      .maybeSingle();
    if (!ath?.athlete_id) return NextResponse.json({ ok: false, error: "no athlete for user" }, { status: 403 });

    // garante ownership
    const { data: a } = await supabaseAdmin
      .from("assessments")
      .select("assessment_id, athlete_id, instrument_version, reference_window, created_at, submitted_at")
      .eq("assessment_id", assessment_id)
      .eq("athlete_id", ath.athlete_id)
      .maybeSingle();
    if (!a) return NextResponse.json({ ok: false, error: "assessment not found" }, { status: 404 });

    // tenta achar report
    let { data: rep } = await supabaseAdmin
      .from("assessment_reports")
      .select("pdf_path")
      .eq("assessment_id", assessment_id)
      .maybeSingle();

    // se não existe, gera agora (on-demand)
    if (!rep?.pdf_path) {
      const { data: athlete } = await supabaseAdmin
        .from("athletes")
        .select("full_name, email, team, sport_primary, birth_date, sex, gender")
        .eq("athlete_id", a.athlete_id)
        .maybeSingle();

      const { data: scores } = await supabaseAdmin
        .from("assessment_scores")
        .select("score_scale, raw_score, t_score, percentile, band_label")
        .eq("assessment_id", assessment_id);

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

      rep = { pdf_path: storagePath } as any;
    }

    const { data: signed, error: eSigned } = await supabaseAdmin.storage
      .from(bucket)
      .createSignedUrl(String(rep.pdf_path), 60 * 30);

    if (eSigned || !signed?.signedUrl) {
      return NextResponse.json({ ok: false, error: "failed to sign url" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, signed_url: signed.signedUrl, pdf_path: rep.pdf_path });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}
