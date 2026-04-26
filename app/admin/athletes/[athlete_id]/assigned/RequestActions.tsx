"use client";

import { PremiumLinkButton } from "@/src/components/ui/premium";

type ReqRow = {
  request_id: string;
  title: string | null;
  status: string;
  instrument_version: string | null;
  reference_window: string | null;
  due_at: string | null;
  created_at: string;
  selection_json: any;
};

export default function RequestActions({
  athleteId,
  request,
}: {
  athleteId: string;
  request: ReqRow;
}) {
  return (
    <div style={{ display: "grid", gap: 8, minWidth: 148 }}>
      <PremiumLinkButton
        href={`/athlete/flow/${request.request_id}`}
        tone="light"
        full
        style={{ minHeight: 38, fontSize: 13 }}
      >
        Abrir
      </PremiumLinkButton>
    </div>
  );
}