"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/src/lib/supabaseBrowser";

type AthleteRow = {
  athlete_id: string;
  full_name: string | null;
  email: string | null;
  sport_primary: string | null;
  team: string | null;
  created_at: string | null;
};

type RequestRow = {
  request_id: string;
  athlete_id: string;
  title: string | null;
  status: string | null;
  created_at: string | null;
  due_at: string | null;
  athletes?: {
    full_name: string | null;
    email: string | null;
  } | null;
};

type AssessmentRow = {
  assessment_id: string;
  athlete_id: string;
  status: string | null;
  submitted_at: string | null;
  created_at: string | null;
  instrument_version: string | null;
  athletes?: {
    full_name: string | null;
    email: string | null;
  } | null;
};

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
  const s = String(status ?? "").toLowerCase();

  const map: Record<string, string> = {
    pending: "Pendente",
    in_progress: "Em andamento",
    submitted: "Concluída",
    completed: "Concluída",
    cancelled: "Cancelada",
  };

  return map[s] ?? status ?? "—";
}

function statusTone(status?: string | null): "green" | "amber" | "blue" | "red" | "neutral" {
  const s = String(status ?? "").toLowerCase();

  if (s === "submitted" || s === "completed") return "green";
  if (s === "pending") return "amber";
  if (s === "in_progress") return "blue";
  if (s === "cancelled") return "red";

  return "neutral";
}

function pageStyle(): React.CSSProperties {
  return {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at top left, rgba(20,184,166,.14), transparent 30%), radial-gradient(circle at top right, rgba(249,115,22,.12), transparent 28%), #f8fafc",
    color: "#0f172a",
    padding: 24,
    overflowX: "hidden",
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

export default function AdminDashboardPage() {
  const router = useRouter();

  const [athletes, setAthletes] = useState<AthleteRow[]>([]);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [assessments, setAssessments] = useState<AssessmentRow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        setWarnings([]);

        const { data: auth } = await supabaseBrowser.auth.getUser();

        if (!auth.user) {
          router.push("/login");
          return;
        }

        const { data: profile, error: profileErr } = await supabaseBrowser
          .from("profiles")
          .select("role")
          .eq("user_id", auth.user.id)
          .single();

        if (profileErr || profile?.role !== "admin") {
          router.push("/login");
          return;
        }

        const localWarnings: string[] = [];

        const athletesRes = await supabaseBrowser
          .from("athletes")
          .select("athlete_id, full_name, email, sport_primary, team, created_at")
          .order("created_at", { ascending: false })
          .limit(500);

        if (athletesRes.error) {
          localWarnings.push(`Atletas: ${athletesRes.error.message}`);
        } else {
          setAthletes((athletesRes.data ?? []) as AthleteRow[]);
        }

        const requestsRes = await supabaseBrowser
          .from("assessment_requests")
          .select("request_id, athlete_id, title, status, created_at, due_at, athletes(full_name, email)")
          .order("created_at", { ascending: false })
          .limit(500);

        if (requestsRes.error) {
          localWarnings.push(`Solicitações: ${requestsRes.error.message}`);
        } else {
          setRequests((requestsRes.data ?? []) as any);
        }

        const assessmentsRes = await supabaseBrowser
          .from("assessments")
          .select("assessment_id, athlete_id, status, submitted_at, created_at, instrument_version, athletes(full_name, email)")
          .order("created_at", { ascending: false })
          .limit(500);

        if (assessmentsRes.error) {
          localWarnings.push(`Avaliações: ${assessmentsRes.error.message}`);
        } else {
          setAssessments((assessmentsRes.data ?? []) as any);
        }

        setWarnings(localWarnings);
      } catch (e: any) {
        setErr(e?.message ?? "Erro ao carregar dashboard administrativo.");
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const kpis = useMemo(() => {
    const pending = requests.filter((r) => r.status === "pending").length;
    const inProgress = requests.filter((r) => r.status === "in_progress").length;
    const submittedReqs = requests.filter((r) =>
      ["submitted", "completed"].includes(String(r.status))
    ).length;

    const submittedAssessments = assessments.filter((a) =>
      ["submitted", "completed"].includes(String(a.status))
    ).length;

    return {
      athletes: athletes.length,
      pending,
      inProgress,
      submitted: Math.max(submittedReqs, submittedAssessments),
      cancelled: requests.filter((r) => r.status === "cancelled").length,
    };
  }, [athletes, requests, assessments]);

  const recentRequests = useMemo(() => {
    return requests.slice(0, 8);
  }, [requests]);

  const recentSubmitted = useMemo(() => {
    return assessments
      .filter((a) => ["submitted", "completed"].includes(String(a.status)))
      .sort((a, b) => {
        const da = new Date(a.submitted_at ?? a.created_at ?? 0).getTime();
        const db = new Date(b.submitted_at ?? b.created_at ?? 0).getTime();
        return db - da;
      })
      .slice(0, 8);
  }, [assessments]);

  const totalFlow = kpis.pending + kpis.inProgress + kpis.submitted + kpis.cancelled;

  return (
    <main className="admin-page" style={pageStyle()}>
      <style>{`
        .admin-shell {
          width: min(100%, 1180px);
          margin: 0 auto;
          box-sizing: border-box;
        }

        .hero-title {
          margin: 8px 0 0;
          font-size: clamp(32px, 5vw, 44px);
          line-height: 1.03;
          letter-spacing: -1px;
          color: #fff;
        }

        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 16px;
          margin-top: 16px;
        }

        .main-grid {
          display: grid;
          grid-template-columns: minmax(0, .92fr) minmax(0, 1.08fr);
          gap: 16px;
          margin-top: 16px;
          align-items: start;
        }

        .table-wrap {
          overflow-x: auto;
        }

        .admin-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
        }

        .admin-table th {
          padding: 0 12px 12px 0;
          text-align: left;
          color: #64748b;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: .35px;
        }

        .admin-table td {
          padding: 13px 12px 13px 0;
          border-top: 1px solid #e5e7eb;
          vertical-align: top;
        }

        .dashboard-action-details {
          position: relative;
          width: 100%;
          min-width: 132px;
        }

        .dashboard-action-details summary {
          list-style: none;
        }

        .dashboard-action-details summary::-webkit-details-marker {
          display: none;
        }

        .dashboard-action-trigger {
          display: inline-flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          width: 100%;
          min-height: 36px;
          padding: 0 12px;
          border-radius: 12px;
          border: 1px solid #111827;
          background: #111827;
          color: #ffffff;
          font-size: 13px;
          font-weight: 900;
          cursor: pointer;
          box-sizing: border-box;
          white-space: nowrap;
        }

        .dashboard-action-trigger::after {
          content: "⌄";
          font-size: 13px;
          color: #ffffff;
          opacity: .9;
        }

        .dashboard-action-menu {
          display: grid;
          grid-template-columns: 1fr;
          gap: 8px;
          margin-top: 8px;
          padding: 10px;
          border-radius: 16px;
          border: 1px solid #e5e7eb;
          background: #ffffff;
          box-shadow: 0 18px 42px rgba(15,23,42,.10);
          min-width: 168px;
          position: absolute;
          right: 0;
          z-index: 20;
        }

        .dashboard-action-link {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 34px;
          padding: 0 10px;
          border-radius: 11px;
          border: 1px solid #d1d5db;
          background: #ffffff;
          color: #0f172a;
          font-size: 13px;
          font-weight: 850;
          text-decoration: none;
          white-space: nowrap;
        }

        .dashboard-action-link.primary {
          border-color: #111827;
          background: #111827;
          color: #ffffff;
        }

        .dashboard-action-link:hover {
          border-color: #94a3b8;
        }

        .shortcut-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        @media (max-width: 900px) {
          .kpi-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .main-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 560px) {
          .admin-page {
            padding: 12px !important;
          }

          .hero-card {
            padding: 22px 18px !important;
            border-radius: 26px !important;
          }

          .kpi-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px;
          }

          .kpi-card {
            padding: 14px !important;
            border-radius: 22px !important;
            min-height: 120px;
          }

          .kpi-value {
            font-size: 28px !important;
          }

          .content-card {
            padding: 18px !important;
            border-radius: 24px !important;
          }

          .shortcut-grid {
            grid-template-columns: 1fr;
          }

          .dashboard-action-menu {
            position: static;
            right: auto;
          }
        }
      `}</style>

      <div className="admin-shell">
        <section
          className="hero-card"
          style={cardStyle({
            padding: 28,
            background:
              "linear-gradient(135deg, rgba(15,23,42,.97), rgba(30,41,59,.95))",
            color: "#fff",
            overflow: "hidden",
            position: "relative",
          })}
        >
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
              Administração ENDURE
            </p>

            <h1 className="hero-title">Painel de controle</h1>

            <p style={{ margin: "12px 0 0", maxWidth: 780, color: "#cbd5e1", lineHeight: 1.65 }}>
              Acompanhe atletas, avaliações designadas, andamento das respostas e relatórios gerados em um único painel operacional.
            </p>
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

        {warnings.length > 0 ? (
          <section
            style={{
              marginTop: 16,
              padding: 14,
              borderRadius: 18,
              border: "1px solid #fde68a",
              background: "#fffbeb",
              color: "#92400e",
              fontWeight: 700,
              lineHeight: 1.55,
            }}
          >
            Algumas informações não puderam ser carregadas: {warnings.join(" | ")}
          </section>
        ) : null}

        <section className="kpi-grid">
          <KpiCard label="Atletas" value={loading ? "..." : String(kpis.athletes)} helper="Cadastrados na plataforma" />
          <KpiCard label="Pendentes" value={loading ? "..." : String(kpis.pending)} helper="Aguardando resposta" />
          <KpiCard label="Em andamento" value={loading ? "..." : String(kpis.inProgress)} helper="Iniciadas pelo atleta" />
          <KpiCard label="Concluídas" value={loading ? "..." : String(kpis.submitted)} helper="Submetidas ou finalizadas" />
        </section>

        <section className="main-grid">
          <section className="content-card" style={cardStyle()}>
            <SectionTitle
              eyebrow="Operação"
              title="Funil de avaliações"
              subtitle="Distribuição das solicitações por status."
            />

            <div style={{ display: "grid", gap: 14, marginTop: 20 }}>
              <FunnelBar label="Pendentes" value={kpis.pending} total={totalFlow} tone="amber" />
              <FunnelBar label="Em andamento" value={kpis.inProgress} total={totalFlow} tone="blue" />
              <FunnelBar label="Concluídas" value={kpis.submitted} total={totalFlow} tone="green" />
              <FunnelBar label="Canceladas" value={kpis.cancelled} total={totalFlow} tone="red" />
            </div>

            <div style={{ marginTop: 22 }}>
              <SectionTitle
                eyebrow="Atalhos"
                title="Ações rápidas"
              />

              <div className="shortcut-grid" style={{ marginTop: 14 }}>
                <Shortcut href="/admin/athletes" label="Ver atletas" helper="Cadastro e perfis" />
                <Shortcut href="/admin/assign/evaluation" label="Designar avaliação" helper="Criar novas pendências" />
                <Shortcut href="/admin/assign/evaluation" label="Avaliação avulsa" helper="Fluxos administrativos" />
                <Shortcut href="/admin" label="Área admin" helper="Voltar ao início" />
              </div>
            </div>
          </section>

          <section style={{ display: "grid", gap: 16 }}>
            <section className="content-card" style={cardStyle()}>
              <SectionTitle
                eyebrow="Solicitações"
                title="Pendências recentes"
                subtitle="Últimas avaliações designadas aos atletas."
              />

              <div className="table-wrap" style={{ marginTop: 16 }}>
                {recentRequests.length === 0 ? (
                  <EmptyBox text="Nenhuma solicitação encontrada." />
                ) : (
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Atleta</th>
                        <th>Status</th>
                        <th>Data</th>
                        <th>Ações</th>
                      </tr>
                    </thead>

                    <tbody>
                      {recentRequests.map((r) => (
                        <tr key={r.request_id}>
                          <td>
                            <div style={{ fontWeight: 900 }}>
                              {r.athletes?.full_name ?? "Atleta"}
                            </div>
                            <div style={{ color: "#64748b", fontSize: 12, marginTop: 3 }}>
                              {r.title ?? "Avaliação"}
                            </div>
                          </td>

                          <td>
                            <StatusBadge label={statusLabel(r.status)} tone={statusTone(r.status)} />
                          </td>

                          <td style={{ color: "#475569" }}>
                            {formatDate(r.created_at)}
                          </td>

                          <td>
                            <ActionMenu
                              items={[
                                {
                                  href: `/admin/athletes/${r.athlete_id}/assigned`,
                                  label: "Avaliações",
                                  primary: true,
                                },
                                {
                                  href: `/admin/athletes/${r.athlete_id}/profile`,
                                  label: "Perfil",
                                },
                                {
                                  href: `/admin/athletes/${r.athlete_id}/dashboard`,
                                  label: "Dashboard",
                                },
                                {
                                  href: "/admin/assign/evaluation",
                                  label: "Designar",
                                },
                              ]}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </section>

            <section className="content-card" style={cardStyle()}>
              <SectionTitle
                eyebrow="Relatórios"
                title="Últimas avaliações concluídas"
                subtitle="Avaliações submetidas mais recentemente."
              />

              <div className="table-wrap" style={{ marginTop: 16 }}>
                {recentSubmitted.length === 0 ? (
                  <EmptyBox text="Nenhuma avaliação concluída encontrada." />
                ) : (
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Atleta</th>
                        <th>Versão</th>
                        <th>Data</th>
                        <th>Ações</th>
                      </tr>
                    </thead>

                    <tbody>
                      {recentSubmitted.map((a) => (
                        <tr key={a.assessment_id}>
                          <td>
                            <div style={{ fontWeight: 900 }}>
                              {a.athletes?.full_name ?? "Atleta"}
                            </div>
                            <div style={{ color: "#64748b", fontSize: 12, marginTop: 3 }}>
                              {a.athletes?.email ?? "—"}
                            </div>
                          </td>

                          <td style={{ color: "#475569" }}>
                            {a.instrument_version ?? "—"}
                          </td>

                          <td style={{ color: "#475569" }}>
                            {formatDate(a.submitted_at ?? a.created_at)}
                          </td>

                          <td>
                            <ActionMenu
                              items={[
                                {
                                  href: `/admin/reports/${a.assessment_id}`,
                                  label: "Relatório",
                                  primary: true,
                                },
                                {
                                  href: `/admin/athletes/${a.athlete_id}/assigned`,
                                  label: "Avaliações",
                                },
                                {
                                  href: `/admin/athletes/${a.athlete_id}/dashboard`,
                                  label: "Dashboard",
                                },
                                {
                                  href: `/admin/athletes/${a.athlete_id}/profile`,
                                  label: "Perfil",
                                },
                              ]}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </section>
          </section>
        </section>
      </div>
    </main>
  );
}

function SectionTitle({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div>
      {eyebrow ? <p style={miniLabelStyle()}>{eyebrow}</p> : null}

      <h2
        style={{
          margin: eyebrow ? "6px 0 0" : 0,
          fontSize: 24,
          lineHeight: 1.08,
          letterSpacing: -0.5,
        }}
      >
        {title}
      </h2>

      {subtitle ? (
        <p style={{ margin: "8px 0 0", color: "#64748b", lineHeight: 1.55 }}>
          {subtitle}
        </p>
      ) : null}
    </div>
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
    <section className="kpi-card" style={cardStyle({ padding: 18 })}>
      <p style={miniLabelStyle()}>{label}</p>

      <div
        className="kpi-value"
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

      <p style={{ margin: "6px 0 0", color: "#64748b", fontSize: 13, lineHeight: 1.2 }}>
        {helper}
      </p>
    </section>
  );
}

function FunnelBar({
  label,
  value,
  total,
  tone,
}: {
  label: string;
  value: number;
  total: number;
  tone: "green" | "amber" | "blue" | "red";
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;

  const color = {
    green: "#10b981",
    amber: "#f59e0b",
    blue: "#3b82f6",
    red: "#ef4444",
  }[tone];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <strong>{label}</strong>
        <span style={{ color: "#64748b", fontWeight: 900 }}>
          {value} · {pct}%
        </span>
      </div>

      <div
        style={{
          height: 14,
          borderRadius: 999,
          background: "#e5e7eb",
          overflow: "hidden",
          marginTop: 8,
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            borderRadius: 999,
            background: `linear-gradient(90deg, ${color}, #0f172a)`,
          }}
        />
      </div>
    </div>
  );
}

function StatusBadge({
  label,
  tone,
}: {
  label: string;
  tone: "green" | "amber" | "blue" | "red" | "neutral";
}) {
  const palette = {
    green: { bg: "#ecfdf5", border: "#a7f3d0", color: "#065f46" },
    amber: { bg: "#fffbeb", border: "#fde68a", color: "#92400e" },
    blue: { bg: "#eff6ff", border: "#bfdbfe", color: "#1d4ed8" },
    red: { bg: "#fef2f2", border: "#fecaca", color: "#991b1b" },
    neutral: { bg: "#f8fafc", border: "#e5e7eb", color: "#475569" },
  }[tone];

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: 28,
        padding: "0 10px",
        borderRadius: 999,
        background: palette.bg,
        border: `1px solid ${palette.border}`,
        color: palette.color,
        fontSize: 12,
        fontWeight: 900,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

function ActionMenu({
  items,
}: {
  items: { href: string; label: string; primary?: boolean }[];
}) {
  return (
    <details className="dashboard-action-details">
      <summary className="dashboard-action-trigger">
        Ações
      </summary>

      <div className="dashboard-action-menu">
        {items.map((item) => (
          <Link
            key={`${item.href}-${item.label}`}
            href={item.href}
            className={
              item.primary
                ? "dashboard-action-link primary"
                : "dashboard-action-link"
            }
          >
            {item.label}
          </Link>
        ))}
      </div>
    </details>
  );
}
function LinkButton({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: 36,
        padding: "0 12px",
        borderRadius: 12,
        border: "1px solid #111827",
        background: "#111827",
        color: "#ffffff",
        fontSize: 13,
        fontWeight: 900,
        textDecoration: "none",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </Link>
  );
}

function Shortcut({
  href,
  label,
  helper,
}: {
  href: string;
  label: string;
  helper: string;
}) {
  return (
    <Link
      href={href}
      style={{
        display: "block",
        padding: 14,
        borderRadius: 18,
        border: "1px solid #e5e7eb",
        background: "#f8fafc",
        color: "#0f172a",
        textDecoration: "none",
      }}
    >
      <div style={{ fontWeight: 950 }}>{label}</div>
      <div style={{ marginTop: 4, color: "#64748b", fontSize: 13 }}>
        {helper}
      </div>
    </Link>
  );
}

function EmptyBox({ text }: { text: string }) {
  return (
    <div
      style={{
        padding: 18,
        borderRadius: 18,
        border: "1px dashed #cbd5e1",
        background: "#f8fafc",
        color: "#64748b",
        fontWeight: 700,
      }}
    >
      {text}
    </div>
  );
}