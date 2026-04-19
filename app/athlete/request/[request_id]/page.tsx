"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../../src/lib/supabaseClient";
import { getMyAthleteId } from "../../../../src/lib/athlete";

type Req = {
  request_id: string;
  athlete_id: string;
  title: string;
  status: string;
  instrument_version: string;
  reference_window: string | null;
  selection_json: any;
};

type DictRow = {
  quest_section: string;
  scale: string | null;
  factor: string | null;
};

const SECTION_ORDER = [
  "Identification",
  "Training",
  "ENDURE",
  "Rest & well-being",
  "Socioemotional core",
];

function statusLabel(status?: string | null) {
  if (status === "pending") return "Pendente";
  if (status === "in_progress") return "Em andamento";
  if (status === "submitted") return "Submetida";
  return status || "Sem status";
}

function statusStyle(status?: string | null): React.CSSProperties {
  if (status === "pending") {
    return {
      background: "#fff7ed",
      border: "1px solid #fed7aa",
      color: "#9a3412",
    };
  }

  if (status === "in_progress") {
    return {
      background: "#eff6ff",
      border: "1px solid #bfdbfe",
      color: "#1d4ed8",
    };
  }

  if (status === "submitted") {
    return {
      background: "#f0fdf4",
      border: "1px solid #bbf7d0",
      color: "#166534",
    };
  }

  return {
    background: "#f8fafc",
    border: "1px solid #e5e7eb",
    color: "#475569",
  };
}

export default function RequestDetailPage() {
  const params = useParams();
  const requestId = String(params.request_id ?? "");

  const [req, setReq] = useState<Req | null>(null);
  const [dict, setDict] = useState<DictRow[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!requestId) return;

    (async () => {
      try {
        setErr(null);

        const athleteId = await getMyAthleteId();

        const { data: r, error: e1 } = await supabase
          .from("assessment_requests")
          .select(
            "request_id, athlete_id, title, status, instrument_version, reference_window, selection_json"
          )
          .eq("request_id", requestId)
          .single();

        if (e1) throw e1;
        if ((r as any).athlete_id !== athleteId) {
          throw new Error("Você não tem acesso a esta pendência.");
        }

        setReq(r as Req);

        const { data: d, error: e2 } = await supabase
          .from("instrument_items")
          .select("quest_section, scale, factor")
          .eq("instrument_version", (r as any).instrument_version);

        if (e2) throw e2;
        setDict((d as DictRow[]) ?? []);
      } catch (e: any) {
        setErr(e.message ?? "Erro ao carregar pendência.");
      }
    })();
  }, [requestId]);

  const grouped = useMemo(() => {
    if (!req) return {} as Record<string, Record<string, Set<string>>>;

    const selSections: string[] = req.selection_json?.sections ?? [];
    const selScales: Record<string, string[]> = req.selection_json?.scales ?? {};

    const out: Record<string, Record<string, Set<string>>> = {};

    for (const row of dict) {
      const sec = (row.quest_section || "").trim();
      const sc = (row.scale || "—").trim();
      const fa = (row.factor || "").trim();

      if (!sec || !sc) continue;
      if (selSections.length && !selSections.includes(sec)) continue;
      if (selScales?.[sec]?.length && !selScales[sec].includes(sc)) continue;

      out[sec] ??= {};
      out[sec][sc] ??= new Set();
      if (fa) out[sec][sc].add(fa);
    }

    return out;
  }, [req, dict]);

  const sections = useMemo(() => {
    const keys = Object.keys(grouped);
    return keys.sort((a, b) => {
      const ia = SECTION_ORDER.indexOf(a);
      const ib = SECTION_ORDER.indexOf(b);
      if (ia === -1 && ib === -1) return a.localeCompare(b);
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });
  }, [grouped]);

  const totalScales = useMemo(() => {
    let n = 0;
    for (const sec of sections) {
      n += Object.keys(grouped[sec] ?? {}).length;
    }
    return n;
  }, [grouped, sections]);

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
          href="/athlete/pending"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            textDecoration: "none",
            color: "#475569",
            fontWeight: 700,
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
            fontWeight: 800,
            letterSpacing: 0.3,
          }}
        >
          Solicitação de avaliação
        </div>

        {req ? (
          <>
            <h1
              style={{
                margin: "14px 0 10px",
                fontSize: 30,
                lineHeight: 1.1,
                letterSpacing: -0.6,
                color: "#0f172a",
              }}
            >
              {req.title}
            </h1>

            <div
              style={{
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  ...statusStyle(req.status),
                  borderRadius: 999,
                  padding: "6px 10px",
                  fontSize: 12,
                  fontWeight: 800,
                }}
              >
                {statusLabel(req.status)}
              </span>

              {req.reference_window ? (
                <span
                  style={{
                    borderRadius: 999,
                    padding: "6px 10px",
                    fontSize: 12,
                    fontWeight: 700,
                    background: "#f8fafc",
                    border: "1px solid #e5e7eb",
                    color: "#475569",
                  }}
                >
                  {req.reference_window}
                </span>
              ) : null}
            </div>

            <p
              style={{
                margin: "14px 0 0",
                color: "#64748b",
                lineHeight: 1.75,
                fontSize: 15,
                maxWidth: 760,
              }}
            >
              Esta solicitação foi organizada em blocos. Você pode responder
              cada escala separadamente a partir das seções abaixo.
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
              {totalScales} {totalScales === 1 ? "escala" : "escalas"}
            </div>
          </>
        ) : (
          <div
            style={{
              marginTop: 14,
              color: "#64748b",
              lineHeight: 1.7,
            }}
          >
            Carregando pendência...
          </div>
        )}
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

      {req && sections.length === 0 ? (
        <section
          style={{
            border: "1px solid #e5e7eb",
            background: "#ffffff",
            borderRadius: 24,
            padding: 20,
            boxShadow: "0 18px 48px rgba(15,23,42,.04)",
          }}
        >
          <div
            style={{
              fontWeight: 800,
              color: "#0f172a",
              fontSize: 16,
            }}
          >
            Nenhum bloco disponível.
          </div>

          <div
            style={{
              marginTop: 6,
              color: "#4b5563",
              fontSize: 14,
              lineHeight: 1.7,
            }}
          >
            Esta pendência não possui seções ou escalas disponíveis para resposta.
          </div>
        </section>
      ) : null}

      <section style={{ display: "grid", gap: 14 }}>
        {sections.map((sec) => {
          const scales = Object.keys(grouped[sec] ?? {}).sort((a, b) =>
            a.localeCompare(b)
          );

          return (
            <article
              key={sec}
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
              <div>
                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 900,
                    color: "#0f172a",
                    lineHeight: 1.25,
                  }}
                >
                  {sec}
                </div>
              </div>

              <div style={{ display: "grid", gap: 12 }}>
                {scales.map((sc) => {
                  const href = `/athlete/questionnaire?request_id=${encodeURIComponent(
                    req!.request_id
                  )}&section=${encodeURIComponent(sec)}&scale=${encodeURIComponent(sc)}`;

                  return (
                    <div
                      key={sc}
                      style={{
                        border: "1px solid #f1f5f9",
                        borderRadius: 18,
                        padding: 14,
                        background: "#fcfcfd",
                        display: "grid",
                        gap: 12,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 16,
                          fontWeight: 800,
                          color: "#0f172a",
                          lineHeight: 1.4,
                        }}
                      >
                        {sc}
                      </div>

                      <div>
                        <a
                          href={href}
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
                            minHeight: 46,
                            textDecoration: "none",
                            width: "100%",
                            maxWidth: 220,
                          }}
                        >
                          Responder <span aria-hidden="true">→</span>
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}