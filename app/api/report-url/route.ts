import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabaseServer";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const assessment_id = searchParams.get("assessment_id");

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

    // 1) tenta achar report já existente
    let { data: rep } = await supabaseAdmin
      .from("assessment_reports")
      .select("pdf_path")
      .eq("assessment_id", assessment_id)
      .maybeSingle();

    // 2) se não existe, gera agora (on-demand)
    if (!rep?.pdf_path) {
      const base = process.env.NEXT_PUBLIC_BASE_URL || "";
      const genUrl = `${base}/api/report`;
      const r = await fetch(genUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ assessment_id }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j?.ok) {
        return NextResponse.json({ ok: false, error: j?.error ?? "failed to generate report" }, { status: 500 });
      }

      // reconsulta
      const again = await supabaseAdmin
        .from("assessment_reports")
        .select("pdf_path")
        .eq("assessment_id", assessment_id)
        .maybeSingle();

      rep = again.data ?? null;
    }

    if (!rep?.pdf_path) {
      return NextResponse.json({ ok: false, error: "no pdf_path for assessment_id" }, { status: 404 });
    }

    const pdfPath = String(rep.pdf_path);

    const { data: signed, error: eSigned } = await supabaseAdmin.storage
      .from(bucket)
      .createSignedUrl(pdfPath, 60 * 30);

    if (eSigned || !signed?.signedUrl) {
      return NextResponse.json({ ok: false, error: "failed to sign url" }, { status: 500 });
    }

    // ✅ redirect: browser abre PDF direto (sem popup / sem JSON)
    return NextResponse.redirect(signed.signedUrl, { status: 302 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}