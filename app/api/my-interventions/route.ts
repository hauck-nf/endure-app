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

async function getUserFromRequest(req: NextRequest) {
  const admin = getAdminClient();

  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();

  if (token) {
    const { data, error } = await admin.auth.getUser(token);

    if (error || !data?.user) {
      return { user: null, admin };
    }

    return { user: data.user, admin };
  }

  const authClient = await createClient();

  const {
    data: { user },
  } = await authClient.auth.getUser();

  return { user, admin };
}

export async function GET(req: NextRequest) {
  try {
    const { user, admin } = await getUserFromRequest(req);

    if (!user) {
      return json(401, { ok: false, error: "Usuário não autenticado." });
    }

    const { data: athlete, error: athleteError } = await admin
      .from("athletes")
      .select("athlete_id, full_name")
      .eq("user_id", user.id)
      .maybeSingle();

    if (athleteError || !athlete?.athlete_id) {
      return json(403, {
        ok: false,
        error: athleteError?.message ?? "Cadastro de atleta não encontrado.",
      });
    }

    const { data, error } = await admin
      .from("intervention_assignments")
      .select(`
        assignment_id,
        template_id,
        athlete_id,
        title_snapshot,
        content_snapshot,
        linked_assessment_snapshot,
        status,
        due_at,
        assigned_at,
        started_at,
        completed_at
      `)
      .eq("athlete_id", athlete.athlete_id)
      .order("assigned_at", { ascending: false });

    if (error) {
      return json(500, { ok: false, error: error.message });
    }

    return json(200, {
      ok: true,
      athlete,
      interventions: data ?? [],
    });
  } catch (e: any) {
    return json(500, { ok: false, error: e?.message ?? "Erro inesperado." });
  }
}