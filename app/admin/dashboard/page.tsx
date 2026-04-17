import { redirect } from "next/navigation";
import { createClient } from "@/src/lib/supabaseServer";

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  // 1) Verifica se está logado
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // 2) Verifica role (admin)
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/login");

  // 3) KPIs (contagens)
  const [{ count: pending }, { count: inProgress }, { count: submitted }] = await Promise.all([
    supabase.from("assessment_requests").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("assessment_requests").select("*", { count: "exact", head: true }).eq("status", "in_progress"),
    supabase.from("assessment_requests").select("*", { count: "exact", head: true }).eq("status", "submitted"),
  ]);

  return (
    <div style={{ padding: 24 }}>
      <h1>ENDURE • Admin Dashboard</h1>

      <h2>KPIs</h2>
      <ul>
        <li>Pendentes: {pending ?? 0}</li>
        <li>Em andamento: {inProgress ?? 0}</li>
        <li>Submetidas: {submitted ?? 0}</li>
      </ul>
    </div>
  );
}
