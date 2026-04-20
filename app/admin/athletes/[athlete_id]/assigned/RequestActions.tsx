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

function actionButtonStyle(disabled = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    minHeight: 38,
    padding: "0 12px",
    borderRadius: 12,
    border: "1px solid #d1d5db",
    background: "#fff",
    color: disabled ? "#9ca3af" : "#0f172a",
    fontSize: 13,
    fontWeight: 600,
    cursor: disabled ? "not-allowed" : "pointer",
    whiteSpace: "nowrap",
    fontFamily: "inherit",
    opacity: disabled ? 0.7 : 1,
  };
}

export default function RequestActions({ athleteId, request }: Props) {
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const publicFlowLink = `${baseUrl()}/athlete/flow/${request.request_id}`;
  const localFlowLink = `${window.location.origin}/athlete/flow/${request.request_id}`;

  async function copy(text: string, okMsg: string) {
    setMsg(null);
    try {
      await navigator.clipboard.writeText(text);
      setMsg(okMsg);
      setTimeout(() => setMsg(null), 1400);
    } catch {
      setMsg("Não foi possível copiar.");
    }
  }

  async function resend() {
    try {
      setMsg(null);
      setBusy(true);

      const { data: authRes, error: authErr } = await supabaseBrowser.auth.getUser();
      if (authErr) throw new Error(authErr.message);

      const createdBy = authRes.user?.id;
      if (!createdBy) throw new Error("Sessão do administrador não encontrada.");

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

      const { error } = await supabaseBrowser
        .from("assessment_requests")
        .insert(payload);

      if (error) throw new Error(error.message);

      setMsg("Avaliação reenviada.");
      setTimeout(() => window.location.reload(), 450);
    } catch (e: any) {
      setMsg(e?.message ?? "Erro ao reenviar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div
        className="assigned-secondary-actions-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: 8,
        }}
      >
        <button
          type="button"
          onClick={() => copy(publicFlowLink, "Link público copiado.")}
          style={actionButtonStyle()}
        >
          Link público
        </button>

        <button
          type="button"
          onClick={() => copy(localFlowLink, "Link local copiado.")}
          style={actionButtonStyle()}
        >
          Link local
        </button>

        <button
          type="button"
          onClick={resend}
          disabled={busy}
          style={actionButtonStyle(busy)}
        >
          {busy ? "Reenviando..." : "Reenviar"}
        </button>

        <div />
      </div>

      {msg ? (
        <div
          style={{
            fontSize: 12,
            color: "#64748b",
            lineHeight: 1.5,
          }}
        >
          {msg}
        </div>
      ) : null}
    </div>
  );
}