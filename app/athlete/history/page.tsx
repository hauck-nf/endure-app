"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser as supabase } from "@/src/lib/supabaseBrowser";
import { getMyAthleteId } from "@/src/lib/athlete";

type Row = {
  assessment_id: string;
  submitted_at: string | null;
  created_at: string;
  instrument_version: string;
  status: string;
};

type ViewRow = Row & {
  date: string;
};

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

function formatDate(value?: string | null) {
  if (!value) return "—";

  try {
    return new Date(value).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    });
  } catch {
    return "—";
  }
}

function statusLabel(status?: string | null) {
  if (status === "submitted") return "Concluída";
  if (!status) return "—";
  return status;
}

export default function AthleteHistoryPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function getAccessToken() {
    const { data, error } = await supabase.auth.getSession();

    if (error) throw error;

    const token = data.session?.access_token;

    if (!token) {
      throw new Error("Sessão do usuário não encontrada.");
    }

    return token;
  }

  async function openReport(assessmentId: string) {
    let reportWindow: Window | null = null;

    try {
      setErr(null);
      setBusyId(assessmentId);

      reportWindow = window.open("about:blank", "_blank");

      const token = await getAccessToken();

      const r1 = await fetch("/api/report", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ assessment_id: assessmentId }),
      });

      const j1: any = await r1.json().catch(() => ({}));

      if (!r1.ok || !j1?.ok) {
        throw new Error(`Erro em /api/report: ${j1?.error ?? "falha desconhecida"}`);
      }

      const r2 = await fetch(
        `/api/report-url?assessment_id=${encodeURIComponent(assessmentId)}`,
        {
          method: "GET",
          headers: {
            authorization: `Bearer ${token}`,
          },
        }
      );

      const j2: any = await r2.json().catch(() => ({}));

      if (!r2.ok || !j2?.ok || !j2?.signedUrl) {
        throw new Error(`Erro em /api/report-url: ${j2?.error ?? "falha desconhecida"}`);
      }

      if (reportWindow) {
        reportWindow.location.replace(j2.signedUrl);
      } else {
        window.open(j2.signedUrl, "_blank");
      }
    } catch (e: any) {
      if (reportWindow && !reportWindow.closed) {
        reportWindow.close();
      }

      setErr(e?.message ?? "Erro ao abrir relatório.");
    } finally {
      setBusyId(null);
    }
  }

  useEffect(() => {
    (async () => {
      try {
        setErr(null);

        const athleteId = await getMyAthleteId();

        const { data, error } = await supabase
          .from("assessments")
          .select("assessment_id, submitted_at, created_at, instrument_version, status")
          .eq("athlete_id", athleteId)
          .eq("status", "submitted")
          .order("submitted_at", { ascending: false });

        if (error) throw error;

        setRows((data as Row[]) ?? []);
      } catch (e: any) {
        setErr(e?.message ?? "Erro ao carregar histórico.");
      }
    })();
  }, []);

  const viewRows: ViewRow[] = useMemo(() => {
    return rows.map((r) => {
      const dt = new Date(r.submitted_at ?? r.created_at);

      return {
        ...r,
        date: dt.toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          year: "2-digit",
        }),
      };
    });
  }, [rows]);

  const lastDate = viewRows[0]?.date ?? "—";

  return (
    <main className="athlete-history-page">
      <style>{`
        .athlete-history-page {
          min-height: 100vh;
          background:
            radial-gradient(circle at top left, rgba(20,184,166,.14), transparent 30%),
            radial-gradient(circle at top right, rgba(249,115,22,.12), transparent 28%),
            #f8fafc;
          color: #0f172a;
          padding: 24px;
          overflow-x: hidden;
        }

        .athlete-history-shell {
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

        .history-list {
          display: grid;
          gap: 12px;
        }

        .history-card {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 16px;
          align-items: center;
          padding: 16px;
          border-radius: 20px;
          border: 1px solid #e5e7eb;
          background: #ffffff;
        }

        .history-title {
          color: #0f172a;
          font-weight: 750;
          font-size: 16.5px;
          line-height: 1.35;
          letter-spacing: -0.1px;
        }

        .history-meta {
          margin-top: 5px;
          color: #64748b;
          font-size: 13px;
          line-height: 1.45;
        }

        .history-actions {
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
          border: 1px solid #a7f3d0;
          background: #ecfdf5;
          color: #065f46;
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
          font-family: inherit;
          cursor: pointer;
        }

        .primary-action:disabled {
          opacity: .72;
          cursor: not-allowed;
        }

        @media (max-width: 760px) {
          .kpi-grid {
            grid-template-columns: 1fr;
          }

          .history-card {
            grid-template-columns: 1fr;
          }

          .history-actions {
            justify-content: flex-start;
          }
        }

        @media (max-width: 560px) {
          .athlete-history-page {
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

      <div className="athlete-history-shell">
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

              <h1 className="hero-title">Histórico de avaliações</h1>

              <p
                style={{
                  margin: "12px 0 0",
                  maxWidth: 780,
                  color: "#cbd5e1",
                  lineHeight: 1.65,
                }}
              >
                Consulte avaliações concluídas e abra o relatório sempre que quiser revisitar seus resultados.
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
              {viewRows.length} {viewRows.length === 1 ? "avaliação" : "avaliações"}
            </div>
          </div>
        </section>

        {err ? (
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
            {err}
          </section>
        ) : null}

        <section className="kpi-grid">
          <KpiCard
            label="Concluídas"
            value={String(viewRows.length)}
            helper="Avaliações submetidas"
          />

          <KpiCard
            label="Última avaliação"
            value={lastDate}
            helper="Mais recente no histórico"
          />

          <KpiCard
            label="Relatórios"
            value={String(viewRows.length)}
            helper="Disponíveis para consulta"
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
              <p style={miniLabelStyle()}>Linha do tempo</p>

              <h2
                style={{
                  margin: "6px 0 0",
                  fontSize: 24,
                  lineHeight: 1.08,
                  letterSpacing: -0.5,
                }}
              >
                Avaliações concluídas
              </h2>

              <p style={{ margin: "8px 0 0", color: "#64748b", lineHeight: 1.6 }}>
                Cada item permite abrir novamente o relatório correspondente.
              </p>
            </div>
          </div>

          {viewRows.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="history-list">
              {viewRows.map((r) => (
                <article key={r.assessment_id} className="history-card">
                  <div style={{ minWidth: 0 }}>
                    <div className="history-title">
                      {r.instrument_version || "Avaliação"}
                    </div>

                    <div className="history-meta">
                      Concluída em {r.date}
                    </div>
                  </div>

                  <div className="history-actions">
                    <span className="status-badge">
                      {statusLabel(r.status)}
                    </span>

                    <button
                      type="button"
                      onClick={() => openReport(r.assessment_id)}
                      disabled={busyId === r.assessment_id}
                      className="primary-action"
                    >
                      {busyId === r.assessment_id ? "Abrindo..." : "Abrir relatório"}
                    </button>
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
        Nenhuma avaliação submetida ainda.
      </div>

      <div style={{ marginTop: 6 }}>
        Quando você concluir avaliações, elas aparecerão aqui para consulta.
      </div>
    </div>
  );
}