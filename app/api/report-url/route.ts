import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabaseServer";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const urlObj = new URL(req.url);
    const assessment_id = urlObj.searchParams.get("assessment_id");
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

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("user_id", auth.user.id)
      .maybeSingle();

    // atleta só pode assinar relatório do próprio assessment
    if (profile?.role !== "admin") {
      const { data: myAth } = await supabaseAdmin
        .from("athletes")
        .select("athlete_id")
        .eq("user_id", auth.user.id)
        .maybeSingle();

      if (!myAth?.athlete_id) return NextResponse.json({ ok: false, error: "no athlete profile" }, { status: 403 });

      const { data: own } = await supabaseAdmin
        .from("assessments")
        .select("assessment_id")
        .eq("assessment_id", assessment_id)
        .eq("athlete_id", myAth.athlete_id)
        .maybeSingle();

      if (!own?.assessment_id) return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    let { data: rep } = await supabaseAdmin
      .from("assessment_reports")
      .select("pdf_path")
      .eq("assessment_id", assessment_id)
      .maybeSingle();

    // se não existe, gera agora (on-demand)
    if (!rep?.pdf_path) {
      const base = process.env.NEXT_PUBLIC_BASE_URL || urlObj.origin;

      const rGen = await fetch(`${base}/api/report`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: req.headers.get("cookie") ?? "",
        },
        body: JSON.stringify({ assessment_id }),
        cache: "no-store",
      });

      const jGen: any = await rGen.json().catch(() => ({}));
      if (!rGen.ok || !jGen?.ok) {
        return NextResponse.json({ ok: false, error: jGen?.error ?? "report not generated" }, { status: 500 });
      }

      ({ data: rep } = await supabaseAdmin
        .from("assessment_reports")
        .select("pdf_path")
        .eq("assessment_id", assessment_id)
        .maybeSingle());
    }

    if (!rep?.pdf_path) {
      return NextResponse.json({ ok: false, error: "no pdf_path for assessment_id" }, { status: 404 });
    }

    const pdfPath = String(rep.pdf_path).trim();

    const { data: signed, error: eSigned } = await supabaseAdmin.storage
      .from(bucket)
      .createSignedUrl(pdfPath, 60 * 30);

    if (eSigned || !signed?.signedUrl) {
      return NextResponse.json({ ok: false, error: eSigned?.message ?? "failed to sign url" }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      pdf_path: pdfPath,
      signedUrl: signed.signedUrl,
      signed_url: signed.signedUrl,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}