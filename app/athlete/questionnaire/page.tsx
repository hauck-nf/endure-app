"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../src/lib/supabaseClient";
import { getMyAthleteId } from "../../../src/lib/athlete";

type Item = {
  itemcode: string;
  quest_section: string;
  type: string;
  scale: string | null;
  factor: string | null;
  item_text_port: string;
  instruction: string | null;
  opt_json: Record<string, string> | null;
};

function typeKind(t: string | null | undefined) {
  const s = (t || "").toLowerCase();
  if (
    s.includes("multiple response") ||
    s.includes("pick more than one") ||
    s.includes("checkbox") ||
    s.includes("múltiplas") ||
    s.includes("caixa de seleção") ||
    s.includes("select all")
  )
    return "multi";

  if (
    s.includes("multiple choice") ||
    s.includes("single choice") ||
    s.includes("radio") ||
    s.includes("escolha única") ||
    s.includes("choose best option") ||
    s.includes("scale") ||
    s.includes("likert") ||
    s.includes("escala")
  )
    return "single";

  if (
    s.includes("short text") ||
    s.includes("texto curto") ||
    s.includes("text") ||
    s.includes("numeric")
  )
    return "text";

  return "auto";
}

function optionsFrom(opt_json: Record<string, string> | null) {
  if (!opt_json) return [];
  return Object.keys(opt_json)
    .sort((a, b) => {
      const na = parseInt(a.replace("opt", ""), 10);
      const nb = parseInt(b.replace("opt", ""), 10);
      return na - nb;
    })
    .map((k) => opt_json[k])
    .filter(Boolean);
}

export default function QuestionnairePage() {
  const version = process.env.NEXT_PUBLIC_INSTRUMENT_VERSION!;

  const [items, setItems] = useState<Item[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  // respostas: itemcode -> string | string[]
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [assessmentId, setAssessmentId] = useState<string | null>(null);

  // query params
  const [requestId, setRequestId] = useState<string>("");
  const [section, setSection] = useState<string>("");
  const [scale, setScale] = useState<string>("");

  // 1) Ler query params (request_id, section, scale)
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    setRequestId(sp.get("request_id") ?? "");
    setSection(sp.get("section") ?? "");
    setScale(sp.get("scale") ?? "");
  }, []);

  // 2) Criar/Reaproveitar assessment (se requestId existir, vincular ao request)
  useEffect(() => {
    if (!section || !scale) return;

    (async () => {
      try {
        setErr(null);
        const athleteId = await getMyAthleteId();

        // se veio de pendência, marca como in_progress (precisa policy de update para atleta)
        if (requestId) {
          await supabase
            .from("assessment_requests")
            .update({ status: "in_progress" })
            .eq("request_id", requestId);
        }

        // procura assessment in_progress (filtra por request_id quando houver)
        const q = supabase
          .from("assessments")
          .select("assessment_id, raw_responses")
          .eq("athlete_id", athleteId)
          .eq("instrument_version", version)
          .eq("status", "in_progress");

        if (requestId) q.eq("request_id", requestId);

        const { data: existing, error: e0 } = await q
          .order("created_at", { ascending: false })
          .limit(1);

        if (e0) throw e0;

        if (existing && existing.length > 0) {
          setAssessmentId(existing[0].assessment_id);
          if (existing[0].raw_responses) setAnswers(existing[0].raw_responses);
          return;
        }

        // cria um novo assessment
        const { data: created, error } = await supabase
          .from("assessments")
         .insert({
  athlete_id: athleteId,
  request_id: requestId || null,
  instrument_version: version,
  reference_window: "últimos 7 dias",
  status: "in_progress",
  raw_responses: {},
  raw_meta: { section, scale },
})
          .select("assessment_id")
          .single();

        if (error) throw error;
        setAssessmentId(created.assessment_id);
      } catch (e: any) {
        setErr(e.message ?? "Erro ao criar/abrir avaliação.");
      }
    })();
  }, [section, scale, version, requestId]);

  // 3) Carregar itens do dicionário
  useEffect(() => {
    if (!section || !scale) return;

    (async () => {
      setErr(null);
      setMsg(null);

      const { data, error } = await supabase
        .from("instrument_items")
        .select("itemcode, quest_section, type, scale, factor, item_text_port, instruction, opt_json")
        .eq("instrument_version", version)
        .eq("quest_section", section)
        .eq("scale", scale);

      if (error) return setErr(error.message);

      setItems(((data as Item[]) ?? []).slice());
    })();
  }, [version, section, scale]);

  const instruction = useMemo(() => {
    const v = items.find((i) => i.instruction && String(i.instruction).trim())
      ?.instruction;
    return v ? String(v).trim() : null;
  }, [items]);

  const byFactor = useMemo(() => {
    const map: Record<string, Item[]> = {};
    for (const it of items) {
      const f = (it.factor || "").trim() || "—";
      map[f] ??= [];
      map[f].push(it);
    }
    return map;
  }, [items]);

  const factorKeys = useMemo(() => {
    const ks = Object.keys(byFactor);
    return ks.sort((a, b) =>
      a === "—" ? 1 : b === "—" ? -1 : a.localeCompare(b)
    );
  }, [byFactor]);

  function setAnswer(itemcode: string, value: any) {
    setAnswers((prev) => ({ ...prev, [itemcode]: value }));
  }

  function toggleMulti(itemcode: string, opt: string) {
    const cur: string[] = Array.isArray(answers[itemcode]) ? answers[itemcode] : [];
    const has = cur.includes(opt);
    const next = has ? cur.filter((x) => x !== opt) : [...cur, opt];
    setAnswer(itemcode, next);
  }

  async function saveDraft() {
    try {
      if (!assessmentId) throw new Error("Avaliação ainda não foi criada.");
      setErr(null);

      const { error } = await supabase
        .from("assessments")
        .update({ raw_responses: answers, raw_meta: { section, scale } })        
        .eq("assessment_id", assessmentId);

      if (error) throw error;

      setMsg("Rascunho salvo no banco.");
      setTimeout(() => setMsg(null), 2000);
    } catch (e: any) {
      setErr(e.message ?? "Erro ao salvar rascunho.");
    }
  }

  async function submit() {
    const missing = items.filter((it) => {
      const kind = typeKind(it.type);
      const opts = optionsFrom(it.opt_json);
      const val = answers[it.itemcode];

      if (kind === "text" && opts.length === 0) return false;
      if (opts.length === 0) return false;

      if (kind === "multi") return !Array.isArray(val) || val.length === 0;
      return !val;
    });

    if (missing.length) {
      setErr(`Faltam respostas em ${missing.length} itens (com alternativas).`);
      return;
    }

    try {
      if (!assessmentId) throw new Error("Avaliação ainda não foi criada.");

      // 1) Finaliza assessment
      const { error } = await supabase
        .from("assessments")
        .update({
  raw_responses: answers,
  raw_meta: { section, scale },
  status: "submitted",
  submitted_at: new Date().toISOString(),
})
        .eq("assessment_id", assessmentId);

      if (error) throw error;

await fetch("/api/score", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ assessment_id: assessmentId }),
});

      // 2) Se veio de pendência, marca request como submitted
      if (requestId) {
        const { error: e2 } = await supabase
          .from("assessment_requests")
          .update({ status: "submitted" })
          .eq("request_id", requestId);

        if (e2) throw e2;
      }

      setMsg("Avaliação enviada e salva. Ela aparecerá no Histórico.");
      setErr(null);
    } catch (e: any) {
      setErr(e.message ?? "Erro ao finalizar.");
    }
  }

  return (
    <div style={{ maxWidth: 950, margin: "40px auto", fontFamily: "system-ui" }}>
      <a href={requestId ? `/athlete/request/${requestId}` : "/athlete"}>← Voltar</a>

      <h2 style={{ marginTop: 12 }}>{section}</h2>
      <h3 style={{ marginTop: 0, color: "#374151" }}>{scale}</h3>

      {instruction && (
        <div
          style={{
            padding: 12,
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            background: "#fafafa",
          }}
        >
          {instruction}
        </div>
      )}

      <div style={{ marginTop: 14, display: "flex", gap: 10 }}>
        <button onClick={saveDraft} style={{ padding: "10px 12px" }}>
          Salvar rascunho
        </button>
        <button onClick={submit} style={{ padding: "10px 12px" }}>
          Finalizar
        </button>
      </div>

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
      {msg && (
        <div
          style={{
            marginTop: 12,
            padding: 12,
            border: "1px solid #10b981",
            borderRadius: 12,
            color: "#065f46",
          }}
        >
          {msg}
        </div>
      )}

      <div style={{ marginTop: 18 }}>
        {factorKeys.map((f) => (
          <div key={f} style={{ marginTop: 16 }}>
            {f !== "—" && <h4 style={{ marginBottom: 8 }}>{f}</h4>}

            {byFactor[f].map((it) => {
              const kind0 = typeKind(it.type);
              const opts = optionsFrom(it.opt_json);
              const kind = kind0 === "auto" ? (opts.length ? "single" : "text") : kind0;

              return (
                <div
                  key={it.itemcode}
                  style={{ padding: "12px 0", borderTop: "1px solid #f3f4f6" }}
                >
                  <div style={{ marginBottom: 8 }}>{it.item_text_port}</div>

                  {kind === "text" && opts.length === 0 && (
                    <input
                      value={answers[it.itemcode] ?? ""}
                      onChange={(e) => setAnswer(it.itemcode, e.target.value)}
                      style={{ width: "100%", padding: 10 }}
                      placeholder="Resposta"
                    />
                  )}

                  {opts.length > 0 && kind === "single" && (
                    <div style={{ display: "grid", gap: 6 }}>
                      {opts.map((o) => (
                        <label
                          key={o}
                          style={{ display: "flex", gap: 10, alignItems: "flex-start" }}
                        >
                          <input
                            type="radio"
                            name={it.itemcode}
                            checked={answers[it.itemcode] === o}
                            onChange={() => setAnswer(it.itemcode, o)}
                          />
                          <span>{o}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {opts.length > 0 && kind === "multi" && (
                    <div style={{ display: "grid", gap: 6 }}>
                      {opts.map((o) => {
                        const cur: string[] = Array.isArray(answers[it.itemcode]) ? answers[it.itemcode] : [];
                        const checked = cur.includes(o);
                        return (
                          <label
                            key={o}
                            style={{ display: "flex", gap: 10, alignItems: "flex-start" }}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleMulti(it.itemcode, o)}
                            />
                            <span>{o}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}