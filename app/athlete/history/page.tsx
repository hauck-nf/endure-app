"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../src/lib/supabaseClient";
import { getMyAthleteId } from "../../../src/lib/athlete";

type Row = {
  assessment_id: string;
  submitted_at: string | null;
  created_at: string;
  instrument_version: string;
  status: string;
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export default function AthleteHistoryPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

async function openReport(assessment_id: string) {
  try {
    setErr(null);
    setBusyId(assessment_id);

    // 1) gera/atualiza
    const r1 = await fetch("/api/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assessment_id }),
    });

    const j1 = await r1.json().catch(() => ({} as any));
    if (!r1.ok) throw new Error(j1.error ?? "Falha ao gerar relatório.");

    // 2) signed url
    const r2 = await fetch(`/api/report-url?assessment_id=${encodeURIComponent(assessment_id)}`);
    const j2 = await r2.json().catch(() => ({} as any));
    if (!r2.ok) throw new Error(j2.error ?? "Falha ao obter URL do relatório.");

    window.open(j2.url, "_blank", "noopener,noreferrer");
  } catch (e: any) {
    setErr(e.message ?? "Erro ao abrir relatório.");
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
        setErr(e.message ?? "Erro ao carregar histórico.");
      }
    })();
  }, []);

  const viewRows = useMemo(() => {
    return rows.map((r) => {
      const dt = new Date(r.submitted_at ?? r.created_at);
      const date = dt.toLocaleDateString();
      const time = `${pad2(dt.getHours())}:${pad2(dt.getMinutes())}`;
      return { ...r, date, time };
    });
  }, [rows]);

  return (
    <div style={{ maxWidth: 980 }}>
      <h2>Já realizadas</h2>
      <p style={{ color: "#6b7280" }}>
        Avaliações concluídas e disponíveis para consulta.
      </p>

      {err && (
        <div style={{ padding: 12, border: "1px solid #ef4444", borderRadius: 12, color: "#b91c1c" }}>
          {err}
        </div>
      )}

      <div style={{ marginTop: 12, border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: 12, background: "#fafafa", borderBottom: "1px solid #e5e7eb" }}>
          <span style={{ color: "#6b7280" }}>Total:</span> <b>{viewRows.length}</b>
        </div>

        {viewRows.length === 0 ? (
          <div style={{ padding: 14, color: "#6b7280" }}>Nenhuma avaliação submetida ainda.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: 12, borderBottom: "1px solid #e5e7eb" }}>Avaliação</th>
                <th style={{ textAlign: "left", padding: 12, borderBottom: "1px solid #e5e7eb" }}>Data</th>
                <th style={{ textAlign: "left", padding: 12, borderBottom: "1px solid #e5e7eb" }}>Hora</th>
                <th style={{ textAlign: "left", padding: 12, borderBottom: "1px solid #e5e7eb" }}>Detalhes</th>
                <th style={{ textAlign: "left", padding: 12, borderBottom: "1px solid #e5e7eb" }}>Relatório</th>
              </tr>
            </thead>
            <tbody>
              {viewRows.map((r) => (
                <tr key={r.assessment_id}>
                  <td style={{ padding: 12, borderBottom: "1px solid #f3f4f6" }}>
                    {r.instrument_version}
                  </td>
                  <td style={{ padding: 12, borderBottom: "1px solid #f3f4f6" }}>
                    {r.date}
                  </td>
                  <td style={{ padding: 12, borderBottom: "1px solid #f3f4f6" }}>
                    {r.time}
                  </td>
                  <td style={{ padding: 12, borderBottom: "1px solid #f3f4f6" }}>
                    <a href={`/athlete/history/${r.assessment_id}`}>Ver</a>
                  </td>
                  <td style={{ padding: 12, borderBottom: "1px solid #f3f4f6" }}>
<button
  onClick={() => openReport(r.assessment_id)}
  disabled={busyId === r.assessment_id}
  style={{
    border: "1px solid #e5e7eb",
    background: "transparent",
    borderRadius: 10,
    padding: "6px 10px",
    cursor: busyId === r.assessment_id ? "not-allowed" : "pointer",
    color: "#111827",
  }}
>
  {busyId === r.assessment_id ? "Gerando..." : "Abrir"}
</button>                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}