"use client";

import Link from "next/link";
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

type PendingRequest = {
  request_id: string;
  title: string | null;
  status: string | null;
  created_at: string | null;
};

export default function AthleteDashboard() {
  const [rows, setRows] = useState<Row[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [scale, setScale] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErr(null);

        const athleteId = await getMyAthleteId();

        const [{ data: assessmentsData, error: assessmentsError }, { data: pendingData, error: pendingError }] =
          await Promise.all([
            supabase
              .from("assessments")
              .select(
                "assessment_id, submitted_at, raw_meta, assessment_scores(readiness_score, scores_json)"
              )
              .eq("athlete_id", athleteId)
              .eq("status", "submitted")
              .order("submitted_at", { ascending: true }),

            supabase
              .from("assessment_requests")
              .select("request_id, title, status, created_at")
              .eq("athlete_id", athleteId)
              .in("status", ["pending", "in_progress"])
              .order("created_at", { ascending: false }),
          ]);

        if (assessmentsError) throw assessmentsError;
        if (pendingError) throw pendingError;

        const out: Row[] = (assessmentsData as any[]).map((r) => ({
          assessment_id: r.assessment_id,
          submitted_at: r.submitted_at,
          raw_meta: r.raw_meta,
          readiness_score: r.assessment_scores?.readiness_score ?? null,
          scores_json: r.assessment_scores?.scores_json ?? null,
        }));

        setRows(out);
        setPendingRequests((pendingData as PendingRequest[]) ?? []);

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

  const pendingCount = pendingRequests.length;
  const latestPending = pendingRequests[0] ?? null;

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <section
        style={{
          background:
            "linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(248,250,252,1) 100%)",
          border: "1px solid #e5e7eb",
          borderRadius: 24,
          padding: 24,
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
          Área do atleta
        </div>

        <h1
          style={{
            margin: "14px 0 10px",
            fontSize: 34,
            lineHeight: 1.1,
            letterSpacing: -0.8,
            color: "#0f172a",
          }}
        >
          Dashboard socioemocional
        </h1>

        <p
          style={{
            margin: 0,
            color: "#64748b",
            lineHeight: 1.75,
            maxWidth: 760,
            fontSize: 15,
          }}
        >
          Acompanhe sua prontidão mais recente, visualize a evolução das escalas
          e veja rapidamente se existe alguma avaliação pendente.
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

      {loading ? null : pendingCount > 0 ? (
        <section
          style={{
            background: "linear-gradient(180deg, #fff7ed 0%, #fffbeb 100%)",
            border: "1px solid #fed7aa",
            borderRadius: 24,
            padding: 22,
            boxShadow: "0 18px 48px rgba(15,23,42,.05)",
            display: "flex",
            justifyContent: "space-between",
            gap: 18,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                border: "1px solid #fdba74",
                background: "#fff",
                color: "#9a3412",
                borderRadius: 999,
                padding: "6px 10px",
                fontSize: 12,
                fontWeight: 800,
              }}
            >
              Atenção
            </div>

            <div
              style={{
                marginTop: 10,
                fontSize: 22,
                fontWeight: 900,
                color: "#7c2d12",
              }}
            >
              Você tem {pendingCount} {pendingCount > 1 ? "avaliações pendentes" : "avaliação pendente"}.
            </div>

            <div
              style={{
                marginTop: 8,
                color: "#9a3412",
                lineHeight: 1.7,
                fontSize: 14,
                maxWidth: 720,
              }}
            >
              {latestPending?.title
                ? `A mais recente é "${latestPending.title}".`
                : "Há uma avaliação aguardando sua resposta."}{" "}
              Acesse suas pendências para responder.
            </div>
          </div>

          <Link
            href="/athlete/pending"
            style={{
              height: 46,
              padding: "0 18px",
              borderRadius: 14,
              border: "1px solid #9a3412",
              background: "#9a3412",
              color: "#fff",
              display: "inline-flex",
              alignItems: "center",
              textDecoration: "none",
              fontWeight: 800,
              whiteSpace: "nowrap",
            }}
          >
            Ver pendências
          </Link>
        </section>
      ) : (
        <section
          style={{
            background: "linear-gradient(180deg, #f0fdf4 0%, #f8fafc 100%)",
            border: "1px solid #bbf7d0",
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
            Nenhuma avaliação pendente no momento.
          </div>
          <div
            style={{
              marginTop: 6,
              color: "#4b5563",
              fontSize: 14,
              lineHeight: 1.7,
            }}
          >
            Quando uma nova solicitação for designada, ela aparecerá aqui e na
            sua área de pendências.
          </div>
        </section>
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
          borderRadius: 24,
          padding: 22,
          boxShadow: "0 18px 48px rgba(15,23,42,.06)",
          display: "grid",
          gap: 18,
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
            <div
              style={{
                fontWeight: 900,
                fontSize: 22,
                color: "#0f172a",
              }}
            >
              Evolução por escala
            </div>
            <div
              style={{
                marginTop: 4,
                color: "#64748b",
                fontSize: 14,
              }}
            >
              Selecione uma escala para visualizar a série temporal dos percentis.
            </div>
          </div>

          <div style={{ minWidth: 260 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span
                style={{
                  fontSize: 13,
                  color: "#64748b",
                  fontWeight: 700,
                }}
              >
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
                  color: "#0f172a",
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
              borderRadius: 20,
              overflow: "hidden",
              background: "#fff",
            }}
          >
            <div
              style={{
                padding: 14,
                borderBottom: "1px solid #e5e7eb",
                background: "#f8fafc",
                fontWeight: 800,
                color: "#0f172a",
              }}
            >
              {scale}
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
        background:
          "linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(250,250,252,1) 100%)",
        border: "1px solid #e5e7eb",
        borderRadius: 22,
        padding: 20,
        boxShadow: "0 18px 48px rgba(15,23,42,.06)",
      }}
    >
      <div style={{ color: "#64748b", fontSize: 14 }}>{label}</div>
      <div
        style={{
          fontSize: 34,
          fontWeight: 900,
          marginTop: 10,
          color: "#0f172a",
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      <div
        style={{
          marginTop: 10,
          color: "#64748b",
          fontSize: 13,
          lineHeight: 1.6,
        }}
      >
        {helper}
      </div>
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
        color: "#64748b",
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

        <path d={path} fill="none" stroke="#0f172a" strokeWidth="2.4" />
        {xs.map((x, i) => (
          <circle key={i} cx={x} cy={ys[i]} r="4" fill="#0f172a" />
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

      <div style={{ marginTop: 10, color: "#64748b" }}>
        Último percentil: <b>{points[points.length - 1].y.toFixed(1)}</b>
      </div>
    </div>
  );
}