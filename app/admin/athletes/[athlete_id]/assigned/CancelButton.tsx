"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/src/lib/supabaseBrowser";

function cancelButtonStyle(disabled = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    minHeight: 38,
    padding: "0 12px",
    borderRadius: 12,
    border: "1px solid #fecaca",
    background: "#fff",
    color: disabled ? "#9ca3af" : "#b91c1c",
    fontSize: 13,
    fontWeight: 600,
    cursor: disabled ? "not-allowed" : "pointer",
    whiteSpace: "nowrap",
    fontFamily: "inherit",
    opacity: disabled ? 0.7 : 1,
  };
}

export default function CancelButton({
  requestId,
  disabled,
}: {
  requestId: string;
  disabled?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function cancel() {
    if (disabled || loading) return;

    const ok = window.confirm("Cancelar esta avaliação pendente?");
    if (!ok) return;

    try {
      setLoading(true);
      setMsg(null);

      const { error } = await supabaseBrowser
        .from("assessment_requests")
        .update({ status: "cancelled" })
        .eq("request_id", requestId);

      if (error) throw new Error(error.message);

      setMsg("Avaliação cancelada.");
      setTimeout(() => window.location.reload(), 450);
    } catch (e: any) {
      setMsg(e?.message ?? "Erro ao cancelar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <button
        type="button"
        onClick={cancel}
        disabled={disabled || loading}
        style={cancelButtonStyle(disabled || loading)}
      >
        {loading ? "Cancelando..." : "Cancelar"}
      </button>

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