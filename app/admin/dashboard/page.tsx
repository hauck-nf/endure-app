import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/src/lib/supabaseServer";

const cardStyle: React.CSSProperties = {
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: 22,
  padding: 22,
  boxShadow: "0 18px 48px rgba(15,23,42,.06)",
};

function getStatusBadgeStyle(status: string): React.CSSProperties {
  if (status === "pending") {
    return {
      background: "#fff7ed",
      border: "1px solid #fed7aa",
      color: "#9a3412",
    };
  }

  if (status === "in_progress") {
    return {
      background: "#eff6ff",
      border: "1px solid #bfdbfe",
      color: "#1d4ed8",
    };
  }

  if (status === "submitted") {
    return {
      background: "#f0fdf4",
      border: "1px solid #bbf7d0",
      color: "#166534",
    };
  }

  return {
    background: "#f8fafc",
    border: "1px solid #e5e7eb",
    color: "#475569",
  };
}

function formatStatus(status: string | null | undefined) {
  if (!status) return "Sem status";
  if (status === "pending") return "Pendente";
  if (status === "in_progress") return "Em andamento";
  if (status === "submitted") return "Submetida";
  return status.replace("_", " ");
}

export default async function AdminDashboardPage() {
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

  const [
    { count: pending },
    { count: inProgress },
    { count: submitted },
    { count: athletes },
    { data: recentRequests },
  ] = await Promise.all([
    supabase
      .from("assessment_requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending"),

    supabase
      .from("assessment_requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "in_progress"),

    supabase
      .from("assessment_requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "submitted"),

    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "athlete"),

    supabase
      .from("assessment_requests")
      .select("request_id, title, status, created_at")
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  const kpis = [
    {
      label: "Pendentes",
      value: pending ?? 0,
      helper: "Solicitações ainda não iniciadas",
    },
    {
      label: "Em andamento",
      value: inProgress ?? 0,
      helper: "Avaliações abertas e não concluídas",
    },
    {
      label: "Submetidas",
      value: submitted ?? 0,
      helper: "Avaliações já enviadas",
    },
    {
      label: "Atletas",
      value: athletes ?? 0,
      helper: "Perfis de atleta cadastrados",
    },
  ];

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <section
        style={{
          ...cardStyle,
          background:
            "linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(248,250,252,1) 100%)",
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
          Painel administrativo
        </div>

        <h1
          style={{
            margin: "14px 0 10px",
            fontSize: 34,
            lineHeight: 1.1,
            letterSpacing: -0.8,
            color: "#0f172a",
          }}
        >
          Dashboard do ENDURE
        </h1>

        <p
          style={{
            margin: 0,
            color: "#64748b",
            lineHeight: 1.75,
            maxWidth: 760,
            fontSize: 15,
          }}
        >
          Acompanhe o volume de avaliações, visualize pendências recentes e
          acesse rapidamente os fluxos principais do sistema em um só lugar.
        </p>
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 16,
        }}
      >
        {kpis.map((item) => (
          <div
            key={item.label}
            style={{
              ...cardStyle,
              padding: 20,
              background:
                "linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(250,250,252,1) 100%)",
            }}
          >
            <div style={{ color: "#64748b", fontSize: 14 }}>{item.label}</div>
            <div
              style={{
                fontSize: 36,
                fontWeight: 900,
                marginTop: 10,
                color: "#0f172a",
                lineHeight: 1,
              }}
            >
              {item.value}
            </div>
            <div
              style={{
                marginTop: 10,
                color: "#64748b",
                fontSize: 13,
                lineHeight: 1.6,
              }}
            >
              {item.helper}
            </div>
          </div>
        ))}
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "1.1fr 0.9fr",
          gap: 16,
          alignItems: "start",
        }}
      >
        <div style={cardStyle}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              alignItems: "center",
              marginBottom: 16,
              flexWrap: "wrap",
            }}
          >
            <div>
              <div
                style={{
                  fontWeight: 900,
                  fontSize: 22,
                  color: "#0f172a",
                }}
              >
                Pendências recentes
              </div>
              <div
                style={{
                  color: "#64748b",
                  fontSize: 14,
                  marginTop: 4,
                }}
              >
                Últimas solicitações criadas no sistema.
              </div>
            </div>

            <Link
              href="/admin/requests"
              style={{
                textDecoration: "none",
                color: "#0f172a",
                fontWeight: 800,
                border: "1px solid #e5e7eb",
                borderRadius: 14,
                padding: "10px 14px",
                background: "#fff",
              }}
            >
              Ver tudo
            </Link>
          </div>

          {!recentRequests || recentRequests.length === 0 ? (
            <div
              style={{
                border: "1px dashed #d1d5db",
                borderRadius: 18,
                padding: 20,
                color: "#64748b",
                background: "#fcfcfd",
              }}
            >
              Nenhuma solicitação encontrada no momento.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              {recentRequests.map((item: any) => (
                <div
                  key={item.request_id}
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 18,
                    padding: 16,
                    display: "grid",
                    gap: 8,
                    background: "#fcfcfd",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      alignItems: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    <strong
                      style={{
                        fontSize: 15,
                        color: "#0f172a",
                        lineHeight: 1.5,
                      }}
                    >
                      {item.title || "Solicitação sem título"}
                    </strong>

                    <span
                      style={{
                        ...getStatusBadgeStyle(item.status),
                        borderRadius: 999,
                        padding: "6px 10px",
                        fontSize: 12,
                        fontWeight: 800,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {formatStatus(item.status)}
                    </span>
                  </div>

                  <div style={{ fontSize: 13, color: "#64748b" }}>
                    Criada em{" "}
                    {item.created_at
                      ? new Date(item.created_at).toLocaleString("pt-BR")
                      : "—"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: "grid", gap: 16 }}>
          <div style={cardStyle}>
            <div
              style={{
                fontWeight: 900,
                fontSize: 22,
                color: "#0f172a",
              }}
            >
              Ações rápidas
            </div>
            <div
              style={{
                color: "#64748b",
                fontSize: 14,
                marginTop: 4,
                lineHeight: 1.7,
              }}
            >
              Acesse os fluxos mais usados no dia a dia administrativo.
            </div>

            <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
              {[
                {
                  href: "/admin/assign/evaluation",
                  label: "Designar avaliação",
                  helper: "Criar nova pendência para atleta",
                },
                {
                  href: "/admin/athletes",
                  label: "Ver atletas",
                  helper: "Consultar perfis cadastrados",
                },
                {
                  href: "/admin/requests",
                  label: "Gerenciar pendências",
                  helper: "Acompanhar e revisar solicitações",
                },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    textDecoration: "none",
                    color: "#0f172a",
                    border: "1px solid #e5e7eb",
                    borderRadius: 16,
                    padding: "14px 16px",
                    background: "#fff",
                    display: "grid",
                    gap: 4,
                  }}
                >
                  <span style={{ fontWeight: 800 }}>{item.label}</span>
                  <span style={{ color: "#64748b", fontSize: 13 }}>
                    {item.helper}
                  </span>
                </Link>
              ))}
            </div>
          </div>

          <div style={cardStyle}>
            <div
              style={{
                fontWeight: 900,
                fontSize: 22,
                color: "#0f172a",
              }}
            >
              Como ler o painel
            </div>

            <ul
              style={{
                color: "#64748b",
                lineHeight: 1.8,
                paddingLeft: 18,
                marginTop: 12,
                marginBottom: 0,
              }}
            >
              <li>Pendentes: solicitações ainda não iniciadas.</li>
              <li>Em andamento: avaliações abertas e não concluídas.</li>
              <li>Submetidas: avaliações já enviadas pelo atleta.</li>
              <li>Atletas: usuários com perfil de atleta cadastrados.</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}