import { redirect } from "next/navigation";
import { createClient } from "@/src/lib/supabaseServer";

export async function requireAthlete() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/athlete/pending");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (error) redirect("/login?next=/athlete/pending");

  const role = profile?.role ?? "unknown";

  // ✅ permite admin entrar no /athlete (admin view)
  if (role !== "athlete" && role !== "admin") redirect("/login");

  return { supabase, user, role };
}
