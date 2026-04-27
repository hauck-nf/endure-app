import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/src/lib/supabaseServer";

export const dynamic = "force-dynamic";

type RequestRow = {
  request_id: string;
  title: string | null;
  status: string | null;
  due_at: string | null;
  created_at: string | null;
};

function fmtDate(s?: string | null) {
  if (!s) return "Sem prazo definido";

  try {
    return new Date(s).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return s;
  }
}

function statusLabel(status?: string | null) {
  if (status === "pending") return "Pendente";
  if (status === "in_progress") return "Em andamento";
  if (!status) return "Sem status";

  return status;
}

function statusTone(status?: string | null) {
  if (status === "pending") {
    return {
      background: "#fffbeb",
      border: "1px solid #fde68a",
      color: "#92400e",
    };
  }

  if (status === "in_progress") {
    return {
      background: "#eff6ff",
      border: "1px solid #bfdbfe",
      color: "#1d4ed8",
    };
  }

  return {
    background: "#f8fafc",
    border: "1px solid #e5e7eb",
    color: "#475569",
  };
}

function cardStyle(extra?: React.CSSProperties): React.CSSProperties {
  return {
    background: "rgba(255,255,255,.94)",
    border: "1px solid rgba(226,232,240,.92)",
    borderRadius: 28,
    padding: 22,
    boxShadow: "0 22px 60px rgba(15,23,42,.08)",
    backdropFilter: "blur(10px)",
    minWidth: 0,
    boxSizing: "border-box",
    ...extra,
  };
}

function miniLabelStyle(): React.CSSProperties {
  return {
    margin: 0,
    color: "#64748b",
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  };
}

export default async function AthletePendingPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/athlete/pending");

  const { data: ath, error: athErr } = await supabase
    .from("athletes")
    .select("athlete_id, full_name")
    .eq("user_id", user.id)
    .maybeSingle();

  if (athErr || !ath?.athlete_id) {
    return (
      <main className="athlete-pending-page">
        <PageStyles />

        <div className="athlete-pending-shell">
          <section
            className="hero-card"
            style={cardStyle({
              padding: 28,
              background:
                "linear-gradient(135deg, rgba(15,23,42,.97), rgba(30,41,59,.95))",
              color: "#ffffff",
              overflow: "hidden",
              position: "relative",
            })}
          >
            <HeroDecor />

            <div style={{ position: "relative", zIndex: 1 }}>
              <p
                style={{
                  margin: 0,
                  color: "#99f6e4",
                  fontSize: 12,
                  fontWeight: 900,
                  letterSpacing: 0.6,
                  textTransform: "uppercase",
                }}
              >
                Área do atleta
              </p>

              <h1 className="hero-title">Avaliações pendentes</h1>

              <p
                style={{
                  margin: "12px 0 0",
                  maxWidth: 780,
                  color: "#cbd5e1",
                  lineHeight: 1.65,
                }}
              >
                Não consegui identificar seu cadastro de atleta.
              </p>
            </div>
          </section>

          <section style={{ ...cardStyle(), marginTop: 16 }}>
            <p style={miniLabelStyle()}>Cadastro não localizado</p>

            <h2 style={{ margin: "6px 0 0", fontSize: 24 }}>
              Verifique o vínculo da sua conta
            </h2>

            <p style={{ margin: "8px 0 0", color: "#64748b", lineHeight: 1.65 }}>
              Sua conta precisa estar vinculada corretamente ao seu perfil de atleta para que as avaliações apareçam aqui.
            </p>

            <div
              style={{
                marginTop: 16,
                padding: 14,
                borderRadius: 16,
                border: "1px solid #e5e7eb",
                background: "#f8fafc",
                color: "#475569",
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              user_id: {user.id}
            </div>
          </section>
        </div>
      </main>
    );
  }

  const { data: reqs, error: rErr } = await supabase
    .from("assessment_requests")
    .select("request_id, title, status, due_at, created_at")
    .eq("athlete_id", ath.athlete_id)
    .in("status", ["pending", "in_progress"])
    .order("created_at", { ascending: false })
    .limit(200);

  const requests = (reqs ?? []) as RequestRow[];
  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const inProgressCount = requests.filter((r) => r.status === "in_progress").length;

  return (
    <main className="athlete-pending-page">
      <PageStyles />

      <div className="athlete-pending-shell">
        <section
          className="hero-card"
          style={cardStyle({
            padding: 28,
            background:
              "linear-gradient(135deg, rgba(15,23,42,.97), rgba(30,41,59,.95))",
            color: "#ffffff",
            overflow: "hidden",
            position: "relative",
          })}
        >
          <HeroDecor />

          <div
            style={{
              position: "relative",
              zIndex: 1,
              display: "flex",
              justifyContent: "space-between",
              gap: 18,
              alignItems: "flex-start",
              flexWrap: "wrap",
            }}
          >
            <div>
              <p
                style={{
                  margin: 0,
                  color: "#99f6e4",
                  fontSize: 12,
                  fontWeight: 900,
                  letterSpacing: 0.6,
                  textTransform: "uppercase",
                }}
              >
                Área do atleta
              </p>

              <h1 className="hero-title">Avaliações pendentes</h1>

              <p
                style={{
                  margin: "12px 0 0",
                  maxWidth: 780,
                  color: "#cbd5e1",
                  lineHeight: 1.65,
                }}
              >
                Aqui você encontra as avaliações que ainda precisam ser respondidas ou que foram iniciadas e ainda não concluídas.
              </p>
            </div>

            <div
              style={{
                minHeight: 44,
                padding: "0 14px",
                borderRadius: 14,
                border: "1px solid rgba(153,246,228,.30)",
                background: "rgba(15,23,42,.32)",
                color: "#ffffff",
                display: "inline-flex",
                alignItems: "center",
                fontWeight: 900,
              }}
            >
              {requests.length} {requests.length === 1 ? "avaliação" : "avaliações"}
            </div>
          </div>
        </section>

        {rErr ? (
          <section
            style={{
              marginTop: 16,
              padding: 14,
              borderRadius: 18,
              border: "1px solid #fecaca",
              background: "#fef2f2",
              color: "#991b1b",
              fontWeight: 800,
            }}
          >
            Erro ao buscar avaliações: {rErr.message}
          </section>
        ) : null}

        <section className="kpi-grid">
          <KpiCard
            label="Pendentes"
            value={String(pendingCount)}
            helper="Aguardando início"
          />

          <KpiCard
            label="Em andamento"
            value={String(inProgressCount)}
            helper="Já iniciadas"
          />

          <KpiCard
            label="Total"
            value={String(requests.length)}
            helper="Solicitações abertas"
          />
        </section>

        <section style={{ ...cardStyle(), marginTop: 16 }} className="content-card">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 14,
              alignItems: "flex-start",
              flexWrap: "wrap",
              marginBottom: 16,
            }}
          >
            <div>
              <p style={miniLabelStyle()}>Fila de avaliações</p>

              <h2
                style={{
                  margin: "6px 0 0",
                  fontSize: 24,
                  lineHeight: 1.08,
                  letterSpacing: -0.5,
                }}
              >
                Suas solicitações
              </h2>

              <p style={{ margin: "8px 0 0", color: "#64748b", lineHeight: 1.6 }}>
                Abra uma avaliação para responder ou continuar de onde parou.
              </p>
            </div>
          </div>

          {requests.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="request-list">
              {requests.map((r) => (
                <article key={r.request_id} className="request-card">
                  <div style={{ minWidth: 0 }}>
                    <div className="request-title">
                      {r.title ?? "Avaliação"}
                    </div>

                    <div className="request-meta">
                      Criada em {fmtDate(r.created_at)} · Prazo: {fmtDate(r.due_at)}
                    </div>
                  </div>

                  <div className="request-actions">
                    <span
                      className="status-badge"
                      style={statusTone(r.status)}
                    >
                      {statusLabel(r.status)}
                    </span>

                    <Link
                      href={`/athlete/flow/${r.request_id}`}
                      className="primary-action"
                    >
                      Abrir avaliação
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function HeroDecor() {
  return (
    <>
      <div
        style={{
          position: "absolute",
          right: -80,
          top: -80,
          width: 260,
          height: 260,
          borderRadius: 999,
          background: "rgba(20,184,166,.22)",
        }}
      />

      <div
        style={{
          position: "absolute",
          right: 120,
          bottom: -110,
          width: 260,
          height: 260,
          borderRadius: 999,
          background: "rgba(249,115,22,.18)",
        }}
      />
    </>
  );
}

function KpiCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <section style={cardStyle({ padding: 18 })} className="kpi-card">
      <p style={miniLabelStyle()}>{label}</p>

      <div
        style={{
          marginTop: 8,
          fontSize: 34,
          fontWeight: 950,
          letterSpacing: -0.9,
          color: "#0f172a",
        }}
      >
        {value}
      </div>

      <p
        style={{
          margin: "6px 0 0",
          color: "#64748b",
          fontSize: 13,
          lineHeight: 1.2,
        }}
      >
        {helper}
      </p>
    </section>
  );
}

function EmptyState() {
  return (
    <div
      style={{
        padding: 22,
        borderRadius: 20,
        border: "1px dashed #cbd5e1",
        background: "#f8fafc",
        color: "#64748b",
        lineHeight: 1.65,
      }}
    >
      <div style={{ color: "#0f172a", fontWeight: 950, fontSize: 18 }}>
        Nenhuma avaliação pendente no momento.
      </div>

      <div style={{ marginTop: 6 }}>
        Quando uma nova solicitação for designada, ela aparecerá aqui.
      </div>
    </div>
  );
}

function PageStyles() {
  return (
    <style>{`
      .athlete-pending-page {
        min-height: 100vh;
        background:
          radial-gradient(circle at top left, rgba(20,184,166,.14), transparent 30%),
          radial-gradient(circle at top right, rgba(249,115,22,.12), transparent 28%),
          #f8fafc;
        color: #0f172a;
        padding: 24px;
        overflow-x: hidden;
      }

      .athlete-pending-shell {
        width: min(100%, 1180px);
        margin: 0 auto;
        box-sizing: border-box;
      }

      .hero-title {
        margin: 8px 0 0;
        font-size: clamp(32px, 5vw, 44px);
        line-height: 1.03;
        letter-spacing: -1px;
        color: #ffffff;
      }

      .kpi-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 16px;
        margin-top: 16px;
      }

      .request-list {
        display: grid;
        gap: 12px;
      }

      .request-card {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 16px;
        align-items: center;
        padding: 16px;
        border-radius: 20px;
        border: 1px solid #e5e7eb;
        background: #ffffff;
      }

      .request-title {
        color: #0f172a;
        font-weight: 750;
        font-size: 16.5px;
        line-height: 1.35;
        letter-spacing: -0.1px;
      }

      .request-meta {
        margin-top: 5px;
        color: #64748b;
        font-size: 13px;
        line-height: 1.45;
      }

      .request-actions {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
        justify-content: flex-end;
      }

      .status-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 30px;
        padding: 0 10px;
        border-radius: 999px;
        font-size: 12px;
        font-weight: 900;
        white-space: nowrap;
      }

      .primary-action {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 40px;
        padding: 0 14px;
        border-radius: 13px;
        border: 1px solid #111827;
        background: #111827;
        color: #ffffff;
        text-decoration: none;
        font-size: 13px;
        font-weight: 900;
        white-space: nowrap;
      }

      @media (max-width: 760px) {
        .kpi-grid {
          grid-template-columns: 1fr;
        }

        .request-card {
          grid-template-columns: 1fr;
        }

        .request-actions {
          justify-content: flex-start;
        }
      }

      @media (max-width: 560px) {
        .athlete-pending-page {
          padding: 12px;
        }

        .hero-card {
          padding: 22px 18px !important;
          border-radius: 26px !important;
        }

        .content-card {
          padding: 18px !important;
          border-radius: 24px !important;
        }

        .kpi-card {
          padding: 14px !important;
          border-radius: 22px !important;
        }
      }
    `}</style>
  );
}