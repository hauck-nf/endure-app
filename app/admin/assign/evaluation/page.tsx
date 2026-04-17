"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/src/lib/supabaseBrowser";

type Athlete = { athlete_id: string; full_name: string | null; email: string | null };
type DictRow = { quest_section: string; scale: string | null };

export default function AssignEvaluationPage() {
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [dictRows, setDictRows] = useState<DictRow[]>([]);

  // seleção
  const [selectedAthletes, setSelectedAthletes] = useState<Record<string, boolean>>({});
  const [selectedScales, setSelectedScales] = useState<Record<string, boolean>>({}); // key = "section||scale"

  // config do request
  const [title, setTitle] = useState("ENDURE • Avaliação");
  const [instrumentVersion, setInstrumentVersion] = useState("ENDURE_v1");
  const [referenceWindow, setReferenceWindow] = useState("");
  const [dueAt, setDueAt] = useState("");

  const [step, setStep] = useState<1 | 2>(1);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // ------------- carregar atletas -------------
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

  // ------------- carregar dicionário (quest_section + scale) -------------
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

  // ------------- util: key section||scale -------------
  function makeKey(sec: string, sc: string) {
    return `${sec}||${sc}`;
  }
  function splitKey(k: string) {
    const i = k.indexOf("||");
    return { sec: k.slice(0, i), sc: k.slice(i + 2) };
  }

  // ------------- lista de escalas agrupadas por seção -------------
  const available = useMemo(() => {
    const map: Record<string, Set<string>> = {}; // section -> set(scales)

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

  // ------------- atletas selecionados -------------
  const chosenAthletes = useMemo(
    () => athletes.filter((a) => selectedAthletes[a.athlete_id]),
    [athletes, selectedAthletes]
  );

  // ------------- escalas selecionadas (keys) -------------
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

  async function send() {
    setMsg("");
    if (chosenAthletes.length === 0) return setMsg("Selecione ao menos 1 atleta.");
    if (chosenScaleKeys.length === 0) return setMsg("Selecione ao menos 1 escala.");

    setLoading(true);

    const { data: auth } = await supabaseBrowser.auth.getUser();
    const createdBy = auth.user?.id ?? null;

    // --------- montar selection_json no formato esperado por /athlete/flow ---------
    const scalesBySection: Record<string, string[]> = {};
    for (const k of chosenScaleKeys) {
      const { sec, sc } = splitKey(k);
      scalesBySection[sec] ??= [];
      scalesBySection[sec].push(sc);
    }

    // dedup + sort em cada seção
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

    const { error } = await supabaseBrowser.from("assessment_requests").insert(payload);

    setLoading(false);

    if (error) return setMsg(`Erro ao enviar: ${error.message}`);

    setMsg(`OK! Avaliação enviada para ${chosenAthletes.length} atleta(s).`);
    setSelectedAthletes({});
    setSelectedScales({});
    setStep(1);
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Designar avaliação</h1>

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 12 }}>
        <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, display: "grid", gap: 10, background: "#fff" }}>
          <div style={{ fontWeight: 600 }}>Configurações</div>

          <label style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: 12, color: "#6b7280" }}>Título</div>
            <input value={title} onChange={(e) => setTitle(e.target.value)} style={{ padding: 10, borderRadius: 10, border: "1px solid #e5e7eb" }} />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: 12, color: "#6b7280" }}>Instrument version</div>
            <input value={instrumentVersion} onChange={(e) => setInstrumentVersion(e.target.value)} style={{ padding: 10, borderRadius: 10, border: "1px solid #e5e7eb" }} />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: 12, color: "#6b7280" }}>Janela de referência (opcional)</div>
            <input value={referenceWindow} onChange={(e) => setReferenceWindow(e.target.value)} placeholder="ex.: Últimos 7 dias" style={{ padding: 10, borderRadius: 10, border: "1px solid #e5e7eb" }} />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: 12, color: "#6b7280" }}>Prazo (opcional)</div>
            <input type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} style={{ padding: 10, borderRadius: 10, border: "1px solid #e5e7eb" }} />
          </label>
        </div>

        <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, display: "grid", gap: 10, background: "#fff" }}>
          <div style={{ fontWeight: 600 }}>Resumo</div>
          <div style={{ fontSize: 13, color: "#6b7280" }}>Atletas selecionados: <b>{chosenAthletes.length}</b></div>
          <div style={{ fontSize: 13, color: "#6b7280" }}>Escalas selecionadas: <b>{chosenScaleKeys.length}</b></div>

          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" onClick={() => setStep(1)} style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #e5e7eb", background: "transparent", cursor: "pointer", opacity: step === 1 ? 1 : 0.6 }}>
              Atletas
            </button>
            <button type="button" onClick={() => setStep(2)} style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #e5e7eb", background: "transparent", cursor: "pointer", opacity: step === 2 ? 1 : 0.6 }}>
              Escalas
            </button>
          </div>

          <button type="button" disabled={loading} onClick={send} style={{ padding: "10px 12px", borderRadius: 10, fontWeight: 700, cursor: "pointer" }}>
            {loading ? "Enviando..." : "Enviar avaliação"}
          </button>

          {msg ? <div style={{ fontSize: 13, color: "#374151" }}>{msg}</div> : null}
        </div>
      </div>

      {step === 1 ? (
        <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, background: "#fff" }}>
          <div style={{ fontWeight: 600, marginBottom: 10 }}>Selecione atletas</div>
          <div style={{ display: "grid", gap: 6 }}>
            {athletes.map((a) => (
              <label key={a.athlete_id} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <input type="checkbox" checked={!!selectedAthletes[a.athlete_id]} onChange={() => toggleAthlete(a.athlete_id)} />
                <span>
                  <b>{a.full_name ?? "—"}</b> <span style={{ color: "#6b7280" }}>{a.email ?? ""}</span>
                </span>
              </label>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 16, background: "#fff" }}>
          <div style={{ fontWeight: 600, marginBottom: 10 }}>Selecione escalas</div>

          {available.map((g) => (
            <div key={g.section} style={{ marginBottom: 14, borderTop: "1px solid #f3f4f6", paddingTop: 10 }}>
              <div style={{ fontWeight: 600 }}>{g.section}</div>
              <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
                {g.scales.map((sc) => {
                  const k = makeKey(g.section, sc);
                  return (
                    <label key={k} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <input type="checkbox" checked={!!selectedScales[k]} onChange={() => toggleScale(k)} />
                      <span>{sc}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

