import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BUCKET = process.env.SUPABASE_REPORTS_BUCKET || "reports";

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const assessment_id = url.searchParams.get("assessment_id") ?? "";

    if (!assessment_id) {
      return NextResponse.json({ ok: false, error: "assessment_id ausente" }, { status: 400 });
    }
    if (!isUuid(assessment_id)) {
      return NextResponse.json({ ok: false, error: `assessment_id inválido: ${assessment_id}` }, { status: 400 });
    }

    const { data: rep, error: repErr } = await supabaseAdmin
      .from("assessment_reports")
      .select("pdf_path")
      .eq("assessment_id", assessment_id)
      .maybeSingle();

    if (repErr) {
      return NextResponse.json({ ok: false, error: `Erro ao consultar assessment_reports: ${repErr.message}` }, { status: 500 });
    }

    if (!rep?.pdf_path) {
      return NextResponse.json({ ok: false, error: "Relatório ainda não gerado" }, { status: 404 });
    }

    const pdfPath = String(rep.pdf_path).trim();

    const { data: signed, error: signErr } = await supabaseAdmin.storage
      .from(BUCKET)
      .createSignedUrl(pdfPath, 60 * 30); // 30 min

    if (signErr || !signed?.signedUrl) {
      return NextResponse.json({ ok: false, error: "Falha ao assinar URL do PDF" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, signed_url: signed.signedUrl, pdf_path: pdfPath });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}
