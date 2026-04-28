"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { supabaseBrowser } from "@/src/lib/supabaseBrowser";
import { displayScaleName, sortScaleNamesForDisplay } from "@/src/lib/endure/displayNames";

type Athlete = {
  athlete_id: string;
  athlete_name?: string | null;
  full_name?: string | null;
  email?: string | null;
};

type Template = {
  template_id: string;
  title: string;
  category: string | null;
  objective: string | null;
  estimated_duration: string | null;
  related_scales: string[] | null;
  content_json: any;
  linked_assessment_json: any;
  is_active: boolean;
  created_at: string;
};

type Assignment = {
  assignment_id: string;
  template_id: string | null;
  athlete_id: string;
  title_snapshot: string;
  status: string;
  due_at: string | null;
  assigned_at: string;
  athletes?: {
    full_name?: string | null;
    email?: string | null;
  } | null;
  intervention_templates?: {
    title?: string | null;
    category?: string | null;
  } | null;
};

type BlockType = "text" | "image" | "steps" | "textarea" | "likert" | "checkbox";

type Block = {
  id: string;
  type: BlockType;
  title?: string;
  body?: string;
  image_url?: string;
  caption?: string;
  alt?: string;
  items?: string[];
  label?: string;
  required?: boolean;
  min?: number;
  max?: number;
  min_label?: string;
  max_label?: string;
};

type MessageTone = "default" | "success" | "error";

const ELIGIBLE_SECTIONS = ["ENDURE", "Socioemocional core", "Socioemotional core"];

function makeId() {
  return `b_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function getTokenFromLocalStorage() {
  if (typeof window === "undefined") return "";

  try {
    const raw = localStorage.getItem("endure-auth");
    const parsed = raw ? JSON.parse(raw) : null;

    return (
      parsed?.access_token ??
      parsed?.session?.access_token ??
      parsed?.currentSession?.access_token ??
      parsed?.state?.session?.access_token ??
      parsed?.state?.access_token ??
      ""
    );
  } catch {
    return "";
  }
}

function authHeaders(): Record<string, string> {
  const token = getTokenFromLocalStorage();

  return token ? { authorization: `Bearer ${token}` } : {};
}

function normalizeKey(x: any): string {
  return String(x ?? "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function sameSection(a: string, b: string) {
  return normalizeKey(a) === normalizeKey(b);
}

function athleteName(a: Athlete) {
  return a.athlete_name ?? a.full_name ?? "Atleta";
}

function cardStyle(extra?: CSSProperties): CSSProperties {
  return {
    background: "rgba(255,255,255,.94)",
    border: "1px solid rgba(226,232,240,.92)",
    borderRadius: 28,
    padding: 22,
    boxShadow: "0 22px 60px rgba(15,23,42,.08)",
    backdropFilter: "blur(10px)",
    minWidth: 0,
    boxSizing: "border-box",
    ...extra,
  };
}

function inputStyle(extra?: CSSProperties): CSSProperties {
  return {
    width: "100%",
    minHeight: 44,
    padding: "0 13px",
    borderRadius: 14,
    border: "1px solid #d1d5db",
    background: "#ffffff",
    color: "#0f172a",
    fontFamily: "inherit",
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
    ...extra,
  };
}

function textareaStyle(extra?: CSSProperties): CSSProperties {
  return {
    width: "100%",
    minHeight: 110,
    padding: "12px 13px",
    borderRadius: 14,
    border: "1px solid #d1d5db",
    background: "#ffffff",
    color: "#0f172a",
    fontFamily: "inherit",
    fontSize: 14,
    lineHeight: 1.55,
    outline: "none",
    resize: "vertical",
    boxSizing: "border-box",
    ...extra,
  };
}

function primaryButtonStyle(disabled = false): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 42,
    padding: "0 16px",
    borderRadius: 14,
    border: disabled ? "1px solid #e5e7eb" : "1px solid #111827",
    background: disabled ? "#f8fafc" : "#111827",
    color: disabled ? "#94a3b8" : "#ffffff",
    fontWeight: 900,
    fontSize: 14,
    cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: "inherit",
    whiteSpace: "nowrap",
    boxSizing: "border-box",
  };
}

function secondaryButtonStyle(): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 40,
    padding: "0 14px",
    borderRadius: 12,
    border: "1px solid #d1d5db",
    background: "#ffffff",
    color: "#0f172a",
    fontWeight: 850,
    fontSize: 14,
    cursor: "pointer",
    fontFamily: "inherit",
    whiteSpace: "nowrap",
    boxSizing: "border-box",
  };
}

function miniLabelStyle(): CSSProperties {
  return {
    margin: 0,
    color: "#64748b",
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  };
}

function messageStyle(tone: MessageTone): CSSProperties {
  if (tone === "success") {
    return {
      border: "1px solid #bbf7d0",
      background: "#f0fdf4",
      color: "#166534",
    };
  }

  if (tone === "error") {
    return {
      border: "1px solid #fecaca",
      background: "#fef2f2",
      color: "#991b1b",
    };
  }

  return {
    border: "1px solid #e5e7eb",
    background: "#f8fafc",
    color: "#334155",
  };
}

function emptyContentJson() {
  return { blocks: [] };
}

function blockDefaults(type: BlockType): Block {
  if (type === "text") {
    return {
      id: makeId(),
      type,
      title: "Texto",
      body: "",
    };
  }

  if (type === "image") {
    return {
      id: makeId(),
      type,
      title: "Imagem",
      image_url: "",
      caption: "",
      alt: "",
    };
  }

  if (type === "steps") {
    return {
      id: makeId(),
      type,
      title: "Tarefa prática",
      items: ["Passo 1", "Passo 2"],
    };
  }

  if (type === "textarea") {
    return {
      id: makeId(),
      type,
      label: "O que você percebeu durante a prática?",
      required: true,
    };
  }

  if (type === "likert") {
    return {
      id: makeId(),
      type,
      label: "Quão útil foi esta prática?",
      min: 1,
      max: 5,
      min_label: "Nada útil",
      max_label: "Muito útil",
      required: false,
    };
  }

  return {
    id: makeId(),
    type: "checkbox",
    label: "Realizei a tarefa proposta",
    required: true,
  };
}

export default function AdminAssignInterventionPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [scalesBySection, setScalesBySection] = useState<Record<string, string[]>>({});

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [objective, setObjective] = useState("");
  const [estimatedDuration, setEstimatedDuration] = useState("");
  const [blocks, setBlocks] = useState<Block[]>([blockDefaults("text")]);

  const [linkedEnabled, setLinkedEnabled] = useState(false);
  const [linkedTitle, setLinkedTitle] = useState("Avaliação pós-intervenção");
  const [selectedScales, setSelectedScales] = useState<Record<string, boolean>>({});

  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [selectedAthletes, setSelectedAthletes] = useState<Record<string, boolean>>({});
  const [dueAt, setDueAt] = useState("");

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [msgTone, setMsgTone] = useState<MessageTone>("default");

  const selectedScaleNames = useMemo(() => {
    return Object.keys(selectedScales).filter((k) => selectedScales[k]);
  }, [selectedScales]);

  const selectedAthleteIds = useMemo(() => {
    return Object.keys(selectedAthletes).filter((k) => selectedAthletes[k]);
  }, [selectedAthletes]);

  const selectedTemplate = useMemo(() => {
    return templates.find((t) => t.template_id === selectedTemplateId) ?? null;
  }, [templates, selectedTemplateId]);

  async function loadData() {
    setMsg("");
    setMsgTone("default");

    const headers = authHeaders();

    const [templatesRes, assignmentsRes] = await Promise.all([
      fetch("/api/intervention-templates", { headers }),
      fetch("/api/intervention-assignments", { headers }),
    ]);

    const templatesPayload = await templatesRes.json().catch(() => ({}));
    const assignmentsPayload = await assignmentsRes.json().catch(() => ({}));

    if (!templatesRes.ok || !templatesPayload?.ok) {
      throw new Error(templatesPayload?.error ?? "Falha ao carregar templates.");
    }

    if (!assignmentsRes.ok || !assignmentsPayload?.ok) {
      throw new Error(assignmentsPayload?.error ?? "Falha ao carregar intervenções enviadas.");
    }

    setTemplates((templatesPayload.templates ?? []) as Template[]);
    setAssignments((assignmentsPayload.assignments ?? []) as Assignment[]);

    if (!selectedTemplateId && templatesPayload.templates?.[0]?.template_id) {
      setSelectedTemplateId(templatesPayload.templates[0].template_id);
    }
  }

  async function loadAthletesAndScales() {
    const { data: athleteRows } = await supabaseBrowser
      .from("v_admin_athletes")
      .select("athlete_id, athlete_name")
      .order("athlete_name", { ascending: true })
      .limit(2000);

    setAthletes((athleteRows ?? []) as Athlete[]);

    const token = getTokenFromLocalStorage();

    const instrumentRes = await fetch("/api/instrument-items", {
      headers: token ? { authorization: `Bearer ${token}` } : {},
    });

    const instrumentPayload = await instrumentRes.json().catch(() => ({}));

    const items = Array.isArray(instrumentPayload?.items)
      ? instrumentPayload.items
      : [];

    const map: Record<string, Set<string>> = {};

    for (const item of items) {
      const section = String(item?.quest_section ?? "").trim();
      const scale = String(item?.scale ?? "").trim();

      if (!section || !scale) continue;
      if (!ELIGIBLE_SECTIONS.some((s) => sameSection(s, section))) continue;

      const sectionLabel = sameSection(section, "Socioemotional core")
        ? "Socioemocional core"
        : section;

      map[sectionLabel] ??= new Set<string>();
      map[sectionLabel].add(scale);
    }

    const out: Record<string, string[]> = {};

    for (const [section, values] of Object.entries(map)) {
      out[section] = sortScaleNamesForDisplay(Array.from(values));
    }

    setScalesBySection(out);
  }

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        await Promise.all([loadData(), loadAthletesAndScales()]);
      } catch (e: any) {
        setMsgTone("error");
        setMsg(e?.message ?? "Erro ao carregar página.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function updateBlock(blockId: string, patch: Partial<Block>) {
    setBlocks((prev) =>
      prev.map((b) => (b.id === blockId ? { ...b, ...patch } : b))
    );
  }

  function removeBlock(blockId: string) {
    setBlocks((prev) => prev.filter((b) => b.id !== blockId));
  }

  function moveBlock(blockId: string, direction: -1 | 1) {
    setBlocks((prev) => {
      const idx = prev.findIndex((b) => b.id === blockId);
      if (idx < 0) return prev;

      const nextIdx = idx + direction;
      if (nextIdx < 0 || nextIdx >= prev.length) return prev;

      const copy = [...prev];
      const temp = copy[idx];
      copy[idx] = copy[nextIdx];
      copy[nextIdx] = temp;

      return copy;
    });
  }

  function addBlock(type: BlockType) {
    setBlocks((prev) => [...prev, blockDefaults(type)]);
  }

  function buildContentJson() {
    return {
      blocks: blocks.map((b) => {
        if (b.type === "steps") {
          return {
            ...b,
            items: Array.isArray(b.items)
              ? b.items.map((x) => String(x).trim()).filter(Boolean)
              : [],
          };
        }

        return b;
      }),
    };
  }

  function buildLinkedAssessmentJson() {
    if (!linkedEnabled) return { enabled: false };

    const scales: Record<string, string[]> = {};

    for (const section of Object.keys(scalesBySection)) {
      const sectionScales = scalesBySection[section].filter((s) => selectedScales[s]);

      if (sectionScales.length > 0) {
        scales[section] = sectionScales;
      }
    }

    return {
      enabled: true,
      instrument_version: "ENDURE_v1",
      sections: Object.keys(scales),
      scales,
      trigger: "on_completion",
      delay_days: 0,
      title: linkedTitle.trim() || "Avaliação pós-intervenção",
    };
  }

  async function createTemplate() {
    try {
      setLoading(true);
      setMsg("");
      setMsgTone("default");

      if (!title.trim()) {
        throw new Error("Informe um título para a intervenção.");
      }

      const payload = {
        title: title.trim(),
        category: category.trim() || null,
        objective: objective.trim() || null,
        estimated_duration: estimatedDuration.trim() || null,
        related_scales: selectedScaleNames,
        content_json: buildContentJson(),
        linked_assessment_json: buildLinkedAssessmentJson(),
        is_active: true,
      };

      const res = await fetch("/api/intervention-templates", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error ?? "Falha ao criar intervenção.");
      }

      setMsgTone("success");
      setMsg("Intervenção criada com sucesso.");

      setTitle("");
      setCategory("");
      setObjective("");
      setEstimatedDuration("");
      setBlocks([blockDefaults("text")]);
      setLinkedEnabled(false);
      setSelectedScales({});

      await loadData();
      setSelectedTemplateId(data.template?.template_id ?? "");
    } catch (e: any) {
      setMsgTone("error");
      setMsg(e?.message ?? "Erro ao criar intervenção.");
    } finally {
      setLoading(false);
    }
  }

  async function sendIntervention() {
    try {
      setLoading(true);
      setMsg("");
      setMsgTone("default");

      if (!selectedTemplateId) {
        throw new Error("Selecione uma intervenção da biblioteca.");
      }

      if (selectedAthleteIds.length === 0) {
        throw new Error("Selecione ao menos um atleta.");
      }

      const res = await fetch("/api/intervention-assignments", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({
          template_id: selectedTemplateId,
          athlete_ids: selectedAthleteIds,
          due_at: dueAt || null,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error ?? "Falha ao enviar intervenção.");
      }

      setMsgTone("success");
      setMsg(`Intervenção enviada para ${data.count ?? selectedAthleteIds.length} atleta(s).`);

      setSelectedAthletes({});
      setDueAt("");

      await loadData();
    } catch (e: any) {
      setMsgTone("error");
      setMsg(e?.message ?? "Erro ao enviar intervenção.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="intervention-page">
      <style>{`
        .intervention-page {
          min-height: 100vh;
          background:
            radial-gradient(circle at top left, rgba(20,184,166,.14), transparent 30%),
            radial-gradient(circle at top right, rgba(249,115,22,.12), transparent 28%),
            #f8fafc;
          color: #0f172a;
          padding: 24px;
          overflow-x: hidden;
        }

        .intervention-shell {
          width: min(100%, 1180px);
          margin: 0 auto;
          display: grid;
          gap: 16px;
          box-sizing: border-box;
        }

        .hero-title {
          margin: 14px 0 10px;
          font-size: clamp(32px, 5vw, 44px);
          line-height: 1.03;
          letter-spacing: -1px;
          color: #ffffff;
          font-weight: 950;
        }

        .two-col {
          display: grid;
          grid-template-columns: minmax(0, 1.08fr) minmax(340px, .92fr);
          gap: 16px;
          align-items: start;
        }

        .field-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
          margin-top: 16px;
        }

        .field-label {
          color: #64748b;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: .35px;
          text-transform: uppercase;
          margin-bottom: 6px;
        }

        .block-card {
          border: 1px solid #e5e7eb;
          border-radius: 20px;
          background: #ffffff;
          padding: 16px;
          display: grid;
          gap: 12px;
        }

        .block-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .block-type {
          display: inline-flex;
          align-items: center;
          min-height: 28px;
          padding: 0 10px;
          border-radius: 999px;
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          color: #1d4ed8;
          font-size: 12px;
          font-weight: 900;
        }

        .template-card,
        .assignment-card,
        .athlete-row,
        .scale-row {
          border: 1px solid #e5e7eb;
          border-radius: 18px;
          background: #ffffff;
          padding: 14px;
        }

        .template-card.selected,
        .athlete-row.selected,
        .scale-row.selected {
          border-color: #7dd3fc;
          background:
            radial-gradient(circle at top left, rgba(20,184,166,.10), transparent 35%),
            #eff6ff;
        }

        .clickable {
          cursor: pointer;
        }

        .small-muted {
          color: #64748b;
          font-size: 13px;
          line-height: 1.45;
        }

        .list {
          display: grid;
          gap: 10px;
        }

        .scale-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
          margin-top: 12px;
        }

        @media (max-width: 980px) {
          .two-col {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 640px) {
          .field-grid,
          .scale-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 560px) {
          .intervention-page {
            padding: 12px;
          }

          .hero-card,
          .content-card {
            padding: 18px !important;
            border-radius: 24px !important;
          }
        }
      `}</style>

      <div className="intervention-shell">
        <section
          className="hero-card"
          style={cardStyle({
            padding: 28,
            background:
              "linear-gradient(135deg, rgba(15,23,42,.97), rgba(30,41,59,.95))",
            color: "#ffffff",
            overflow: "hidden",
            position: "relative",
          })}
        >
          <HeroDecor />

          <div style={{ position: "relative", zIndex: 1 }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                border: "1px solid rgba(153,246,228,.35)",
                background: "rgba(15,23,42,.38)",
                color: "#99f6e4",
                borderRadius: 999,
                padding: "8px 12px",
                fontSize: 12,
                fontWeight: 900,
                letterSpacing: 0.4,
              }}
            >
              Intervenções socioemocionais
            </div>

            <h1 className="hero-title">Criar e enviar intervenções</h1>

            <p
              style={{
                margin: 0,
                color: "#cbd5e1",
                lineHeight: 1.65,
                fontSize: 15,
                maxWidth: 840,
              }}
            >
              Construa tarefas flexíveis com textos, imagens, perguntas e escalas vinculadas para acompanhar o desenvolvimento dos atletas.
            </p>
          </div>
        </section>

        {msg ? (
          <section
            style={{
              borderRadius: 18,
              padding: 14,
              lineHeight: 1.6,
              fontWeight: 800,
              ...messageStyle(msgTone),
            }}
          >
            {msg}
          </section>
        ) : null}

        <section className="two-col">
          <section className="content-card" style={cardStyle()}>
            <SectionTitle
              eyebrow="Construtor"
              title="Criar intervenção"
              subtitle="Monte uma intervenção em blocos. Depois, ela ficará disponível na biblioteca para envio aos atletas."
            />

            <div className="field-grid">
              <Field label="Título">
                <input value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle()} />
              </Field>

              <Field label="Categoria">
                <input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Ex.: Mindfulness"
                  style={inputStyle()}
                />
              </Field>

              <Field label="Duração estimada">
                <input
                  value={estimatedDuration}
                  onChange={(e) => setEstimatedDuration(e.target.value)}
                  placeholder="Ex.: 5 min/dia por 7 dias"
                  style={inputStyle()}
                />
              </Field>
            </div>

            <Field label="Objetivo" style={{ marginTop: 12 }}>
              <textarea
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                placeholder="Descreva o objetivo da intervenção."
                style={textareaStyle({ minHeight: 84 })}
              />
            </Field>

            <div style={{ marginTop: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                <SectionTitle
                  eyebrow="Conteúdo"
                  title="Blocos da intervenção"
                  subtitle="Adicione textos, imagens, tarefas e perguntas."
                />

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <AddBlockButton label="Texto" onClick={() => addBlock("text")} />
                  <AddBlockButton label="Imagem" onClick={() => addBlock("image")} />
                  <AddBlockButton label="Passos" onClick={() => addBlock("steps")} />
                  <AddBlockButton label="Aberta" onClick={() => addBlock("textarea")} />
                  <AddBlockButton label="Likert" onClick={() => addBlock("likert")} />
                  <AddBlockButton label="Confirmação" onClick={() => addBlock("checkbox")} />
                </div>
              </div>

              <div className="list" style={{ marginTop: 14 }}>
                {blocks.map((block, idx) => (
                  <BlockEditor
                    key={block.id}
                    block={block}
                    index={idx}
                    total={blocks.length}
                    updateBlock={updateBlock}
                    removeBlock={removeBlock}
                    moveBlock={moveBlock}
                  />
                ))}
              </div>
            </div>

            <section style={{ marginTop: 18, borderTop: "1px solid #e5e7eb", paddingTop: 18 }}>
              <SectionTitle
                eyebrow="Avaliação vinculada"
                title="Escalas pós-intervenção"
                subtitle="Ao concluir a intervenção, o sistema poderá criar automaticamente uma avaliação pendente."
              />

              <label style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 12, fontWeight: 850 }}>
                <input
                  type="checkbox"
                  checked={linkedEnabled}
                  onChange={(e) => setLinkedEnabled(e.target.checked)}
                />
                Ativar avaliação vinculada ao concluir
              </label>

              {linkedEnabled ? (
                <>
                  <Field label="Título da avaliação" style={{ marginTop: 12 }}>
                    <input
                      value={linkedTitle}
                      onChange={(e) => setLinkedTitle(e.target.value)}
                      style={inputStyle()}
                    />
                  </Field>

                  <ScaleSelector
                    scalesBySection={scalesBySection}
                    selectedScales={selectedScales}
                    setSelectedScales={setSelectedScales}
                  />
                </>
              ) : null}
            </section>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}>
              <button type="button" disabled={loading} onClick={createTemplate} style={primaryButtonStyle(loading)}>
                {loading ? "Salvando..." : "Criar intervenção"}
              </button>
            </div>
          </section>

          <section className="content-card" style={cardStyle()}>
            <SectionTitle
              eyebrow="Envio"
              title="Enviar intervenção"
              subtitle="Selecione uma intervenção da biblioteca e escolha os atletas."
            />

            <div style={{ marginTop: 16 }}>
              <p style={miniLabelStyle()}>Biblioteca</p>

              <div className="list" style={{ marginTop: 10 }}>
                {templates.length === 0 ? (
                  <EmptyText text="Nenhuma intervenção criada ainda." />
                ) : (
                  templates.map((t) => (
                    <div
                      key={t.template_id}
                      className={selectedTemplateId === t.template_id ? "template-card selected clickable" : "template-card clickable"}
                      onClick={() => setSelectedTemplateId(t.template_id)}
                    >
                      <div style={{ fontWeight: 900, color: "#0f172a" }}>{t.title}</div>
                      <div className="small-muted" style={{ marginTop: 4 }}>
                        {t.category || "Sem categoria"} · {(t.content_json?.blocks ?? []).length} bloco(s)
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div style={{ marginTop: 18 }}>
              <p style={miniLabelStyle()}>Atletas</p>

              <div className="list" style={{ marginTop: 10, maxHeight: 360, overflow: "auto", paddingRight: 4 }}>
                {athletes.map((a) => {
                  const checked = !!selectedAthletes[a.athlete_id];

                  return (
                    <div
                      key={a.athlete_id}
                      className={checked ? "athlete-row selected clickable" : "athlete-row clickable"}
                      onClick={() =>
                        setSelectedAthletes((prev) => ({
                          ...prev,
                          [a.athlete_id]: !prev[a.athlete_id],
                        }))
                      }
                    >
                      <div style={{ fontWeight: 750, fontSize: 16.5 }}>{athleteName(a)}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <Field label="Prazo" style={{ marginTop: 16 }}>
              <input
                type="datetime-local"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
                style={inputStyle()}
              />
            </Field>

            <div style={{ marginTop: 14, padding: 14, borderRadius: 18, border: "1px solid #e5e7eb", background: "#f8fafc" }}>
              <div style={{ fontWeight: 900 }}>{selectedTemplate?.title ?? "Nenhuma intervenção selecionada"}</div>
              <div className="small-muted" style={{ marginTop: 4 }}>
                {selectedAthleteIds.length} atleta(s) selecionado(s)
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
              <button type="button" disabled={loading} onClick={sendIntervention} style={primaryButtonStyle(loading)}>
                {loading ? "Enviando..." : "Enviar intervenção"}
              </button>
            </div>
          </section>
        </section>

        <section className="content-card" style={cardStyle()}>
          <SectionTitle
            eyebrow="Acompanhamento"
            title="Intervenções enviadas"
            subtitle="Lista das tarefas já enviadas aos atletas."
          />

          <div className="list" style={{ marginTop: 14 }}>
            {assignments.length === 0 ? (
              <EmptyText text="Nenhuma intervenção enviada ainda." />
            ) : (
              assignments.map((a) => (
                <div key={a.assignment_id} className="assignment-card">
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <div>
                      <div style={{ fontWeight: 900 }}>{a.title_snapshot}</div>
                      <div className="small-muted" style={{ marginTop: 4 }}>
                        {a.athletes?.full_name ?? "Atleta"} · Enviada em {formatDate(a.assigned_at)}
                      </div>
                    </div>

                    <StatusPill status={a.status} />
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function HeroDecor() {
  return (
    <>
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
    </>
  );
}

function SectionTitle({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div>
      <p style={miniLabelStyle()}>{eyebrow}</p>
      <h2 style={{ margin: "6px 0 0", fontSize: 24, lineHeight: 1.08, letterSpacing: -0.5 }}>
        {title}
      </h2>
      {subtitle ? (
        <p style={{ margin: "8px 0 0", color: "#64748b", lineHeight: 1.6, fontSize: 14 }}>
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

function Field({
  label,
  children,
  style,
}: {
  label: string;
  children: React.ReactNode;
  style?: CSSProperties;
}) {
  return (
    <label style={{ display: "block", ...style }}>
      <div className="field-label">{label}</div>
      {children}
    </label>
  );
}

function AddBlockButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} style={secondaryButtonStyle()}>
      + {label}
    </button>
  );
}

function BlockEditor({
  block,
  index,
  total,
  updateBlock,
  removeBlock,
  moveBlock,
}: {
  block: Block;
  index: number;
  total: number;
  updateBlock: (blockId: string, patch: Partial<Block>) => void;
  removeBlock: (blockId: string) => void;
  moveBlock: (blockId: string, direction: -1 | 1) => void;
}) {
  const stepsText = Array.isArray(block.items) ? block.items.join("\n") : "";

  return (
    <div className="block-card">
      <div className="block-top">
        <span className="block-type">{blockLabel(block.type)}</span>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" disabled={index === 0} onClick={() => moveBlock(block.id, -1)} style={secondaryButtonStyle()}>
            ↑
          </button>
          <button type="button" disabled={index === total - 1} onClick={() => moveBlock(block.id, 1)} style={secondaryButtonStyle()}>
            ↓
          </button>
          <button type="button" onClick={() => removeBlock(block.id)} style={secondaryButtonStyle()}>
            Remover
          </button>
        </div>
      </div>

      {["text", "image", "steps"].includes(block.type) ? (
        <Field label="Título">
          <input
            value={block.title ?? ""}
            onChange={(e) => updateBlock(block.id, { title: e.target.value })}
            style={inputStyle()}
          />
        </Field>
      ) : null}

      {block.type === "text" ? (
        <Field label="Texto">
          <textarea
            value={block.body ?? ""}
            onChange={(e) => updateBlock(block.id, { body: e.target.value })}
            style={textareaStyle()}
          />
        </Field>
      ) : null}

      {block.type === "image" ? (
        <>
          <Field label="URL da imagem">
            <input
              value={block.image_url ?? ""}
              onChange={(e) => updateBlock(block.id, { image_url: e.target.value })}
              placeholder="https://..."
              style={inputStyle()}
            />
          </Field>

          <Field label="Legenda">
            <input
              value={block.caption ?? ""}
              onChange={(e) => updateBlock(block.id, { caption: e.target.value })}
              style={inputStyle()}
            />
          </Field>

          <Field label="Descrição alternativa">
            <input
              value={block.alt ?? ""}
              onChange={(e) => updateBlock(block.id, { alt: e.target.value })}
              style={inputStyle()}
            />
          </Field>
        </>
      ) : null}

      {block.type === "steps" ? (
        <Field label="Passos, um por linha">
          <textarea
            value={stepsText}
            onChange={(e) =>
              updateBlock(block.id, {
                items: e.target.value.split("\n"),
              })
            }
            style={textareaStyle()}
          />
        </Field>
      ) : null}

      {["textarea", "likert", "checkbox"].includes(block.type) ? (
        <Field label="Pergunta / rótulo">
          <input
            value={block.label ?? ""}
            onChange={(e) => updateBlock(block.id, { label: e.target.value })}
            style={inputStyle()}
          />
        </Field>
      ) : null}

      {block.type === "likert" ? (
        <div className="field-grid" style={{ marginTop: 0 }}>
          <Field label="Âncora mínima">
            <input
              value={block.min_label ?? ""}
              onChange={(e) => updateBlock(block.id, { min_label: e.target.value })}
              style={inputStyle()}
            />
          </Field>

          <Field label="Âncora máxima">
            <input
              value={block.max_label ?? ""}
              onChange={(e) => updateBlock(block.id, { max_label: e.target.value })}
              style={inputStyle()}
            />
          </Field>
        </div>
      ) : null}

      {["textarea", "likert", "checkbox"].includes(block.type) ? (
        <label style={{ display: "flex", gap: 10, alignItems: "center", fontWeight: 800 }}>
          <input
            type="checkbox"
            checked={!!block.required}
            onChange={(e) => updateBlock(block.id, { required: e.target.checked })}
          />
          Obrigatório
        </label>
      ) : null}
    </div>
  );
}

function blockLabel(type: BlockType) {
  const labels: Record<BlockType, string> = {
    text: "Texto",
    image: "Imagem",
    steps: "Lista de passos",
    textarea: "Pergunta aberta",
    likert: "Likert 1–5",
    checkbox: "Confirmação",
  };

  return labels[type];
}

function ScaleSelector({
  scalesBySection,
  selectedScales,
  setSelectedScales,
}: {
  scalesBySection: Record<string, string[]>;
  selectedScales: Record<string, boolean>;
  setSelectedScales: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}) {
  return (
    <div style={{ marginTop: 14 }}>
      {Object.entries(scalesBySection).map(([section, scales]) => (
        <section key={section} style={{ marginTop: 14 }}>
          <p style={miniLabelStyle()}>{section}</p>

          <div className="scale-grid">
            {scales.map((scale) => {
              const checked = !!selectedScales[scale];

              return (
                <div
                  key={scale}
                  className={checked ? "scale-row selected clickable" : "scale-row clickable"}
                  onClick={() =>
                    setSelectedScales((prev) => ({
                      ...prev,
                      [scale]: !prev[scale],
                    }))
                  }
                >
                  <div style={{ fontWeight: 750 }}>{displayScaleName(scale)}</div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const label =
    status === "pending"
      ? "Pendente"
      : status === "in_progress"
        ? "Em andamento"
        : status === "completed"
          ? "Concluída"
          : status;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        minHeight: 30,
        padding: "0 10px",
        borderRadius: 999,
        border: "1px solid #e5e7eb",
        background: "#f8fafc",
        color: "#475569",
        fontSize: 12,
        fontWeight: 900,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

function EmptyText({ text }: { text: string }) {
  return (
    <div style={{ padding: 14, borderRadius: 18, border: "1px dashed #cbd5e1", color: "#64748b", background: "#f8fafc" }}>
      {text}
    </div>
  );
}

function formatDate(value?: string | null) {
  if (!value) return "—";

  try {
    return new Date(value).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    });
  } catch {
    return "—";
  }
}