"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { supabaseBrowser } from "@/src/lib/supabaseBrowser";

type Athlete = {
  athlete_id: string;
  full_name: string | null;
  email: string | null;
};

type DictRow = {
  quest_section: string | null;
  scale: string | null;
};

type MsgTone = "default" | "error" | "success";

function makeKey(sec: string, sc: string) {
  return `${sec}||${sc}`;
}

function splitKey(k: string) {
  const i = k.indexOf("||");
  return { sec: k.slice(0, i), sc: k.slice(i + 2) };
}

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
    strivings: "Perfectionism-strivings",
    "perfectionism-strivings": "Perfectionism-strivings",

    concerns: "Perfectionism-concerns",
    "perfectionism-concerns": "Perfectionism-concerns",

    "vigor/energia": "Vigor",
    "vigor-energia": "Vigor",
    energy: "Vigor",
    vigor: "Vigor",

    autodialogo: "Autodiálogo",
    "auto-dialogo": "Autodiálogo",
    "self-talk": "Autodiálogo",
    selftalk: "Autodiálogo",
  };

  return aliases[key] ?? original;
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

function inputStyle(): CSSProperties {
  return {
    width: "100%",
    minHeight: 46,
    padding: "0 14px",
    borderRadius: 14,
    border: "1px solid #d1d5db",
    background: "#ffffff",
    color: "#0f172a",
    fontFamily: "inherit",
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
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

function messageStyle(tone: MsgTone): CSSProperties {
  if (tone === "error") {
    return {
      border: "1px solid #fecaca",
      background: "#fef2f2",
      color: "#991b1b",
    };
  }

  if (tone === "success") {
    return {
      border: "1px solid #bbf7d0",
      background: "#f0fdf4",
      color: "#166534",
    };
  }

  return {
    border: "1px solid #e5e7eb",
    background: "#f8fafc",
    color: "#334155",
  };
}

function SectionTitle({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div>
      {eyebrow ? <p style={miniLabelStyle()}>{eyebrow}</p> : null}

      <h2
        style={{
          margin: eyebrow ? "6px 0 0" : 0,
          fontSize: 24,
          lineHeight: 1.08,
          letterSpacing: -0.5,
          color: "#0f172a",
        }}
      >
        {title}
      </h2>

      {subtitle ? (
        <p
          style={{
            margin: "8px 0 0",
            color: "#64748b",
            fontSize: 14,
            lineHeight: 1.6,
          }}
        >
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

export default function AssignEvaluationPage() {
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [dictRows, setDictRows] = useState<DictRow[]>([]);

  const [selectedAthletes, setSelectedAthletes] = useState<Record<string, boolean>>({});
  const [selectedScales, setSelectedScales] = useState<Record<string, boolean>>({});

  const [title, setTitle] = useState("ENDURE • Avaliação");
  const [instrumentVersion, setInstrumentVersion] = useState("ENDURE_v1");
  const [referenceWindow, setReferenceWindow] = useState("");
  const [dueAt, setDueAt] = useState("");

  const [step, setStep] = useState<1 | 2>(1);
  const [msg, setMsg] = useState("");
  const [msgTone, setMsgTone] = useState<MsgTone>("default");
  const [loading, setLoading] = useState(false);

  const [searchAthlete, setSearchAthlete] = useState("");
  const [searchScale, setSearchScale] = useState("");

  useEffect(() => {
    (async () => {
      const a = await supabaseBrowser
        .from("athletes")
        .select("athlete_id, full_name, email")
        .order("full_name", { ascending: true })
        .limit(2000);

      if (!a.error) {
        setAthletes((a.data ?? []) as Athlete[]);
      } else {
        setMsgTone("error");
        setMsg(`Erro ao carregar atletas: ${a.error.message}`);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { data: sessionData } = await supabaseBrowser.auth.getSession();
        const token = sessionData.session?.access_token ?? "";

        const res = await fetch("/api/instrument-items", {
          method: "GET",
          headers: token ? { authorization: `Bearer ${token}` } : {},
        });

        const payload: any = await res.json().catch(() => ({}));

        if (!res.ok || !payload?.ok) {
          throw new Error(payload?.error ?? "Falha ao carregar itens do instrumento.");
        }

        setDictRows((payload.items ?? []) as DictRow[]);
      } catch (e: any) {
        setMsgTone("error");
        setMsg(`Erro ao carregar itens do instrumento: ${e?.message ?? "Falha desconhecida."}`);
      }
    })();
  }, []);

  const available = useMemo(() => {
    const map: Record<string, Set<string>> = {};

    for (const r of dictRows) {
      const sec = String(r.quest_section ?? "").trim();
      const sc = canonicalScaleName(r.scale);

      if (!sec || !sc) continue;

      map[sec] ??= new Set();
      map[sec].add(sc);
    }

    const sectionOrder = [
      "Identification",
      "Training",
      "ENDURE",
      "Rest & well-being",
      "Socioemocional core",
    ];

    const sections = Object.keys(map).sort((a, b) => {
      const ia = sectionOrder.indexOf(a);
      const ib = sectionOrder.indexOf(b);

      if (ia === -1 && ib === -1) return a.localeCompare(b);
      if (ia === -1) return 1;
      if (ib === -1) return -1;

      return ia - ib;
    });

    return sections.map((sec) => ({
      section: sec,
      scales: Array.from(map[sec]).sort((a, b) => a.localeCompare(b)),
    }));
  }, [dictRows]);

  const filteredAthletes = useMemo(() => {
    const q = searchAthlete.trim().toLowerCase();

    if (!q) return athletes;

    return athletes.filter((a) => {
      const name = (a.full_name ?? "").toLowerCase();
      const email = (a.email ?? "").toLowerCase();

      return name.includes(q) || email.includes(q);
    });
  }, [athletes, searchAthlete]);

  const filteredAvailable = useMemo(() => {
    const q = searchScale.trim().toLowerCase();

    if (!q) return available;

    return available
      .map((group) => ({
        section: group.section,
        scales: group.scales.filter((s) => {
          const sec = group.section.toLowerCase();
          const sc = s.toLowerCase();

          return sec.includes(q) || sc.includes(q);
        }),
      }))
      .filter((g) => g.scales.length > 0);
  }, [available, searchScale]);

  const chosenAthletes = useMemo(
    () => athletes.filter((a) => selectedAthletes[a.athlete_id]),
    [athletes, selectedAthletes]
  );

  const chosenScaleKeys = useMemo(
    () => Object.keys(selectedScales).filter((k) => selectedScales[k]),
    [selectedScales]
  );

  function toggleAthlete(id: string) {
    setSelectedAthletes((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function toggleScale(key: string) {
    setSelectedScales((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function selectAllVisibleAthletes() {
    const next = { ...selectedAthletes };

    for (const a of filteredAthletes) {
      next[a.athlete_id] = true;
    }

    setSelectedAthletes(next);
  }

  function clearAllVisibleAthletes() {
    const next = { ...selectedAthletes };

    for (const a of filteredAthletes) {
      delete next[a.athlete_id];
    }

    setSelectedAthletes(next);
  }

  function selectAllVisibleScales() {
    const next = { ...selectedScales };

    for (const group of filteredAvailable) {
      for (const sc of group.scales) {
        next[makeKey(group.section, sc)] = true;
      }
    }

    setSelectedScales(next);
  }

  function clearAllVisibleScales() {
    const next = { ...selectedScales };

    for (const group of filteredAvailable) {
      for (const sc of group.scales) {
        delete next[makeKey(group.section, sc)];
      }
    }

    setSelectedScales(next);
  }

  async function send() {
    try {
      setMsg("");
      setMsgTone("default");

      if (chosenAthletes.length === 0) {
        setMsgTone("error");
        setMsg("Selecione ao menos 1 atleta.");
        return;
      }

      if (chosenScaleKeys.length === 0) {
        setMsgTone("error");
        setMsg("Selecione ao menos 1 escala.");
        return;
      }

      setLoading(true);

      const { data: authRes, error: authErr } =
        await supabaseBrowser.auth.getUser();

      if (authErr) throw new Error(authErr.message);

      const createdBy = authRes.user?.id;

      if (!createdBy) {
        throw new Error("Sessão do administrador não encontrada. Entre novamente no sistema.");
      }

      const scalesBySection: Record<string, string[]> = {};

      for (const k of chosenScaleKeys) {
        const { sec, sc } = splitKey(k);
        scalesBySection[sec] ??= [];
        scalesBySection[sec].push(sc);
      }

      Object.keys(scalesBySection).forEach((sec) => {
        scalesBySection[sec] = Array.from(new Set(scalesBySection[sec])).sort();
      });

      const sections = Object.keys(scalesBySection).sort();

      const selection_json = {
        sections,
        scales: scalesBySection,
      };

      const payload = chosenAthletes.map((a) => ({
        athlete_id: a.athlete_id,
        created_by_user_id: createdBy,
        title: title.trim() || "ENDURE • Avaliação",
        status: "pending",
        instrument_version: instrumentVersion.trim() || "ENDURE_v1",
        reference_window: referenceWindow.trim() || null,
        due_at: dueAt ? new Date(dueAt).toISOString() : null,
        selection_json,
      }));

      const { error } = await supabaseBrowser
        .from("assessment_requests")
        .insert(payload);

      if (error) throw new Error(error.message);

      setMsgTone("success");
      setMsg(`OK! Avaliação enviada para ${chosenAthletes.length} atleta(s).`);
      setSelectedAthletes({});
      setSelectedScales({});
      setSearchAthlete("");
      setSearchScale("");
      setStep(1);
    } catch (e: any) {
      setMsgTone("error");
      setMsg(`Erro ao enviar: ${e?.message ?? "Falha desconhecida."}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="assign-page">
      <style>{`
        .assign-page {
          min-height: 100vh;
          background:
            radial-gradient(circle at top left, rgba(20,184,166,.14), transparent 30%),
            radial-gradient(circle at top right, rgba(249,115,22,.12), transparent 28%),
            #f8fafc;
          color: #0f172a;
          padding: 24px;
          overflow-x: hidden;
        }

        .assign-shell {
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

        .summary-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.15fr) minmax(320px, .85fr);
          gap: 16px;
          align-items: start;
        }

        .field-grid {
          display: grid;
          gap: 14px;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          margin-top: 16px;
        }

        .field-label {
          font-size: 12px;
          color: #64748b;
          font-weight: 900;
        }

        .section-toolbar {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          align-items: center;
          flex-wrap: wrap;
          margin-bottom: 16px;
        }

        .list-grid {
          display: grid;
          gap: 10px;
        }

        .selection-row {
          display: flex;
          gap: 12px;
          align-items: flex-start;
          padding: 13px 14px;
          border-radius: 16px;
          border: 1px solid #e5e7eb;
          background: #ffffff;
          cursor: pointer;
          transition: border-color .15s ease, background .15s ease, transform .15s ease;
        }

        .selection-row:hover {
          transform: translateY(-1px);
          border-color: #cbd5e1;
        }

        .selection-row.selected {
          border-color: #7dd3fc;
          background:
            radial-gradient(circle at top left, rgba(20,184,166,.10), transparent 35%),
            #eff6ff;
        }
        .selection-button {
          width: 100%;
          text-align: left;
          font-family: inherit;
          appearance: none;
          -webkit-appearance: none;
        }

        .selection-button:focus-visible {
          outline: 3px solid rgba(14,165,233,.25);
          outline-offset: 2px;
        }

        .selection-name {
          color: #0f172a;
          font-weight: 650;
          font-size: 16.5px;
          line-height: 1.35;
          letter-spacing: -0.1px;
        }

        .selection-row.selected .selection-name {
          color: #082f49;
          font-weight: 700;
        }.scale-section {
          border: 1px solid #e5e7eb;
          border-radius: 20px;
          padding: 16px;
          background: #fcfcfd;
          display: grid;
          gap: 12px;
        }

        .scale-section-title {
          font-weight: 950;
          font-size: 16px;
          color: #0f172a;
          line-height: 1.35;
        }

        @media (max-width: 860px) {
          .summary-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 560px) {
          .assign-page {
            padding: 12px;
          }

          .hero-card {
            padding: 22px 18px !important;
            border-radius: 26px !important;
          }

          .content-card {
            padding: 18px !important;
            border-radius: 24px !important;
          }

          .field-grid {
            grid-template-columns: 1fr;
          }

          .section-toolbar {
            align-items: stretch;
          }

          .section-toolbar > div:last-child {
            width: 100%;
          }
        }
      `}</style>

      <div className="assign-shell">
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
              Administração de avaliações
            </div>

            <h1 className="hero-title">Designar avaliação</h1>

            <p
              style={{
                margin: 0,
                color: "#cbd5e1",
                lineHeight: 1.65,
                fontSize: 15,
                maxWidth: 780,
              }}
            >
              Selecione os atletas, defina as escalas que compõem a avaliação e envie a pendência em um único fluxo.
            </p>
          </div>
        </section>

        <section className="summary-grid">
          <div className="content-card" style={cardStyle()}>
            <SectionTitle
              eyebrow="Configurações"
              title="Detalhes da solicitação"
              subtitle="Defina o título, a versão do instrumento, a janela de referência e o prazo."
            />

            <div className="field-grid">
              <label style={{ display: "grid", gap: 6 }}>
                <div className="field-label">Título</div>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  style={inputStyle()}
                />
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                <div className="field-label">Versão do instrumento</div>
                <input
                  value={instrumentVersion}
                  onChange={(e) => setInstrumentVersion(e.target.value)}
                  style={inputStyle()}
                />
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                <div className="field-label">Janela de referência</div>
                <input
                  value={referenceWindow}
                  onChange={(e) => setReferenceWindow(e.target.value)}
                  placeholder="Ex.: Últimos 7 dias"
                  style={inputStyle()}
                />
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                <div className="field-label">Prazo</div>
                <input
                  type="datetime-local"
                  value={dueAt}
                  onChange={(e) => setDueAt(e.target.value)}
                  style={inputStyle()}
                />
              </label>
            </div>
          </div>

          <div className="content-card" style={cardStyle()}>
            <SectionTitle
              eyebrow="Resumo"
              title="Antes do envio"
              subtitle="Acompanhe os totais selecionados para evitar solicitações incompletas."
            />

            <div
              style={{
                display: "grid",
                gap: 12,
                marginTop: 18,
              }}
            >
              <SummaryPill label="Atletas selecionados" value={chosenAthletes.length} />
              <SummaryPill label="Escalas selecionadas" value={chosenScaleKeys.length} />
            </div>

            {msg ? (
              <div
                style={{
                  marginTop: 16,
                  borderRadius: 16,
                  padding: 14,
                  lineHeight: 1.65,
                  fontSize: 14,
                  fontWeight: 700,
                  ...messageStyle(msgTone),
                }}
              >
                {msg}
              </div>
            ) : null}
          </div>
        </section>

        {step === 1 ? (
          <section className="content-card" style={cardStyle()}>
            <div className="section-toolbar">
              <SectionTitle
                eyebrow="Etapa 1"
                title="Selecionar atletas"
                subtitle="Escolha um ou mais atletas para receber a avaliação."
              />

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button type="button" onClick={selectAllVisibleAthletes} style={secondaryButtonStyle()}>
                  Selecionar visíveis
                </button>

                <button type="button" onClick={clearAllVisibleAthletes} style={secondaryButtonStyle()}>
                  Limpar visíveis
                </button>
              </div>
            </div>

            <input
              value={searchAthlete}
              onChange={(e) => setSearchAthlete(e.target.value)}
              placeholder="Buscar atleta por nome ou email"
              style={{ ...inputStyle(), marginBottom: 16 }}
            />

            <div className="list-grid">
              {filteredAthletes.map((a) => {
                const checked = !!selectedAthletes[a.athlete_id];

                return (
                  <button
                    key={a.athlete_id}
                    type="button"
                    onClick={() => toggleAthlete(a.athlete_id)}
                    aria-pressed={checked}
                    className={
                      checked
                        ? "selection-row selection-button selected"
                        : "selection-row selection-button"
                    }
                  >
                    <span className="selection-name">
                      {a.full_name ?? "—"}
                    </span>
                  </button>
                );
              })}
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginTop: 18,
              }}
            >
              <button type="button" onClick={() => setStep(2)} style={primaryButtonStyle()}>
                Continuar para escalas
              </button>
            </div>
          </section>
        ) : (
          <section className="content-card" style={cardStyle()}>
            <div className="section-toolbar">
              <SectionTitle
                eyebrow="Etapa 2"
                title="Selecionar escalas"
                subtitle="Escolha as escalas que serão incluídas na avaliação."
              />

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button type="button" onClick={selectAllVisibleScales} style={secondaryButtonStyle()}>
                  Selecionar visíveis
                </button>

                <button type="button" onClick={clearAllVisibleScales} style={secondaryButtonStyle()}>
                  Limpar visíveis
                </button>
              </div>
            </div>

            <input
              value={searchScale}
              onChange={(e) => setSearchScale(e.target.value)}
              placeholder="Buscar seção ou escala"
              style={{ ...inputStyle(), marginBottom: 16 }}
            />

            <div style={{ display: "grid", gap: 14 }}>
              {filteredAvailable.map((g) => (
                <div key={g.section} className="scale-section">
                  <div className="scale-section-title">{g.section}</div>

                  <div className="list-grid">
                    {g.scales.map((sc) => {
                      const k = makeKey(g.section, sc);
                      const checked = !!selectedScales[k];

                      return (
                        <button
                          key={k}
                          type="button"
                          onClick={() => toggleScale(k)}
                          aria-pressed={checked}
                          className={
                            checked
                              ? "selection-row selection-button selected"
                              : "selection-row selection-button"
                          }
                        >
                          <span className="selection-name">
                            {sc}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
                alignItems: "center",
                marginTop: 18,
              }}
            >
              <button type="button" onClick={() => setStep(1)} style={secondaryButtonStyle()}>
                Voltar para atletas
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={send}
                style={primaryButtonStyle(loading)}
              >
                {loading ? "Enviando..." : "Enviar avaliação"}
              </button>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function SummaryPill({ label, value }: { label: string; value: number }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 12,
        alignItems: "center",
        minHeight: 48,
        padding: "0 14px",
        borderRadius: 16,
        border: "1px solid #e5e7eb",
        background: "#f8fafc",
      }}
    >
      <span style={{ color: "#475569", fontWeight: 800 }}>{label}</span>
      <span style={{ color: "#0f172a", fontWeight: 950, fontSize: 22 }}>
        {value}
      </span>
    </div>
  );
}