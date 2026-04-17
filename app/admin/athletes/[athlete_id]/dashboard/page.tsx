"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function DashboardRedirect() {
  const params = useParams();
  const router = useRouter();

  const athleteId = String((params as any)?.athlete_id ?? "").trim();

  useEffect(() => {
    if (!athleteId) return;
    router.replace(`/admin/athletes/${athleteId}/dashboard/view`);
  }, [athleteId, router]);

  return <div style={{ padding: 16, color: "#6b7280" }}>Abrindo dashboard…</div>;
}
