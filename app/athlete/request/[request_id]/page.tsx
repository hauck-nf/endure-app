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

export default function RequestDetail() {
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
        if ((r as any).athlete_id !== athleteId)
          throw new Error("Você não tem acesso a esta pendência.");

        setReq(r as any);

        const { data: d, error: e2 } = await supabase
          .from("instrument_items")
          .select("quest_section, scale, factor")
          .eq("instrument_version", (r as any).instrument_version);

        if (e2) throw e2;
        setDict((d as any) ?? []);
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
    return keys.sort(
      (a, b) => SECTION_ORDER.indexOf(a) - SECTION_ORDER.indexOf(b)
    );
  }, [grouped]);

  return (
    <div style={{ maxWidth: 950, margin: "40px auto", fontFamily: "system-ui" }}>
      <a href="/athlete/pending">← Voltar</a>

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

      {req && (
        <>
          <h2 style={{ marginTop: 12 }}>{req.title}</h2>
          <div style={{ color: "#6b7280" }}>
            status: {req.status}{" "}
            {req.reference_window ? `· ${req.reference_window}` : ""}
          </div>

          {sections.map((sec) => (
            <div
              key={sec}
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                padding: 14,
                marginTop: 14,
              }}
            >
              <h3 style={{ marginTop: 0 }}>{sec}</h3>

              {Object.keys((grouped as any)[sec] ?? {})
                .sort()
                .map((sc) => {
                  const href = `/athlete/questionnaire?request_id=${encodeURIComponent(
                    req.request_id
                  )}&section=${encodeURIComponent(sec)}&scale=${encodeURIComponent(
                    sc
                  )}`;

                  return (
                    <div
                      key={sc}
                      style={{
                        padding: "10px 0",
                        borderTop: "1px solid #f3f4f6",
                      }}
                    >
                      <b>{sc}</b>{" "}
                      <a style={{ marginLeft: 10 }} href={href}>
                        Responder
                      </a>
                    </div>
                  );
                })}
            </div>
          ))}
        </>
      )}
    </div>
  );
}