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

function isUuid(x: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    x
  );
}

export async function GET(req: Request) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!url || !serviceKey) {
      return json(500, { ok: false, error: "missing SUPABASE env vars" });
    }

    const supabaseAdmin = createSupabaseAdmin(url, serviceKey);

    const accessToken = getBearerToken(req);

    if (!accessToken) {
      return json(401, { ok: false, error: "not authenticated: missing bearer token" });
    }

    const { data: userData, error: userErr } =
      await supabaseAdmin.auth.getUser(accessToken);

    if (userErr || !userData?.user) {
      return json(401, { ok: false, error: "not authenticated" });
    }

    const { searchParams } = new URL(req.url);
    const requestId = String(searchParams.get("request_id") ?? "").trim();

    if (!requestId || !isUuid(requestId)) {
      return json(400, { ok: false, error: "invalid or missing request_id" });
    }

    const { data: requestRow, error: requestErr } = await supabaseAdmin
      .from("assessment_requests")
      .select("request_id, athlete_id, status")
      .eq("request_id", requestId)
      .maybeSingle();

    if (requestErr) {
      return json(500, {
        ok: false,
        error: `failed to read assessment_request: ${requestErr.message}`,
      });
    }

    if (!requestRow?.request_id) {
      return json(404, { ok: false, error: "assessment_request not found" });
    }

    const { data: athlete, error: athleteErr } = await supabaseAdmin
      .from("athletes")
      .select("athlete_id, user_id")
      .eq("athlete_id", requestRow.athlete_id)
      .maybeSingle();

    if (athleteErr || !athlete?.athlete_id) {
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

    const { data: assessment, error: assessmentErr } = await supabaseAdmin
      .from("assessments")
      .select("assessment_id, request_id, athlete_id, status, submitted_at, created_at")
      .eq("request_id", requestId)
      .eq("status", "submitted")
      .order("submitted_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (assessmentErr) {
      return json(500, {
        ok: false,
        error: `failed to read submitted assessment: ${assessmentErr.message}`,
      });
    }

    if (!assessment?.assessment_id) {
      return json(404, {
        ok: false,
        error: "no submitted assessment found for this request_id",
        request_status: requestRow.status,
      });
    }

    return json(200, {
      ok: true,
      request_id: requestId,
      assessment_id: assessment.assessment_id,
      assessment_status: assessment.status,
      submitted_at: assessment.submitted_at,
    });
  } catch (e: any) {
    return json(500, { ok: false, error: e?.message ?? String(e) });
  }
}