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
  request_id: string;
  submitted_at: string | null;
  status: string;
  created_at?: string | null;
};

type ReportRow = {
  assessment_id: string;
  pdf_path: string;
  generated_at: string | null;
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
    border: disabled ? "1px solid #e5e7eb" : "1px solid #d1d5db",
    background: disabled ? "#f8fafc" : "#fff",
    color: disabled ? "#94a3b8" : "#0f172a",
    textDecoration: "none",
    fontSize: 13,
    fontWeight: 600,
    whiteSpace: "nowrap",
    fontFamily: "inherit",
    cursor: disabled ? "not-allowed" : "pointer",
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
    cancelled: {
      label: "Cancelada",
      bg: "#f3f4f6",
      border: "#e5e7eb",
      color: "#374151",
    },
  };

  return (
    map[s] ?? {
      label: status,
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
        minHeight: 30,
        padding: "0 10px",
        borderRadius: 999,
        border: `1px solid ${v.border}`,
        background: v.bg,
        color: v.color,
        fontSize: 12,
        fontWeight: 700,
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

async function openStoredReport(pdfPath: string) {
  const { data, error } = await supabaseBrowser.storage
    .from("reports")
    .createSignedUrl(pdfPath, 60);

  if (error || !data?.signedUrl) {
    throw new Error(error?.message || "Falha ao abrir relatório.");
  }

  window.open(data.signedUrl, "_blank", "noopener,noreferrer");
}

export default function AssignedEvaluationsPageClient() {
  const params = useParams();
  const router = useRouter();

  const athleteId = String((params as any)?.athlete_id ?? "").trim();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [requests, setRequests] = useState<ReqRow[]>([]);
  const [assessments, setAssessments] = useState<AssessmentRow[]>([]);
  const [reports, setReports] = useState<ReportRow[]>([]);


    async function resolveAssessmentId(
  requestId: string | null | undefined,
  fallbackAssessmentId?: string | null,
  instrumentVersion?: string | null
) {
  if (fallbackAssessmentId && isUuid(fallbackAssessmentId)) {
    return fallbackAssessmentId;
  }

  const rid = String(requestId ?? "").trim();

  if (rid && isUuid(rid)) {
    const q = await supabaseBrowser
      .from("assessments")
      .select("assessment_id, request_id, athlete_id, instrument_version, status, submitted_at, created_at")
      .eq("request_id", rid)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (q.error) {
      throw new Error(q.error.message || "Falha ao localizar assessment.");
    }

    const assessmentId = String(q.data?.assessment_id ?? "").trim();
    if (assessmentId && isUuid(assessmentId)) {
      return assessmentId;
    }
  }

  if (!athleteId || !isUuid(athleteId)) {
    throw new Error("athlete_id inválido para localizar o relatório.");
  }

  const iv = String(instrumentVersion ?? "").trim();
  if (iv) {
    const q2 = await supabaseBrowser
      .from("assessments")
      .select("assessment_id, request_id, athlete_id, instrument_version, status, submitted_at, created_at")
      .eq("athlete_id", athleteId)
      .eq("instrument_version", iv)
      .in("status", ["submitted", "completed"])
      .order("submitted_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (q2.error) {
      throw new Error(q2.error.message || "Falha ao localizar assessment por fallback.");
    }

    const byFallback = String(q2.data?.assessment_id ?? "").trim();
    if (byFallback && isUuid(byFallback)) {
      return byFallback;
    }
  }

  throw new Error("Assessment ainda não encontrado para esta avaliação.");
}
  }

  if (!athleteId || !isUuid(athleteId)) {
    throw new Error("athlete_id inválido para localizar o relatório.");
  }

  const iv = String(instrumentVersion ?? "").trim();
  if (iv) {
    const q2 = await supabaseBrowser
      .from("assessments")
      .select("assessment_id, request_id, athlete_id, instrument_version, status, submitted_at, created_at")
      .eq("athlete_id", athleteId)
      .eq("instrument_version", iv)
      .in("status", ["submitted", "completed"])
      .order("submitted_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (q2.error) {
      throw new Error(q2.error.message || "Falha ao localizar assessment por fallback.");
    }

    const byFallback = String(q2.data?.assessment_id ?? "").trim();
    if (byFallback && isUuid(byFallback)) {
      return byFallback;
    }
  }

  throw new Error("Assessment ainda não encontrado para esta avaliação.");
}
async function openOrGenerateReport(assessmentId: string, existingPdfPath?: string | null) {
    if (existingPdfPath) {
      await openStoredReport(existingPdfPath);
      return;
    }

    const { data: sessionData } = await supabaseBrowser.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) throw new Error("Sessão não encontrada.");

    const res = await fetch("/api/report", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ assessment_id: assessmentId }),
    });

    const payload = await res.json().catch(() => ({}));

    if (!res.ok || !payload?.ok) {
      throw new Error(payload?.error || "Falha ao gerar relatório.");
    }

    const pdfPath = String(payload?.pdf_path ?? "").trim();
    if (!pdfPath) throw new Error("pdf_path não retornado pela API.");

    setReports((prev) => {
      const next = [...prev];
      const idx = next.findIndex((x: any) => x.assessment_id === assessmentId);
      const row = {
        assessment_id: assessmentId,
        pdf_path: pdfPath,
        generated_at: new Date().toISOString(),
      } as any;

      if (idx >= 0) next[idx] = row;
      else next.push(row);

      return next;
    });

    await openStoredReport(pdfPath);
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

        const requestIds = reqs.map((x) => x.request_id);
        if (requestIds.length === 0) {
          setAssessments([]);
          setReports([]);
          return;
        }

        const a = await supabaseBrowser
          .from("assessments")
          .select("assessment_id, request_id, submitted_at, status, created_at")
          .in("request_id", requestIds)
          .order("created_at", { ascending: false })
          .limit(1500);

        if (a.error) throw a.error;
        const asRows = (a.data ?? []) as AssessmentRow[];
        setAssessments(asRows);

        const assessmentIds = Array.from(new Set(asRows.map((x) => x.assessment_id)));
        if (assessmentIds.length === 0) {
          setReports([]);
          return;
        }

        const rep = await supabaseBrowser
          .from("assessment_reports_v2")
          .select("assessment_id, pdf_path, generated_at")
          .in("assessment_id", assessmentIds)
          .limit(2000);

        if (rep.error) throw rep.error;
        setReports((rep.data ?? []) as ReportRow[]);
      } catch (e: any) {
        setErr(e?.message ?? "Erro ao carregar avaliações designadas.");
      } finally {
        setLoading(false);
      }
    })();
  }, [athleteId, router]);

  const assessmentByRequest = useMemo(() => {
    const m = new Map<string, AssessmentRow>();
    for (const a of assessments) {
      if (!m.has(a.request_id)) m.set(a.request_id, a);
    }
    return m;
  }, [assessments]);

  const reportByAssessment = useMemo(() => {
    const m = new Map<string, ReportRow>();
    for (const r of reports) m.set(r.assessment_id, r);
    return m;
  }, [reports]);

  if (loading) {
    return (
      <div
        style={{
          maxWidth: 980,
          margin: "0 auto",
          padding: "20px 16px 32px",
          color: "#64748b",
        }}
      >
        Carregando…
      </div>
    );
  }

  if (err) {
    return (
      <div
        style={{
          maxWidth: 980,
          margin: "0 auto",
          padding: "20px 16px 32px",
          display: "grid",
          gap: 16,
        }}
      >
        <a
          href="/admin/athletes"
          style={{
            color: "#475569",
            textDecoration: "none",
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          ← Voltar
        </a>

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
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Erro</div>
          <div style={{ fontSize: 14 }}>{err}</div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: 980,
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
        <a
          href="/admin/athletes"
          style={{
            color: "#475569",
            textDecoration: "none",
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          ← Voltar
        </a>

        <div
          style={{
            marginTop: 14,
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
          Avaliações do atleta
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "baseline",
            flexWrap: "wrap",
            marginTop: 14,
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: 32,
              lineHeight: 1.1,
              letterSpacing: -0.6,
              color: "#0f172a",
              fontWeight: 700,
            }}
          >
            Avaliações designadas
          </h1>

          <div
            style={{
              color: "#64748b",
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            {requests.length} item(ns)
          </div>
        </div>

        <p
          style={{
            margin: "10px 0 0",
            color: "#64748b",
            lineHeight: 1.75,
            fontSize: 15,
            maxWidth: 760,
          }}
        >
          Consulte aqui as pendências atribuídas ao atleta, o status de realização e o
          acesso aos relatórios disponíveis.
        </p>
      </section>

      {requests.length === 0 ? (
        <section style={cardStyle()}>
          <div
            style={{
              color: "#64748b",
              fontSize: 14,
              lineHeight: 1.7,
            }}
          >
            Nenhuma avaliação designada.
          </div>
        </section>
      ) : (
        <section style={{ display: "grid", gap: 12 }}>
          {requests.map((r) => {
          const a = assessmentByRequest.get(r.request_id) ?? null;
          const rep = a ? reportByAssessment.get(a.assessment_id) ?? null : null;

            return (
              <article
                key={r.request_id}
                style={{
                  ...cardStyle(),
                  padding: 18,
                  display: "grid",
                  gap: 14,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    alignItems: "flex-start",
                    flexWrap: "wrap",
                  }}
                >
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 600,
                      color: "#0f172a",
                      lineHeight: 1.45,
                      maxWidth: 620,
                    }}
                  >
                    {r.title ?? "—"}
                  </div>

                  <StatusBadge status={r.status} />
                </div>

                <div
                  style={{
                    display: "grid",
                    gap: 8,
                    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "#64748b",
                        fontWeight: 600,
                        marginBottom: 4,
                      }}
                    >
                      Assignment
                    </div>
                    <div
                      style={{
                        fontSize: 14,
                        color: "#334155",
                        lineHeight: 1.6,
                      }}
                    >
                      {formatDate(r.created_at)}
                    </div>
                  </div>

                  <div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "#64748b",
                        fontWeight: 600,
                        marginBottom: 4,
                      }}
                    >
                      Prazo
                    </div>
                    <div
                      style={{
                        fontSize: 14,
                        color: "#334155",
                        lineHeight: 1.6,
                      }}
                    >
                      {r.due_at ? formatDate(r.due_at) : "—"}
                    </div>
                  </div>

                  <div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "#64748b",
                        fontWeight: 600,
                        marginBottom: 4,
                      }}
                    >
                      Realização
                    </div>
                    <div
                      style={{
                        fontSize: 14,
                        color: "#334155",
                        lineHeight: 1.6,
                      }}
                    >
                      {a?.submitted_at ? formatDate(a.submitted_at) : "—"}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gap: 10,
                  }}
                >
                  <div
                    className="assigned-actions-grid"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                      gap: 8,
                      alignItems: "start",
                    }}
                  >
<button
  type="button"
  disabled={r.status === "pending" || r.status === "in_progress"}
  style={actionCellStyle(r.status === "pending" || r.status === "in_progress")}
  onClick={async () => {
    try {
      const assessmentId = await resolveAssessmentId(r.request_id, a?.assessment_id ?? null, r.instrument_version);

      await openOrGenerateReport(assessmentId, rep?.pdf_path ?? null);
    } catch (e: any) {
      alert(e?.message ?? "Falha ao abrir relatório.");
    }
  }}
>
  Relatório
</button>

                    <CancelButton
                      requestId={r.request_id}
                      disabled={r.status !== "pending"}
                    />

                    <div style={{ gridColumn: "1 / -1" }}>
                      <RequestActions
                        athleteId={athleteId}
                        request={{
                          request_id: r.request_id,
                          title: r.title,
                          instrument_version: r.instrument_version,
                          reference_window: r.reference_window,
                          due_at: r.due_at,
                          selection_json: r.selection_json,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}