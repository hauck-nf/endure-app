"use client";

import { useParams } from "next/navigation";
import AthleteDashboardClient from "@/src/components/athlete/AthleteDashboardClient";

export default function AdminAthleteDashboardPage() {
  const params = useParams();
  const athleteId = String(params?.athlete_id ?? "");

  return <AthleteDashboardClient athleteIdOverride={athleteId} />;
}