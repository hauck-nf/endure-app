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

type ViewRow = Row & {
  date: string;
};

export default function AthleteHistoryPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

async function openReport(assessmentId: string) {
  let reportWindow: Window | null = null;
  try {
    setErr(null);
    setBusyId(assessmentId);

    // abre um "placeholder" para evitar bloqueio de popup no mobile
    reportWindow = window.open("about:blank", "_blank", "noopener,noreferrer");

    // 1) garante/gera o PDF (idempotente)
    const r1 = await fetch("/api/report", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ assessment_id: assessmentId }),
    });

    const j1: any = await r1.json().catch(() => ({}));
    if (!r1.ok || !j1?.ok) {
      throw new Error(j1?.error ?? "Erro ao gerar relatório.");
    }

    // 2) pega signed URL
    const r2 = await fetch(`/api/report-url?assessment_id=${encodeURIComponent(assessmentId)}`);
    const j2: any = await r2.json().catch(() => ({}));

    const url = (j2?.signedUrl ?? j2?.signed_url ?? j2?.url ?? "") as string;
    if (!r2.ok || !j2?.ok || !url) {
      throw new Error(j2?.error ?? "A API não retornou uma URL válida para o relatório.");
    }

    if (reportWindow) {
      reportWindow.location.replace(url);
    } else {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  } catch (e: any) {
    if (reportWindow && !reportWindow.closed) reportWindow.close();
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
        setErr(e.message ?? "Erro ao carregar histÃƒÂ³rico.");
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
    <div style={{ display: "grid", gap: 16 }}>
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
            fontWeight: 800,
            letterSpacing: 0.3,
          }}
        >
          ÃƒÂrea do atleta
        </div>

        <h1
          style={{
            margin: "14px 0 10px",
            fontSize: 30,
            lineHeight: 1.1,
            letterSpacing: -0.6,
            color: "#0f172a",
          }}
        >
          HistÃƒÂ³rico de avaliaÃƒÂ§ÃƒÂµes
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
          Consulte aqui as avaliaÃƒÂ§ÃƒÂµes jÃƒÂ¡ concluÃƒÂ­das e abra o relatÃƒÂ³rio sempre que
          quiser revisitar seus resultados.
        </p>

        <div
          style={{
            marginTop: 16,
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            borderRadius: 999,
            padding: "8px 12px",
            background: "#f8fafc",
            border: "1px solid #e5e7eb",
            color: "#475569",
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          {viewRows.length} {viewRows.length === 1 ? "avaliaÃƒÂ§ÃƒÂ£o" : "avaliaÃƒÂ§ÃƒÂµes"}
        </div>
      </section>

      {err ? (
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
          {err}
        </div>
      ) : null}

      {viewRows.length === 0 ? (
        <section
          style={{
            border: "1px solid #bbf7d0",
            background: "linear-gradient(180deg, #f0fdf4 0%, #f8fafc 100%)",
            borderRadius: 24,
            padding: 20,
            boxShadow: "0 18px 48px rgba(15,23,42,.04)",
          }}
        >
          <div
            style={{
              fontWeight: 800,
              color: "#166534",
              fontSize: 16,
            }}
          >
            Nenhuma avaliaÃƒÂ§ÃƒÂ£o submetida ainda.
          </div>

          <div
            style={{
              marginTop: 6,
              color: "#4b5563",
              fontSize: 14,
              lineHeight: 1.7,
            }}
          >
            Quando vocÃƒÂª concluir avaliaÃƒÂ§ÃƒÂµes, elas aparecerÃƒÂ£o aqui para consulta.
          </div>
        </section>
      ) : (
        <div style={{ display: "grid", gap: 14 }}>
          {viewRows.map((r) => (
            <article
              key={r.assessment_id}
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 22,
                background: "#ffffff",
                padding: 18,
                boxShadow: "0 18px 48px rgba(15,23,42,.05)",
                display: "grid",
                gap: 14,
              }}
            >
              <div style={{ display: "grid", gap: 6 }}>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 900,
                    color: "#0f172a",
                    lineHeight: 1.3,
                  }}
                >
                  {r.instrument_version}
                </div>

                <div
                  style={{
                    color: "#64748b",
                    fontSize: 14,
                    lineHeight: 1.7,
                  }}
                >
                  {r.date}
                </div>
              </div>

              <div style={{ display: "flex" }}>
                <button
                  onClick={() => openReport(r.assessment_id)}
                  disabled={busyId === r.assessment_id}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    borderRadius: 14,
                    border: "1px solid #0f172a",
                    background: "#0f172a",
                    color: "#fff",
                    padding: "12px 16px",
                    fontWeight: 800,
                    fontSize: 14,
                    lineHeight: 1,
                    minHeight: 46,
                    cursor:
                      busyId === r.assessment_id ? "not-allowed" : "pointer",
                    width: "100%",
                    maxWidth: 220,
                    fontFamily: "inherit",
                  }}
                >
                  {busyId === r.assessment_id ? "Gerando..." : "Abrir relatÃƒÂ³rio"}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
