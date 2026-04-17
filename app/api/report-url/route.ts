import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const assessment_id = url.searchParams.get("assessment_id");
    if (!assessment_id) return NextResponse.json({ error: "assessment_id ausente" }, { status: 400 });

    const { data: r, error } = await supabaseAdmin
      .from("assessment_reports")
      .select("pdf_path")
      .eq("assessment_id", assessment_id)
      .maybeSingle();
    if (error) throw error;
    if (!r?.pdf_path) return NextResponse.json({ error: "Relatório ainda não gerado" }, { status: 404 });

    const { data: signed, error: e2 } = await supabaseAdmin.storage
      .from("reports")
      .createSignedUrl(r.pdf_path, 60 * 10); // 10 min
    if (e2) throw e2;

    return NextResponse.json({ url: signed.signedUrl });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? String(e) }, { status: 500 });
  }
}