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
      .select("request_id, athlete_id, status, title, created_at")
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

    // 1) Caminho principal: assessment submitted/completed vinculado ao request_id.
    const { data: completedAssessments, error: completedErr } = await supabaseAdmin
      .from("assessments")
      .select("assessment_id, request_id, athlete_id, status, submitted_at, created_at")
      .eq("request_id", requestId)
      .eq("athlete_id", requestRow.athlete_id)
      .in("status", ["submitted", "completed"])
      .order("submitted_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(10);

    if (completedErr) {
      return json(500, {
        ok: false,
        error: `failed to read completed assessments: ${completedErr.message}`,
      });
    }

    const completed = completedAssessments?.[0];

    if (completed?.assessment_id) {
      return json(200, {
        ok: true,
        request_id: requestId,
        assessment_id: completed.assessment_id,
        assessment_status: completed.status,
        submitted_at: completed.submitted_at,
        source: "completed_assessment_by_request",
      });
    }

    // 2) Diagnóstico/fallback controlado:
    // busca qualquer assessment vinculado ao request para explicar melhor o erro.
    const { data: anyAssessments, error: anyErr } = await supabaseAdmin
      .from("assessments")
      .select("assessment_id, request_id, athlete_id, status, submitted_at, created_at")
      .eq("request_id", requestId)
      .eq("athlete_id", requestRow.athlete_id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (anyErr) {
      return json(500, {
        ok: false,
        error: `failed to read assessments for diagnostics: ${anyErr.message}`,
      });
    }

    return json(404, {
      ok: false,
      error: "no submitted or completed assessment found for this request_id",
      request_id: requestId,
      request_status: requestRow.status,
      request_title: requestRow.title,
      linked_assessments_found: anyAssessments?.length ?? 0,
      linked_assessment_statuses: (anyAssessments ?? []).map((a: any) => ({
        assessment_id: a.assessment_id,
        status: a.status,
        submitted_at: a.submitted_at,
        created_at: a.created_at,
      })),
    });
  } catch (e: any) {
    return json(500, { ok: false, error: e?.message ?? String(e) });
  }
}