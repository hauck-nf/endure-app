import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabaseServer";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function isUuid(s: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}

export async function GET(req: Request) {
  try {
    const supabase = await createClient();

    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    }

    const urlObj = new URL(req.url);
    const assessment_id = (urlObj.searchParams.get("assessment_id") ?? "").trim();
    if (!assessment_id || !isUuid(assessment_id)) {
      return NextResponse.json({ ok: false, error: "invalid assessment_id" }, { status: 400 });
    }

    // role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", auth.user.id)
      .maybeSingle();

    const role = profile?.role ?? "unknown";

    // se não for admin: garantir que o assessment pertence ao atleta logado
    if (role !== "admin") {
      const { data: ath } = await supabase
        .from("athletes")
        .select("athlete_id")
        .eq("user_id", auth.user.id)
        .maybeSingle();

      if (!ath?.athlete_id) {
        return NextResponse.json({ ok: false, error: "no athlete profile" }, { status: 403 });
      }

      const { data: own } = await supabase
        .from("assessments")
        .select("assessment_id")
        .eq("assessment_id", assessment_id)
        .eq("athlete_id", ath.athlete_id)
        .maybeSingle();

      if (!own?.assessment_id) {
        return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
      }
    }

    // pegar pdf_path
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const bucket = process.env.SUPABASE_REPORTS_BUCKET || "reports";
    const supabaseAdmin = createSupabaseAdmin(supabaseUrl, serviceKey);

    const { data: rep, error: repErr } = await supabaseAdmin
      .from("assessment_reports")
      .select("pdf_path")
      .eq("assessment_id", assessment_id)
      .maybeSingle();

    if (repErr) {
      return NextResponse.json({ ok: false, error: `Erro ao consultar assessment_reports: ${repErr.message}` }, { status: 500 });
    }

    const pdf_path = (rep?.pdf_path ? String(rep.pdf_path).trim() : "");
    if (!pdf_path) {
      return NextResponse.json({ ok: false, error: "no pdf_path for assessment_id" }, { status: 404 });
    }

    const { data: signed, error: signErr } = await supabaseAdmin.storage
      .from(bucket)
      .createSignedUrl(pdf_path, 60 * 30);

    if (signErr || !signed?.signedUrl) {
      return NextResponse.json({ ok: false, error: "failed to sign url" }, { status: 500 });
    }

    // retornos redundantes por compatibilidade
    return NextResponse.json({
      ok: true,
      pdf_path,
      signedUrl: signed.signedUrl,
      signed_url: signed.signedUrl,
      url: signed.signedUrl,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}