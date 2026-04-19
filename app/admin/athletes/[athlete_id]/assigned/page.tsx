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
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(x);
}

function StatusBadge({ status }: { status: string }) {
  const s = (status || "").toLowerCase();
  const map: Record<string, { label: string; bg: string; border: string; color: string }> = {
    pending: { label: "Pendente", bg: "#fff7ed", border: "#fed7aa", color: "#9a3412" },
    in_progress: { label: "Em andamento", bg: "#eff6ff", border: "#bfdbfe", color: "#1d4ed8" },
    submitted: { label: "Concluída", bg: "#ecfdf5", border: "#a7f3d0", color: "#065f46" },
    cancelled: { label: "Cancelada", bg: "#f3f4f6", border: "#e5e7eb", color: "#374151" },
  };
  const v = map[s] ?? { label: status, bg: "#f3f4f6", border: "#e5e7eb", color: "#374151" };

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        height: 30,
        padding: "0 10px",
        borderRadius: 10,
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

const tableCell: React.CSSProperties = {
  padding: "12px 12px",
  borderBottom: "1px solid #f3f4f6",
  fontSize: 13,
  color: "#111827",
  verticalAlign: "top",
};

const headCell: React.CSSProperties = {
  textAlign: "left",
  fontSize: 12,
  padding: "12px 12px",
  borderBottom: "1px solid #e5e7eb",
  color: "#6b7280",
  fontWeight: 600,
};

export default function AssignedEvaluationsPageClient() {
  const params = useParams();
  const router = useRouter();

  const athleteId = String((params as any)?.athlete_id ?? "").trim();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [requests, setRequests] = useState<ReqRow[]>([]);
  const [assessments, setAssessments] = useState<AssessmentRow[]>([]);
  const [reports, setReports] = useState<ReportRow[]>([]);

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
          .select("request_id, title, status, instrument_version, reference_window, due_at, created_at, selection_json")
          .eq("athlete_id", athleteId)
          .order("created_at", { ascending: false })
          .limit(300);

        if (r.error) throw r.error;
        const reqs = (r.data ?? []) as any as ReqRow[];
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
        const asRows = (a.data ?? []) as any as AssessmentRow[];
        setAssessments(asRows);

        const assessmentIds = Array.from(new Set(asRows.map((x) => x.assessment_id)));
        if (assessmentIds.length === 0) {
          setReports([]);
          return;
        }

        const rep = await supabaseBrowser
          .from("assessment_reports")
          .select("assessment_id, pdf_path, generated_at")
          .in("assessment_id", assessmentIds)
          .limit(2000);

        if (rep.error) throw rep.error;
        setReports((rep.data ?? []) as any as ReportRow[]);
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

  if (loading) return <div style={{ padding: 16, color: "#6b7280" }}>Carregando…</div>;

  if (err) {
    return (
      <div style={{ padding: 16 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>Erro</h1>
        <div style={{ color: "#6b7280", marginTop: 6 }}>{err}</div>
        <div style={{ marginTop: 12 }}>
          <a href="/admin/athletes">← Voltar</a>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Avaliações designadas</h1>
        <div style={{ fontSize: 12, color: "#6b7280" }}>{requests.length} item(ns)</div>
      </div>

      <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden", background: "#fff" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ ...headCell, width: 280 }}>Título</th>
              <th style={headCell}>Assignment</th>
              <th style={headCell}>Prazo</th>
              <th style={headCell}>Status</th>
              <th style={headCell}>Realização</th>
              <th style={headCell}>Relatório</th>
              <th style={{ ...headCell, width: 220 }}>Ações</th>
              <th style={{ ...headCell, width: 120 }}></th>
            </tr>
          </thead>

          <tbody>
            {requests.map((r) => {
              const a = assessmentByRequest.get(r.request_id) ?? null;
              const rep = a ? reportByAssessment.get(a.assessment_id) ?? null : null;
              const reportHref = a && rep ? `/admin/reports/${a.assessment_id}` : null;

              return (
                <tr key={r.request_id}>
                  <td style={{ ...tableCell, fontWeight: 600 }}>{r.title ?? "—"}</td>
                  <td style={tableCell}>{r.created_at}</td>
                  <td style={tableCell}>{r.due_at ?? "—"}</td>
                  <td style={tableCell}><StatusBadge status={r.status} /></td>
                  <td style={tableCell}>{a?.submitted_at ?? "—"}</td>

                  <td style={tableCell}>
                    {reportHref ? (
                      <a
                        href={reportHref}
                        target="_blank"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          height: 34,
                          padding: "0 10px",
                          borderRadius: 10,
                          border: "1px solid #e5e7eb",
                          background: "#fff",
                          textDecoration: "none",
                          color: "#111827",
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        Abrir PDF
                      </a>
                    ) : (
                      <span style={{ color: "#6b7280" }}>—</span>
                    )}
                  </td>

                  <td style={tableCell}>
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
                  </td>

                  <td style={tableCell}>
                    <div style={{ marginTop: 1 }}>
                      <CancelButton requestId={r.request_id} disabled={r.status !== "pending"} />
                    </div>
                  </td>
                </tr>
              );
            })}

            {requests.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: 12, color: "#6b7280" }}>
                  Nenhuma avaliação designada.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 8 }}>
        <a href="/admin/athletes" style={{ color: "#111827" }}>← Voltar</a>
      </div>
    </div>
  );
}
