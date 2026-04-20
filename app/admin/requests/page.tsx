import { redirect } from "next/navigation";
import { createClient } from "@/src/lib/supabaseServer";
import CreateRequestForm from "./_components/CreateRequestForm";
import RequestsTable from "./_components/RequestsTable";

function panelStyle(): React.CSSProperties {
  return {
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: 24,
    padding: 22,
    boxShadow: "0 18px 48px rgba(15,23,42,.06)",
  };
}

export default async function AdminRequestsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/login");

  const { data: athletes, error: aErr } = await supabase
    .from("v_admin_athletes")
    .select("athlete_id, athlete_name")
    .limit(500);

  const { data: requests, error: rErr } = await supabase
    .from("v_admin_requests")
    .select(
      "request_id, athlete_id, athlete_name, title, status, instrument_version, due_at, created_at"
    )
    .limit(200);

  return (
    <div
      style={{
        maxWidth: 1180,
        margin: "0 auto",
        padding: "20px 16px 32px",
        display: "grid",
        gap: 16,
      }}
    >
      <section
        style={{
          background:
            "linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(248,250,252,1) 100%)",
          border: "1px solid #e5e7eb",
          borderRadius: 24,
          padding: 22,
          boxShadow: "0 18px 48px rgba(15,23,42,.06)",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            border: "1px solid #dbeafe",
            background: "#eff6ff",
            color: "#1d4ed8",
            borderRadius: 999,
            padding: "8px 12px",
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: 0.3,
          }}
        >
          Administração de pendências
        </div>

        <h1
          style={{
            margin: "14px 0 10px",
            fontSize: 32,
            lineHeight: 1.1,
            letterSpacing: -0.7,
            color: "#0f172a",
          }}
        >
          Solicitações de avaliação
        </h1>

        <p
          style={{
            margin: 0,
            color: "#64748b",
            lineHeight: 1.75,
            fontSize: 15,
            maxWidth: 780,
          }}
        >
          Crie novas pendências para atletas e acompanhe as solicitações já
          abertas em um único ambiente.
        </p>
      </section>

      {aErr || rErr ? (
        <div
          style={{
            border: "1px solid #fecaca",
            background: "#fff1f2",
            color: "#9f1239",
            borderRadius: 18,
            padding: 16,
            lineHeight: 1.7,
          }}
        >
          <div style={{ fontWeight: 800, marginBottom: 6 }}>
            Erro ao carregar dados
          </div>
          <div style={{ fontSize: 14 }}>
            {aErr ? `Atletas: ${aErr.message}` : ""}
            {aErr && rErr ? " | " : ""}
            {rErr ? `Pendências: ${rErr.message}` : ""}
          </div>
        </div>
      ) : null}

      <section
        style={{
          display: "grid",
          gap: 16,
          gridTemplateColumns: "minmax(0, 1fr)",
        }}
      >
        <div style={panelStyle()}>
          <div
            style={{
              fontWeight: 900,
              fontSize: 22,
              color: "#0f172a",
              marginBottom: 6,
            }}
          >
            Criar nova pendência
          </div>

          <div
            style={{
              color: "#64748b",
              fontSize: 14,
              lineHeight: 1.7,
              marginBottom: 16,
            }}
          >
            Selecione o atleta e configure a solicitação para iniciar um novo
            fluxo de avaliação.
          </div>

          <CreateRequestForm
            athletes={(athletes ?? []) as any}
            createdByUserId={user.id}
          />
        </div>

        <div style={panelStyle()}>
          <div
            style={{
              fontWeight: 900,
              fontSize: 22,
              color: "#0f172a",
              marginBottom: 6,
            }}
          >
            Pendências existentes
          </div>

          <div
            style={{
              color: "#64748b",
              fontSize: 14,
              lineHeight: 1.7,
              marginBottom: 16,
            }}
          >
            Visualize as solicitações recentes e acompanhe o andamento de cada
            uma delas.
          </div>

          <RequestsTable rows={(requests ?? []) as any} />
        </div>
      </section>

      <style>{`
        @media (min-width: 1024px) {
          section[data-admin-requests-grid="true"] {
            grid-template-columns: minmax(320px, 0.95fr) minmax(0, 1.35fr);
          }
        }
      `}</style>
    </div>
  );
}