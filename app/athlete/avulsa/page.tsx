"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../src/lib/supabaseClient";
import { getMyAthleteId } from "../../../src/lib/athlete";

type Row = { quest_section: string; scale: string | null };

const SECTION_ORDER = ["Training", "ENDURE", "Rest & well-being", "Socioemotional core"];

export default function AvulsaPage() {
  const version = process.env.NEXT_PUBLIC_INSTRUMENT_VERSION!;
  const [rows, setRows] = useState<Row[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  // seleção: section -> scale -> bool
  const [sel, setSel] = useState<Record<string, Record<string, boolean>>>({});

  useEffect(() => {
    (async () => {
      try {
        setErr(null);
        const { data, error } = await supabase
          .from("instrument_items")
          .select("quest_section, scale")
          .eq("instrument_version", version);

        if (error) throw error;

        const clean = ((data as Row[]) ?? [])
          .map((r) => ({
            quest_section: String(r.quest_section ?? "").trim(),
            scale: r.scale ? String(r.scale).trim() : null,
          }))
          .filter(
            (r) =>
              SECTION_ORDER.includes(r.quest_section) &&
              r.scale &&
              r.scale !== "—" &&
              r.scale.length > 0
          );

        setRows(clean);
      } catch (e: any) {
        setErr(e.message ?? "Erro ao carregar escalas.");
      }
    })();
  }, [version]);

  const grouped = useMemo(() => {
    const out: Record<string, string[]> = {};
    for (const r of rows) {
      out[r.quest_section] ??= [];
      out[r.quest_section].push(r.scale!);
    }
    for (const sec of Object.keys(out)) {
      out[sec] = Array.from(new Set(out[sec])).sort();
    }
    return out;
  }, [rows]);

  function toggle(sec: string, sc: string) {
    setSel((prev) => ({
      ...prev,
      [sec]: { ...(prev[sec] ?? {}), [sc]: !((prev[sec] ?? {})[sc]) },
    }));
  }

  function selectAll(sec: string, on: boolean) {
    const list = grouped[sec] ?? [];
    setSel((prev) => ({
      ...prev,
      [sec]: Object.fromEntries(list.map((s) => [s, on])),
    }));
  }

  const chosen = useMemo(() => {
    const out: { section: string; scale: string }[] = [];
    for (const sec of Object.keys(sel)) {
      for (const sc of Object.keys(sel[sec] ?? {})) {
        if (sel[sec][sc]) out.push({ section: sec, scale: sc });
      }
    }
    return out;
  }, [sel]);

  async function start() {
    try {
      setErr(null);
      setMsg(null);

      if (chosen.length === 0) {
        setErr("Selecione ao menos uma escala.");
        return;
      }

      const athleteId = await getMyAthleteId();

      const { data: ures } = await supabase.auth.getUser();
      const user = ures.user;
      if (!user) throw new Error("Usuário não autenticado.");

      // monta selection_json igual ao admin
      const sections = Array.from(new Set(chosen.map((c) => c.section)));

      const scales: Record<string, string[]> = {};
      for (const sec of sections) {
        scales[sec] = chosen.filter((c) => c.section === sec).map((c) => c.scale);
      }

      const selection_json = { sections, scales };

      const { data: created, error } = await supabase
        .from("assessment_requests")
        .insert({
          athlete_id: athleteId,
          created_by_user_id: user.id,
          title: "Avaliação avulsa",
          status: "pending",
          instrument_version: version,
          reference_window: "sem janela definida",
          selection_json,
        })
        .select("request_id")
        .single();

      if (error) throw error;

      setMsg("Pacote criado. Redirecionando…");
      window.location.href = `/athlete/flow/${created.request_id}`;
    } catch (e: any) {
      setErr(e.message ?? "Erro ao iniciar avaliação avulsa.");
    }
  }

  return (
    <div style={{ maxWidth: 980 }}>
      <h2>Realizar avaliação avulsa</h2>
      <p style={{ color: "#6b7280" }}>
        Selecione as escalas que você deseja responder agora. (Identification não aparece aqui.)
      </p>

      {err && (
        <div style={{ padding: 12, border: "1px solid #ef4444", borderRadius: 12, color: "#b91c1c" }}>
          {err}
        </div>
      )}
      {msg && (
        <div style={{ padding: 12, border: "1px solid #10b981", borderRadius: 12, color: "#065f46" }}>
          {msg}
        </div>
      )}

      <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
        {SECTION_ORDER.map((sec) => (
          <div key={sec} style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
              <div style={{ fontWeight: 600 }}>{sec}</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => selectAll(sec, true)}
                  style={{
                    border: "1px solid #e5e7eb",
                    background: "transparent",
                    borderRadius: 10,
                    padding: "6px 10px",
                    cursor: "pointer",
                  }}
                >
                  Marcar tudo
                </button>
                <button
                  onClick={() => selectAll(sec, false)}
                  style={{
                    border: "1px solid #e5e7eb",
                    background: "transparent",
                    borderRadius: 10,
                    padding: "6px 10px",
                    cursor: "pointer",
                  }}
                >
                  Limpar
                </button>
              </div>
            </div>

            <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
              {(grouped[sec] ?? []).map((sc) => (
                <label key={sc} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <input type="checkbox" checked={!!sel[sec]?.[sc]} onChange={() => toggle(sec, sc)} />
                  <span>{sc}</span>
                </label>
              ))}
              {(grouped[sec] ?? []).length === 0 && <div style={{ color: "#6b7280" }}>Sem escalas neste bloco.</div>}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 14, display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
        <div style={{ color: "#6b7280" }}>
          Selecionadas: <b>{chosen.length}</b>
        </div>
        <button
          onClick={start}
          style={{
            border: "1px solid #111827",
            background: "#111827",
            color: "#fff",
            borderRadius: 12,
            padding: "10px 12px",
            cursor: "pointer",
          }}
        >
          Iniciar
        </button>
      </div>
    </div>
  );
}