"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../src/lib/supabaseClient";
import { getMyAthleteId } from "../../../src/lib/athlete";

type Row = {
  assessment_id: string;
  submitted_at: string | null;
  raw_meta: any;
  readiness_score: number | null;
  scores_json: any;
};

export default function AthleteDashboard() {
  const [rows, setRows] = useState<Row[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [scale, setScale] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErr(null);

        const athleteId = await getMyAthleteId();

        const { data, error } = await supabase
          .from("assessments")
          .select(
            "assessment_id, submitted_at, raw_meta, assessment_scores(readiness_score, scores_json)"
          )
          .eq("athlete_id", athleteId)
          .eq("status", "submitted")
          .order("submitted_at", { ascending: true });

        if (error) throw error;

        const out: Row[] = (data as any[]).map((r) => ({
          assessment_id: r.assessment_id,
          submitted_at: r.submitted_at,
          raw_meta: r.raw_meta,
          readiness_score: r.assessment_scores?.readiness_score ?? null,
          scores_json: r.assessment_scores?.scores_json ?? null,
        }));

        setRows(out);

        const first = out.find((x) => x.scores_json?.scales)?.scores_json?.scales;
        const firstScale = first ? Object.keys(first)[0] : "";
        setScale(firstScale || "");
      } catch (e: any) {
        setErr(e.message ?? "Erro ao carregar dashboard.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const latestReadiness = useMemo(() => {
    const last = [...rows].reverse().find((r) => typeof r.readiness_score === "number");
    return last?.readiness_score ?? null;
  }, [rows]);

  const availableScales = useMemo(() => {
    const s = new Set<string>();
    for (const r of rows) {
      const obj = r.scores_json?.scales;
      if (obj) Object.keys(obj).forEach((k) => s.add(k));
    }
    return [...s].sort();
  }, [rows]);

  const series = useMemo(() => {
    if (!scale) return [];
    return rows
      .filter((r) => r.scores_json?.scales?.[scale])
      .map((r) => {
        const sc = r.scores_json.scales[scale];
        const dt = r.submitted_at ? new Date(r.submitted_at) : null;
        return {
          dateLabel: dt ? dt.toLocaleDateString("pt-BR") : "",
          ts: dt ? dt.getTime() : 0,
          percentile: typeof sc.percentile === "number" ? sc.percentile : null,
        };
      })
      .sort((a, b) => a.ts - b.ts);
  }, [rows, scale]);

  const lastDate = useMemo(() => {
    const last = [...rows].reverse().find((r) => r.submitted_at);
    return last?.submitted_at
      ? new Date(last.submitted_at).toLocaleDateString("pt-BR")
      : null;
  }, [rows]);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <section
        style={{
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 20,
          padding: 20,
          boxShadow: "0 14px 40px rgba(17,24,39,.06)",
        }}
      >
        <div style={{ fontSize: 13, color: "#6b7280", fontWeight: 700 }}>
          Área do atleta
        </div>
        <h1 style={{ margin: "8px 0 8px", fontSize: 30 }}>
          Dashboard socioemocional
        </h1>
        <p style={{ margin: 0, color: "#6b7280", lineHeight: 1.7 }}>
          Acompanhe sua prontidão mais recente e a evolução dos percentis nas
          escalas disponíveis.
        </p>
      </section>

      {err && (
        <div
          style={{
            padding: 14,
            border: "1px solid #fecaca",
            background: "#fef2f2",
            borderRadius: 16,
            color: "#b91c1c",
          }}
        >
          {err}
        </div>
      )}

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 16,
        }}
      >
        <StatCard
          label="Prontidão socioemocional"
          value={loading ? "..." : latestReadiness === null ? "—" : latestReadiness.toFixed(2)}
          helper="Último valor disponível"
        />
        <StatCard
          label="Avaliações concluídas"
          value={loading ? "..." : String(rows.length)}
          helper="Total submetido até o momento"
        />
        <StatCard
          label="Última atualização"
          value={loading ? "..." : lastDate ?? "—"}
          helper="Data da avaliação mais recente"
        />
      </section>

      <section
        style={{
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 20,
          padding: 20,
          boxShadow: "0 14px 40px rgba(17,24,39,.06)",
          display: "grid",
          gap: 16,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 16,
            alignItems: "end",
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={{ fontWeight: 900, fontSize: 20 }}>
              Evolução por escala
            </div>
            <div style={{ marginTop: 4, color: "#6b7280", fontSize: 14 }}>
              Selecione uma escala para visualizar a série temporal dos percentis.
            </div>
          </div>

          <div style={{ minWidth: 260 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontSize: 13, color: "#6b7280", fontWeight: 700 }}>
                Escala
              </span>
              <select
                value={scale}
                onChange={(e) => setScale(e.target.value)}
                style={{
                  width: "100%",
                  height: 46,
                  padding: "0 12px",
                  borderRadius: 14,
                  border: "1px solid #d1d5db",
                  background: "#fff",
                }}
                disabled={availableScales.length === 0}
              >
                {availableScales.length === 0 ? (
                  <option value="">Sem escalas disponíveis</option>
                ) : (
                  availableScales.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))
                )}
              </select>
            </label>
          </div>
        </div>

        {loading ? (
          <EmptyBox text="Carregando dados do dashboard..." />
        ) : rows.length === 0 ? (
          <EmptyBox text="Seu dashboard aparecerá aqui após a primeira avaliação submetida." />
        ) : series.length === 0 ? (
          <EmptyBox text="Não há dados disponíveis para a escala selecionada." />
        ) : (
          <div
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 18,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: 14,
                borderBottom: "1px solid #e5e7eb",
                background: "#f9fafb",
              }}
            >
              <strong>{scale}</strong>
            </div>

            <PercentileChart
              points={series
                .filter((p) => typeof p.percentile === "number")
                .map((p) => ({
                  label: p.dateLabel,
                  y: Number(p.percentile),
                }))}
            />
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 18,
        padding: 20,
        boxShadow: "0 14px 40px rgba(17,24,39,.06)",
      }}
    >
      <div style={{ color: "#6b7280", fontSize: 14 }}>{label}</div>
      <div style={{ fontSize: 32, fontWeight: 900, marginTop: 8 }}>{value}</div>
      <div style={{ marginTop: 8, color: "#6b7280", fontSize: 13 }}>{helper}</div>
    </div>
  );
}

function EmptyBox({ text }: { text: string }) {
  return (
    <div
      style={{
        border: "1px dashed #d1d5db",
        borderRadius: 18,
        padding: 24,
        color: "#6b7280",
        background: "#fcfcfd",
      }}
    >
      {text}
    </div>
  );
}

function PercentileChart({ points }: { points: { label: string; y: number }[] }) {
  const W = 900;
  const H = 280;
  const padL = 70;
  const padR = 16;
  const padT = 18;
  const padB = 40;

  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const clamp = (v: number) => Math.max(0, Math.min(100, v));

  const xs = points.map((_, i) =>
    points.length === 1 ? padL + innerW / 2 : padL + (innerW * i) / (points.length - 1)
  );
  const ys = points.map((p) => padT + innerH * (1 - clamp(p.y) / 100));

  const path = xs
    .map((x, i) => `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${ys[i].toFixed(2)}`)
    .join(" ");

  const grid = [0, 25, 50, 75, 100];
  const maxLabels = 6;
  const step = points.length <= maxLabels ? 1 : Math.ceil(points.length / maxLabels);

  return (
    <div style={{ padding: 14 }}>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Série temporal do percentil">
        {grid.map((g) => {
          const y = padT + innerH * (1 - g / 100);
          return (
            <g key={g}>
              <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="#e5e7eb" strokeWidth="1" />
              <text x={padL - 8} y={y + 4} textAnchor="end" fontSize="12" fill="#6b7280">
                {g}
              </text>
            </g>
          );
        })}

        <line x1={padL} y1={padT} x2={padL} y2={H - padB} stroke="#9ca3af" strokeWidth="1" />
        <line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} stroke="#9ca3af" strokeWidth="1" />

        <path d={path} fill="none" stroke="#111827" strokeWidth="2.4" />
        {xs.map((x, i) => (
          <circle key={i} cx={x} cy={ys[i]} r="4" fill="#111827" />
        ))}

        {points.map((p, i) => {
          if (i % step !== 0 && i !== points.length - 1) return null;
          return (
            <text key={i} x={xs[i]} y={H - 18} textAnchor="middle" fontSize="11" fill="#6b7280">
              {p.label}
            </text>
          );
        })}

        <text x={padL - 2} y={12} fontSize="12" fill="#6b7280">
          Percentil
        </text>
      </svg>

      <div style={{ marginTop: 10, color: "#6b7280" }}>
        Último percentil: <b>{points[points.length - 1].y.toFixed(1)}</b>
      </div>
    </div>
  );
}