"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../../src/lib/supabaseClient";
import { getMyAthleteId } from "../../../../src/lib/athlete";

type Assessment = {
  assessment_id: string;
  athlete_id: string;
  instrument_version: string;
  status: string;
  created_at: string;
  submitted_at: string | null;
  raw_meta: any;
  raw_responses: any;
};

type Scores = {
  readiness_score: number | null;
  scores_json: any;
  computed_at: string | null;
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export default function AssessmentDetailPage() {
  const params = useParams();
  const assessmentId = String(params.assessment_id ?? "");

  const [a, setA] = useState<Assessment | null>(null);
  const [s, setS] = useState<Scores | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!assessmentId) return;

    (async () => {
      try {
        setErr(null);
        const athleteId = await getMyAthleteId();

        const { data: ad, error: e1 } = await supabase
          .from("assessments")
          .select("assessment_id, athlete_id, instrument_version, status, created_at, submitted_at, raw_meta, raw_responses")
          .eq("assessment_id", assessmentId)
          .single();

        if (e1) throw e1;
        if ((ad as any).athlete_id !== athleteId) throw new Error("Você não tem acesso a esta avaliação.");

        setA(ad as any);

        const { data: sd, error: e2 } = await supabase
          .from("assessment_scores")
          .select("readiness_score, scores_json, computed_at")
          .eq("assessment_id", assessmentId)
          .maybeSingle();

        if (e2) throw e2;
        setS((sd as any) ?? null);
      } catch (e: any) {
        setErr(e.message ?? "Erro ao carregar detalhes.");
      }
    })();
  }, [assessmentId]);

  const when = useMemo(() => {
    if (!a) return { date: "—", time: "—" };
    const dt = new Date(a.submitted_at ?? a.created_at);
    return { date: dt.toLocaleDateString(), time: `${pad2(dt.getHours())}:${pad2(dt.getMinutes())}` };
  }, [a]);

  const instruments = useMemo(() => {
    // Prioriza raw_meta (quando existe) e complementa com as escalas pontuadas (scores_json.scales)
    const out: { section?: string; scale?: string }[] = [];

    const meta = a?.raw_meta ?? null;
    if (meta?.section || meta?.scale) out.push({ section: meta.section, scale: meta.scale });

    const scalesObj = s?.scores_json?.scales ?? null;
    if (scalesObj) {
      const keys = Object.keys(scalesObj);
      // como scores_json está por escala, colocamos como lista simples
      keys.forEach((k) => out.push({ section: "ENDURE/Training", scale: k }));
    }

    // remove duplicados
    const seen = new Set<string>();
    return out.filter((x) => {
      const key = `${x.section ?? ""}||${x.scale ?? ""}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [a, s]);


  return (
    <div style={{ maxWidth: 980 }}>
      <a href="/athlete/history">← Voltar</a>
      <h2>Detalhes da avaliação</h2>

      {err && (
        <div style={{ padding: 12, border: "1px solid #ef4444", borderRadius: 12, color: "#b91c1c" }}>
          {err}
        </div>
      )}

      {!a ? (
        <div style={{ marginTop: 12, color: "#6b7280" }}>Carregando…</div>
      ) : (
        <>
          <div style={{ marginTop: 12, border: "1px solid #e5e7eb", borderRadius: 12, padding: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <div style={{ color: "#6b7280" }}>Avaliação</div>
                <div>{a.instrument_version}</div>
              </div>
              <div>
                <div style={{ color: "#6b7280" }}>Status</div>
                <div>{a.status}</div>
              </div>
              <div>
                <div style={{ color: "#6b7280" }}>Data</div>
                <div>{when.date}</div>
              </div>
              <div>
                <div style={{ color: "#6b7280" }}>Hora</div>
                <div>{when.time}</div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 12, border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ padding: 12, background: "#fafafa", borderBottom: "1px solid #e5e7eb" }}>
              <b>Instrumentos/Blocos respondidos</b>
            </div>

            {instruments.length === 0 ? (
              <div style={{ padding: 14, color: "#6b7280" }}>Sem informações de instrumentos para esta avaliação.</div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", padding: 12, borderBottom: "1px solid #e5e7eb" }}>Seção</th>
                    <th style={{ textAlign: "left", padding: 12, borderBottom: "1px solid #e5e7eb" }}>Escala</th>
                  </tr>
                </thead>
                <tbody>
                  {instruments.map((x, i) => (
                    <tr key={i}>
                      <td style={{ padding: 12, borderBottom: "1px solid #f3f4f6" }}>{x.section ?? "—"}</td>
                      <td style={{ padding: 12, borderBottom: "1px solid #f3f4f6" }}>{x.scale ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}