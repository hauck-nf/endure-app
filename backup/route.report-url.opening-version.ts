import { NextResponse } from "next/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function json(status: number, body: any) {
  return NextResponse.json(body, { status });
}

function getBearerToken(req: Request) {
  const auth = req.headers.get("authorization") || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : "";
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const assessment_id = String(searchParams.get("assessment_id") ?? "").trim();

    if (!assessment_id) {
      return json(400, { ok: false, error: "missing assessment_id" });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const bucket = process.env.SUPABASE_REPORTS_BUCKET || "reports";

    if (!url || !anonKey || !serviceKey) {
      return json(500, { ok: false, error: "missing SUPABASE env vars" });
    }

    const supabaseAdmin = createSupabaseAdmin(url, serviceKey);

    const accessToken = getBearerToken(req);
    if (!accessToken) {
      return json(401, { ok: false, error: "not authenticated: missing bearer token" });
    }

    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(accessToken);
    if (userErr || !userData?.user) {
      return json(401, { ok: false, error: "not authenticated" });
    }

    // LER APENAS A TABELA NOVA
    const { data: reportRow, error: reportErr } = await supabaseAdmin
      .from("assessment_reports_v2")
      .select("assessment_id, pdf_path")
      .eq("assessment_id", assessment_id)
      .maybeSingle();

    if (reportErr) {
      return json(500, { ok: false, error: reportErr.message });
    }

    if (!reportRow?.pdf_path) {
      return json(404, { ok: false, error: "report not generated yet in assessment_reports_v2" });
    }

    // AUTORIZAÇÃO: dono do assessment ou staff
    const { data: assessment, error: assErr } = await supabaseAdmin
      .from("assessments")
      .select("assessment_id, athlete_id")
      .eq("assessment_id", assessment_id)
      .maybeSingle();

    if (assErr || !assessment?.assessment_id) {
      return json(404, { ok: false, error: "assessment not found" });
    }

    const { data: athlete, error: athErr } = await supabaseAdmin
      .from("athletes")
      .select("athlete_id, user_id")
      .eq("athlete_id", assessment.athlete_id)
      .maybeSingle();

    if (athErr || !athlete?.athlete_id) {
      return json(404, { ok: false, error: "athlete not found" });
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("user_id", userData.user.id)
      .maybeSingle();

    const role = String(profile?.role ?? "");
    const isOwner = athlete.user_id === userData.user.id;
    const isStaff = role === "admin" || role === "coach";

    if (!isOwner && !isStaff) {
      return json(403, { ok: false, error: "forbidden" });
    }

    const signed = await supabaseAdmin.storage
      .from(bucket)
      .createSignedUrl(reportRow.pdf_path, 60 * 10);

    if (signed.error || !signed.data?.signedUrl) {
      return json(500, {
        ok: false,
        error: signed.error?.message ?? "failed to create signed url",
      });
    }

    return json(200, {
      ok: true,
      signedUrl: signed.data.signedUrl,
    });
  } catch (e: any) {
    return json(500, { ok: false, error: e?.message ?? String(e) });
  }
}
