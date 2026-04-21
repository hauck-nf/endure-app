"use client";

import { useState } from "react";

type Row = {
  assessment_id: string;
  submitted_at: string | null;
  instrument_version: string | null;
};

export default function HistoryClient({ rows }: { rows: Row[] }) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function openReport(assessmentId: string) {
    let w: Window | null = null;

    try {
      setErr(null);
      setBusyId(assessmentId);

      // abre placeholder para evitar bloqueio de popup no mobile
      w = window.open("about:blank", "_blank", "noopener,noreferrer");

      // 1) garante/gera pdf
      const r1 = await fetch("/api/report", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ assessment_id: assessmentId }),
      });
      const j1: any = await r1.json().catch(() => ({}));
      if (!r1.ok || !j1?.ok) throw new Error(j1?.error ?? "Falha ao gerar o relatório.");

      // 2) pega signed url
      const r2 = await fetch(`/api/report-url?assessment_id=${encodeURIComponent(assessmentId)}`, { cache: "no-store" });
      const j2: any = await r2.json().catch(() => ({}));
      const url = (j2?.signedUrl ?? j2?.signed_url ?? j2?.url ?? "") as string;
      if (!r2.ok || !j2?.ok || !url) throw new Error(j2?.error ?? "A API não retornou uma URL válida para o relatório.");

      // 3) navega a janela
      if (w) {
        try {
          w.location.replace(url);
        } catch {
          window.open(url, "_blank", "noopener,noreferrer");
          try { w.close(); } catch {}
        }
      } else {
        window.open(url, "_blank", "noopener,noreferrer");
      }
    } catch (e: any) {
      try { if (w && !w.closed) w.close(); } catch {}
      setErr(e?.message ?? "Erro ao abrir relatório.");
    } finally {
      setBusyId(null);
    }
  }

  const count = rows.length;
  const countLabel = count === 1 ? "1 Avaliação" : `${count} Avaliações`;

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {err ? (
        <div style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 12, background: "#fff7ed", color: "#7c2d12" }}>
          {err}
        </div>
      ) : null}

      <div style={{ opacity: 0.8, fontSize: 12 }}>{countLabel}</div>

      <div style={{ display: "grid", gap: 10 }}>
        {rows.map((r) => {
          const date = r.submitted_at ? new Date(r.submitted_at).toLocaleDateString("pt-BR") : "—";
          const label = r.instrument_version ?? "ENDURE_v1";

          return (
            <div key={r.assessment_id} style={{ border: "1px solid #e5e7eb", borderRadius: 16, padding: 14, background: "#fff" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 14, color: "#111827" }}>{label}</div>
                  <div style={{ fontSize: 12, opacity: 0.75, marginTop: 2 }}>{date}</div>
                </div>

                <button
                  onClick={() => openReport(r.assessment_id)}
                  disabled={busyId === r.assessment_id}
                  style={{
                    height: 44,
                    padding: "0 14px",
                    borderRadius: 14,
                    border: "1px solid #e5e7eb",
                    background: "#111827",
                    color: "#fff",
                    fontWeight: 700,
                    cursor: busyId === r.assessment_id ? "wait" : "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  {busyId === r.assessment_id ? "Abrindo..." : "Abrir relatório"}
                </button>
              </div>
            </div>
          );
        })}

        {rows.length === 0 ? (
          <div style={{ border: "1px solid #e5e7eb", borderRadius: 16, padding: 14, background: "#fff", opacity: 0.75 }}>
            Nenhuma avaliação concluída ainda.
          </div>
        ) : null}
      </div>
    </div>
  );
}