import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/src/lib/supabaseServer";

function cardStyle(): React.CSSProperties {
  return {
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: 24,
    padding: 20,
    boxShadow: "0 18px 48px rgba(15,23,42,.06)",
  };
}

function badgeStyle(status: string | null | undefined): React.CSSProperties {
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

function statusLabel(status: string | null | undefined) {
  if (status === "pending") return "Pendente";
  if (status === "in_progress") return "Em andamento";
  if (status === "submitted") return "Submetida";
  return status || "Sem status";
}

function fmtDate(value?: string | null) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("pt-BR");
  } catch {
    return value;
  }
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
    { count: pendingCount },
    { count: inProgressCount },
    { count: submittedCount },
    { count: athleteCount },
    { data: recentRequests, error: recentErr },
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
      value: pendingCount ?? 0,
      helper: "Solicitações ainda não iniciadas",
    },
    {
      label: "Em andamento",
      value: inProgressCount ?? 0,
      helper: "Avaliações abertas e não concluídas",
    },
    {
      label: "Submetidas",
      value: submittedCount ?? 0,
      helper: "Avaliações já enviadas",
    },
    {
      label: "Atletas",
      value: athleteCount ?? 0,
      helper: "Perfis de atleta cadastrados",
    },
  ];

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
            fontWeight: 700,
            letterSpacing: 0.2,
          }}
        >
          Painel administrativo
        </div>

        <h1
          style={{
            margin: "14px 0 10px",
            fontSize: 32,
            lineHeight: 1.1,
            letterSpacing: -0.6,
            color: "#0f172a",
            fontWeight: 700,
          }}
        >
          Dashboard do ENDURE
        </h1>

        <p
          style={{
            margin: 0,
            color: "#64748b",
            lineHeight: 1.75,
            fontSize: 15,
            maxWidth: 760,
          }}
        >
          Acompanhe o volume de avaliações, visualize pendências recentes e acesse
          rapidamente os principais fluxos do sistema.
        </p>
      </section>

      <section
        style={{
          display: "grid",
          gap: 14,
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        }}
      >
        {kpis.map((item) => (
          <div key={item.label} style={cardStyle()}>
            <div
              style={{
                color: "#64748b",
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              {item.label}
            </div>

            <div
              style={{
                fontSize: 34,
                fontWeight: 700,
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
        data-admin-dashboard-grid="true"
        style={{
          display: "grid",
          gap: 16,
          gridTemplateColumns: "minmax(0, 1fr)",
        }}
      >
        <div style={cardStyle()}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              alignItems: "center",
              flexWrap: "wrap",
              marginBottom: 16,
            }}
          >
            <div>
              <h2
                style={{
                  margin: 0,
                  fontWeight: 700,
                  fontSize: 24,
                  color: "#0f172a",
                  lineHeight: 1.15,
                }}
              >
                Pendências recentes
              </h2>

              <div
                style={{
                  color: "#64748b",
                  fontSize: 14,
                  marginTop: 6,
                  lineHeight: 1.7,
                }}
              >
                Últimas solicitações criadas no sistema.
              </div>
            </div>

            <Link
              href="/admin/assign/evaluation"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: 40,
                padding: "0 14px",
                borderRadius: 12,
                border: "1px solid #d1d5db",
                background: "#fff",
                color: "#0f172a",
                textDecoration: "none",
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              Designar avaliação
            </Link>
          </div>

          {recentErr ? (
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
              Erro ao carregar pendências: {recentErr.message}
            </div>
          ) : !recentRequests || recentRequests.length === 0 ? (
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
                    <div
                      style={{
                        fontSize: 15,
                        color: "#0f172a",
                        lineHeight: 1.5,
                        fontWeight: 600,
                      }}
                    >
                      {item.title || "Solicitação sem título"}
                    </div>

                    <span
                      style={{
                        ...badgeStyle(item.status),
                        borderRadius: 999,
                        padding: "6px 10px",
                        fontSize: 12,
                        fontWeight: 700,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {statusLabel(item.status)}
                    </span>
                  </div>

                  <div
                    style={{
                      fontSize: 13,
                      color: "#64748b",
                      lineHeight: 1.6,
                    }}
                  >
                    Criada em {fmtDate(item.created_at)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: "grid", gap: 16 }}>
          <div style={cardStyle()}>
            <h2
              style={{
                margin: 0,
                fontWeight: 700,
                fontSize: 24,
                color: "#0f172a",
                lineHeight: 1.15,
              }}
            >
              Ações rápidas
            </h2>

            <div
              style={{
                color: "#64748b",
                fontSize: 14,
                marginTop: 6,
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
                  <span style={{ fontWeight: 600, lineHeight: 1.4 }}>
                    {item.label}
                  </span>
                  <span
                    style={{
                      color: "#64748b",
                      fontSize: 13,
                      lineHeight: 1.6,
                    }}
                  >
                    {item.helper}
                  </span>
                </Link>
              ))}
            </div>
          </div>

          <div style={cardStyle()}>
            <h2
              style={{
                margin: 0,
                fontWeight: 700,
                fontSize: 24,
                color: "#0f172a",
                lineHeight: 1.15,
              }}
            >
              Como ler o painel
            </h2>

            <div
              style={{
                display: "grid",
                gap: 10,
                marginTop: 14,
                color: "#64748b",
                fontSize: 14,
                lineHeight: 1.75,
              }}
            >
              <div>
                <span style={{ color: "#0f172a", fontWeight: 600 }}>
                  Pendentes:
                </span>{" "}
                solicitações ainda não iniciadas.
              </div>
              <div>
                <span style={{ color: "#0f172a", fontWeight: 600 }}>
                  Em andamento:
                </span>{" "}
                avaliações abertas e não concluídas.
              </div>
              <div>
                <span style={{ color: "#0f172a", fontWeight: 600 }}>
                  Submetidas:
                </span>{" "}
                avaliações já enviadas pelo atleta.
              </div>
              <div>
                <span style={{ color: "#0f172a", fontWeight: 600 }}>
                  Atletas:
                </span>{" "}
                usuários com perfil de atleta cadastrados.
              </div>
            </div>
          </div>
        </div>
      </section>

      <style>{`
        @media (min-width: 960px) {
          section[data-admin-dashboard-grid="true"] {
            grid-template-columns: minmax(0, 1.15fr) minmax(320px, 0.85fr);
            align-items: start;
          }
        }
      `}</style>
    </div>
  );
}