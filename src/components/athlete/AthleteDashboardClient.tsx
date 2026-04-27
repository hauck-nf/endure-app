"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser as supabase } from "@/src/lib/supabaseBrowser";
import { displayScaleName, sortScaleNamesForDisplay } from "@/src/lib/endure/displayNames";
import { getMyAthleteId } from "@/src/lib/athlete";

type Row = {
  assessment_id: string;
  submitted_at: string | null;
  created_at: string | null;
  scores_json: any;
};

type PendingRequest = {
  request_id: string;
  title: string | null;
  status: string | null;
  created_at: string | null;
};

type ScaleScore = {
  scale: string;
  raw_score: number | null;
  t_score: number | null;
  percentile: number | null;
  theta_hat: number | null;
  band: string | null;
  band_label: string | null;
  text_port?: string | null;
};

type InstrumentItem = {
  itemcode: string | null;
  quest_section: string | null;
  scale: string | null;
};

const POSITIVE_COMPETENCE_KEYS = [
  "autodialogo",
  "grit",
  "mastery-approach-goals",
  "mental-practice",
  "mindfulness",
  "performance-approach-goals",
  "perfectionism-strivings",
  "self-efficacy",
  "task-oriented-coping",
  "vigor",
];

const NEGATIVE_ELEMENT_KEYS = [
  "anger",
  "anxiety",
  "depression",
  "fatigue",
  "mastery-avoidance-goals",
  "perfectionism-concerns",
  "rumination",
];

const MODEL_GROUPS = [
  {
    key: "positive",
    label: "Afetividade positiva",
    helper: "Recursos emocionais e motivacionais associados a energia, confiança e engajamento.",
    keys: [
      "autodialogo",
      "grit",
      "mastery-approach-goals",
      "mental-practice",
      "mindfulness",
      "performance-approach-goals",
      "perfectionism-strivings",
      "self-efficacy",
      "task-oriented-coping",
      "vigor",
    ],
    inverted: false,
  },
  {
    key: "selfreg",
    label: "Autorregulação",
    helper: "Capacidade de modular atenção, comportamento e estratégias durante treinos e provas.",
    keys: [
      "autodialogo",
      "mental-practice",
      "mindfulness",
      "self-efficacy",
      "task-oriented-coping",
      "grit",
    ],
    inverted: false,
  },
  {
    key: "negative",
    label: "Afetividade negativa",
    helper: "Sinais emocionais e cognitivos que podem indicar maior carga psicológica.",
    keys: [
      "anger",
      "anxiety",
      "depression",
      "fatigue",
      "mastery-avoidance-goals",
      "perfectionism-concerns",
      "rumination",
    ],
    inverted: true,
  },
];

function normalizeKey(x: any): string {
  return String(x ?? "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/_/g, "-")
    .replace(/\s+/g, "-");
}

function canonicalScaleName(x: any): string {
  const original = String(x ?? "").trim();
  const key = normalizeKey(original);

  const aliases: Record<string, string> = {
    "strivings": "Perfectionism-strivings",
    "perfectionism-strivings": "Perfectionism-strivings",

    "concerns": "Perfectionism-concerns",
    "perfectionism-concerns": "Perfectionism-concerns",

    "vigor/energia": "Vigor",
    "vigor-energia": "Vigor",
    "energy": "Vigor",
    "vigor": "Vigor",

    "autodialogo": "Autodiálogo",
    "auto-dialogo": "Autodiálogo",
    "self-talk": "Autodiálogo",
    "selftalk": "Autodiálogo",
  };

  return aliases[key] ?? original;
}

function scaleKey(x: any): string {
  return normalizeKey(canonicalScaleName(x));
}

function sameScale(a: any, b: any) {
  return scaleKey(a) === scaleKey(b);
}

function sameSection(a: any, b: any) {
  return normalizeKey(a) === normalizeKey(b);
}

function clamp100(v: number) {
  return Math.max(0, Math.min(100, v));
}

function numOrNull(x: any): number | null {
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

function formatDate(value?: string | null, shortYear = false) {
  if (!value) return "—";

  try {
    return new Date(value).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: shortYear ? "2-digit" : "numeric",
    });
  } catch {
    return "—";
  }
}

function extractScales(scoresJson: any): ScaleScore[] {
  if (!scoresJson) return [];

  const fromFactors = Array.isArray(scoresJson.factors)
    ? scoresJson.factors.map((f: any) => ({
        scale: canonicalScaleName(f.scale ?? f.score_scale),
        raw_score: numOrNull(f.raw_score),
        t_score: numOrNull(f.t_score),
        percentile: numOrNull(f.percentile),
        theta_hat: numOrNull(f.theta_hat),
        band: f.band == null ? null : String(f.band),
        band_label: f.band_label == null ? null : String(f.band_label),
        text_port: f.text_port == null ? null : String(f.text_port),
      }))
    : [];

  if (fromFactors.length > 0) return fromFactors;

  const obj = scoresJson.scales;

  if (obj && typeof obj === "object") {
    return Object.entries(obj).map(([scale, v]: [string, any]) => ({
      scale: canonicalScaleName(scale),
      raw_score: numOrNull(v?.raw_score),
      t_score: numOrNull(v?.t_score),
      percentile: numOrNull(v?.percentile),
      theta_hat: numOrNull(v?.theta_hat),
      band: v?.band == null ? null : String(v.band),
      band_label: v?.band_label == null ? null : String(v.band_label),
      text_port: v?.text_port == null ? null : String(v.text_port),
    }));
  }

  return [];
}

function scoreMap(scales: ScaleScore[]) {
  const m = new Map<string, ScaleScore>();

  for (const s of scales) {
    m.set(scaleKey(s.scale), s);
  }

  return m;
}

function averagePercentile(scales: ScaleScore[], keys: string[]) {
  const m = scoreMap(scales);

  const values = keys
    .map((k) => m.get(k)?.percentile)
    .filter((x): x is number => typeof x === "number" && Number.isFinite(x));

  if (values.length === 0) return null;

  return values.reduce((a, b) => a + b, 0) / values.length;
}

function isHigh(s?: ScaleScore) {
  return String(s?.band_label ?? "").trim().toLowerCase() === "alto";
}

function isLow(s?: ScaleScore) {
  return String(s?.band_label ?? "").trim().toLowerCase() === "baixo";
}

function buildHighlights(scales: ScaleScore[]) {
  const m = scoreMap(scales);

  const strengths = POSITIVE_COMPETENCE_KEYS
    .map((k) => m.get(k))
    .filter((s): s is ScaleScore => !!s && isHigh(s));

  const develop = POSITIVE_COMPETENCE_KEYS
    .map((k) => m.get(k))
    .filter((s): s is ScaleScore => !!s && isLow(s));

  const negatives = NEGATIVE_ELEMENT_KEYS
    .map((k) => m.get(k))
    .filter((s): s is ScaleScore => !!s && isHigh(s));

  return { strengths, develop, negatives };
}

function pageStyle(): React.CSSProperties {
  return {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at top left, rgba(20,184,166,.14), transparent 30%), radial-gradient(circle at top right, rgba(249,115,22,.12), transparent 28%), #f8fafc",
    color: "#0f172a",
    padding: 24,
    overflowX: "hidden",
  };
}

function cardStyle(extra?: React.CSSProperties): React.CSSProperties {
  return {
    background: "rgba(255,255,255,.92)",
    border: "1px solid rgba(226,232,240,.9)",
    borderRadius: 28,
    padding: 22,
    boxShadow: "0 22px 60px rgba(15,23,42,.08)",
    backdropFilter: "blur(10px)",
    minWidth: 0,
    boxSizing: "border-box",
    ...extra,
  };
}

function miniLabelStyle(): React.CSSProperties {
  return {
    margin: 0,
    color: "#64748b",
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  };
}

export default function AthleteDashboardClient({ athleteIdOverride }: { athleteIdOverride?: string } = {}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [instrumentScales, setInstrumentScales] = useState<string[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [scale, setScale] = useState("");
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (typeof window !== "undefined") {
        setIsMobile(window.innerWidth <= 520);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErr(null);

        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token ?? "";

        const dashboardUrl = athleteIdOverride
          ? `/api/athlete-dashboard?athlete_id=${encodeURIComponent(athleteIdOverride)}`
          : "/api/athlete-dashboard";

        const [dashboardResponse, instrumentResponse] = await Promise.all([
          fetch(dashboardUrl, {
            method: "GET",
            headers: token ? { authorization: `Bearer ${token}` } : {},
          }),
          fetch("/api/instrument-items", {
            method: "GET",
            headers: token ? { authorization: `Bearer ${token}` } : {},
          }),
        ]);

        const dashboardPayload: any = await dashboardResponse.json().catch(() => ({}));

        if (!dashboardResponse.ok || !dashboardPayload?.ok) {
          throw new Error(
            dashboardPayload?.error ?? "Falha ao carregar dados do dashboard."
          );
        }

        const out: Row[] = (dashboardPayload.rows ?? []) as Row[];

        setRows(out);

        // Pendências continuam vindo pelo fluxo atual do atleta logado.
        // Em modo admin, não exibimos pendências aqui para evitar mistura de permissões.
        if (athleteIdOverride) {
          setPendingRequests([]);
        } else {
          const athleteId = await getMyAthleteId();

          const { data: pendingData, error: pendingError } = await supabase
            .from("assessment_requests")
            .select("request_id, title, status, created_at")
            .eq("athlete_id", athleteId)
            .in("status", ["pending", "in_progress"])
            .order("created_at", { ascending: false });

          if (pendingError) throw pendingError;

          setPendingRequests((pendingData as PendingRequest[]) ?? []);
        }

        const instrumentPayload: any = await instrumentResponse
          .json()
          .catch(() => ({}));

        if (!instrumentResponse.ok || !instrumentPayload?.ok) {
          throw new Error(
            instrumentPayload?.error ?? "Falha ao carregar escalas do instrumento."
          );
        }

        const instrumentItems = Array.isArray(instrumentPayload.items)
          ? instrumentPayload.items
          : [];

        const allowedSections = new Set([
          "endure",
          "socioemocional core",
          "socioemotional core",
        ]);

        const scaleMap = new Map<string, string>();

        for (const item of instrumentItems) {
          const section = String(item?.quest_section ?? "")
            .trim()
            .toLowerCase();

          const rawScale = String(item?.scale ?? "").trim();

          if (!rawScale) continue;
          if (!allowedSections.has(section)) continue;

          const scaleName = canonicalScaleName(rawScale);
          const key = scaleKey(scaleName);

          if (key) {
            scaleMap.set(key, scaleName);
          }
        }

        const instrumentScaleList = sortScaleNamesForDisplay(Array.from(scaleMap.values()));
        if (instrumentScaleList.length > 0) {
          setScale((prev) => prev || instrumentScaleList[0]);
        } else {
          const firstScores = out.map((r) => extractScales(r.scores_json)).find((x) => x.length > 0);
          setScale((prev) => prev || firstScores?.[0]?.scale || "");
        }
      } catch (e: any) {
        setErr(e?.message ?? "Erro ao carregar dashboard.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const latestRow = useMemo(() => {
    return [...rows].reverse().find((r) => extractScales(r.scores_json).length > 0) ?? null;
  }, [rows]);

  const latestScales = useMemo(() => {
    return latestRow ? extractScales(latestRow.scores_json) : [];
  }, [latestRow]);

  const latestDateShort = useMemo(() => {
    return formatDate(latestRow?.submitted_at ?? latestRow?.created_at, true);
  }, [latestRow]);

  const scoredScaleFallback = useMemo(() => {
    const m = new Map<string, string>();

    for (const r of rows) {
      for (const s of extractScales(r.scores_json)) {
        m.set(scaleKey(s.scale), s.scale);
      }
    }

    return Array.from(m.values()).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const availableScales = useMemo(() => {
    return instrumentScales.length > 0 ? instrumentScales : scoredScaleFallback;
  }, [instrumentScales, scoredScaleFallback]);

  useEffect(() => {
    if (!scale && availableScales.length > 0) {
      setScale(availableScales[0]);
    }

    if (scale && availableScales.length > 0 && !availableScales.some((s) => sameScale(s, scale))) {
      setScale(availableScales[0]);
    }
  }, [availableScales, scale]);

  const series = useMemo(() => {
    if (!scale) return [];

    return rows
      .map((r) => {
        const sc = extractScales(r.scores_json).find((s) => sameScale(s.scale, scale));
        const dtRaw = r.submitted_at ?? r.created_at;
        const dt = dtRaw ? new Date(dtRaw) : null;

        return {
          dateLabel: dt
            ? dt.toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
                year: "2-digit",
              })
            : "",
          ts: dt ? dt.getTime() : 0,
          percentile: sc?.percentile ?? null,
        };
      })
      .filter((p) => typeof p.percentile === "number")
      .sort((a, b) => a.ts - b.ts);
  }, [rows, scale]);

  const modelBars = useMemo(() => {
    return MODEL_GROUPS.map((g) => ({
      ...g,
      value: averagePercentile(latestScales, g.keys),
    }));
  }, [latestScales]);

  const highlights = useMemo(() => buildHighlights(latestScales), [latestScales]);

  const pendingCount = pendingRequests.length;
  const latestPending = pendingRequests[0] ?? null;

  return (
    <main className="dashboard-page" style={pageStyle()}>
      <style>{`
        .dashboard-page {
          min-height: 100vh;
        }

        .dashboard-shell {
          width: min(100%, 1180px);
          margin: 0 auto;
          box-sizing: border-box;
        }

        .hero-card {
          padding: 28px;
        }

        .hero-title {
          margin: 8px 0 0;
          font-size: 34px;
          line-height: 1.05;
          letter-spacing: -0.8px;
          color: #ffffff;
        }

        .summary-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 16px;
          margin-top: 16px;
        }

        .main-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.1fr) minmax(0, .9fr);
          gap: 16px;
          margin-top: 16px;
          align-items: stretch;
        }

        .chart-header {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          align-items: flex-start;
          flex-wrap: wrap;
        }

        .select-wrap {
          min-width: 280px;
        }

        .stat-card {
          min-height: 158px;
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
        }

        .stat-value {
          font-size: clamp(26px, 4vw, 30px);
          line-height: 0.95;
          overflow-wrap: anywhere;
          word-break: break-word;
        }

        .stat-helper {
          line-height: 1.12;
          overflow-wrap: anywhere;
          word-break: break-word;
        }

        @media (max-width: 860px) {
          .dashboard-page {
            padding: 16px !important;
          }

          .hero-card {
            padding: 22px !important;
          }

          .hero-title {
            font-size: 31px;
          }

          .summary-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 12px;
          }

          .main-grid {
            grid-template-columns: 1fr;
          }

          .select-wrap {
            width: 100%;
            min-width: 0;
          }
        }

        @media (max-width: 520px) {
          .dashboard-page {
            padding: 12px !important;
          }

          .hero-card {
            padding: 22px 18px !important;
            border-radius: 26px !important;
            min-height: 315px;
            display: flex;
            align-items: flex-end;
          }

          .hero-card::after {
            content: "";
            position: absolute;
            inset: 0;
            background: linear-gradient(180deg, rgba(15,23,42,.18), rgba(15,23,42,.72));
            pointer-events: none;
          }

          .hero-card > div:last-child {
            position: relative;
            z-index: 2;
          }

          .hero-title {
            font-size: 30px;
            line-height: 1.04;
            letter-spacing: -0.9px;
            text-shadow: 0 2px 14px rgba(0,0,0,.22);
          }

          .summary-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px;
          }

          .stat-card {
            min-height: 122px;
            padding: 13px !important;
            border-radius: 22px !important;
          }

          .stat-card p:first-child {
            font-size: 10.5px !important;
            line-height: 1.12 !important;
            letter-spacing: .35px !important;
          }

          .stat-value {
            font-size: clamp(21px, 7.2vw, 27px) !important;
            line-height: .95 !important;
            letter-spacing: -0.7px !important;
          }

          .stat-helper {
            font-size: 11.5px !important;
            line-height: 1.12 !important;
            margin-top: 7px !important;
          }

          .content-card {
            padding: 18px !important;
            border-radius: 24px !important;
          }

          .content-title {
            font-size: 23px !important;
            line-height: 1.08 !important;
          }
        }

        @media (max-width: 380px) {
          .summary-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="dashboard-shell">
        <section
          className="hero-card"
          style={cardStyle({
            padding: 28,
            background:
              "linear-gradient(135deg, rgba(15,23,42,.97), rgba(30,41,59,.95))",
            color: "#fff",
            overflow: "hidden",
            position: "relative",
          })}
        >
          <div
            style={{
              position: "absolute",
              right: -80,
              top: -80,
              width: 260,
              height: 260,
              borderRadius: 999,
              background: "rgba(20,184,166,.22)",
            }}
          />

          <div
            style={{
              position: "absolute",
              right: 120,
              bottom: -110,
              width: 260,
              height: 260,
              borderRadius: 999,
              background: "rgba(249,115,22,.18)",
            }}
          />

          <div style={{ position: "relative", zIndex: 1 }}>
            <p
              style={{
                margin: 0,
                color: "#99f6e4",
                fontSize: 12,
                fontWeight: 900,
                letterSpacing: 0.6,
                textTransform: "uppercase",
              }}
            >
              Área do atleta
            </p>

            <h1 className="hero-title">Dashboard socioemocional</h1>

            <p
              style={{
                margin: "12px 0 0",
                maxWidth: 740,
                color: "#cbd5e1",
                lineHeight: 1.65,
                fontSize: isMobile ? 15 : 16,
              }}
            >
              Acompanhe seu retrato socioemocional recente, seus principais destaques e a evolução das escalas ao longo das avaliações.
            </p>
          </div>
        </section>

        {err ? (
          <section
            style={{
              marginTop: 16,
              padding: 14,
              borderRadius: 18,
              border: "1px solid #fecaca",
              background: "#fef2f2",
              color: "#991b1b",
              fontWeight: 800,
            }}
          >
            {err}
          </section>
        ) : null}

        <section className="summary-grid">
          <StatCard
            label="Última avaliação"
            value={loading ? "..." : latestDateShort}
            helper="Base do retrato atual"
          />

          <StatCard
            label="Avaliações"
            value={loading ? "..." : String(rows.length)}
            helper="Concluídas no histórico"
          />

          <StatCard
            label="Escalas"
            value={loading ? "..." : String(availableScales.length)}
            helper="Monitoradas longitudinalmente"
          />

          <StatCard
            label="Pendências"
            value={loading ? "..." : String(pendingCount)}
            helper={pendingCount > 0 ? "Aguardando resposta" : "Nenhuma pendência"}
          />
        </section>

        <section className="main-grid">
          <section className="content-card" style={cardStyle()}>
            <p style={miniLabelStyle()}>Retrato socioemocional recente</p>

            <h2 className="content-title" style={{ margin: "6px 0 0", fontSize: 24 }}>
              Modelo geral de três fatores
            </h2>

            <p style={{ margin: "8px 0 20px", color: "#64748b", lineHeight: 1.55 }}>
              Síntese da última avaliação, apresentada em percentis médios dos grupos de escalas.
            </p>

            {latestScales.length === 0 ? (
              <EmptyBox text="Sem avaliação com escores disponíveis para compor o retrato recente." />
            ) : (
              <div style={{ display: "grid", gap: 18 }}>
                {modelBars.map((b) => (
                  <ModelBar
                    key={b.key}
                    label={b.label}
                    helper={b.helper}
                    value={b.value}
                    inverted={b.inverted}
                  />
                ))}
              </div>
            )}
          </section>

          <section className="content-card" style={cardStyle()}>
            <p style={miniLabelStyle()}>Destaques</p>

            <h2 className="content-title" style={{ margin: "6px 0 0", fontSize: 24 }}>
              Última avaliação
            </h2>

            <p style={{ margin: "8px 0 18px", color: "#64748b", lineHeight: 1.55 }}>
              Leitura rápida dos pontos mais importantes do perfil recente.
            </p>

            <div style={{ display: "grid", gap: 12 }}>
              <HighlightGroup
                title="Competências bem desenvolvidas"
                tone="green"
                items={highlights.strengths}
                empty="Nenhuma competência positiva em faixa alta."
              />

              <HighlightGroup
                title="Competências a desenvolver"
                tone="amber"
                items={highlights.develop}
                empty="Nenhuma competência positiva em faixa baixa."
              />

              <HighlightGroup
                title="Elementos negativos salientes"
                tone="red"
                items={highlights.negatives}
                empty="Nenhum elemento negativo em faixa alta."
              />
            </div>
          </section>
        </section>

        <section style={{ marginTop: 16 }}>
          <section className="content-card" style={cardStyle()}>
            <div className="chart-header">
              <div>
                <p style={miniLabelStyle()}>Evolução por escala</p>

                <h2 className="content-title" style={{ margin: "6px 0 0", fontSize: 24 }}>
                  Série temporal de percentis
                </h2>

                <p style={{ margin: "8px 0 0", color: "#64748b", lineHeight: 1.55 }}>
                  Selecione qualquer escala das seções ENDURE e Socioemocional core para acompanhar a curva de desenvolvimento.
                </p>
              </div>

              <div className="select-wrap">
                <label style={{ display: "block", fontWeight: 800, marginBottom: 8 }}>
                  Escala
                </label>

                <select
                  value={displayScaleName(scale)}
                  onChange={(e) => setScale(e.target.value)}
                  style={{
                    width: "100%",
                    height: 46,
                    padding: "0 12px",
                    borderRadius: 14,
                    border: "1px solid #d1d5db",
                    background: "#fff",
                    color: "#0f172a",
                    fontWeight: 700,
                  }}
                  disabled={availableScales.length === 0}
                >
                  {availableScales.length === 0 ? (
                    <option value="">Sem escalas disponíveis</option>
                  ) : (
                    availableScales.map((s) => (
                      <option key={s} value={s}>{displayScaleName(s)}</option>
                    ))
                  )}
                </select>
              </div>
            </div>

            <div style={{ marginTop: 20 }}>
              {loading ? (
                <EmptyBox text="Carregando dados..." />
              ) : rows.length === 0 ? (
                <EmptyBox text="Nenhuma avaliação submetida ainda." />
              ) : series.length === 0 ? (
                <EmptyBox text="Ainda não há pontos históricos para esta escala." />
              ) : (
                <PercentileChart
                  title={displayScaleName(scale)}
                  points={series.map((p) => ({
                    label: p.dateLabel,
                    y: Number(p.percentile),
                  }))}
                  compact={isMobile}
                />
              )}
            </div>
          </section>
        </section>

        <section className="content-card" style={{ ...cardStyle(), marginTop: 16 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 16,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <div>
              <p style={miniLabelStyle()}>Pendências</p>

              <h2 style={{ margin: "6px 0 0", fontSize: 22, lineHeight: 1.05 }}>
                {pendingCount > 0 ? pendingTitle(pendingCount) : "Nenhuma avaliação pendente"}
              </h2>

              <p style={{ margin: "8px 0 0", color: "#64748b" }}>
                {pendingCount > 0
                  ? latestPending?.title
                    ? `A mais recente é "${latestPending.title}".`
                    : "Há uma avaliação aguardando sua resposta."
                  : "Quando uma nova solicitação for designada, ela aparecerá aqui."}
              </p>
            </div>

            <Link
              href="/athlete/pending"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: 42,
                padding: "0 16px",
                borderRadius: 14,
                background: "#111827",
                color: "#fff",
                fontWeight: 900,
                textDecoration: "none",
              }}
            >
              Ver pendências
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

function pendingTitle(n: number) {
  if (n === 1) return "1 avaliação pendente";
  return `${n} avaliações pendentes`;
}


function getScoreMap(scoresJson: any): Record<string, any> {
  if (!scoresJson) return {};

  // Formato antigo
  if (
    scoresJson.scales &&
    typeof scoresJson.scales === "object" &&
    !Array.isArray(scoresJson.scales)
  ) {
    return scoresJson.scales;
  }

  // Formato atual principal
  if (
    scoresJson.factors_by_key &&
    typeof scoresJson.factors_by_key === "object" &&
    !Array.isArray(scoresJson.factors_by_key)
  ) {
    return scoresJson.factors_by_key;
  }

  // Formato atual alternativo
  if (Array.isArray(scoresJson.factors)) {
    const out: Record<string, any> = {};

    for (const f of scoresJson.factors) {
      const name = String(f?.scale ?? f?.score_scale ?? "").trim();
      if (name) out[name] = f;
    }

    return out;
  }

  return {};
}

function getPercentile(score: any): number | null {
  const v = score?.percentile ?? score?.percentil;

  if (typeof v === "number" && Number.isFinite(v)) return v;

  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function getLatestScoreMap(rows: Row[]): Record<string, any> {
  for (const r of [...rows].reverse()) {
    const map = getScoreMap(r.scores_json);
    if (Object.keys(map).length > 0) return map;
  }

  return {};
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
    <section className="stat-card" style={cardStyle({ padding: 18 })}>
      <p style={miniLabelStyle()}>{label}</p>

      <div
        className="stat-value"
        style={{
          marginTop: 8,
          fontSize: 30,
          fontWeight: 950,
          letterSpacing: -0.8,
          color: "#0f172a",
        }}
      >
        {value}
      </div>

      <p
        className="stat-helper"
        style={{
          margin: "8px 0 0",
          color: "#64748b",
          fontSize: 13,
        }}
      >
        {helper}
      </p>
    </section>
  );
}

function EmptyBox({ text }: { text: string }) {
  return (
    <div
      style={{
        padding: 18,
        borderRadius: 18,
        border: "1px dashed #cbd5e1",
        background: "#f8fafc",
        color: "#64748b",
        fontWeight: 700,
      }}
    >
      {text}
    </div>
  );
}

function ModelBar({
  label,
  helper,
  value,
  inverted,
}: {
  label: string;
  helper: string;
  value: number | null;
  inverted: boolean;
}) {
  const pct = value == null ? 0 : clamp100(value);
  const gradient = inverted
    ? "linear-gradient(90deg, #ef4444 0%, #f59e0b 50%, #38bdf8 100%)"
    : "linear-gradient(90deg, #38bdf8 0%, #facc15 50%, #f97316 100%)";

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ fontWeight: 900 }}>{label}</div>
          <div style={{ marginTop: 3, color: "#64748b", fontSize: 12.5, lineHeight: 1.45 }}>
            {helper}
          </div>
        </div>

        <div
          style={{
            fontWeight: 950,
            fontSize: 22,
            color: inverted ? "#b91c1c" : "#0f172a",
          }}
        >
          {value == null ? "—" : `${Math.round(pct)}`}
        </div>
      </div>

      <div
        style={{
          marginTop: 10,
          height: 16,
          borderRadius: 999,
          background: "#e5e7eb",
          overflow: "hidden",
          position: "relative",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            borderRadius: 999,
            background: gradient,
          }}
        />

        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(90deg, rgba(255,255,255,.22), rgba(255,255,255,0))",
          }}
        />
      </div>

      <div
        style={{
          marginTop: 5,
          display: "flex",
          justifyContent: "space-between",
          color: "#94a3b8",
          fontSize: 11,
          fontWeight: 800,
        }}
      >
        <span>{inverted ? "mais saliente" : "menor"}</span>
        <span>percentil</span>
        <span>{inverted ? "menos saliente" : "maior"}</span>
      </div>
    </div>
  );
}

function HighlightGroup({
  title,
  tone,
  items,
  empty,
}: {
  title: string;
  tone: "green" | "amber" | "red";
  items: ScaleScore[];
  empty: string;
}) {
  const palette = {
    green: {
      bg: "#ecfdf5",
      border: "#a7f3d0",
      title: "#065f46",
      chipBg: "#ffffff",
      chipBorder: "#6ee7b7",
    },
    amber: {
      bg: "#fffbeb",
      border: "#fde68a",
      title: "#92400e",
      chipBg: "#ffffff",
      chipBorder: "#fcd34d",
    },
    red: {
      bg: "#fef2f2",
      border: "#fecaca",
      title: "#991b1b",
      chipBg: "#ffffff",
      chipBorder: "#fca5a5",
    },
  }[tone];

  return (
    <div
      style={{
        borderRadius: 20,
        border: `1px solid ${palette.border}`,
        background: palette.bg,
        padding: 14,
      }}
    >
      <div style={{ fontWeight: 950, color: palette.title, marginBottom: 10 }}>
        {title}
      </div>

      {items.length === 0 ? (
        <div style={{ color: "#64748b", fontSize: 13, fontWeight: 700 }}>
          {empty}
        </div>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {items.map((s) => (
            <span
              key={s.scale}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                minHeight: 30,
                padding: "0 10px",
                borderRadius: 999,
                border: `1px solid ${palette.chipBorder}`,
                background: palette.chipBg,
                fontSize: 12.5,
                fontWeight: 850,
                color: "#0f172a",
              }}
            >
              {s.scale}
              <span style={{ color: "#64748b", fontWeight: 900 }}>
                P{s.percentile == null ? "—" : Math.round(s.percentile)}
              </span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function PercentileChart({
  title,
  points,
  compact = false,
}: {
  title: string;
  points: { label: string; y: number }[];
  compact?: boolean;
}) {
  const W = compact ? 430 : 920;
  const H = compact ? 455 : 340;
  const padL = compact ? 44 : 70;
  const padR = compact ? 16 : 24;
  const padT = 24;
  const padB = compact ? 62 : 46;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const xs = points.map((_, i) =>
    points.length === 1 ? padL + innerW / 2 : padL + (innerW * i) / (points.length - 1)
  );

  const ys = points.map((p) => padT + innerH * (1 - clamp100(p.y) / 100));

  const path = xs
    .map((x, i) => `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${ys[i].toFixed(2)}`)
    .join(" ");

  const areaPath =
    xs.length > 0
      ? `${path} L ${xs[xs.length - 1].toFixed(2)} ${(padT + innerH).toFixed(2)} L ${xs[0].toFixed(2)} ${(padT + innerH).toFixed(2)} Z`
      : "";

  const grid = [0, 25, 50, 75, 100];
  const maxLabels = compact ? 4 : 6;
  const step = points.length <= maxLabels ? 1 : Math.ceil(points.length / maxLabels);
  const last = points[points.length - 1];
  const gradId = `series-${normalizeKey(title) || "scale"}`;

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "center",
          marginBottom: 12,
          flexWrap: "wrap",
        }}
      >
        <strong style={{ fontSize: compact ? 20 : 22 }}>{title}</strong>

        <span
          style={{
            minHeight: 34,
            padding: "7px 12px",
            borderRadius: 999,
            background: "linear-gradient(135deg, #ecfeff, #dbeafe)",
            color: "#075985",
            border: "1px solid #7dd3fc",
            fontSize: compact ? 11.5 : 12.5,
            fontWeight: 900,
          }}
        >
          Último percentil: {last.y.toFixed(0)}
        </span>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: "100%", height: "auto", display: "block" }}
      >
        <defs>
          <linearGradient id={`${gradId}-line`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0ea5e9" />
            <stop offset="50%" stopColor="#14b8a6" />
            <stop offset="100%" stopColor="#22c55e" />
          </linearGradient>

          <linearGradient id={`${gradId}-area`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(20,184,166,0.28)" />
            <stop offset="100%" stopColor="rgba(20,184,166,0.03)" />
          </linearGradient>
        </defs>

        <rect x="0" y="0" width={W} height={H} rx="22" fill="#f8fafc" />

        {grid.map((g) => {
          const y = padT + innerH * (1 - g / 100);

          return (
            <g key={g}>
              <line
                x1={padL}
                x2={W - padR}
                y1={y}
                y2={y}
                stroke="#dbeafe"
                strokeWidth="1"
              />
              <text x={padL - 12} y={y + 4} fontSize="11" fill="#64748b" textAnchor="end">
                {g}
              </text>
            </g>
          );
        })}

        {areaPath ? (
          <path d={areaPath} fill={`url(#${gradId}-area)`} stroke="none" />
        ) : null}

        <path
          d={path}
          fill="none"
          stroke={`url(#${gradId}-line)`}
          strokeWidth={compact ? 4 : 4}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {xs.map((x, i) => (
          <circle key={i} cx={x} cy={ys[i]} r={compact ? 5.5 : 5} fill="#0f766e" />
        ))}

        {points.map((p, i) => {
          if (i % step !== 0 && i !== points.length - 1) return null;

          return (
            <text
              key={`${p.label}-${i}`}
              x={xs[i]}
              y={H - 18}
              fontSize={compact ? "10.5" : "11"}
              fill="#64748b"
              textAnchor="middle"
            >
              {p.label}
            </text>
          );
        })}

        <text
          x="18"
          y={padT + innerH / 2}
          fontSize="12"
          fill="#64748b"
          transform={`rotate(-90 18 ${padT + innerH / 2})`}
          textAnchor="middle"
        >
          Percentil
        </text>
      </svg>
    </div>
  );
}