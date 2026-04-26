"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser as supabase } from "@/src/lib/supabaseBrowser";

type DictItem = {
  itemcode: string;
  quest_section: string | null;
  type: string | null;
  effect?: string | null;
  scale: string | null;
  definition?: string | null;
  key?: number | string | null;
  item_text_port: string | null;
  instruction: string | null;
  opt1?: string | null;
  opt2?: string | null;
  opt3?: string | null;
  opt4?: string | null;
  opt5?: string | null;
  opt6?: string | null;
  opt7?: string | null;
  opt8?: string | null;
  opt9?: string | null;
  opt10?: string | null;
  opt11?: string | null;
};

type RequestRow = {
  request_id: string;
  athlete_id: string;
  title: string | null;
  status: string | null;
  instrument_version: string | null;
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

type Block = {
  section: string;
  scale: string;
};

const SECTION_ORDER = [
  "Identification",
  "Training",
  "ENDURE",
  "Rest & well-being",
  "Socioemocional core",
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

function canonicalSectionName(x: any): string {
  return String(x ?? "").trim();
}

function sameSection(a: any, b: any) {
  return normalizeKey(canonicalSectionName(a)) === normalizeKey(canonicalSectionName(b));
}

function sameScale(a: any, b: any) {
  return normalizeKey(canonicalScaleName(a)) === normalizeKey(canonicalScaleName(b));
}

function typeKind(t: string | null | undefined) {
  const s = String(t ?? "").toLowerCase();

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

function optionsFrom(item: DictItem) {
  return [
    item.opt1,
    item.opt2,
    item.opt3,
    item.opt4,
    item.opt5,
    item.opt6,
    item.opt7,
    item.opt8,
    item.opt9,
    item.opt10,
    item.opt11,
  ]
    .map((x) => String(x ?? "").trim())
    .filter(Boolean);
}

function progressPercent(idx: number, total: number) {
  if (!total) return 0;
  return ((idx + 1) / total) * 100;
}

function selectedSectionsFrom(selection: any): string[] {
  if (!selection || typeof selection !== "object") return [];
  return Array.isArray(selection.sections) ? selection.sections.map(String) : [];
}

function selectedScalesForSection(selection: any, section: string): string[] {
  const scales = selection?.scales;

  if (!scales || typeof scales !== "object") return [];

  const direct = scales[section];

  if (Array.isArray(direct)) return direct.map(String);

  const matchingKey = Object.keys(scales).find((k) => sameSection(k, section));

  if (!matchingKey) return [];

  const val = scales[matchingKey];

  return Array.isArray(val) ? val.map(String) : [];
}

function selectionAllowsItem(selection: any, section: string, scale: string) {
  const sections = selectedSectionsFrom(selection);

  if (sections.length > 0 && !sections.some((s) => sameSection(s, section))) {
    return false;
  }

  const selectedScales = selectedScalesForSection(selection, section);

  if (selectedScales.length === 0) {
    return true;
  }

  return selectedScales.some((s) => sameScale(s, scale));
}

function buildBlocksFromItems(
  items: DictItem[],
  request: RequestRow,
  useSelection: boolean
): Block[] {
  const selection = request.selection_json ?? {};
  const temp: Record<string, Set<string>> = {};

  for (const it of items) {
    const itemcode = String(it.itemcode ?? "").trim();
    const section = canonicalSectionName(it.quest_section);
    const scale = canonicalScaleName(it.scale);

    if (!itemcode || !section || !scale) continue;

    if (useSelection && !selectionAllowsItem(selection, section, scale)) continue;

    temp[section] ??= new Set<string>();
    temp[section].add(scale);
  }

  const sectionKeys = Object.keys(temp).sort((a, b) => {
    const ia = SECTION_ORDER.indexOf(a);
    const ib = SECTION_ORDER.indexOf(b);

    if (ia === -1 && ib === -1) return a.localeCompare(b);
    if (ia === -1) return 1;
    if (ib === -1) return -1;

    return ia - ib;
  });

  const blocks: Block[] = [];

  for (const section of sectionKeys) {
    const scales = Array.from(temp[section]).sort((a, b) => a.localeCompare(b));

    for (const scale of scales) {
      blocks.push({ section, scale });
    }
  }

  return blocks;
}

async function fetchJsonWithTimeout(url: string, body: any, ms = 30000) {
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), ms);

  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers.authorization = `Bearer ${token}`;
    }

    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });

    const json = await res.json().catch(() => ({} as any));

    return {
      ok: res.ok,
      status: res.status,
      json,
    };
  } finally {
    clearTimeout(timeout);
  }
}

function pageShellStyle(): React.CSSProperties {
  return {
    minHeight: "100vh",
    background: "#f8fafc",
    color: "#0f172a",
    padding: 24,
  };
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

function buttonStyle(primary = false, disabled = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 40,
    padding: "0 16px",
    borderRadius: 12,
    border: primary ? "1px solid #111827" : "1px solid #d1d5db",
    background: disabled ? "#f1f5f9" : primary ? "#111827" : "#ffffff",
    color: disabled ? "#94a3b8" : primary ? "#ffffff" : "#111827",
    fontWeight: 800,
    fontSize: 14,
    cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: "inherit",
    textDecoration: "none",
  };
}

export default function FlowPage() {
  const params = useParams();
  const requestId = String((params as any)?.request_id ?? "").trim();

  const [reqRow, setReqRow] = useState<RequestRow | null>(null);
  const [athlete, setAthlete] = useState<AthleteRow | null>(null);
  const [dict, setDict] = useState<DictItem[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
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

  const current = blocks[idx] ?? null;

  function draftKey(section: string, scale: string) {
    return `ENDURE_FLOW_DRAFT_${requestId}_${section}_${scale}`;
  }

  function setAnswer(itemcode: string, value: any) {
    setAnswers((prev) => ({ ...prev, [itemcode]: value }));
  }

  function toggleMulti(itemcode: string, opt: string) {
    const cur: string[] = Array.isArray(answers[itemcode]) ? answers[itemcode] : [];
    const has = cur.includes(opt);
    const next = has ? cur.filter((x) => x !== opt) : [...cur, opt];

    setAnswer(itemcode, next);
  }

  async function saveDraftToDb() {
    if (!assessmentId) {
      throw new Error("Avaliação ainda não foi criada.");
    }

    const { error } = await supabase
      .from("assessments")
      .update({ raw_responses: answers })
      .eq("assessment_id", assessmentId);

    if (error) throw error;
  }

  useEffect(() => {
    if (!requestId) return;

    (async () => {
      try {
        setErr(null);

        const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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

        const { data: requestData, error: requestError } = await supabase
          .from("assessment_requests")
          .select("request_id, athlete_id, title, status, instrument_version, reference_window, selection_json")
          .eq("request_id", requestId)
          .single();

        if (requestError) throw requestError;

        const request = requestData as RequestRow;

        setReqRow(request);

        const { data: athleteData, error: athleteError } = await supabase
          .from("athletes")
          .select("full_name, birth_date, sex, sport_primary, team")
          .eq("athlete_id", request.athlete_id)
          .single();

        if (athleteError) throw athleteError;

        setAthlete(athleteData as AthleteRow);

        const token = sess.session.access_token;

        const dictResponse = await fetch("/api/instrument-items", {
          method: "GET",
          headers: {
            authorization: `Bearer ${token}`,
          },
        });

        const dictPayload: any = await dictResponse.json().catch(() => ({}));

        if (!dictResponse.ok || !dictPayload?.ok) {
          throw new Error(
            dictPayload?.error ?? "Falha ao carregar os itens do instrumento."
          );
        }

        const dictArr = ((dictPayload.items ?? []) as DictItem[]).filter((it) =>
          String(it.itemcode ?? "").trim()
        );

        setDict(dictArr);

        let blocksList = buildBlocksFromItems(dictArr, request, true);

        if (blocksList.length === 0) {
          blocksList = buildBlocksFromItems(dictArr, request, false);
        }

        if (blocksList.length === 0) {
          const diagnostic = {
            request_id: request.request_id,
            request_instrument_version: request.instrument_version,
            selection_json: request.selection_json,
            instrument_items_loaded: dictArr.length,
            items_with_section_and_scale: dictArr.filter(
              (it) => String(it.quest_section ?? "").trim() && String(it.scale ?? "").trim()
            ).length,
            unique_sections: Array.from(
              new Set(dictArr.map((it) => String(it.quest_section ?? "").trim()).filter(Boolean))
            ),
            unique_scales_sample: Array.from(
              new Set(dictArr.map((it) => String(it.scale ?? "").trim()).filter(Boolean))
            ).slice(0, 30),
          };

          console.error("ENDURE flow diagnostic", diagnostic);

          throw new Error(
            `Nenhum bloco foi montado. Itens carregados: ${diagnostic.instrument_items_loaded}; itens com seção e escala: ${diagnostic.items_with_section_and_scale}. Veja o console para o diagnóstico completo.`
          );
        }

        setBlocks(blocksList);
        setIdx(0);
      } catch (e: any) {
        setErr(e?.message ?? "Erro ao carregar pendência.");
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

        const { data: existing, error: existingError } = await supabase
          .from("assessments")
          .select("assessment_id, raw_responses")
          .eq("athlete_id", reqRow.athlete_id)
          .eq("instrument_version", reqRow.instrument_version)
          .eq("status", "in_progress")
          .eq("request_id", requestId)
          .order("created_at", { ascending: false })
          .limit(1);

        if (existingError) throw existingError;

        if (existing && existing.length > 0) {
          setAssessmentId(existing[0].assessment_id);

          if (existing[0].raw_responses) {
            setAnswers(existing[0].raw_responses);
          }

          return;
        }

        const { data: created, error: createdError } = await supabase
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

        if (createdError) throw createdError;

        setAssessmentId(created.assessment_id);
      } catch (e: any) {
        setErr(e?.message ?? "Erro ao criar avaliação.");
      }
    })();
  }, [reqRow, requestId]);

  useEffect(() => {
    if (!current || dict.length === 0) return;

    const section = current.section;
    const scale = current.scale;

    const blockItems = dict.filter(
      (it) =>
        sameSection(it.quest_section, section) &&
        sameScale(it.scale, scale) &&
        String(it.itemcode ?? "").trim()
    );

    setItems(blockItems);

    const instr =
      blockItems.find((i) => i.instruction && String(i.instruction).trim())?.instruction ??
      null;

    setInstruction(instr ? String(instr).trim() : null);

    const saved = localStorage.getItem(draftKey(section, scale));

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setAnswers((prev) => ({ ...prev, ...parsed }));
      } catch {}
    }
  }, [current, dict]);

  useEffect(() => {
    if (!current) return;

    const subset: Record<string, any> = {};

    for (const it of items) {
      if (answers[it.itemcode] !== undefined) {
        subset[it.itemcode] = answers[it.itemcode];
      }
    }

    localStorage.setItem(draftKey(current.section, current.scale), JSON.stringify(subset));
  }, [answers, current, items]);

  const missingCount = useMemo(() => {
    if (!items.length) return 0;

    const missing = items.filter((it) => {
      const opts = optionsFrom(it);
      const val = answers[it.itemcode];

      if (opts.length === 0) return false;

      const allowMulti = it.quest_section === "Identification" && it.itemcode === "sports";

      let kind0 = typeKind(it.type);
      let kind = kind0 === "auto" ? (opts.length ? "single" : "text") : kind0;

      if (kind === "multi" && !allowMulti) {
        kind = "single";
      }

      if (kind === "multi") {
        return !Array.isArray(val) || val.length === 0;
      }

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
      setErr(e?.message ?? "Erro ao salvar rascunho.");
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
      const { error: updateAssessmentError } = await supabase
        .from("assessments")
        .update({
          raw_responses: answers,
          status: "submitted",
          submitted_at: new Date().toISOString(),
        })
        .eq("assessment_id", assessmentId);

      if (updateAssessmentError) throw updateAssessmentError;

      const { error: updateRequestError } = await supabase
        .from("assessment_requests")
        .update({ status: "submitted" })
        .eq("request_id", requestId);

      if (updateRequestError) throw updateRequestError;

      setProgress("Calculando escores...");

      const scoreResponse = await fetchJsonWithTimeout(
        "/api/score",
        { assessment_id: assessmentId },
        60000
      );

      if (!scoreResponse.ok) {
        throw new Error(scoreResponse.json?.error ?? "Falha ao calcular escores.");
      }

      setProgress("Gerando relatório...");

      const reportResponse = await fetchJsonWithTimeout(
        "/api/report",
        { assessment_id: assessmentId },
        90000
      );

      if (!reportResponse.ok) {
        throw new Error(reportResponse.json?.error ?? "Falha ao gerar relatório.");
      }

      setProgress(null);
      setMsg("Avaliação finalizada e relatório gerado. Redirecionando para o histórico...");

      setTimeout(() => {
        window.location.href = "/athlete/history";
      }, 900);
    } catch (e: any) {
      setProgress(null);
      setErr(e?.message ?? "Erro ao finalizar.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main style={pageShellStyle()}>
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        <a href="/athlete/pending" style={buttonStyle(false)}>
          ← Voltar
        </a>

        <section style={{ ...cardStyle(), marginTop: 16 }}>
          <p
            style={{
              margin: 0,
              color: "#64748b",
              fontSize: 13,
              fontWeight: 800,
              letterSpacing: 0.3,
              textTransform: "uppercase",
            }}
          >
            Fluxo completo de avaliação
          </p>

          <h1 style={{ margin: "6px 0 0", fontSize: 28 }}>
            {reqRow?.title ?? "Avaliação"}
          </h1>

          <p style={{ margin: "10px 0 0", color: "#475569" }}>
            Responda aos blocos abaixo com calma. Você pode salvar o progresso e retomar depois.
          </p>

          {reqRow?.reference_window ? (
            <p style={{ margin: "10px 0 0", color: "#475569", fontWeight: 700 }}>
              Janela de referência: {reqRow.reference_window}
            </p>
          ) : null}
        </section>

        {athlete ? (
          <section style={{ ...cardStyle(), marginTop: 16 }}>
            <strong>{athlete.full_name ?? "Atleta"}</strong>

            <div style={{ marginTop: 8, color: "#475569", lineHeight: 1.7 }}>
              <div>
                {athlete.birth_date
                  ? `Data de nascimento: ${athlete.birth_date}`
                  : "Data de nascimento: —"}
              </div>
              <div>{athlete.sex ? `Sexo: ${athlete.sex}` : "Sexo: —"}</div>
              <div>
                {athlete.sport_primary ? `Esporte: ${athlete.sport_primary}` : "Esporte: —"}
              </div>
              <div>{athlete.team ? `Equipe: ${athlete.team}` : "Equipe: —"}</div>
            </div>
          </section>
        ) : null}

        <section style={{ ...cardStyle(), marginTop: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
            <div>
              <strong>Progresso do fluxo</strong>
              <div style={{ marginTop: 4, color: "#64748b" }}>
                Bloco {blocks.length ? idx + 1 : 0} de {blocks.length}
              </div>
            </div>

            <div style={{ color: "#64748b", fontWeight: 800 }}>
              {Math.round(progressPercent(idx, blocks.length))}%
            </div>
          </div>

          <div
            style={{
              height: 10,
              background: "#e5e7eb",
              borderRadius: 999,
              overflow: "hidden",
              marginTop: 12,
            }}
          >
            <div
              style={{
                width: `${progressPercent(idx, blocks.length)}%`,
                height: "100%",
                background: "#111827",
              }}
            />
          </div>
        </section>

        {err ? (
          <section
            style={{
              marginTop: 16,
              padding: 14,
              borderRadius: 16,
              border: "1px solid #fecaca",
              background: "#fef2f2",
              color: "#991b1b",
              fontWeight: 700,
            }}
          >
            {err}
          </section>
        ) : null}

        {msg ? (
          <section
            style={{
              marginTop: 16,
              padding: 14,
              borderRadius: 16,
              border: "1px solid #bbf7d0",
              background: "#f0fdf4",
              color: "#166534",
              fontWeight: 700,
            }}
          >
            {msg}
          </section>
        ) : null}

        {progress ? (
          <section
            style={{
              marginTop: 16,
              padding: 14,
              borderRadius: 16,
              border: "1px solid #bfdbfe",
              background: "#eff6ff",
              color: "#1d4ed8",
              fontWeight: 700,
            }}
          >
            {progress}
          </section>
        ) : null}

        <section style={{ ...cardStyle(), marginTop: 16 }}>
          <p
            style={{
              margin: 0,
              color: "#64748b",
              fontSize: 13,
              fontWeight: 800,
              letterSpacing: 0.3,
              textTransform: "uppercase",
            }}
          >
            Bloco atual
          </p>

          <h2 style={{ margin: "6px 0 0", fontSize: 22 }}>
            {current ? `${current.section} — ${current.scale}` : "Carregando..."}
          </h2>

          {instruction ? (
            <p style={{ margin: "12px 0 0", color: "#475569", lineHeight: 1.6 }}>
              {instruction}
            </p>
          ) : null}

          <div style={{ display: "grid", gap: 16, marginTop: 20 }}>
            {items.map((it, index) => {
              const opts = optionsFrom(it);
              const allowMulti = it.quest_section === "Identification" && it.itemcode === "sports";

              let kind0 = typeKind(it.type);
              let kind = kind0 === "auto" ? (opts.length ? "single" : "text") : kind0;

              if (kind === "multi" && !allowMulti) {
                kind = "single";
              }

              return (
                <div
                  key={it.itemcode}
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 18,
                    padding: 16,
                    background: "#ffffff",
                  }}
                >
                  <div style={{ fontWeight: 800, marginBottom: 10 }}>
                    {index + 1}. {it.item_text_port}
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
                              alignItems: "flex-start",
                              gap: 10,
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
                            <span>{o}</span>
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
                              alignItems: "flex-start",
                              gap: 10,
                              cursor: "pointer",
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleMulti(it.itemcode, o)}
                              style={{ marginTop: 2 }}
                            />
                            <span>{o}</span>
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
              marginTop: 22,
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              disabled={saving || !assessmentId}
              onClick={saveDraft}
              style={buttonStyle(false, saving || !assessmentId)}
            >
              {saving ? "Salvando..." : "Salvar rascunho"}
            </button>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button
                type="button"
                disabled={idx <= 0 || saving}
                onClick={prevBlock}
                style={buttonStyle(false, idx <= 0 || saving)}
              >
                Anterior
              </button>

              {idx < blocks.length - 1 ? (
                <button
                  type="button"
                  disabled={saving || !assessmentId}
                  onClick={nextBlock}
                  style={buttonStyle(true, saving || !assessmentId)}
                >
                  Próximo
                </button>
              ) : (
                <button
                  type="button"
                  disabled={submitting || saving || !assessmentId}
                  onClick={submitAll}
                  style={buttonStyle(true, submitting || saving || !assessmentId)}
                >
                  {submitting ? "Finalizando..." : "Finalizar"}
                </button>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}