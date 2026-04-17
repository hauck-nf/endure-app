import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabaseServer";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();

    // 1) auth
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      return NextResponse.json({ ok: false, error: "Não autenticado." }, { status: 401 });
    }

    // 2) role admin
    const { data: prof, error: pErr } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", auth.user.id)
      .single();

    if (pErr) return NextResponse.json({ ok: false, error: pErr.message }, { status: 403 });
    if (prof?.role !== "admin") {
      return NextResponse.json({ ok: false, error: "Apenas admin pode cadastrar atleta." }, { status: 403 });
    }

    // 3) payload
    const body = await req.json().catch(() => ({}));
    const full_name = String(body.full_name ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");

    if (!full_name) return NextResponse.json({ ok: false, error: "Nome é obrigatório." }, { status: 400 });
    if (!email || !email.includes("@")) return NextResponse.json({ ok: false, error: "E-mail inválido." }, { status: 400 });
    if (!password || password.length < 8) return NextResponse.json({ ok: false, error: "Senha deve ter no mínimo 8 caracteres." }, { status: 400 });

    // 4) service role client
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    if (!url || !serviceKey) {
      return NextResponse.json({ ok: false, error: "Faltando NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY." }, { status: 500 });
    }

    const admin = createSupabaseAdmin(url, serviceKey);

    // 5) cria user no Auth
    const { data: created, error: cErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    });

    if (cErr) return NextResponse.json({ ok: false, error: `Auth createUser: ${cErr.message}` }, { status: 400 });

    const newUserId = created.user?.id;
    if (!newUserId) return NextResponse.json({ ok: false, error: "Auth user.id não retornou." }, { status: 500 });

    // ✅ 6) profiles: use UPSERT (porque o trigger handle_new_user pode já ter criado)
    const { error: prErr } = await admin
      .from("profiles")
      .upsert(
        { user_id: newUserId, role: "athlete", full_name },
        { onConflict: "user_id" }
      );

    if (prErr) {
      // rollback: apaga user criado
      await admin.auth.admin.deleteUser(newUserId);
      return NextResponse.json({ ok: false, error: `Upsert profiles: ${prErr.message}` }, { status: 400 });
    }

    // 7) athletes
    const { error: aErr } = await admin
      .from("athletes")
      .insert({
        athlete_id: crypto.randomUUID(),
        user_id: newUserId,
        full_name,
        email,
      });
if (aErr) {
      // rollback
      await admin.from("profiles").delete().eq("user_id", newUserId);
      await admin.auth.admin.deleteUser(newUserId);
      return NextResponse.json({ ok: false, error: `Insert athletes: ${aErr.message}` }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}
