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

type ViewRow = Row & { date: string };

export default function AthleteHistoryPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function getAccessToken() {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    const token = data.session?.access_token;
    if (!token) throw new Error("Sessão do usuário não encontrada.");
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
          "authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ assessment_id: assessmentId }),
      });

      const j1: any = await r1.json().catch(() => ({}));

      if (!r1.ok || !j1?.ok) {
        throw new Error(`Erro em /api/report: ${j1?.error ?? "falha desconhecida"}`);
      }

      const r2 = await fetch(`/api/report-url?assessment_id=${encodeURIComponent(assessmentId)}`, {
        method: "GET",
        headers: {
          "authorization": `Bearer ${token}`,
        },
      });

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

  const viewRows = useMemo<ViewRow[]>(() => {
    return rows.map((r) => {
      const dt = new Date(r.submitted_at ?? r.created_at);
      return {
        ...r,
        date: dt.toLocaleDateString("pt-BR"),
      };
    });
  }, [rows]);

  return (
    <section style={{ maxWidth: 920, margin: "0 auto", padding: "24px 20px 40px" }}>
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 6 }}>Área do atleta</div>
        <h1 style={{ margin: 0, fontSize: 28, lineHeight: 1.1 }}>Histórico de avaliações</h1>
        <p style={{ marginTop: 10, color: "#4b5563", maxWidth: 760 }}>
          Consulte aqui as avaliações concluídas e abra o relatório sempre que quiser revisitar seus resultados.
        </p>
      </div>

      <div
        style={{
          marginBottom: 16,
          display: "inline-flex",
          padding: "8px 12px",
          borderRadius: 999,
          background: "#f3f4f6",
          color: "#111827",
          fontWeight: 700,
          fontSize: 13,
        }}
      >
        {viewRows.length} {viewRows.length === 1 ? "avaliação" : "avaliações"}
      </div>

      {err ? (
        <div
          style={{
            marginBottom: 16,
            padding: 14,
            borderRadius: 14,
            background: "#fef2f2",
            color: "#991b1b",
            border: "1px solid #fecaca",
          }}
        >
          {err}
        </div>
      ) : null}

      {viewRows.length === 0 ? (
        <div
          style={{
            padding: 22,
            borderRadius: 20,
            border: "1px solid #e5e7eb",
            background: "#ffffff",
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>
            Nenhuma avaliação submetida ainda.
          </div>
          <div style={{ color: "#6b7280" }}>
            Quando você concluir avaliações, elas aparecerão aqui para consulta.
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 14 }}>
          {viewRows.map((r) => (
            <article
              key={r.assessment_id}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto",
                gap: 16,
                alignItems: "center",
                padding: 18,
                borderRadius: 20,
                border: "1px solid #e5e7eb",
                background: "#ffffff",
                boxShadow: "0 6px 20px rgba(17,24,39,0.04)",
              }}
            >
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#111827", marginBottom: 6 }}>
                  {r.instrument_version}
                </div>
                <div style={{ color: "#6b7280", fontSize: 14 }}>
                  Concluída em {r.date}
                </div>
              </div>

              <button
                onClick={() => openReport(r.assessment_id)}
                disabled={busyId === r.assessment_id}
                style={{
                  height: 44,
                  padding: "0 16px",
                  borderRadius: 16,
                  border: "1px solid #111827",
                  background: "#111827",
                  color: "#ffffff",
                  fontWeight: 800,
                  letterSpacing: 0.2,
                  cursor: busyId === r.assessment_id ? "not-allowed" : "pointer",
                  opacity: busyId === r.assessment_id ? 0.75 : 1,
                }}
              >
                {busyId === r.assessment_id ? "Abrindo..." : "Abrir relatório"}
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
