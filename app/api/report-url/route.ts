import { NextResponse } from "next/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const assessment_id = String(searchParams.get("assessment_id") ?? "").trim();
    if (!assessment_id || !isUuid(assessment_id)) {
      return NextResponse.json({ ok: false, error: "invalid assessment_id" }, { status: 400 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const bucket = process.env.SUPABASE_REPORTS_BUCKET || "reports";
    const supabaseAdmin = createSupabaseAdmin(url, serviceKey);

    const { data: rep, error: repErr } = await supabaseAdmin
      .from("assessment_reports")
      .select("pdf_path")
      .eq("assessment_id", assessment_id)
      .maybeSingle();

    if (repErr) {
      return NextResponse.json(
        { ok: false, error: "Erro ao consultar assessment_reports: " + repErr.message },
        { status: 500 }
      );
    }
    if (!rep?.pdf_path) {
      return NextResponse.json({ ok: false, error: "no pdf_path" }, { status: 404 });
    }

    const pdfPath = String(rep.pdf_path);

    const { data: signed, error: eSigned } = await supabaseAdmin.storage
      .from(bucket)
      .createSignedUrl(pdfPath, 60 * 30);

    if (eSigned || !signed?.signedUrl) {
      return NextResponse.json({ ok: false, error: "failed to sign url" }, { status: 500 });
    }

    const accept = req.headers.get("accept") || "";
    const wantsJson = accept.includes("application/json") || searchParams.get("json") === "1";
    if (wantsJson) {
      return NextResponse.json({ ok: true, pdf_path: pdfPath, signedUrl: signed.signedUrl });
    }

    return NextResponse.redirect(signed.signedUrl, { status: 302 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}