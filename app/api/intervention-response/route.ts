import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/src/lib/supabaseServer";

export const dynamic = "force-dynamic";

function json(status: number, body: any) {
  return NextResponse.json(body, { status });
}

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE ||
    process.env.SUPABASE_SERVICE_KEY;

  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL não encontrada.");
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY não encontrada.");

  return createSupabaseClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

async function getContext(req: NextRequest) {
  const admin = getAdminClient();

  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();

  let user: any = null;

  if (token) {
    const { data, error } = await admin.auth.getUser(token);

    if (error || !data?.user) {
      return { ok: false as const, status: 401, error: "Usuário não autenticado." };
    }

    user = data.user;
  } else {
    const authClient = await createClient();

    const {
      data: { user: cookieUser },
      error,
    } = await authClient.auth.getUser();

    if (error || !cookieUser) {
      return { ok: false as const, status: 401, error: "Usuário não autenticado." };
    }

    user = cookieUser;
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: athlete } = await admin
    .from("athletes")
    .select("athlete_id")
    .eq("user_id", user.id)
    .maybeSingle();

  return {
    ok: true as const,
    user,
    admin,
    role: String(profile?.role ?? ""),
    ownAthleteId: athlete?.athlete_id ?? null,
  };
}

function buildAssessmentRequestFromLinked(input: {
  linked: any;
  athleteId: string;
  assignedByUserId: string | null;
}) {
  const linked = input.linked ?? {};

  const title =
    String(linked?.title ?? "").trim() ||
    "Avaliação pós-intervenção";

  const instrumentVersion =
    String(linked?.instrument_version ?? "").trim() || "ENDURE_v1";

  const selection_json = {
    sections: Array.isArray(linked?.sections) ? linked.sections : [],
    scales:
      linked?.scales && typeof linked.scales === "object"
        ? linked.scales
        : {},
  };

  return {
    athlete_id: input.athleteId,
    created_by_user_id: input.assignedByUserId,
    title,
    status: "pending",
    instrument_version: instrumentVersion,
    reference_window: linked?.reference_window ?? null,
    due_at: null,
    selection_json,
  };
}

export async function GET(req: NextRequest) {
  try {
    const ctx = await getContext(req);

    if (!ctx.ok) return json(ctx.status, { ok: false, error: ctx.error });

    const url = new URL(req.url);
    const assignmentId = url.searchParams.get("assignment_id");

    if (!assignmentId) {
      return json(400, { ok: false, error: "assignment_id é obrigatório." });
    }

    const { data: assignment, error: assignmentError } = await ctx.admin
      .from("intervention_assignments")
      .select("*")
      .eq("assignment_id", assignmentId)
      .maybeSingle();

    if (assignmentError || !assignment?.assignment_id) {
      return json(404, {
        ok: false,
        error: assignmentError?.message ?? "Intervenção não encontrada.",
      });
    }

    const isAdmin = ctx.role === "admin";
    const isOwner = ctx.ownAthleteId === assignment.athlete_id;

    if (!isAdmin && !isOwner) {
      return json(403, { ok: false, error: "Acesso não autorizado." });
    }

    const { data: response } = await ctx.admin
      .from("intervention_responses")
      .select("*")
      .eq("assignment_id", assignmentId)
      .eq("athlete_id", assignment.athlete_id)
      .maybeSingle();

    return json(200, {
      ok: true,
      assignment,
      response: response ?? null,
    });
  } catch (e: any) {
    return json(500, { ok: false, error: e?.message ?? "Erro inesperado." });
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await getContext(req);

    if (!ctx.ok) return json(ctx.status, { ok: false, error: ctx.error });

    const body = await req.json().catch(() => ({}));

    const assignmentId = String(body?.assignment_id ?? "").trim();
    const response_json =
      body?.response_json && typeof body.response_json === "object"
        ? body.response_json
        : {};

    const complete = Boolean(body?.complete);

    if (!assignmentId) {
      return json(400, { ok: false, error: "assignment_id é obrigatório." });
    }

    const { data: assignment, error: assignmentError } = await ctx.admin
      .from("intervention_assignments")
      .select("*")
      .eq("assignment_id", assignmentId)
      .maybeSingle();

    if (assignmentError || !assignment?.assignment_id) {
      return json(404, {
        ok: false,
        error: assignmentError?.message ?? "Intervenção não encontrada.",
      });
    }

    const isAdmin = ctx.role === "admin";
    const isOwner = ctx.ownAthleteId === assignment.athlete_id;

    if (!isAdmin && !isOwner) {
      return json(403, { ok: false, error: "Acesso não autorizado." });
    }

    const now = new Date().toISOString();

    const responseStatus = complete ? "completed" : "in_progress";

    const { data: savedResponse, error: responseError } = await ctx.admin
      .from("intervention_responses")
      .upsert(
        {
          assignment_id: assignment.assignment_id,
          athlete_id: assignment.athlete_id,
          response_json,
          status: responseStatus,
          updated_at: now,
        },
        { onConflict: "assignment_id,athlete_id" }
      )
      .select("*")
      .single();

    if (responseError) {
      return json(500, { ok: false, error: responseError.message });
    }

    const wasAlreadyCompleted = Boolean(assignment.completed_at);

    const assignmentUpdate: any = {
      status: responseStatus,
    };

    if (!assignment.started_at) {
      assignmentUpdate.started_at = now;
    }

    if (complete && !assignment.completed_at) {
      assignmentUpdate.completed_at = now;
    }

    const { error: updateError } = await ctx.admin
      .from("intervention_assignments")
      .update(assignmentUpdate)
      .eq("assignment_id", assignment.assignment_id);

    if (updateError) {
      return json(500, { ok: false, error: updateError.message });
    }

    let createdAssessmentRequest: any = null;

    const linked = assignment.linked_assessment_snapshot ?? {};
    const shouldCreateLinkedAssessment =
      complete &&
      !wasAlreadyCompleted &&
      linked?.enabled === true &&
      String(linked?.trigger ?? "on_completion") === "on_completion";

    if (shouldCreateLinkedAssessment) {
      const requestPayload = buildAssessmentRequestFromLinked({
        linked,
        athleteId: assignment.athlete_id,
        assignedByUserId: assignment.assigned_by_user_id ?? ctx.user.id,
      });

      const { data: assessmentRequest, error: assessmentError } = await ctx.admin
        .from("assessment_requests")
        .insert(requestPayload)
        .select("*")
        .single();

      if (assessmentError) {
        return json(500, {
          ok: false,
          error: `Intervenção concluída, mas falhou ao criar avaliação vinculada: ${assessmentError.message}`,
        });
      }

      createdAssessmentRequest = assessmentRequest;
    }

    return json(200, {
      ok: true,
      response: savedResponse,
      completed: complete,
      created_assessment_request: createdAssessmentRequest,
    });
  } catch (e: any) {
    return json(500, { ok: false, error: e?.message ?? "Erro inesperado." });
  }
}