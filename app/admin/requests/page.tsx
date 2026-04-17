import { redirect } from "next/navigation";
import { createClient } from "@/src/lib/supabaseServer";
import CreateRequestForm from "./_components/CreateRequestForm";
import RequestsTable from "./_components/RequestsTable";

export default async function AdminRequestsPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role").eq("user_id", user.id).single();
  if (profile?.role !== "admin") redirect("/login");

  const { data: athletes, error: aErr } = await supabase
    .from("v_admin_athletes")
    .select("athlete_id, athlete_name")
    .limit(500);

  const { data: requests, error: rErr } = await supabase
    .from("v_admin_requests")
    .select("request_id, athlete_id, athlete_name, title, status, instrument_version, due_at, created_at")
    .limit(200);

  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>ENDURE • Admin • Pendências</h1>

      {(aErr || rErr) ? (
        <div style={{ border: "1px solid #400", borderRadius: 12, padding: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Erros</div>
          <div style={{ fontSize: 13, opacity: 0.9 }}>
            {aErr ? `Athletes: ${aErr.message}` : ""}
            {rErr ? ` | Requests: ${rErr.message}` : ""}
          </div>
        </div>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: 12 }}>
        <CreateRequestForm athletes={(athletes ?? []) as any} createdByUserId={user.id} />
        <RequestsTable rows={(requests ?? []) as any} />
      </div>
    </div>
  );
}
