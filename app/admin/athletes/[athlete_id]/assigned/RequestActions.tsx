"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/src/lib/supabaseBrowser";

type Props = {
  athleteId: string;
  request: {
    request_id: string;
    title: string | null;
    instrument_version: string | null;
    reference_window: string | null;
    due_at: string | null;
    selection_json: any;
  };
};

function baseUrl() {
  const env = (process.env.NEXT_PUBLIC_BASE_URL || "").trim();
  if (env) return env.replace(/\/+$/, "");
  return window.location.origin;
}

const btn: React.CSSProperties = {
  width: "100%",
  height: 34,
  padding: "0 10px",
  borderRadius: 10,
  border: "1px solid #e5e7eb",
  background: "#fff",
  color: "#111827",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
};

const tiny: React.CSSProperties = { fontSize: 11, color: "#6b7280", fontWeight: 600 };

export default function RequestActions({ athleteId, request }: Props) {
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const localFlowLink = `${window.location.origin}/athlete/flow/${request.request_id}`;
  const publicFlowLink = `${baseUrl()}/athlete/flow/${request.request_id}`;

  async function copy(text: string, okMsg: string) {
    setMsg(null);
    try {
      await navigator.clipboard.writeText(text);
      setMsg(okMsg);
      setTimeout(() => setMsg(null), 1200);
    } catch {
      setMsg("Não consegui copiar. Copie manualmente.");
    }
  }

  async function resend() {
    setMsg(null);
    setBusy(true);
    try {
      const { data: auth } = await supabaseBrowser.auth.getUser();
      const createdBy = auth.user?.id ?? null;

      const payload = {
        athlete_id: athleteId,
        created_by_user_id: createdBy,
        title: request.title ?? "ENDURE • Avaliação",
        status: "pending",
        instrument_version: request.instrument_version ?? "ENDURE_v1",
        reference_window: request.reference_window ?? null,
        due_at: request.due_at ?? null,
        selection_json: request.selection_json ?? null,
      };

      const { error } = await supabaseBrowser.from("assessment_requests").insert(payload);
      if (error) throw error;

      setMsg("Reenviado.");
      setTimeout(() => window.location.reload(), 350);
    } catch (e: any) {
      setMsg(e?.message ?? "Erro ao reenviar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 8, minWidth: 190 }}>
      <button type="button" onClick={() => copy(publicFlowLink, "Link público copiado.")} style={btn} title="Link para enviar ao atleta">
        <span>Copiar link público</span>
        <span style={tiny}>📱</span>
      </button>

      <button type="button" onClick={() => copy(localFlowLink, "Link local copiado.")} style={btn} title="Útil apenas no seu computador">
        <span>Copiar link local</span>
        <span style={tiny}>🖥️</span>
      </button>

      <button
        type="button"
        disabled={busy}
        onClick={resend}
        style={{
          ...btn,
          opacity: busy ? 0.7 : 1,
          cursor: busy ? "not-allowed" : "pointer",
        }}
        title="Cria uma nova avaliação igual a esta"
      >
        <span>{busy ? "Reenviando..." : "Reenviar"}</span>
        <span style={tiny}>↻</span>
      </button>

      {msg ? <div style={{ fontSize: 12, color: "#6b7280" }}>{msg}</div> : null}
    </div>
  );
}
