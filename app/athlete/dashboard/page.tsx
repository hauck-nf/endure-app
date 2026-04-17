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

  useEffect(() => {
    (async () => {
      try {
        setErr(null);
        const athleteId = await getMyAthleteId();

        // assessments submitted + scores
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

        // escala default: primeira disponível
        const first = out.find((x) => x.scores_json?.scales)?.scores_json?.scales;
        const firstScale = first ? Object.keys(first)[0] : "";
        setScale(firstScale || "");
      } catch (e: any) {
        setErr(e.message ?? "Erro ao carregar dashboard.");
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
          dateLabel: dt ? dt.toLocaleDateString() : "",
          ts: dt ? dt.getTime() : 0,
          percentile: typeof sc.percentile === "number" ? sc.percentile : null,
        };
      })
      .sort((a, b) => a.ts - b.ts);
  }, [rows, scale]);

  return (
    <div style={{ maxWidth: 950, margin: "40px auto", fontFamily: "system-ui" }}>
      <a href="/athlete">← Voltar</a>
      <h2 style={{ marginTop: 12 }}>Dashboard socioemocional</h2>

      {err && (
        <div
          style={{
            marginTop: 12,
            padding: 12,
            border: "1px solid #ef4444",
            borderRadius: 12,
            color: "#b91c1c",
          }}
        >
          {err}
        </div>
      )}

      <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 14 }}>
          <div style={{ color: "#6b7280" }}>Prontidão socioemocional (última)</div>
          <div style={{ fontSize: 34, fontWeight: 700, marginTop: 6 }}>
            {latestReadiness === null ? "—" : latestReadiness.toFixed(2)}
          </div>
        </div>

        <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 14 }}>
          <div style={{ color: "#6b7280" }}>Escala</div>
          <select
            value={scale}
            onChange={(e) => setScale(e.target.value)}
            style={{ width: "100%", padding: 10, marginTop: 8 }}
          >
            {availableScales.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ marginTop: 16, border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: 12, background: "#fafafa", borderBottom: "1px solid #e5e7eb" }}>
          <b>{scale || "—"}</b>
        </div>

        {series.length === 0 ? (
          <div style={{ padding: 14, color: "#6b7280" }}>Sem dados para essa escala.</div>
        ) : (
          <PercentileChart
            points={series
              .filter((p) => typeof p.percentile === "number")
              .map((p) => ({ label: p.dateLabel, y: Number(p.percentile) }))}
          />
        )}
      </div>
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

  const path = xs.map((x, i) => `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${ys[i].toFixed(2)}`).join(" ");

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

        <path d={path} fill="none" stroke="#111827" strokeWidth="2" />
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
