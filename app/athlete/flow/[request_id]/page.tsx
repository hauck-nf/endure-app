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

const SECTION_ORDER = ["Identification", "Training", "ENDURE", "Rest & well-being", "Socioemocional core"];

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
  if (s.includes("short text") || s.includes("texto curto") || s.includes("text") || s.includes("numeric"))
    return "text";
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

// fetch com timeout (evita "nada acontece" infinito)
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

  // 1) Carrega request + athlete + dict + blocks
  useEffect(() => {
    if (!requestId) return;

    (async () => {

// ✅ Se não estiver logado, manda para /login?next=/athlete/flow/<request_id>
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
          .select("request_id, athlete_id, title, status, instrument_version, reference_window, selection_json")
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
          .select("itemcode, quest_section, type, scale, factor, item_text_port, instruction, opt_json")
          .eq("instrument_version", (r as any).instrument_version);
        if (e3) throw e3;

        const dictArr = (d as any as DictItem[]) ?? [];
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

  // 2) Cria/reusa assessment in_progress (por request)
  useEffect(() => {
    if (!reqRow) return;

    (async () => {
      try {
        setErr(null);
        const athleteId = reqRow.athlete_id;

        await supabase
          .from("assessment_requests")
          .update({ status: "in_progress" })
          .eq("request_id", requestId);

        const { data: existing, error: e1 } = await supabase
          .from("assessments")
          .select("assessment_id, raw_responses")
          .eq("athlete_id", athleteId)
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
            athlete_id: athleteId,
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

  // 3) Carrega itens do bloco atual + instruction + draft local
  useEffect(() => {
    if (!current || dict.length === 0) return;

    const sec = current.section;
    const sc = current.scale;

    const its = dict
      .filter((it) => String(it.quest_section || "").trim() === sec && String(it.scale || "").trim() === sc)
      .map((it) => ({ ...it }));

    setItems(its);

    const instr = its.find((i) => i.instruction && String(i.instruction).trim())?.instruction ?? null;
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

  // 4) Autosave local ao mudar answers
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
      setErr(`Faltam respostas em ${missingCount} itens (com alternativas) neste bloco.`);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setErr(null);
    await saveDraft();
    setIdx((v) => Math.min(v + 1, blocks.length - 1));
  }

  async function prevBlock() {
    setErr(null);
    await saveDraft();
    setIdx((v) => Math.max(v - 1, 0));
  }

  async function submitAll() {
    if (submitting) return;
    if (!assessmentId) {
      setErr("Avaliação ainda não foi criada.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    if (missingCount > 0) {
      setErr(`Faltam respostas em ${missingCount} itens (com alternativas) neste bloco.`);
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
      const rScore = await fetchJsonWithTimeout("/api/score", { assessment_id: assessmentId }, 60000);
      if (!rScore.ok) throw new Error(rScore.json?.error ?? "Falha ao calcular escores.");

      setProgress("Gerando relatório...");
      const rRep = await fetchJsonWithTimeout("/api/report", { assessment_id: assessmentId }, 90000);
      if (!rRep.ok) throw new Error(rRep.json?.error ?? "Falha ao gerar relatório.");

      setProgress(null);
      setMsg("Avaliação finalizada e relatório gerado. Redirecionando para o Histórico...");
      setTimeout(() => {
        window.location.href = "/athlete/history";
      }, 800);
    } catch (e: any) {
      setProgress(null);
      setErr(e.message ?? "Erro ao finalizar.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ maxWidth: 980, margin: "40px auto", fontFamily: "system-ui" }}>
      <a href="/athlete/pending">← Voltar</a>

      <div style={{ marginTop: 14 }}>
        <h2 style={{ margin: 0 }}>{reqRow?.title ?? "Avaliação"}</h2>
        <div style={{ color: "#6b7280", marginTop: 6 }}>
          {reqRow?.reference_window ? `Janela: ${reqRow.reference_window}` : ""}
        </div>
      </div>

      {athlete && (
        <div style={{ marginTop: 14, border: "1px solid #e5e7eb", borderRadius: 12, padding: 14, background: "#fafafa" }}>
          <div style={{ fontWeight: 700, color: "#111827" }}>{athlete.full_name ?? "—"}</div>
          <div style={{ color: "#374151", marginTop: 6, lineHeight: 1.45 }}>
            {athlete.birth_date ? `Data de nascimento: ${athlete.birth_date}` : "Data de nascimento: —"}
            {"  •  "}
            {athlete.sex ? `Sexo: ${athlete.sex}` : "Sexo: —"}
            <br />
            {athlete.sport_primary ? `Esporte: ${athlete.sport_primary}` : "Esporte: —"}
            {"  •  "}
            {athlete.team ? `Equipe: ${athlete.team}` : "Equipe: —"}
          </div>
        </div>
      )}

      <div style={{ marginTop: 14, border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: 12, background: "#111827", color: "white" }}>
          <div style={{ fontSize: 12, opacity: 0.9 }}>
            Bloco {blocks.length ? idx + 1 : 0} de {blocks.length}
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, marginTop: 4 }}>
            {current ? `${current.section} — ${current.scale}` : "Carregando..."}
          </div>
        </div>

        <div style={{ padding: 14 }}>
          {err && (
            <div style={{ marginBottom: 12, padding: 12, border: "1px solid #ef4444", borderRadius: 12, color: "#b91c1c" }}>
              {err}
            </div>
          )}
          {msg && (
            <div style={{ marginBottom: 12, padding: 12, border: "1px solid #10b981", borderRadius: 12, color: "#065f46" }}>
              {msg}
            </div>
          )}
          {progress && (
            <div style={{ marginBottom: 12, padding: 12, border: "1px solid #e5e7eb", borderRadius: 12, color: "#374151", background: "#fafafa" }}>
              {progress}
            </div>
          )}

          <div style={{ padding: 12, background: "#fafafa", border: "1px solid #e5e7eb", borderRadius: 12 }}>
            <div style={{ fontWeight: 700 }}>{current?.scale}</div>
            {instruction && <div style={{ marginTop: 8, color: "#374151" }}>{instruction}</div>}
          </div>

          <div style={{ marginTop: 10 }}>
            {items.map((it) => {
              const opts = optionsFrom(it.opt_json);

              const allowMulti = it.quest_section === "Identification" && it.itemcode === "sports";
              let kind0 = typeKind(it.type);
              let kind = kind0 === "auto" ? (opts.length ? "single" : "text") : kind0;
              if (kind === "multi" && !allowMulti) kind = "single";

              return (
                <div key={it.itemcode} style={{ padding: "14px 0", borderBottom: "1px solid #f3f4f6" }}>
                  <div style={{ marginBottom: 10, color: "#111827" }}>{it.item_text_port}</div>

                  {kind === "text" && opts.length === 0 && (
                    <input
                      value={answers[it.itemcode] ?? ""}
                      onChange={(e) => setAnswer(it.itemcode, e.target.value)}
                      style={{ width: "100%", padding: 10, border: "1px solid #e5e7eb", borderRadius: 10 }}
                      placeholder="Resposta"
                    />
                  )}

                  {opts.length > 0 && kind === "single" && (
                    <div style={{ display: "grid", gap: 8 }}>
                      {opts.map((o) => (
                        <label key={o} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                          <input type="radio" name={it.itemcode} checked={answers[it.itemcode] === o} onChange={() => setAnswer(it.itemcode, o)} />
                          <span>{o}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {opts.length > 0 && kind === "multi" && (
                    <div style={{ display: "grid", gap: 8 }}>
                      {opts.map((o) => {
                        const cur: string[] = Array.isArray(answers[it.itemcode]) ? answers[it.itemcode] : [];
                        const checked = cur.includes(o);
                        return (
                          <label key={o} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                            <input type="checkbox" checked={checked} onChange={() => toggleMulti(it.itemcode, o)} />
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

          <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={saveDraft}
              disabled={saving || submitting}
              style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #e5e7eb", background: "white" }}
            >
              {saving ? "Salvando..." : "Salvar rascunho"}
            </button>

            <div style={{ flex: 1 }} />

            <button
              type="button"
              onClick={prevBlock}
              disabled={idx === 0 || submitting}
              style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #e5e7eb", background: "white" }}
            >
              Anterior
            </button>

            {idx < blocks.length - 1 ? (
              <button
                type="button"
                onClick={nextBlock}
                disabled={submitting}
                style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #111827", background: "#111827", color: "white" }}
              >
                Próximo
              </button>
            ) : (
              <button
                type="button"
                onClick={submitAll}
                disabled={submitting}
                style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #111827", background: "#111827", color: "white" }}
              >
                {submitting ? "Finalizando..." : "Finalizar"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
