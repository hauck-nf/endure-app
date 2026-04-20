"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabaseBrowser } from "@/src/lib/supabaseBrowser";

type Row = {
  assessment_id: string;
  submitted_at: string | null;
  readiness_score: number | null;
  scores_json: any;
};

type AthleteMini = {
  full_name: string | null;
  email: string | null;
  team: string | null;
  sport_primary: string | null;
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

export default function AdminAthleteDashboardView() {
  const params = useParams();
  const router = useRouter();

  const athleteId = String((params as any)?.athlete_id ?? "").trim();

  const [athlete, setAthlete] = useState<AthleteMini | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [scale, setScale] = useState<string>("");

  useEffect(() => {
    (async () => {
      try {
        setErr(null);

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

        const { data: a, error: aErr } = await supabaseBrowser
          .from("athletes")
          .select("full_name, email, team, sport_primary")
          .eq("athlete_id", athleteId)
          .single();

        if (aErr) throw aErr;
        setAthlete(a as any);

        const { data, error } = await supabaseBrowser
          .from("assessments")
          .select(
            "assessment_id, submitted_at, assessment_scores(readiness_score, scores_json)"
          )
          .eq("athlete_id", athleteId)
          .eq("status", "submitted")
          .order("submitted_at", { ascending: true });

        if (error) throw error;

        const out: Row[] = (data as any[]).map((r) => ({
          assessment_id: r.assessment_id,
          submitted_at: r.submitted_at,
          readiness_score: r.assessment_scores?.readiness_score ?? null,
          scores_json: r.assessment_scores?.scores_json ?? null,
        }));

        setRows(out);

        const first = out.find((x) => x.scores_json?.scales)?.scores_json?.scales;
        const firstScale = first ? Object.keys(first)[0] : "";
        setScale(firstScale || "");
      } catch (e: any) {
        setErr(e?.message ?? "Erro ao carregar dashboard do atleta.");
      }
    })();
  }, [athleteId, router]);

  const latestReadiness = useMemo(() => {
    const last = [...rows].reverse().find(
      (r) => typeof r.readiness_score === "number"
    );
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
          Dashboard do atleta
        </div>

        <h1
          style={{
            margin: "14px 0 10px",
            fontSize: 32,
            lineHeight: 1.1,
            letterSpacing: -0.6,
            color: "#0f172a",
            fontWeight: 700,
          }}
        >
          {athlete?.full_name ?? "Atleta"}
        </h1>

        <div
          style={{
            display: "grid",
            gap: 4,
            color: "#64748b",
            fontSize: 14,
            lineHeight: 1.7,
          }}
        >
          <div>{athlete?.email ?? "Sem email cadastrado"}</div>
          <div>
            {[athlete?.team, athlete?.sport_primary].filter(Boolean).join(" • ") || "—"}
          </div>
        </div>
      </section>

      <section
        data-athlete-admin-dashboard-top="true"
        style={{
          display: "grid",
          gap: 16,
          gridTemplateColumns: "minmax(0, 1fr)",
        }}
      >
        <div style={cardStyle()}>
          <div
            style={{
              color: "#64748b",
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            Prontidão mais recente
          </div>

          <div
            style={{
              fontSize: 34,
              fontWeight: 700,
              marginTop: 10,
              color: "#0f172a",
              lineHeight: 1,
            }}
          >
            {latestReadiness === null ? "—" : latestReadiness.toFixed(2)}
          </div>

          <div
            style={{
              marginTop: 10,
              color: "#64748b",
              fontSize: 13,
              lineHeight: 1.6,
            }}
          >
            Valor calculado a partir da avaliação mais recente submetida.
          </div>
        </div>

        <div style={cardStyle()}>
          <h2
            style={{
              margin: 0,
              fontWeight: 700,
              fontSize: 24,
              color: "#0f172a",
              lineHeight: 1.15,
            }}
          >
            Escala
          </h2>

          <div
            style={{
              color: "#64748b",
              fontSize: 14,
              marginTop: 6,
              lineHeight: 1.7,
            }}
          >
            Selecione a escala para visualizar a evolução percentual ao longo do tempo.
          </div>

          <select
            value={scale}
            onChange={(e) => setScale(e.target.value)}
            style={{
              width: "100%",
              padding: "12px 14px",
              marginTop: 14,
              borderRadius: 14,
              border: "1px solid #d1d5db",
              background: "#fff",
              color: "#0f172a",
              fontSize: 14,
              fontFamily: "inherit",
            }}
          >
            {availableScales.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section style={cardStyle()}>
        <div
          style={{
            display: "grid",
            gap: 4,
            marginBottom: 16,
          }}
        >
          <h2
            style={{
              margin: 0,
              fontWeight: 700,
              fontSize: 24,
              color: "#0f172a",
              lineHeight: 1.15,
            }}
          >
            Evolução por escala
          </h2>

          <div
            style={{
              color: "#64748b",
              fontSize: 14,
              lineHeight: 1.7,
            }}
          >
            {scale ? `Série temporal da escala ${scale}.` : "Selecione uma escala."}
          </div>
        </div>

        {series.length === 0 ? (
          <div
            style={{
              border: "1px dashed #d1d5db",
              borderRadius: 18,
              padding: 20,
              color: "#64748b",
              background: "#fcfcfd",
            }}
          >
            Sem dados para essa escala.
          </div>
        ) : (
          <PercentileChart
            points={series
              .filter((p) => typeof p.percentile === "number")
              .map((p) => ({ label: p.dateLabel, y: Number(p.percentile) }))}
          />
        )}
      </section>

      <style>{`
        @media (min-width: 860px) {
          section[data-athlete-admin-dashboard-top="true"] {
            grid-template-columns: minmax(220px, 0.8fr) minmax(0, 1.2fr);
            align-items: stretch;
          }
        }
      `}</style>
    </div>
  );
}

function PercentileChart({
  points,
}: {
  points: { label: string; y: number }[];
}) {
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
    points.length === 1
      ? padL + innerW / 2
      : padL + (innerW * i) / (points.length - 1)
  );
  const ys = points.map((p) => padT + innerH * (1 - clamp(p.y) / 100));

  const path = xs
    .map((x, i) => `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${ys[i].toFixed(2)}`)
    .join(" ");

  const grid = [0, 25, 50, 75, 100];
  const maxLabels = 6;
  const step = points.length <= maxLabels ? 1 : Math.ceil(points.length / maxLabels);

  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 18,
        overflow: "hidden",
        background: "#ffffff",
      }}
    >
      <div
        style={{
          padding: "12px 14px",
          background: "#f8fafc",
          borderBottom: "1px solid #e5e7eb",
          color: "#0f172a",
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        Percentil ao longo do tempo
      </div>

      <div style={{ padding: 14 }}>
        <svg
          width="100%"
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label="Série temporal do percentil"
        >
          {grid.map((g) => {
            const y = padT + innerH * (1 - g / 100);
            return (
              <g key={g}>
                <line
                  x1={padL}
                  y1={y}
                  x2={W - padR}
                  y2={y}
                  stroke="#e5e7eb"
                  strokeWidth="1"
                />
                <text
                  x={padL - 8}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="12"
                  fill="#64748b"
                >
                  {g}
                </text>
              </g>
            );
          })}

          <line
            x1={padL}
            y1={padT}
            x2={padL}
            y2={H - padB}
            stroke="#9ca3af"
            strokeWidth="1"
          />
          <line
            x1={padL}
            y1={H - padB}
            x2={W - padR}
            y2={H - padB}
            stroke="#9ca3af"
            strokeWidth="1"
          />

          {points.length > 0 && (
            <path
              d={path}
              fill="none"
              stroke="#1d4ed8"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {points.map((p, i) => (
            <g key={`${p.label}-${i}`}>
              <circle cx={xs[i]} cy={ys[i]} r="4.5" fill="#1d4ed8" />
            </g>
          ))}

          {points.map((p, i) => {
            if (i % step !== 0 && i !== points.length - 1) return null;
            return (
              <text
                key={`label-${p.label}-${i}`}
                x={xs[i]}
                y={H - padB + 18}
                textAnchor="middle"
                fontSize="12"
                fill="#64748b"
              >
                {p.label}
              </text>
            );
          })}
        </svg>
      </div>
    </div>
  );
}