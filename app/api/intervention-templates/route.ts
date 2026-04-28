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
      .from("intervention_templates")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return json(500, { ok: false, error: error.message });
    }

    return json(200, { ok: true, templates: data ?? [] });
  } catch (e: any) {
    return json(500, { ok: false, error: e?.message ?? "Erro inesperado." });
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireAdmin(req);

    if (!ctx.ok) return json(ctx.status, { ok: false, error: ctx.error });

    const body = await req.json().catch(() => ({}));

    const title = String(body?.title ?? "").trim();

    if (!title) {
      return json(400, { ok: false, error: "Título da intervenção é obrigatório." });
    }

    const content_json =
      body?.content_json && typeof body.content_json === "object"
        ? body.content_json
        : { blocks: [] };

    const linked_assessment_json =
      body?.linked_assessment_json && typeof body.linked_assessment_json === "object"
        ? body.linked_assessment_json
        : { enabled: false };

    const payload = {
      title,
      category: body?.category ? String(body.category).trim() : null,
      objective: body?.objective ? String(body.objective).trim() : null,
      estimated_duration: body?.estimated_duration
        ? String(body.estimated_duration).trim()
        : null,
      related_scales: Array.isArray(body?.related_scales) ? body.related_scales : [],
      content_json,
      linked_assessment_json,
      is_active: body?.is_active === false ? false : true,
      created_by_user_id: ctx.user.id,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await ctx.admin
      .from("intervention_templates")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      return json(500, { ok: false, error: error.message });
    }

    return json(200, { ok: true, template: data });
  } catch (e: any) {
    return json(500, { ok: false, error: e?.message ?? "Erro inesperado." });
  }
}