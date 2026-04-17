import { redirect } from "next/navigation";
import { createClient } from "@/src/lib/supabaseServer";

export async function requireAdmin() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Se você já está usando active_role/roles, pode trocar aqui depois.
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (error) redirect("/login");
  if (profile?.role !== "admin") redirect("/login");

  return { supabase, user };
}
