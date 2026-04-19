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
  ) {
    return "multi";
  }

  if (
    s.includes("multiple choice") ||
    s.includes("single choice") ||
    s.includes("radio") ||
    s.includes("escolha única") ||
    s.includes("choose best option") ||
    s.includes("scale") ||
    s.includes("likert") ||
    s.includes("escala")
  ) {
    return "single";
  }

  if (
    s.includes("short text") ||
    s.includes("texto curto") ||
    s.includes("text") ||
    s.includes("numeric")
  ) {
    return "text";
  }

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

  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [assessmentId, setAssessmentId] = useState<string | null>(null);

  const [requestId, setRequestId] = useState<string>("");
  const [section, setSection] = useState<string>("");
  const [scale, setScale] = useState<string>("");

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    setRequestId(sp.get("request_id") ?? "");
    setSection(sp.get("section") ?? "");
    setScale(sp.get("scale") ?? "");
  }, []);

  useEffect(() => {
    if (!section || !scale) return;

    (async () => {
      try {
        setErr(null);
        const athleteId = await getMyAthleteId();

        if (requestId) {
          await supabase
            .from("assessment_requests")
            .update({ status: "in_progress" })
            .eq("request_id", requestId);
        }

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

  useEffect(() => {
    if (!section || !scale) return;

    (async () => {
      setErr(null);
      setMsg(null);

      const { data, error } = await supabase
        .from("instrument_items")
        .select(
          "itemcode, quest_section, type, scale, factor, item_text_port, instruction, opt_json"
        )
        .eq("instrument_version", version)
        .eq("quest_section", section)
        .eq("scale", scale);

      if (error) {
        setErr(error.message);
        return;
      }

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

  const answerableItems = useMemo(() => {
    return items.filter((it) => optionsFrom(it.opt_json).length > 0);
  }, [items]);

  const answeredCount = useMemo(() => {
    let count = 0;
    for (const it of answerableItems) {
      const kind0 = typeKind(it.type);
      const opts = optionsFrom(it.opt_json);
      const kind = kind0 === "auto" ? (opts.length ? "single" : "text") : kind0;
      const val = answers[it.itemcode];

      if (kind === "multi") {
        if (Array.isArray(val) && val.length > 0) count++;
      } else if (val) {
        count++;
      }
    }
    return count;
  }, [answerableItems, answers]);

  function setAnswer(itemcode: string, value: any) {
    setAnswers((prev) => ({ ...prev, [itemcode]: value }));
  }

  function toggleMulti(itemcode: string, opt: string) {
    const cur: string[] = Array.isArray(answers[itemcode])
      ? answers[itemcode]
      : [];
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

      setMsg("Rascunho salvo.");
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
      setErr(`Faltam respostas em ${missing.length} itens.`);
      return;
    }

    try {
      if (!assessmentId) throw new Error("Avaliação ainda não foi criada.");

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

      if (requestId) {
        const { error: e2 } = await supabase
          .from("assessment_requests")
          .update({ status: "submitted" })
          .eq("request_id", requestId);

        if (e2) throw e2;
      }

      setMsg("Avaliação enviada com sucesso. Ela aparecerá no histórico.");
      setErr(null);
    } catch (e: any) {
      setErr(e.message ?? "Erro ao finalizar.");
    }
  }

  return (
    <div
      style={{
        maxWidth: 920,
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
          href={requestId ? `/athlete/request/${requestId}` : "/athlete/dashboard"}
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
          Questionário
        </div>

        <h1
          style={{
            margin: "14px 0 8px",
            fontSize: 28,
            lineHeight: 1.1,
            letterSpacing: -0.6,
            color: "#0f172a",
          }}
        >
          {section || "Avaliação"}
        </h1>

        <div
          style={{
            color: "#475569",
            fontSize: 16,
            fontWeight: 700,
            lineHeight: 1.6,
          }}
        >
          {scale}
        </div>

        {instruction ? (
          <div
            style={{
              marginTop: 14,
              padding: 14,
              border: "1px solid #e5e7eb",
              borderRadius: 16,
              background: "#f8fafc",
              color: "#475569",
              lineHeight: 1.75,
              fontSize: 14,
            }}
          >
            {instruction}
          </div>
        ) : null}

        <div
          style={{
            marginTop: 16,
            display: "grid",
            gap: 8,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <div style={{ color: "#475569", fontSize: 14, fontWeight: 700 }}>
              Progresso
            </div>
            <div style={{ color: "#64748b", fontSize: 13 }}>
              {answeredCount} de {answerableItems.length} respondidos
            </div>
          </div>

          <div
            style={{
              height: 10,
              background: "#e5e7eb",
              borderRadius: 999,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width:
                  answerableItems.length > 0
                    ? `${(answeredCount / answerableItems.length) * 100}%`
                    : "0%",
                height: "100%",
                background:
                  "linear-gradient(90deg, #2563eb 0%, #1d4ed8 100%)",
                borderRadius: 999,
              }}
            />
          </div>
        </div>

        <div
          style={{
            marginTop: 18,
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={saveDraft}
            style={{
              minHeight: 46,
              padding: "12px 16px",
              borderRadius: 14,
              border: "1px solid #cbd5e1",
              background: "#fff",
              color: "#0f172a",
              fontWeight: 800,
              fontSize: 14,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Salvar rascunho
          </button>

          <button
            onClick={submit}
            style={{
              minHeight: 46,
              padding: "12px 16px",
              borderRadius: 14,
              border: "1px solid #0f172a",
              background: "#0f172a",
              color: "#fff",
              fontWeight: 800,
              fontSize: 14,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Finalizar avaliação
          </button>
        </div>

        {err ? (
          <div
            style={{
              marginTop: 14,
              padding: 14,
              border: "1px solid #fecaca",
              background: "#fff1f2",
              borderRadius: 16,
              color: "#9f1239",
              lineHeight: 1.7,
            }}
          >
            {err}
          </div>
        ) : null}

        {msg ? (
          <div
            style={{
              marginTop: 14,
              padding: 14,
              border: "1px solid #bbf7d0",
              background: "#f0fdf4",
              borderRadius: 16,
              color: "#166534",
              lineHeight: 1.7,
            }}
          >
            {msg}
          </div>
        ) : null}
      </section>

      <section style={{ display: "grid", gap: 14 }}>
        {factorKeys.map((f) => (
          <div
            key={f}
            style={{
              background: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: 22,
              padding: 18,
              boxShadow: "0 18px 48px rgba(15,23,42,.05)",
              display: "grid",
              gap: 14,
            }}
          >
            {f !== "—" ? (
              <div
                style={{
                  fontWeight: 900,
                  fontSize: 18,
                  color: "#0f172a",
                }}
              >
                {f}
              </div>
            ) : null}

            <div style={{ display: "grid", gap: 16 }}>
              {byFactor[f].map((it, idx) => {
                const kind0 = typeKind(it.type);
                const opts = optionsFrom(it.opt_json);
                const kind = kind0 === "auto" ? (opts.length ? "single" : "text") : kind0;

                return (
                  <div
                    key={it.itemcode}
                    style={{
                      paddingTop: idx === 0 ? 0 : 14,
                      borderTop: idx === 0 ? "none" : "1px solid #f1f5f9",
                      display: "grid",
                      gap: 12,
                    }}
                  >
                    <div
                      style={{
                        color: "#0f172a",
                        fontSize: 16,
                        lineHeight: 1.7,
                        fontWeight: 500,
                      }}
                    >
                      {it.item_text_port}
                    </div>

                    {kind === "text" && opts.length === 0 ? (
                      <input
                        value={answers[it.itemcode] ?? ""}
                        onChange={(e) => setAnswer(it.itemcode, e.target.value)}
                        style={{
                          width: "100%",
                          minHeight: 48,
                          padding: "12px 14px",
                          borderRadius: 14,
                          border: "1px solid #cbd5e1",
                          background: "#fff",
                          color: "#0f172a",
                          fontSize: 15,
                          outline: "none",
                          fontFamily: "inherit",
                        }}
                        placeholder="Digite sua resposta"
                      />
                    ) : null}

                    {opts.length > 0 && kind === "single" ? (
                      <div style={{ display: "grid", gap: 10 }}>
                        {opts.map((o) => {
                          const checked = answers[it.itemcode] === o;
                          return (
                            <label
                              key={o}
                              style={{
                                display: "flex",
                                gap: 12,
                                alignItems: "flex-start",
                                padding: "12px 14px",
                                borderRadius: 16,
                                border: checked
                                  ? "1px solid #93c5fd"
                                  : "1px solid #e5e7eb",
                                background: checked ? "#eff6ff" : "#fff",
                                cursor: "pointer",
                              }}
                            >
                              <input
                                type="radio"
                                name={it.itemcode}
                                checked={checked}
                                onChange={() => setAnswer(it.itemcode, o)}
                                style={{ marginTop: 2 }}
                              />
                              <span
                                style={{
                                  color: "#0f172a",
                                  lineHeight: 1.7,
                                  fontSize: 15,
                                }}
                              >
                                {o}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    ) : null}

                    {opts.length > 0 && kind === "multi" ? (
                      <div style={{ display: "grid", gap: 10 }}>
                        {opts.map((o) => {
                          const cur: string[] = Array.isArray(answers[it.itemcode])
                            ? answers[it.itemcode]
                            : [];
                          const checked = cur.includes(o);

                          return (
                            <label
                              key={o}
                              style={{
                                display: "flex",
                                gap: 12,
                                alignItems: "flex-start",
                                padding: "12px 14px",
                                borderRadius: 16,
                                border: checked
                                  ? "1px solid #93c5fd"
                                  : "1px solid #e5e7eb",
                                background: checked ? "#eff6ff" : "#fff",
                                cursor: "pointer",
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleMulti(it.itemcode, o)}
                                style={{ marginTop: 2 }}
                              />
                              <span
                                style={{
                                  color: "#0f172a",
                                  lineHeight: 1.7,
                                  fontSize: 15,
                                }}
                              >
                                {o}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}