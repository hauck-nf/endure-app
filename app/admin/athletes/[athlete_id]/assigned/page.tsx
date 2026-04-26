"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabaseBrowser } from "@/src/lib/supabaseBrowser";
import CancelButton from "./CancelButton";
import RequestActions from "./RequestActions";

type ReqRow = {
  request_id: string;
  title: string | null;
  status: string;
  instrument_version: string | null;
  reference_window: string | null;
  due_at: string | null;
  created_at: string;
  selection_json: any;
};

type AssessmentRow = {
  assessment_id: string;
  request_id: string | null;
  submitted_at: string | null;
  status: string;
  created_at: string | null;
};

function isUuid(x: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    x
  );
}

function cardStyle(): React.CSSProperties {
  return {
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: 24,
    padding: 20,
    boxShadow: "0 18px 48px rgba(15,23,42,.06)",
  };
}

function actionCellStyle(disabled = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    minHeight: 38,
    padding: "0 12px",
    borderRadius: 12,
    border: disabled ? "1px solid #e5e7eb" : "1px solid #111827",
    background: disabled ? "#f8fafc" : "#111827",
    color: disabled ? "#94a3b8" : "#ffffff",
    textDecoration: "none",
    fontSize: 13,
    fontWeight: 700,
    whiteSpace: "nowrap",
    fontFamily: "inherit",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.75 : 1,
  };
}

function statusMeta(status: string) {
  const s = (status || "").toLowerCase();

  const map: Record<
    string,
    { label: string; bg: string; border: string; color: string }
  > = {
    pending: {
      label: "Pendente",
      bg: "#fff7ed",
      border: "#fed7aa",
      color: "#9a3412",
    },
    in_progress: {
      label: "Em andamento",
      bg: "#eff6ff",
      border: "#bfdbfe",
      color: "#1d4ed8",
    },
    submitted: {
      label: "Concluída",
      bg: "#ecfdf5",
      border: "#a7f3d0",
      color: "#065f46",
    },
    completed: {
      label: "Concluída",
      bg: "#ecfdf5",
      border: "#a7f3d0",
      color: "#065f46",
    },
    cancelled: {
      label: "Cancelada",
      bg: "#f3f4f6",
      border: "#e5e7eb",
      color: "#374151",
    },
  };

  return (
    map[s] ?? {
      label: status || "—",
      bg: "#f3f4f6",
      border: "#e5e7eb",
      color: "#374151",
    }
  );
}

function StatusBadge({ status }: { status: string }) {
  const v = statusMeta(status);

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: 28,
        padding: "0 10px",
        borderRadius: 999,
        background: v.bg,
        border: `1px solid ${v.border}`,
        color: v.color,
        fontSize: 12,
        fontWeight: 800,
        whiteSpace: "nowrap",
      }}
    >
      {v.label}
    </span>
  );
}

function formatDate(value?: string | null) {
  if (!value) return "—";

  try {
    return new Date(value).toLocaleString("pt-BR");
  } catch {
    return value;
  }
}

function chooseAssessmentForRequest(
  rows: AssessmentRow[],
  requestId: string
): AssessmentRow | null {
  const linked = rows.filter((x) => x.request_id === requestId);

  if (linked.length === 0) return null;

  const submitted = linked
    .filter((x) => String(x.status).toLowerCase() === "submitted")
    .sort((a, b) => {
      const da = new Date(a.submitted_at ?? a.created_at ?? 0).getTime();
      const db = new Date(b.submitted_at ?? b.created_at ?? 0).getTime();

      return db - da;
    });

  if (submitted.length > 0) return submitted[0];

  const any = [...linked].sort((a, b) => {
    const da = new Date(a.created_at ?? 0).getTime();
    const db = new Date(b.created_at ?? 0).getTime();

    return db - da;
  });

  return any[0] ?? null;
}

export default function AssignedEvaluationsPageClient() {
  const params = useParams();
  const router = useRouter();

  const athleteId = String((params as any)?.athlete_id ?? "").trim();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [requests, setRequests] = useState<ReqRow[]>([]);
  const [assessments, setAssessments] = useState<AssessmentRow[]>([]);
  const [busyRequestId, setBusyRequestId] = useState<string | null>(null);

  async function getAccessToken() {
    const { data, error } = await supabaseBrowser.auth.getSession();

    if (error) throw error;

    const token = data.session?.access_token;

    if (!token) {
      throw new Error("Sessão do usuário não encontrada.");
    }

    return token;
  }

  async function resolveAssessmentIdByRequest(requestId: string) {
    if (!requestId || !isUuid(requestId)) {
      throw new Error("request_id inválido.");
    }

    const token = await getAccessToken();

    const res = await fetch(
      `/api/assessment-by-request?request_id=${encodeURIComponent(requestId)}`,
      {
        method: "GET",
        headers: {
          authorization: `Bearer ${token}`,
        },
      }
    );

    const payload: any = await res.json().catch(() => ({}));

    if (!res.ok || !payload?.ok || !payload?.assessment_id) {
      throw new Error(
        payload?.error ??
          "Não foi possível localizar uma avaliação submetida para esta solicitação."
      );
    }

    const assessmentId = String(payload.assessment_id ?? "").trim();

    if (!assessmentId || !isUuid(assessmentId)) {
      throw new Error("A API retornou um assessment_id inválido.");
    }

    return assessmentId;
  }

  async function openReportLikeAthlete(assessmentId: string) {
    let reportWindow: Window | null = null;

    try {
      setErr(null);

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
        window.open(j2.signedUrl, "_blank", "noopener,noreferrer");
      }
    } catch (e: any) {
      if (reportWindow && !reportWindow.closed) {
        reportWindow.close();
      }

      throw e;
    }
  }

  async function handleOpenReport(requestId: string) {
    try {
      setErr(null);
      setBusyRequestId(requestId);

      const assessmentId = await resolveAssessmentIdByRequest(requestId);

      await openReportLikeAthlete(assessmentId);
    } catch (e: any) {
      const msg = e?.message ?? "Erro ao abrir relatório.";

      setErr(msg);
      alert(msg);
    } finally {
      setBusyRequestId(null);
    }
  }

  useEffect(() => {
    (async () => {
      try {
        setErr(null);
        setLoading(true);

        if (!athleteId || athleteId === "undefined" || !isUuid(athleteId)) {
          setErr(`athlete_id inválido: ${athleteId || "(vazio)"}`);
          return;
        }

        const { data: auth } = await supabaseBrowser.auth.getUser();

        if (!auth.user) {
          router.push("/login");
          return;
        }

        const { data: profile, error: pErr } = await supabaseBrowser
          .from("profiles")
          .select("role")
          .eq("user_id", auth.user.id)
          .single();

        if (pErr || profile?.role !== "admin") {
          router.push("/login");
          return;
        }

        const r = await supabaseBrowser
          .from("assessment_requests")
          .select(
            "request_id, title, status, instrument_version, reference_window, due_at, created_at, selection_json"
          )
          .eq("athlete_id", athleteId)
          .order("created_at", { ascending: false })
          .limit(300);

        if (r.error) throw r.error;

        const reqs = (r.data ?? []) as ReqRow[];

        setRequests(reqs);

        const requestIds = reqs.map((x) => x.request_id).filter(Boolean);

        if (requestIds.length === 0) {
          setAssessments([]);
          return;
        }

        const a = await supabaseBrowser
          .from("assessments")
          .select("assessment_id, request_id, submitted_at, status, created_at")
          .in("request_id", requestIds)
          .order("created_at", { ascending: false })
          .limit(1500);

        if (a.error) {
          // Não bloquear a página se a RLS impedir essa leitura.
          // O botão Relatório resolve o assessment_id pelo servidor.
          setAssessments([]);
        } else {
          setAssessments((a.data ?? []) as AssessmentRow[]);
        }
      } catch (e: any) {
        setErr(e?.message ?? "Erro ao carregar avaliações designadas.");
      } finally {
        setLoading(false);
      }
    })();
  }, [athleteId, router]);

  const rows = useMemo(() => {
    return requests.map((request) => ({
      request,
      assessment: chooseAssessmentForRequest(assessments, request.request_id),
    }));
  }, [requests, assessments]);

  if (loading) {
    return (
      <main style={{ padding: 24 }}>
        <p>Carregando…</p>
      </main>
    );
  }

  if (err && requests.length === 0) {
    return (
      <main style={{ padding: 24 }}>
        <a href="/admin/athletes" style={{ color: "#0f172a", fontWeight: 800 }}>
          ← Voltar
        </a>

        <section style={{ ...cardStyle(), marginTop: 16 }}>
          <h1 style={{ margin: 0, fontSize: 22 }}>Erro</h1>
          <p style={{ color: "#b91c1c" }}>{err}</p>
        </section>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f8fafc",
        padding: 24,
        color: "#0f172a",
      }}
    >
      <div style={{ maxWidth: 1280, margin: "0 auto" }}>
        <a
          href={`/admin/athletes/${athleteId}/profile`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            minHeight: 38,
            padding: "0 14px",
            borderRadius: 12,
            border: "1px solid #d1d5db",
            background: "#ffffff",
            color: "#111827",
            textDecoration: "none",
            fontSize: 13,
            fontWeight: 800,
          }}
        >
          ← Voltar
        </a>

        <section style={{ ...cardStyle(), marginTop: 16, marginBottom: 16 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <div>
              <p
                style={{
                  margin: 0,
                  color: "#64748b",
                  fontSize: 13,
                  fontWeight: 800,
                  letterSpacing: 0.3,
                  textTransform: "uppercase",
                }}
              >
                Avaliações do atleta
              </p>

              <h1 style={{ margin: "6px 0 0", fontSize: 28 }}>
                Avaliações designadas
              </h1>

              <p style={{ margin: "10px 0 0", color: "#475569", maxWidth: 820 }}>
                Consulte pendências atribuídas ao atleta, status de realização,
                links de acesso e relatórios disponíveis.
              </p>
            </div>

            <div
              style={{
                background: "#f8fafc",
                border: "1px solid #e5e7eb",
                borderRadius: 16,
                padding: "10px 14px",
                fontWeight: 800,
              }}
            >
              {requests.length} item(ns)
            </div>
          </div>
        </section>

        {err ? (
          <section
            style={{
              marginBottom: 16,
              padding: 14,
              borderRadius: 16,
              border: "1px solid #fecaca",
              background: "#fef2f2",
              color: "#991b1b",
              fontWeight: 700,
            }}
          >
            {err}
          </section>
        ) : null}

        {rows.length === 0 ? (
          <section style={cardStyle()}>
            <p style={{ margin: 0, color: "#475569" }}>
              Nenhuma avaliação designada.
            </p>
          </section>
        ) : (
          <section style={cardStyle()}>
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 14,
                }}
              >
                <thead>
                  <tr style={{ textAlign: "left", color: "#475569" }}>
                    <th style={{ padding: "0 12px 12px 0" }}>Avaliação</th>
                    <th style={{ padding: "0 12px 12px" }}>Status</th>
                    <th style={{ padding: "0 12px 12px" }}>Designada em</th>
                    <th style={{ padding: "0 12px 12px" }}>Prazo</th>
                    <th style={{ padding: "0 12px 12px" }}>Realização</th>
                    <th style={{ padding: "0 12px 12px" }}>Relatório</th>
                    <th style={{ padding: "0 12px 12px" }}>Ações</th>
                    <th style={{ padding: "0 0 12px 12px" }}>Cancelar</th>
                  </tr>
                </thead>

                <tbody>
                  {rows.map(({ request, assessment }) => {
                    const requestStatus = String(request.status ?? "").toLowerCase();
                    const assessmentStatus = String(assessment?.status ?? "").toLowerCase();

                    const canOpenReport =
                      requestStatus === "submitted" ||
                      requestStatus === "completed" ||
                      assessmentStatus === "submitted";

                    const isOpening = busyRequestId === request.request_id;

                    const canCancel =
                      requestStatus === "pending" || requestStatus === "in_progress";

                    return (
                      <tr
                        key={request.request_id}
                        style={{
                          borderTop: "1px solid #e5e7eb",
                          verticalAlign: "top",
                        }}
                      >
                        <td style={{ padding: "14px 12px 14px 0", minWidth: 240 }}>
                          <div style={{ fontWeight: 800 }}>
                            {request.title ?? "—"}
                          </div>

                          <div
                            style={{
                              marginTop: 4,
                              color: "#64748b",
                              fontSize: 12,
                            }}
                          >
                            {request.instrument_version ?? "—"}
                          </div>
                        </td>

                        <td style={{ padding: "14px 12px" }}>
                          <StatusBadge status={request.status} />
                        </td>

                        <td style={{ padding: "14px 12px", color: "#475569" }}>
                          {formatDate(request.created_at)}
                        </td>

                        <td style={{ padding: "14px 12px", color: "#475569" }}>
                          {formatDate(request.due_at)}
                        </td>

                        <td style={{ padding: "14px 12px", color: "#475569" }}>
                          {formatDate(assessment?.submitted_at)}
                        </td>

                        <td style={{ padding: "14px 12px", minWidth: 130 }}>
                          <button
                            type="button"
                            disabled={!canOpenReport || isOpening}
                            style={actionCellStyle(!canOpenReport || isOpening)}
                            onClick={() => handleOpenReport(request.request_id)}
                          >
                            {isOpening
                              ? "Abrindo..."
                              : canOpenReport
                                ? "Relatório"
                                : "Indisponível"}
                          </button>
                        </td>

                        <td style={{ padding: "14px 12px", minWidth: 150 }}>
                          <RequestActions athleteId={athleteId} request={request} />
                        </td>

                        <td style={{ padding: "14px 0 14px 12px", minWidth: 120 }}>
                          <CancelButton
                            requestId={request.request_id}
                            disabled={!canCancel}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}