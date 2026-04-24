"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../../src/lib/supabaseClient";

type DictItem = {
  itemcode: string;
  quest_section: string;
  type: string;
  scale: string | null;
  factor: string | null;
  item_text_port: string;
  instruction: string | null;
  opt_json: Record<string, string> | null;
};

type RequestRow = {
  request_id: string;
  athlete_id: string;
  title: string;
  status: string;
  instrument_version: string;
  reference_window: string | null;
  selection_json: any;
};

type AthleteRow = {
  full_name: string | null;
  birth_date: string | null;
  sex: string | null;
  sport_primary: string | null;
  team: string | null;
};

const SECTION_ORDER = [
  "Identification",
  "Training",
  "ENDURE",
  "Rest & well-being",
  "Socioemocional core",
];

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
    .filter((k) => k.toLowerCase().startsWith("opt"))
    .sort((a, b) => Number(a.replace(/opt/i, "")) - Number(b.replace(/opt/i, "")))
    .map((k) => String(opt_json[k] ?? "").trim())
    .filter(Boolean);
}

async function fetchJsonWithTimeout(url: string, body: any, ms = 30000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });

    const json = await res.json().catch(() => ({} as any));
    return { ok: res.ok, json, status: res.status };
  } finally {
    clearTimeout(t);
  }
}

function progressPercent(idx: number, total: number) {
  if (!total) return 0;
  return ((idx + 1) / total) * 100;
}

export default function FlowPage() {
  const params = useParams();
  const requestId = String((params as any)?.request_id ?? "").trim();

  const version = process.env.NEXT_PUBLIC_INSTRUMENT_VERSION || "ENDURE_v1";

  const [reqRow, setReqRow] = useState<RequestRow | null>(null);
  const [athlete, setAthlete] = useState<AthleteRow | null>(null);

  const [dict, setDict] = useState<DictItem[]>([]);
  const [blocks, setBlocks] = useState<Array<{ section: string; scale: string }>>([]);
  const [idx, setIdx] = useState(0);

  const [items, setItems] = useState<DictItem[]>([]);
  const [instruction, setInstruction] = useState<string | null>(null);

  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [assessmentId, setAssessmentId] = useState<string | null>(null);

  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [saving, setSaving] = useState(false);

  const current = blocks[idx] || null;

  function setAnswer(itemcode: string, value: any) {
    setAnswers((prev) => ({ ...prev, [itemcode]: value }));
  }

  function toggleMulti(itemcode: string, opt: string) {
    const cur: string[] = Array.isArray(answers[itemcode]) ? answers[itemcode] : [];
    const has = cur.includes(opt);
    const next = has ? cur.filter((x) => x !== opt) : [...cur, opt];
    setAnswer(itemcode, next);
  }

  function draftKey(sec: string, sc: string) {
    return `ENDURE_FLOW_DRAFT_${version}_${requestId}_${sec}_${sc}`;
  }

  async function saveDraftToDb() {
    if (!assessmentId) throw new Error("Avaliação ainda não foi criada.");

    const { error } = await supabase
      .from("assessments")
      .update({ raw_responses: answers })
      .eq("assessment_id", assessmentId);

    if (error) throw error;
  }

  useEffect(() => {
    if (!requestId) return;

    (async () => {
      const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

      let { data: sess } = await supabase.auth.getSession();
      if (!sess?.session) {
        await wait(300);
        ({ data: sess } = await supabase.auth.getSession());
      }

      if (!sess?.session) {
        const next = encodeURIComponent(`/athlete/flow/${requestId}`);
        window.location.href = `/login?next=${next}`;
        return;
      }

      try {
        setErr(null);

        const { data: r, error: e1 } = await supabase
          .from("assessment_requests")
          .select(
            "request_id, athlete_id, title, status, instrument_version, reference_window, selection_json"
          )
          .eq("request_id", requestId)
          .single();

        if (e1) throw e1;
        setReqRow(r as any);

        const { data: ath, error: e2 } = await supabase
          .from("athletes")
          .select("full_name, birth_date, sex, sport_primary, team")
          .eq("athlete_id", (r as any).athlete_id)
          .single();

        if (e2) throw e2;
        setAthlete(ath as any);

        const { data: d, error: e3 } = await supabase
          .from("instrument_items")
          .select("*")
          .neq("itemcode","");

        if (e3) throw e3;

        const dictArr = (d as DictItem[]) ?? [];
        setDict(dictArr);

        const selSections: string[] = (r as any).selection_json?.sections ?? [];
        const selScales: Record<string, string[]> = (r as any).selection_json?.scales ?? {};

        const temp: Record<string, Set<string>> = {};
        for (const it of dictArr) {
          const sec = String(it.quest_section || "").trim();
          const sc = String(it.scale || "").trim();

          if (!sec || !sc) continue;
          if (selSections.length && !selSections.includes(sec)) continue;
          if (selScales?.[sec]?.length && !selScales[sec].includes(sc)) continue;

          temp[sec] ??= new Set();
          temp[sec].add(sc);
        }

        const secKeys = Object.keys(temp).sort((a, b) => {
          const ia = SECTION_ORDER.indexOf(a);
          const ib = SECTION_ORDER.indexOf(b);
          if (ia === -1 && ib === -1) return a.localeCompare(b);
          if (ia === -1) return 1;
          if (ib === -1) return -1;
          return ia - ib;
        });

        const blocksList: Array<{ section: string; scale: string }> = [];
        for (const sec of secKeys) {
          const scales = Array.from(temp[sec]).sort((a, b) => a.localeCompare(b));
          for (const sc of scales) blocksList.push({ section: sec, scale: sc });
        }

        setBlocks(blocksList);
        setIdx(0);
      } catch (e: any) {
        setErr(e.message ?? "Erro ao carregar pendência.");
      }
    })();
  }, [requestId]);

  useEffect(() => {
    if (!reqRow) return;

    (async () => {
      try {
        setErr(null);

        await supabase
          .from("assessment_requests")
          .update({ status: "in_progress" })
          .eq("request_id", requestId);

        const { data: existing, error: e1 } = await supabase
          .from("assessments")
          .select("assessment_id, raw_responses")
          .eq("athlete_id", reqRow.athlete_id)
          .eq("instrument_version", reqRow.instrument_version)
          .eq("status", "in_progress")
          .eq("request_id", requestId)
          .order("created_at", { ascending: false })
          .limit(1);

        if (e1) throw e1;

        if (existing && existing.length > 0) {
          setAssessmentId(existing[0].assessment_id);
          if (existing[0].raw_responses) setAnswers(existing[0].raw_responses);
          return;
        }

        const { data: created, error: e2 } = await supabase
          .from("assessments")
          .insert({
            athlete_id: reqRow.athlete_id,
            request_id: requestId,
            instrument_version: reqRow.instrument_version,
            reference_window: reqRow.reference_window ?? "últimos 7 dias",
            status: "in_progress",
            raw_responses: {},
          })
          .select("assessment_id")
          .single();

        if (e2) throw e2;
        setAssessmentId(created.assessment_id);
      } catch (e: any) {
        setErr(e.message ?? "Erro ao criar avaliação.");
      }
    })();
  }, [reqRow, requestId]);

  useEffect(() => {
    if (!current || dict.length === 0) return;

    const sec = current.section;
    const sc = current.scale;

    const its = dict.filter(
      (it) =>
        String(it.quest_section || "").trim() === sec &&
        String(it.scale || "").trim() === sc
    );

    setItems(its);

    const instr =
      its.find((i) => i.instruction && String(i.instruction).trim())?.instruction ?? null;
    setInstruction(instr ? String(instr).trim() : null);

    const k = draftKey(sec, sc);
    const saved = localStorage.getItem(k);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setAnswers((prev) => ({ ...prev, ...parsed }));
      } catch {}
    }
  }, [current, dict]);

  useEffect(() => {
    if (!current) return;

    const k = draftKey(current.section, current.scale);
    const subset: Record<string, any> = {};

    for (const it of items) {
      if (answers[it.itemcode] !== undefined) subset[it.itemcode] = answers[it.itemcode];
    }

    localStorage.setItem(k, JSON.stringify(subset));
  }, [answers, current, items]);

  const missingCount = useMemo(() => {
    if (!items.length) return 0;

    const missing = items.filter((it) => {
      const opts = optionsFrom(it.opt_json);
      const val = answers[it.itemcode];

      const allowMulti = it.quest_section === "Identification" && it.itemcode === "sports";
      let kind0 = typeKind(it.type);
      let kind = kind0 === "auto" ? (opts.length ? "single" : "text") : kind0;
      if (kind === "multi" && !allowMulti) kind = "single";

      if (opts.length === 0) return false;
      if (kind === "multi") return !Array.isArray(val) || val.length === 0;
      return !val;
    });

    return missing.length;
  }, [items, answers]);

  async function saveDraft() {
    try {
      if (!assessmentId) throw new Error("Avaliação ainda não foi criada.");
      setSaving(true);
      setErr(null);
      setMsg(null);
      await saveDraftToDb();
      setMsg("Rascunho salvo.");
      setTimeout(() => setMsg(null), 1500);
    } catch (e: any) {
      setErr(e.message ?? "Erro ao salvar rascunho.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSaving(false);
    }
  }

  async function nextBlock() {
    if (missingCount > 0) {
      setErr(`Faltam respostas em ${missingCount} itens neste bloco.`);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setErr(null);
    await saveDraft();
    setIdx((v) => Math.min(v + 1, blocks.length - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function prevBlock() {
    setErr(null);
    await saveDraft();
    setIdx((v) => Math.max(v - 1, 0));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submitAll() {
    if (submitting) return;

    if (!assessmentId) {
      setErr("Avaliação ainda não foi criada.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (missingCount > 0) {
      setErr(`Faltam respostas em ${missingCount} itens neste bloco.`);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setSubmitting(true);
    setErr(null);
    setMsg(null);
    setProgress("Salvando e finalizando...");

    try {
      const { error: e1 } = await supabase
        .from("assessments")
        .update({
          raw_responses: answers,
          status: "submitted",
          submitted_at: new Date().toISOString(),
        })
        .eq("assessment_id", assessmentId);

      if (e1) throw e1;

      const { error: e2 } = await supabase
        .from("assessment_requests")
        .update({ status: "submitted" })
        .eq("request_id", requestId);

      if (e2) throw e2;

      setProgress("Calculando escores...");
      const rScore = await fetchJsonWithTimeout(
        "/api/score",
        { assessment_id: assessmentId },
        60000
      );
      if (!rScore.ok) {
        throw new Error(rScore.json?.error ?? "Falha ao calcular escores.");
      }

      setProgress("Gerando relatório...");
      const rRep = await fetchJsonWithTimeout(
        "/api/report",
        { assessment_id: assessmentId },
        90000
      );
      if (!rRep.ok) {
        throw new Error(rRep.json?.error ?? "Falha ao gerar relatório.");
      }

      setProgress(null);
      setMsg("Avaliação finalizada e relatório gerado. Redirecionando para o histórico...");
      setTimeout(() => {
        window.location.href = "/athlete/history";
      }, 900);
    } catch (e: any) {
      setProgress(null);
      setErr(e.message ?? "Erro ao finalizar.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSubmitting(false);
    }
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
          Fluxo completo de avaliação
        </div>

        <h1
          style={{
            margin: "14px 0 8px",
            fontSize: 30,
            lineHeight: 1.1,
            letterSpacing: -0.6,
            color: "#0f172a",
          }}
        >
          {reqRow?.title ?? "Avaliação"}
        </h1>

        <p
          style={{
            margin: 0,
            color: "#64748b",
            lineHeight: 1.75,
            fontSize: 15,
            maxWidth: 760,
          }}
        >
          Responda aos blocos abaixo com calma. Você pode salvar o progresso e retomar
          depois.
        </p>

        {reqRow?.reference_window ? (
          <div
            style={{
              marginTop: 14,
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
            Janela de referência: {reqRow.reference_window}
          </div>
        ) : null}

        {athlete ? (
          <div
            style={{
              marginTop: 16,
              border: "1px solid #e5e7eb",
              borderRadius: 18,
              padding: 16,
              background: "#ffffff",
              display: "grid",
              gap: 8,
            }}
          >
            <div
              style={{
                fontWeight: 900,
                color: "#0f172a",
                fontSize: 16,
              }}
            >
              {athlete.full_name ?? "Atleta"}
            </div>

            <div
              style={{
                color: "#64748b",
                fontSize: 14,
                lineHeight: 1.7,
              }}
            >
              {athlete.birth_date ? `Data de nascimento: ${athlete.birth_date}` : "Data de nascimento: —"}
              <br />
              {athlete.sex ? `Sexo: ${athlete.sex}` : "Sexo: —"}
              <br />
              {athlete.sport_primary ? `Esporte: ${athlete.sport_primary}` : "Esporte: —"}
              <br />
              {athlete.team ? `Equipe: ${athlete.team}` : "Equipe: —"}
            </div>
          </div>
        ) : null}

        <div style={{ marginTop: 18, display: "grid", gap: 8 }}>
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
              Progresso do fluxo
            </div>
            <div style={{ color: "#64748b", fontSize: 13 }}>
              Bloco {blocks.length ? idx + 1 : 0} de {blocks.length}
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
                width: `${progressPercent(idx, blocks.length)}%`,
                height: "100%",
                background: "linear-gradient(90deg, #2563eb 0%, #1d4ed8 100%)",
                borderRadius: 999,
              }}
            />
          </div>
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

        {progress ? (
          <div
            style={{
              marginTop: 14,
              padding: 14,
              border: "1px solid #e5e7eb",
              background: "#f8fafc",
              borderRadius: 16,
              color: "#334155",
              lineHeight: 1.7,
            }}
          >
            {progress}
          </div>
        ) : null}
      </section>

      <section
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 24,
          background: "#ffffff",
          padding: 22,
          boxShadow: "0 18px 48px rgba(15,23,42,.05)",
          display: "grid",
          gap: 18,
        }}
      >
        <div
          style={{
            padding: 14,
            background: "#f8fafc",
            border: "1px solid #e5e7eb",
            borderRadius: 18,
            display: "grid",
            gap: 6,
          }}
        >
          <div
            style={{
              fontSize: 13,
              color: "#64748b",
            }}
          >
            Bloco atual
          </div>

          <div
            style={{
              fontSize: 20,
              fontWeight: 900,
              color: "#0f172a",
              lineHeight: 1.3,
            }}
          >
            {current ? `${current.section} — ${current.scale}` : "Carregando..."}
          </div>

          {instruction ? (
            <div
              style={{
                marginTop: 4,
                color: "#475569",
                fontSize: 14,
                lineHeight: 1.75,
              }}
            >
              {instruction}
            </div>
          ) : null}
        </div>

        <div style={{ display: "grid", gap: 16 }}>
          {items.map((it, index) => {
            const opts = optionsFrom(it.opt_json);

            const allowMulti =
              it.quest_section === "Identification" && it.itemcode === "sports";

            let kind0 = typeKind(it.type);
            let kind = kind0 === "auto" ? (opts.length ? "single" : "text") : kind0;
            if (kind === "multi" && !allowMulti) kind = "single";

            return (
              <div
                key={it.itemcode}
                style={{
                  paddingTop: index === 0 ? 0 : 14,
                  borderTop: index === 0 ? "none" : "1px solid #f1f5f9",
                  display: "grid",
                  gap: 12,
                }}
              >
                <div
                  style={{
                    color: "#0f172a",
                    fontSize: 16,
                    lineHeight: 1.75,
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

        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <button
            type="button"
            onClick={saveDraft}
            disabled={saving || submitting}
            style={{
              minHeight: 46,
              padding: "12px 16px",
              borderRadius: 14,
              border: "1px solid #cbd5e1",
              background: "#fff",
              color: "#0f172a",
              fontWeight: 800,
              fontSize: 14,
              cursor: saving || submitting ? "not-allowed" : "pointer",
              fontFamily: "inherit",
            }}
          >
            {saving ? "Salvando..." : "Salvar rascunho"}
          </button>

          <div style={{ flex: 1 }} />

          <button
            type="button"
            onClick={prevBlock}
            disabled={idx === 0 || submitting}
            style={{
              minHeight: 46,
              padding: "12px 16px",
              borderRadius: 14,
              border: "1px solid #cbd5e1",
              background: "#fff",
              color: "#0f172a",
              fontWeight: 800,
              fontSize: 14,
              cursor: idx === 0 || submitting ? "not-allowed" : "pointer",
              fontFamily: "inherit",
            }}
          >
            Anterior
          </button>

          {idx < blocks.length - 1 ? (
            <button
              type="button"
              onClick={nextBlock}
              disabled={submitting}
              style={{
                minHeight: 46,
                padding: "12px 16px",
                borderRadius: 14,
                border: "1px solid #0f172a",
                background: "#0f172a",
                color: "#fff",
                fontWeight: 800,
                fontSize: 14,
                cursor: submitting ? "not-allowed" : "pointer",
                fontFamily: "inherit",
              }}
            >
              Próximo
            </button>
          ) : (
            <button
              type="button"
              onClick={submitAll}
              disabled={submitting}
              style={{
                minHeight: 46,
                padding: "12px 16px",
                borderRadius: 14,
                border: "1px solid #0f172a",
                background: "#0f172a",
                color: "#fff",
                fontWeight: 800,
                fontSize: 14,
                cursor: submitting ? "not-allowed" : "pointer",
                fontFamily: "inherit",
              }}
            >
              {submitting ? "Finalizando..." : "Finalizar"}
            </button>
          )}
        </div>
      </section>
    </div>
  );
}