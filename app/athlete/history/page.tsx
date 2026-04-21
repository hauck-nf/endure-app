"use client";

import { useEffect, useMemo, useState } from "react";

type Row = {
  assessment_id: string;
  instrument_version?: string | null;
  submitted_at?: string | null;
};

export default function AthleteHistoryPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const titleArea = "\u00c1rea do atleta";
  const title = "Hist\u00f3rico de avalia\u00e7\u00f5es";
  const subtitle =
    "Consulte aqui as avalia\u00e7\u00f5es conclu\u00eddas e abra o relat\u00f3rio sempre que quiser revisitar seus resultados.";

  const countLabel = useMemo(() => {
    const n = rows.length;
    return n === 1 ? "1 avalia\u00e7\u00e3o" : `${n} avalia\u00e7\u00f5es`;
  }, [rows.length]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setErr(null);
        // mantém seu endpoint atual (se você já tinha outro, troque aqui)
        const r = await fetch("/api/athlete/history");
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j?.error ?? `HTTP ${r.status}`);

        const list: Row[] = Array.isArray(j?.rows) ? j.rows : Array.isArray(j) ? j : [];
        if (alive) setRows(list);
      } catch (e: any) {
        if (alive) setErr(e?.message ?? String(e));
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  async function openReport(assessmentId: string) {
    try {
      setErr(null);
      setBusyId(assessmentId);

      // 1) garante/gera o PDF (idempotente)
      const r1 = await fetch("/api/report", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ assessment_id: assessmentId }),
      });
      const j1 = await r1.json().catch(() => ({}));
      if (!r1.ok || !j1?.ok) {
        throw new Error(j1?.error ?? "Falha ao gerar o PDF.");
      }

      // 2) pega a signedUrl
      const r2 = await fetch(`/api/report-url?assessment_id=${encodeURIComponent(assessmentId)}`);
      // se o endpoint resolver mudar para redirect no futuro, isso já funciona:
      if (r2.redirected) {
        window.location.assign(r2.url);
        return;
      }
      const j2: any = await r2.json().catch(() => ({}));
      const url = (j2?.signedUrl ?? j2?.signed_url ?? j2?.url ?? "") as string;
      if (!url || typeof url !== "string") throw new Error("A API n\u00e3o retornou uma URL v\u00e1lida para o relat\u00f3rio.");

      // 3) abre SEM popup (mesma aba) -> zero fricção e sem bloqueio
      window.location.assign(url);
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div style={{ padding: 24 }}>
      <div
        style={{
          display: "inline-flex",
          padding: "6px 12px",
          borderRadius: 999,
          border: "1px solid #e5e7eb",
          background: "#f8fafc",
          fontSize: 12,
          color: "#111827",
        }}
      >
        {titleArea}
      </div>

      <h1 style={{ fontSize: 34, margin: "14px 0 6px", color: "#111827" }}>{title}</h1>
      <p style={{ color: "#475569", marginTop: 0, maxWidth: 820 }}>{subtitle}</p>

      <div style={{ margin: "14px 0 22px" }}>
        <span
          style={{
            display: "inline-flex",
            padding: "10px 14px",
            borderRadius: 999,
            border: "1px solid #e5e7eb",
            background: "#fff",
            color: "#111827",
            fontWeight: 600,
          }}
        >
          {countLabel}
        </span>
      </div>

      {err ? (
        <div
          style={{
            border: "1px solid #fecaca",
            background: "#fef2f2",
            color: "#991b1b",
            borderRadius: 14,
            padding: 14,
            marginBottom: 18,
            maxWidth: 900,
          }}
        >
          {err}
        </div>
      ) : null}

      <div style={{ display: "grid", gap: 14, maxWidth: 900 }}>
        {rows.map((r) => (
          <div
            key={r.assessment_id}
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 16,
              padding: 16,
              background: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <div>
              <div style={{ fontWeight: 800, color: "#111827" }}>{r.instrument_version ?? "ENDURE_v1"}</div>
              <div style={{ fontSize: 13, color: "#475569", marginTop: 2 }}>
                {r.submitted_at ? new Date(r.submitted_at).toLocaleDateString() : "—"}
              </div>
            </div>

            <button
              onClick={() => openReport(r.assessment_id)}
              disabled={busyId === r.assessment_id}
              style={{
                height: 44,
                padding: "0 18px",
                borderRadius: 16,
                border: "1px solid #111827",
                background: "#111827",
                color: "#fff",
                fontWeight: 700,
                cursor: busyId === r.assessment_id ? "not-allowed" : "pointer",
                opacity: busyId === r.assessment_id ? 0.7 : 1,
                whiteSpace: "nowrap",
              }}
            >
              {busyId === r.assessment_id ? "Abrindo..." : "Abrir relat\u00f3rio"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}