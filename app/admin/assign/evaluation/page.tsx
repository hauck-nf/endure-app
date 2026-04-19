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

    const { data: auth } = await supabaseBrowser.auth.getUser();
    const createdBy = auth.user?.id ?? null;

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
      title,
      status: "pending",
      instrument_version: instrumentVersion,
      reference_window: referenceWindow || null,
      due_at: dueAt ? new Date(dueAt).toISOString() : null,
      selection_json,
    }));

    const { error } = await supabaseBrowser
      .from("assessment_requests")
      .insert(payload);

    setLoading(false);

    if (error) {
      setMsg(`Erro ao enviar: ${error.message}`);
      return;
    }

    setMsg(`OK! Avaliação enviada para ${chosenAthletes.length} atleta(s).`);
    setSelectedAthletes({});
    setSelectedScales({});
    setStep(1);
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
            fontWeight: 800,
            letterSpacing: 0.3,
          }}
        >
          Administração de avaliações
        </div>

        <h1
          style={{
            margin: "14px 0 10px",
            fontSize: 32,
            lineHeight: 1.1,
            letterSpacing: -0.7,
            color: "#0f172a",
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
            maxWidth: 780,
          }}
        >
          Selecione atletas, defina as escalas que comporão a avaliação e envie a
          pendência em um único fluxo.
        </p>
      </section>

      <section
        style={{
          display: "grid",
          gap: 16,
          gridTemplateColumns: "minmax(0, 1fr)",
        }}
      >
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: 24,
            padding: 22,
            boxShadow: "0 18px 48px rgba(15,23,42,.06)",
            display: "grid",
            gap: 16,
          }}
        >
          <div
            style={{
              fontWeight: 900,
              fontSize: 22,
              color: "#0f172a",
            }}
          >
            Configurações da solicitação
          </div>

          <div
            style={{
              display: "grid",
              gap: 14,
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            }}
          >
            <label style={{ display: "grid", gap: 6 }}>
              <div style={{ fontSize: 12, color: "#6b7280" }}>Título</div>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                style={{
                  padding: 12,
                  borderRadius: 12,
                  border: "1px solid #e5e7eb",
                }}
              />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <div style={{ fontSize: 12, color: "#6b7280" }}>Versão do instrumento</div>
              <input
                value={instrumentVersion}
                onChange={(e) => setInstrumentVersion(e.target.value)}
                style={{
                  padding: 12,
                  borderRadius: 12,
                  border: "1px solid #e5e7eb",
                }}
              />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <div style={{ fontSize: 12, color: "#6b7280" }}>
                Janela de referência
              </div>
              <input
                value={referenceWindow}
                onChange={(e) => setReferenceWindow(e.target.value)}
                placeholder="Ex.: Últimos 7 dias"
                style={{
                  padding: 12,
                  borderRadius: 12,
                  border: "1px solid #e5e7eb",
                }}
              />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <div style={{ fontSize: 12, color: "#6b7280" }}>Prazo (opcional)</div>
              <input
                type="datetime-local"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
                style={{
                  padding: 12,
                  borderRadius: 12,
                  border: "1px solid #e5e7eb",
                }}
              />
            </label>
          </div>
        </div>

        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: 24,
            padding: 22,
            boxShadow: "0 18px 48px rgba(15,23,42,.06)",
            display: "grid",
            gap: 14,
          }}
        >
          <div
            style={{
              fontWeight: 900,
              fontSize: 22,
              color: "#0f172a",
            }}
          >
            Resumo
          </div>

          <div
            style={{
              display: "grid",
              gap: 8,
              color: "#64748b",
              fontSize: 14,
              lineHeight: 1.7,
            }}
          >
            <div>
              Atletas selecionados: <b style={{ color: "#0f172a" }}>{chosenAthletes.length}</b>
            </div>
            <div>
              Escalas selecionadas: <b style={{ color: "#0f172a" }}>{chosenScaleKeys.length}</b>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              onClick={() => setStep(1)}
              style={{
                minHeight: 42,
                padding: "10px 14px",
                borderRadius: 12,
                border: "1px solid #e5e7eb",
                background: step === 1 ? "#0f172a" : "#fff",
                color: step === 1 ? "#fff" : "#0f172a",
                fontWeight: 800,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Atletas
            </button>

            <button
              type="button"
              onClick={() => setStep(2)}
              style={{
                minHeight: 42,
                padding: "10px 14px",
                borderRadius: 12,
                border: "1px solid #e5e7eb",
                background: step === 2 ? "#0f172a" : "#fff",
                color: step === 2 ? "#fff" : "#0f172a",
                fontWeight: 800,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Escalas
            </button>

            <div style={{ flex: 1 }} />

            <button
              type="button"
              disabled={loading}
              onClick={send}
              style={{
                minHeight: 46,
                padding: "12px 16px",
                borderRadius: 14,
                border: "1px solid #0f172a",
                background: "#0f172a",
                color: "#fff",
                fontWeight: 800,
                fontSize: 14,
                cursor: loading ? "not-allowed" : "pointer",
                fontFamily: "inherit",
              }}
            >
              {loading ? "Enviando..." : "Enviar avaliação"}
            </button>
          </div>

          {msg ? (
            <div
              style={{
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
        <section
          style={{
            background: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: 24,
            padding: 22,
            boxShadow: "0 18px 48px rgba(15,23,42,.06)",
            display: "grid",
            gap: 16,
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
            <div>
              <div
                style={{
                  fontWeight: 900,
                  fontSize: 22,
                  color: "#0f172a",
                }}
              >
                Selecionar atletas
              </div>

              <div
                style={{
                  color: "#64748b",
                  fontSize: 14,
                  marginTop: 4,
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
                  minHeight: 42,
                  padding: "10px 14px",
                  borderRadius: 12,
                  border: "1px solid #e5e7eb",
                  background: "#fff",
                  color: "#0f172a",
                  fontWeight: 700,
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
                  minHeight: 42,
                  padding: "10px 14px",
                  borderRadius: 12,
                  border: "1px solid #e5e7eb",
                  background: "#fff",
                  color: "#0f172a",
                  fontWeight: 700,
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
              padding: 12,
              borderRadius: 12,
              border: "1px solid #e5e7eb",
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
                  <b style={{ color: "#0f172a" }}>{a.full_name ?? "—"}</b>
                  <span style={{ color: "#6b7280", display: "block" }}>
                    {a.email ?? ""}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </section>
      ) : (
        <section
          style={{
            background: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: 24,
            padding: 22,
            boxShadow: "0 18px 48px rgba(15,23,42,.06)",
            display: "grid",
            gap: 16,
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
            <div>
              <div
                style={{
                  fontWeight: 900,
                  fontSize: 22,
                  color: "#0f172a",
                }}
              >
                Selecionar escalas
              </div>

              <div
                style={{
                  color: "#64748b",
                  fontSize: 14,
                  marginTop: 4,
                }}
              >
                Escolha as escalas que serão incluídas na pendência.
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={selectAllVisibleScales}
                style={{
                  minHeight: 42,
                  padding: "10px 14px",
                  borderRadius: 12,
                  border: "1px solid #e5e7eb",
                  background: "#fff",
                  color: "#0f172a",
                  fontWeight: 700,
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
                  minHeight: 42,
                  padding: "10px 14px",
                  borderRadius: 12,
                  border: "1px solid #e5e7eb",
                  background: "#fff",
                  color: "#0f172a",
                  fontWeight: 700,
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
              padding: 12,
              borderRadius: 12,
              border: "1px solid #e5e7eb",
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
                    fontWeight: 900,
                    fontSize: 18,
                    color: "#0f172a",
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
                        <span style={{ color: "#0f172a", lineHeight: 1.6 }}>{sc}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}