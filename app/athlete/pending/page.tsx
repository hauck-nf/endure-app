import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/src/lib/supabaseServer";

export const dynamic = "force-dynamic";

function fmtDate(s?: string | null) {
  if (!s) return "—";
  try { return new Date(s).toLocaleString("pt-BR"); } catch { return s; }
}

export default async function AthletePendingPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/athlete/pending");

  const { data: ath, error: athErr } = await supabase
    .from("athletes")
    .select("athlete_id, full_name")
    .eq("user_id", user.id)
    .maybeSingle();

  if (athErr || !ath?.athlete_id) {
    return (
      <div style={{ display: "grid", gap: 10 }}>
        <h1 style={{ fontSize: 22, fontWeight: 900 }}>Pendentes</h1>
        <div style={{ border: "1px solid #e5e7eb", borderRadius: 16, background: "#fff", padding: 14 }}>
          Não consegui identificar seu cadastro de atleta.
          <div style={{ marginTop: 8, fontSize: 12, opacity: 0.75 }}>user_id: {user.id}</div>
        </div>
      </div>
    );
  }

  const { data: reqs, error: rErr } = await supabase
    .from("assessment_requests")
    .select("request_id, title, status, due_at, created_at")
    .eq("athlete_id", ath.athlete_id)
    .in("status", ["pending", "in_progress"])
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
        <h1 style={{ fontSize: 22, fontWeight: 900 }}>Pendentes</h1>
        <div style={{ fontSize: 13, opacity: 0.75 }}>{(reqs ?? []).length} avaliação(ões)</div>
      </div>

      {rErr ? (
        <div style={{ border: "1px solid #e5e7eb", borderRadius: 16, background: "#fff", padding: 14 }}>
          Erro ao buscar avaliações: {rErr.message}
        </div>
      ) : null}

      {(reqs ?? []).map((r) => (
        <div key={r.request_id} style={{ border: "1px solid #e5e7eb", borderRadius: 16, background: "#fff", padding: 14 }}>
          <div style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: 16, fontWeight: 850 }}>{r.title ?? "Avaliação"}</div>
            <div style={{ fontSize: 13, opacity: 0.78 }}>
              Status: {r.status} &nbsp;&nbsp; Prazo: {fmtDate(r.due_at)}
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <Link
              href={`/athlete/flow/${r.request_id}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                borderRadius: 14,
                border: "1px solid #e5e7eb",
                background: "#fff",
                padding: "12px 14px",
                fontWeight: 800,
                minHeight: 44,
              }}
            >
              Abrir avaliação <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      ))}

      {(reqs ?? []).length === 0 ? (
        <div style={{ border: "1px solid #e5e7eb", borderRadius: 16, background: "#fff", padding: 14, opacity: 0.85 }}>
          Nenhuma avaliação pendente no momento.
        </div>
      ) : null}
    </div>
  );
}