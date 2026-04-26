"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/src/lib/supabaseBrowser";
import { PremiumButton } from "@/src/components/ui/premium";

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
    <PremiumButton
      tone="danger"
      disabled={disabled || busy}
      onClick={cancel}
      full
      style={{ minHeight: 38, fontSize: 13 }}
    >
      {busy ? "Cancelando..." : "Cancelar"}
    </PremiumButton>
  );
}