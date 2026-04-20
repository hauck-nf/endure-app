"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/src/lib/supabaseBrowser";

type Athlete = {
  athlete_id: string;
  full_name: string | null;
  email: string | null;
};

type DictRow = {
  quest_section: string;
  scale: string | null;
};

function makeKey(sec: string, sc: string) {
  return `${sec}||${sc}`;
}

function splitKey(k: string) {
  const i = k.indexOf("||");
  return { sec: k.slice(0, i), sc: k.slice(i + 2) };
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

      if (!a.error) setAthletes((a.data ?? []) as any);
      else setMsg(`Erro athletes: ${a.error.message}`);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const d = await supabaseBrowser
        .from("instrument_items")
        .select("quest_section, scale")
        .eq("instrument_version", instrumentVersion);

      if (!d.error) setDictRows((d.data ?? []) as any);
      else setMsg(`Erro instrument_items: ${d.error.message}`);
    })();
  }, [instrumentVersion]);

  const available = useMemo(() => {
    const map: Record<string, Set<string>> = {};

    for (const r of dictRows) {
      const sec = String(r.quest_section ?? "").trim();
      const sc = String(r.scale ?? "").trim();
      if (!sec || !sc) continue;
      map[sec] ??= new Set();
      map[sec].add(sc);
    }

    const sections = Object.keys(map).sort();
    return sections.map((sec) => ({
      section: sec,
      scales: Array.from(map[sec]).sort(),
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
    for (const a of filteredAthletes) next[a.athlete_id] = true;
    setSelectedAthletes(next);
  }

  function clearAllVisibleAthletes() {
    const next = { ...selectedAthletes };
    for (const a of filteredAthletes) delete next[a.athlete_id];
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

      if (chosenAthletes.length === 0) {
        setMsg("Selecione ao menos 1 atleta.");
        return;
      }

      if (chosenScaleKeys.length === 0) {
        setMsg("Selecione ao menos 1 escala.");
        return;
      }

      setLoading(true);

      const { data: authRes, error: authErr } = await supabaseBrowser.auth.getUser();
      if (authErr) {
        throw new Error(authErr.message);
      }

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

      if (error) {
        throw new Error(error.message);
      }

      setMsg(`OK! Avaliação enviada para ${chosenAthletes.length} atleta(s).`);
      setSelectedAthletes({});
      setSelectedScales({});
      setSearchAthlete("");
      setSearchScale("");
      setStep(1);
    } catch (e: any) {
      setMsg(`Erro ao enviar: ${e?.message ?? "Falha desconhecida."}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        maxWidth: 1180,
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
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            border: "1px solid #dbeafe",
            background: "#eff6ff",
            color: "#1d4ed8",
            borderRadius: 999,
            padding: "8px 12px",
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: 0.2,
          }}
        >
          Administração de avaliações
        </div>

        <h1
          style={{
            margin: "14px 0 10px",
            fontSize: 32,
            lineHeight: 1.1,
            letterSpacing: -0.6,
            color: "#0f172a",
            fontWeight: 700,
          }}
        >
          Designar avaliação
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
          Selecione os atletas, defina as escalas que compõem a avaliação e envie a
          pendência em um único fluxo.
        </p>
      </section>

      <section
        data-assign-grid="true"
        style={{
          display: "grid",
          gap: 16,
          gridTemplateColumns: "minmax(0, 1fr)",
        }}
      >
        <div style={cardStyle()}>
          <h2
            style={{
              margin: 0,
              fontSize: 24,
              lineHeight: 1.15,
              color: "#0f172a",
              fontWeight: 700,
            }}
          >
            Configurações
          </h2>

          <div
            style={{
              marginTop: 8,
              marginBottom: 16,
              color: "#64748b",
              fontSize: 14,
              lineHeight: 1.75,
            }}
          >
            Defina o título, a versão do instrumento e o prazo da solicitação.
          </div>

          <div
            style={{
              display: "grid",
              gap: 14,
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            }}
          >
            <label style={{ display: "grid", gap: 6 }}>
              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>
                Título
              </div>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                style={{
                  padding: "12px 14px",
                  borderRadius: 14,
                  border: "1px solid #d1d5db",
                  fontFamily: "inherit",
                  fontSize: 14,
                }}
              />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>
                Versão do instrumento
              </div>
              <input
                value={instrumentVersion}
                onChange={(e) => setInstrumentVersion(e.target.value)}
                style={{
                  padding: "12px 14px",
                  borderRadius: 14,
                  border: "1px solid #d1d5db",
                  fontFamily: "inherit",
                  fontSize: 14,
                }}
              />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>
                Janela de referência
              </div>
              <input
                value={referenceWindow}
                onChange={(e) => setReferenceWindow(e.target.value)}
                placeholder="Ex.: Últimos 7 dias"
                style={{
                  padding: "12px 14px",
                  borderRadius: 14,
                  border: "1px solid #d1d5db",
                  fontFamily: "inherit",
                  fontSize: 14,
                }}
              />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>
                Prazo
              </div>
              <input
                type="datetime-local"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
                style={{
                  padding: "12px 14px",
                  borderRadius: 14,
                  border: "1px solid #d1d5db",
                  fontFamily: "inherit",
                  fontSize: 14,
                }}
              />
            </label>
          </div>
        </div>

        <div style={cardStyle()}>
          <h2
            style={{
              margin: 0,
              fontSize: 24,
              lineHeight: 1.15,
              color: "#0f172a",
              fontWeight: 700,
            }}
          >
            Resumo
          </h2>

<div
  style={{
    marginTop: 8,
    marginBottom: 16,
    color: "#64748b",
    fontSize: 14,
    lineHeight: 1.75,
  }}
>
  Acompanhe a quantidade de atletas e escalas selecionados antes do envio.
</div>

          <div
            style={{
              display: "grid",
              gap: 10,
              color: "#475569",
              fontSize: 14,
              lineHeight: 1.7,
            }}
          >
            <div>
              Atletas selecionados:{" "}
              <span style={{ color: "#0f172a", fontWeight: 600 }}>
                {chosenAthletes.length}
              </span>
            </div>
            <div>
              Escalas selecionadas:{" "}
              <span style={{ color: "#0f172a", fontWeight: 600 }}>
                {chosenScaleKeys.length}
              </span>
            </div>
          </div>
          
          {msg ? (
            <div
              style={{
                marginTop: 16,
                border: "1px solid #e5e7eb",
                background: "#f8fafc",
                color: "#334155",
                borderRadius: 16,
                padding: 14,
                lineHeight: 1.7,
                fontSize: 14,
              }}
            >
              {msg}
            </div>
          ) : null}
        </div>
      </section>

      {step === 1 ? (
        <section style={cardStyle()}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              alignItems: "center",
              flexWrap: "wrap",
              marginBottom: 16,
            }}
          >
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: 24,
                  lineHeight: 1.15,
                  color: "#0f172a",
                  fontWeight: 700,
                }}
              >
                Selecionar atletas
              </h2>

              <div
                style={{
                  marginTop: 6,
                  color: "#64748b",
                  fontSize: 14,
                  lineHeight: 1.7,
                }}
              >
                Escolha um ou mais atletas para receber a avaliação.
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={selectAllVisibleAthletes}
                style={{
                  minHeight: 40,
                  padding: "0 14px",
                  borderRadius: 12,
                  border: "1px solid #d1d5db",
                  background: "#fff",
                  color: "#0f172a",
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Selecionar visíveis
              </button>

              <button
                type="button"
                onClick={clearAllVisibleAthletes}
                style={{
                  minHeight: 40,
                  padding: "0 14px",
                  borderRadius: 12,
                  border: "1px solid #d1d5db",
                  background: "#fff",
                  color: "#0f172a",
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Limpar visíveis
              </button>
            </div>
          </div>

          <input
            value={searchAthlete}
            onChange={(e) => setSearchAthlete(e.target.value)}
            placeholder="Buscar atleta por nome ou email"
            style={{
              width: "100%",
              padding: "12px 14px",
              borderRadius: 14,
              border: "1px solid #d1d5db",
              fontFamily: "inherit",
              fontSize: 14,
              marginBottom: 16,
            }}
          />

          <div style={{ display: "grid", gap: 10 }}>
            {filteredAthletes.map((a) => (
              <label
                key={a.athlete_id}
                style={{
                  display: "flex",
                  gap: 12,
                  alignItems: "flex-start",
                  padding: "12px 14px",
                  borderRadius: 16,
                  border: "1px solid #e5e7eb",
                  background: selectedAthletes[a.athlete_id] ? "#eff6ff" : "#fff",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={!!selectedAthletes[a.athlete_id]}
                  onChange={() => toggleAthlete(a.athlete_id)}
                  style={{ marginTop: 2 }}
                />
                <span style={{ lineHeight: 1.6 }}>
                  <span style={{ color: "#0f172a", fontWeight: 600 }}>
                    {a.full_name ?? "—"}
                  </span>
                  <span
                    style={{
                      color: "#64748b",
                      display: "block",
                      fontSize: 14,
                    }}
                  >
                    {a.email ?? ""}
                  </span>
                </span>
              </label>
            ))}
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginTop: 16,
            }}
          >
            <button
              type="button"
              onClick={() => setStep(2)}
              style={{
                minHeight: 42,
                padding: "0 16px",
                borderRadius: 12,
                border: "1px solid #0f172a",
                background: "#0f172a",
                color: "#fff",
                fontWeight: 600,
                fontSize: 14,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Continuar para escalas
            </button>
          </div>
        </section>
      ) : (
        <section style={cardStyle()}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              alignItems: "center",
              flexWrap: "wrap",
              marginBottom: 16,
            }}
          >
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: 24,
                  lineHeight: 1.15,
                  color: "#0f172a",
                  fontWeight: 700,
                }}
              >
                Selecionar escalas
              </h2>

              <div
                style={{
                  marginTop: 6,
                  color: "#64748b",
                  fontSize: 14,
                  lineHeight: 1.7,
                }}
              >
                Escolha as escalas que serão incluídas na avaliação.
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={selectAllVisibleScales}
                style={{
                  minHeight: 40,
                  padding: "0 14px",
                  borderRadius: 12,
                  border: "1px solid #d1d5db",
                  background: "#fff",
                  color: "#0f172a",
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Selecionar visíveis
              </button>

              <button
                type="button"
                onClick={clearAllVisibleScales}
                style={{
                  minHeight: 40,
                  padding: "0 14px",
                  borderRadius: 12,
                  border: "1px solid #d1d5db",
                  background: "#fff",
                  color: "#0f172a",
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Limpar visíveis
              </button>
            </div>
          </div>

          <input
            value={searchScale}
            onChange={(e) => setSearchScale(e.target.value)}
            placeholder="Buscar seção ou escala"
            style={{
              width: "100%",
              padding: "12px 14px",
              borderRadius: 14,
              border: "1px solid #d1d5db",
              fontFamily: "inherit",
              fontSize: 14,
              marginBottom: 16,
            }}
          />

          <div style={{ display: "grid", gap: 14 }}>
            {filteredAvailable.map((g) => (
              <div
                key={g.section}
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 18,
                  padding: 16,
                  background: "#fcfcfd",
                  display: "grid",
                  gap: 12,
                }}
              >
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: 16,
                    color: "#0f172a",
                    lineHeight: 1.35,
                  }}
                >
                  {g.section}
                </div>

                <div style={{ display: "grid", gap: 10 }}>
                  {g.scales.map((sc) => {
                    const k = makeKey(g.section, sc);

                    return (
                      <label
                        key={k}
                        style={{
                          display: "flex",
                          gap: 12,
                          alignItems: "flex-start",
                          padding: "12px 14px",
                          borderRadius: 16,
                          border: "1px solid #e5e7eb",
                          background: selectedScales[k] ? "#eff6ff" : "#fff",
                          cursor: "pointer",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={!!selectedScales[k]}
                          onChange={() => toggleScale(k)}
                          style={{ marginTop: 2 }}
                        />
                        <span
                          style={{
                            color: "#0f172a",
                            fontSize: 14,
                            lineHeight: 1.6,
                          }}
                        >
                          {sc}
                        </span>
                      </label>
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
              marginTop: 16,
            }}
          >
            <button
              type="button"
              onClick={() => setStep(1)}
              style={{
                minHeight: 42,
                padding: "0 14px",
                borderRadius: 12,
                border: "1px solid #d1d5db",
                background: "#fff",
                color: "#0f172a",
                fontWeight: 600,
                fontSize: 14,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Voltar para atletas
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={send}
              style={{
                minHeight: 42,
                padding: "0 16px",
                borderRadius: 12,
                border: "1px solid #0f172a",
                background: "#0f172a",
                color: "#fff",
                fontWeight: 600,
                fontSize: 14,
                cursor: loading ? "not-allowed" : "pointer",
                fontFamily: "inherit",
              }}
            >
              {loading ? "Enviando..." : "Enviar avaliação"}
            </button>
          </div>
        </section>
      )}

      <style>{`
        @media (min-width: 960px) {
          section[data-assign-grid="true"] {
            grid-template-columns: minmax(0, 1.1fr) minmax(320px, 0.9fr);
            align-items: start;
          }
        }
      `}</style>
    </div>
  );
}