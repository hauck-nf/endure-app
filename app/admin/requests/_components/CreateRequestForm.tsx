"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/src/lib/supabaseBrowser";

type Athlete = {
  athlete_id: string;
  athlete_name: string | null;
};

export default function CreateRequestForm({
  athletes,
  createdByUserId,
}: {
  athletes: Athlete[];
  createdByUserId: string;
}) {
  const router = useRouter();

  const [athleteId, setAthleteId] = useState<string>(athletes[0]?.athlete_id ?? "");
  const [title, setTitle] = useState<string>("ENDURE • Avaliação");
  const [instrumentVersion, setInstrumentVersion] = useState<string>("ENDURE_v1");
  const [referenceWindow, setReferenceWindow] = useState<string>("");
  const [dueAt, setDueAt] = useState<string>(""); // ISO-like local string
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string>("");

  const athleteOptions = useMemo(() => athletes ?? [], [athletes]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");

    if (!athleteId) return setMsg("Selecione um atleta.");
    if (!title.trim()) return setMsg("Informe um título.");

    setLoading(true);

    const payload: any = {
      athlete_id: athleteId,
      created_by_user_id: createdByUserId,
      title: title.trim(),
      status: "pending",
      instrument_version: instrumentVersion || null,
      reference_window: referenceWindow || null,
      due_at: dueAt ? new Date(dueAt).toISOString() : null,
    };

    const { error } = await supabaseBrowser.from("assessment_requests").insert(payload);

    setLoading(false);

    if (error) return setMsg(`Erro: ${error.message}`);

    setMsg("Pendência criada com sucesso.");
    setReferenceWindow("");
    setDueAt("");
    router.refresh();
  }

  return (
    <div style={{ border: "1px solid #222", borderRadius: 12, padding: 16 }}>
      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>Criar pendência</div>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 10 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <div style={{ fontSize: 12, opacity: 0.8 }}>Atleta</div>
          <select value={athleteId} onChange={(e) => setAthleteId(e.target.value)} style={{ padding: 10, borderRadius: 10 }}>
            {athleteOptions.map((a) => (
              <option key={a.athlete_id} value={a.athlete_id}>
                {a.athlete_name ?? a.athlete_id}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <div style={{ fontSize: 12, opacity: 0.8 }}>Título</div>
          <input value={title} onChange={(e) => setTitle(e.target.value)} style={{ padding: 10, borderRadius: 10 }} />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <div style={{ fontSize: 12, opacity: 0.8 }}>Versão do instrumento</div>
          <input value={instrumentVersion} onChange={(e) => setInstrumentVersion(e.target.value)} style={{ padding: 10, borderRadius: 10 }} />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <div style={{ fontSize: 12, opacity: 0.8 }}>Janela de referência (opcional)</div>
          <input value={referenceWindow} onChange={(e) => setReferenceWindow(e.target.value)} placeholder="ex.: Últimos 7 dias" style={{ padding: 10, borderRadius: 10 }} />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <div style={{ fontSize: 12, opacity: 0.8 }}>Prazo (opcional)</div>
          <input type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} style={{ padding: 10, borderRadius: 10 }} />
        </label>

        <button disabled={loading} style={{ padding: 10, borderRadius: 10, fontWeight: 700 }}>
          {loading ? "Criando..." : "Criar pendência"}
        </button>

        {msg ? <div style={{ fontSize: 13, opacity: 0.9 }}>{msg}</div> : null}
      </form>
    </div>
  );
}
