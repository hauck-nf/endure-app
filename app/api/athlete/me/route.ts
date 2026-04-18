import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabaseServer";

export async function GET() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "not_authenticated" }, { status: 401 });

  const { data, error } = await supabase
    .from("athletes")
    .select("athlete_id, user_id, full_name, email, phone, birth_date, sex, gender, team, coach_name, sport_primary, address_city, address_state")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true, athlete: data ?? null });
}
import { NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabaseServer";

export async function POST(req: Request) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "not_authenticated" }, { status: 401 });

  const body = await req.json().catch(() => ({}));

  // whitelist de campos editáveis pelo atleta
  const patch: any = {
    full_name: body.full_name ?? null,
    phone: body.phone ?? null,
    birth_date: body.birth_date ?? null,
    sex: body.sex ?? null,
    gender: body.gender ?? null,
    team: body.team ?? null,
    coach_name: body.coach_name ?? null,
    sport_primary: body.sport_primary ?? null,
    address_city: body.address_city ?? null,
    address_state: body.address_state ?? null,
  };

  // remove undefined (não mexe no campo)
  Object.keys(patch).forEach((k) => patch[k] === undefined && delete patch[k]);

  const { data: updated, error } = await supabase
    .from("athletes")
    .update(patch)
    .eq("user_id", user.id)
    .select("athlete_id, user_id, full_name, email, phone, birth_date, sex, gender, team, coach_name, sport_primary, address_city, address_state")
    .single();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true, athlete: updated });
}