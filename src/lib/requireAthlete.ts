import { redirect } from "next/navigation";
import { createClient } from "@/src/lib/supabaseServer";

export async function requireAthlete() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/athlete");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (error) redirect("/login?next=/athlete");
  if (profile?.role !== "athlete") redirect("/login");

  return { supabase, user, role: profile.role };
}
