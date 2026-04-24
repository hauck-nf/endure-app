import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabaseServer";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const supabase = await createClient();

    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      return NextResponse.json({ ok: false, error: "not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const assessment_id = String(searchParams.get("assessment_id") ?? "").trim();

    if (!assessment_id) {
      return NextResponse.json({ ok: false, error: "missing assessment_id" }, { status: 400 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const bucket = process.env.SUPABASE_REPORTS_BUCKET || "reports";

    if (!url || !serviceKey) {
      return NextResponse.json({ ok: false, error: "missing SUPABASE env vars" }, { status: 500 });
    }

    const supabaseAdmin = createSupabaseAdmin(url, serviceKey);

    const { data: row, error } = await supabaseAdmin
      .from("assessment_reports_v2")
      .select("assessment_id, pdf_path")
      .eq("assessment_id", assessment_id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    if (!row?.pdf_path) {
      return NextResponse.json(
        { ok: false, error: "report not generated yet in assessment_reports_v2" },
        { status: 404 }
      );
    }

    const signed = await supabaseAdmin.storage
      .from(bucket)
      .createSignedUrl(row.pdf_path, 60 * 10);

    if (signed.error || !signed.data?.signedUrl) {
      return NextResponse.json(
        { ok: false, error: signed.error?.message ?? "failed to create signed url" },
        { status: 500 }
      );
    }

    return NextResponse.redirect(signed.data.signedUrl, { status: 302 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}
