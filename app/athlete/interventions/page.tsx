"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Intervention = {
  assignment_id: string;
  title_snapshot: string;
  status: string;
  due_at: string | null;
  assigned_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  content_snapshot: any;
  linked_assessment_snapshot: any;
};

function getTokenFromLocalStorage() {
  if (typeof window === "undefined") return "";

  try {
    const raw = localStorage.getItem("endure-auth");
    const parsed = raw ? JSON.parse(raw) : null;

    return (
      parsed?.access_token ??
      parsed?.session?.access_token ??
      parsed?.currentSession?.access_token ??
      parsed?.state?.session?.access_token ??
      parsed?.state?.access_token ??
      ""
    );
  } catch {
    return "";
  }
}

function authHeaders(): Record<string, string> {
  const token = getTokenFromLocalStorage();
  return token ? { authorization: `Bearer ${token}` } : {};
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

function formatDate(value?: string | null) {
  if (!value) return "Sem prazo definido";

  try {
    return new Date(value).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    });
  } catch {
    return value;
  }
}

function statusLabel(status?: string | null) {
  if (status === "pending") return "Pendente";
  if (status === "in_progress") return "Em andamento";
  if (status === "completed") return "Concluída";
  return status || "Sem status";
}

function statusTone(status?: string | null): React.CSSProperties {
  if (status === "completed") {
    return {
      background: "#ecfdf5",
      border: "1px solid #a7f3d0",
      color: "#065f46",
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
    background: "#fffbeb",
    border: "1px solid #fde68a",
    color: "#92400e",
  };
}

export default function AthleteInterventionsPage() {
  const [rows, setRows] = useState<Intervention[]>([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      setErr("");
      setLoading(true);

      const res = await fetch("/api/my-interventions", {
        headers: authHeaders(),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error ?? "Falha ao carregar intervenções.");
      }

      setRows((data.interventions ?? []) as Intervention[]);
    } catch (e: any) {
      setErr(e?.message ?? "Erro ao carregar intervenções.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const pending = useMemo(
    () => rows.filter((r) => r.status === "pending" || r.status === "in_progress"),
    [rows]
  );

  const completed = useMemo(
    () => rows.filter((r) => r.status === "completed"),
    [rows]
  );

  return (
    <main className="athlete-interventions-page">
      <style>{`
        .athlete-interventions-page {
          min-height: 100vh;
          background:
            radial-gradient(circle at top left, rgba(20,184,166,.14), transparent 30%),
            radial-gradient(circle at top right, rgba(249,115,22,.12), transparent 28%),
            #f8fafc;
          color: #0f172a;
          padding: 24px;
          overflow-x: hidden;
        }

        .shell {
          width: min(100%, 1180px);
          margin: 0 auto;
          display: grid;
          gap: 16px;
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
        }

        .intervention-list {
          display: grid;
          gap: 12px;
        }

        .intervention-card {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 16px;
          align-items: center;
          padding: 16px;
          border-radius: 20px;
          border: 1px solid #e5e7eb;
          background: #ffffff;
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

        .small-muted {
          color: #64748b;
          font-size: 13px;
          line-height: 1.45;
        }

        @media (max-width: 760px) {
          .kpi-grid {
            grid-template-columns: 1fr;
          }

          .intervention-card {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 560px) {
          .athlete-interventions-page {
            padding: 12px;
          }

          .hero-card,
          .content-card {
            padding: 18px !important;
            border-radius: 24px !important;
          }
        }
      `}</style>

      <div className="shell">
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

            <h1 className="hero-title">Intervenções</h1>

            <p
              style={{
                margin: "12px 0 0",
                maxWidth: 780,
                color: "#cbd5e1",
                lineHeight: 1.65,
              }}
            >
              Acesse tarefas, exercícios e conteúdos práticos enviados pela equipe para apoiar seu desenvolvimento socioemocional.
            </p>
          </div>
        </section>

        {err ? (
          <section
            style={{
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
          <KpiCard label="Pendentes" value={String(pending.length)} helper="Aguardando ação" />
          <KpiCard label="Concluídas" value={String(completed.length)} helper="Tarefas finalizadas" />
          <KpiCard label="Total" value={String(rows.length)} helper="Intervenções recebidas" />
        </section>

        <section style={cardStyle()} className="content-card">
          <p style={miniLabelStyle()}>Tarefas abertas</p>

          <h2 style={{ margin: "6px 0 0", fontSize: 24, letterSpacing: -0.5 }}>
            Intervenções pendentes
          </h2>

          <div className="intervention-list" style={{ marginTop: 16 }}>
            {loading ? (
              <EmptyState text="Carregando intervenções..." />
            ) : pending.length === 0 ? (
              <EmptyState text="Nenhuma intervenção pendente no momento." />
            ) : (
              pending.map((r) => <InterventionRow key={r.assignment_id} row={r} />)
            )}
          </div>
        </section>

        <section style={cardStyle()} className="content-card">
          <p style={miniLabelStyle()}>Histórico</p>

          <h2 style={{ margin: "6px 0 0", fontSize: 24, letterSpacing: -0.5 }}>
            Intervenções concluídas
          </h2>

          <div className="intervention-list" style={{ marginTop: 16 }}>
            {completed.length === 0 ? (
              <EmptyState text="Nenhuma intervenção concluída ainda." />
            ) : (
              completed.map((r) => <InterventionRow key={r.assignment_id} row={r} />)
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function InterventionRow({ row }: { row: Intervention }) {
  const blocks = Array.isArray(row.content_snapshot?.blocks)
    ? row.content_snapshot.blocks.length
    : 0;

  return (
    <article className="intervention-card">
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            color: "#0f172a",
            fontWeight: 800,
            fontSize: 16.5,
            lineHeight: 1.35,
          }}
        >
          {row.title_snapshot}
        </div>

        <div className="small-muted" style={{ marginTop: 5 }}>
          {blocks} bloco(s) · Prazo: {formatDate(row.due_at)}
        </div>
      </div>

      <div style={{ display: "inline-flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <span className="status-badge" style={statusTone(row.status)}>
          {statusLabel(row.status)}
        </span>

        <Link href={`/athlete/interventions/${row.assignment_id}`} className="primary-action">
          {row.status === "completed" ? "Rever" : "Abrir"}
        </Link>
      </div>
    </article>
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
    <section style={cardStyle({ padding: 18 })}>
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

      <p style={{ margin: "6px 0 0", color: "#64748b", fontSize: 13 }}>
        {helper}
      </p>
    </section>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div
      style={{
        padding: 18,
        borderRadius: 18,
        border: "1px dashed #cbd5e1",
        background: "#f8fafc",
        color: "#64748b",
        lineHeight: 1.6,
      }}
    >
      {text}
    </div>
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