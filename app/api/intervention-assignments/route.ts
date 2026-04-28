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

async function requireAdmin(req: NextRequest) {
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

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profileError) {
    return {
      ok: false as const,
      status: 500,
      error: `Erro ao ler perfil: ${profileError.message}`,
    };
  }

  if (profile?.role !== "admin") {
    return { ok: false as const, status: 403, error: "Acesso restrito ao admin." };
  }

  return { ok: true as const, user, admin };
}

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireAdmin(req);

    if (!ctx.ok) return json(ctx.status, { ok: false, error: ctx.error });

    const { data, error } = await ctx.admin
      .from("intervention_assignments")
      .select(`
        assignment_id,
        template_id,
        athlete_id,
        title_snapshot,
        status,
        due_at,
        assigned_at,
        started_at,
        completed_at,
        athletes(full_name, email),
        intervention_templates(title, category)
      `)
      .order("assigned_at", { ascending: false })
      .limit(500);

    if (error) {
      return json(500, { ok: false, error: error.message });
    }

    return json(200, { ok: true, assignments: data ?? [] });
  } catch (e: any) {
    return json(500, { ok: false, error: e?.message ?? "Erro inesperado." });
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireAdmin(req);

    if (!ctx.ok) return json(ctx.status, { ok: false, error: ctx.error });

    const body = await req.json().catch(() => ({}));

    const templateId = String(body?.template_id ?? "").trim();
    const athleteIds = Array.isArray(body?.athlete_ids) ? body.athlete_ids : [];

    if (!templateId) {
      return json(400, { ok: false, error: "template_id é obrigatório." });
    }

    if (athleteIds.length === 0) {
      return json(400, { ok: false, error: "Selecione ao menos um atleta." });
    }

    const { data: template, error: templateError } = await ctx.admin
      .from("intervention_templates")
      .select("*")
      .eq("template_id", templateId)
      .maybeSingle();

    if (templateError || !template?.template_id) {
      return json(404, {
        ok: false,
        error: templateError?.message ?? "Template não encontrado.",
      });
    }

    const now = new Date().toISOString();

    const rows = athleteIds.map((athleteId: string) => ({
      template_id: template.template_id,
      athlete_id: athleteId,
      assigned_by_user_id: ctx.user.id,
      title_snapshot: template.title,
      content_snapshot: template.content_json ?? { blocks: [] },
      linked_assessment_snapshot:
        template.linked_assessment_json ?? { enabled: false },
      status: "pending",
      due_at: body?.due_at ? new Date(body.due_at).toISOString() : null,
      assigned_at: now,
    }));

    const { data, error } = await ctx.admin
      .from("intervention_assignments")
      .insert(rows)
      .select("*");

    if (error) {
      return json(500, { ok: false, error: error.message });
    }

    return json(200, {
      ok: true,
      assignments: data ?? [],
      count: data?.length ?? 0,
    });
  } catch (e: any) {
    return json(500, { ok: false, error: e?.message ?? "Erro inesperado." });
  }
}