"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/src/lib/supabaseBrowser";

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

    setLoading(true);
    setMsg(null);

    const { error } = await supabaseBrowser
      .from("assessment_requests")
      .update({ status: "cancelled" })
      .eq("request_id", requestId);

    setLoading(false);

    if (error) {
      setMsg(error.message);
      return;
    }

    setMsg("Cancelada.");
    setTimeout(() => window.location.reload(), 350);
  }

  const style: React.CSSProperties = {
    width: "100%",
    height: 34,
    padding: "0 10px",
    borderRadius: 10,
    border: "1px solid #e5e7eb",
    background: "#fff",
    color: disabled ? "#9ca3af" : "#111827",
    fontSize: 12,
    fontWeight: 600, // ✅ sem negrito exagerado
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.6 : 1,
  };

  return (
    <div style={{ display: "grid", gap: 8, minWidth: 120 }}>
      <button type="button" onClick={cancel} disabled={disabled || loading} style={style}>
        {loading ? "Cancelando..." : "Cancelar"}
      </button>

      {msg ? <div style={{ fontSize: 12, color: "#6b7280" }}>{msg}</div> : null}
    </div>
  );
}
