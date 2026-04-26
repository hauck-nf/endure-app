"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/src/lib/supabaseBrowser";

function buttonStyle(disabled = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    minHeight: 38,
    padding: "0 12px",
    borderRadius: 12,
    border: disabled ? "1px solid #e5e7eb" : "1px solid #ef4444",
    background: disabled ? "#f8fafc" : "#ef4444",
    color: disabled ? "#94a3b8" : "#ffffff",
    textDecoration: "none",
    fontSize: 13,
    fontWeight: 800,
    fontFamily: "inherit",
    whiteSpace: "nowrap",
    boxSizing: "border-box",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.8 : 1,
  };
}

export default function CancelButton({
  requestId,
  disabled,
}: {
  requestId: string;
  disabled?: boolean;
}) {
  const [busy, setBusy] = useState(false);

  async function cancel() {
    if (disabled || busy) return;

    const ok = window.confirm("Cancelar esta avaliação designada?");

    if (!ok) return;

    try {
      setBusy(true);

      const { error } = await supabaseBrowser
        .from("assessment_requests")
        .update({ status: "cancelled" })
        .eq("request_id", requestId);

      if (error) throw error;

      window.location.reload();
    } catch (e: any) {
      alert(e?.message ?? "Erro ao cancelar avaliação.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ width: 148 }}>
      <button
        type="button"
        disabled={disabled || busy}
        onClick={cancel}
        style={buttonStyle(disabled || busy)}
      >
        {busy ? "Cancelando..." : "Cancelar"}
      </button>
    </div>
  );
}