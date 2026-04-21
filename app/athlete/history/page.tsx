import { redirect } from "next/navigation";
import { createClient } from "@/src/lib/supabaseServer";
import HistoryClient from "./HistoryClient";

export const dynamic = "force-dynamic";

export default async function AthleteHistoryPage() {
  const supabase = await createClient();

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login?next=/athlete/history");

  const { data: ath } = await supabase
    .from("athletes")
    .select("athlete_id")
    .eq("user_id", auth.user.id)
    .maybeSingle();

  if (!ath?.athlete_id) redirect("/athlete");

  // Histórico = assessments submetidos do atleta
  const { data: rows } = await supabase
    .from("assessments")
    .select("assessment_id, submitted_at, instrument_version")
    .eq("athlete_id", ath.athlete_id)
    .eq("status", "submitted")
    .order("submitted_at", { ascending: false })
    .limit(200);

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={{ fontSize: 12, letterSpacing: 0.2, opacity: 0.75 }}>Área do atleta</div>

      <div style={{ fontSize: 18, fontWeight: 900, color: "#111827" }}>Histórico de avaliações</div>

      <div style={{ fontSize: 13, lineHeight: 1.5, opacity: 0.8, maxWidth: 720 }}>
        Consulte aqui as avaliações concluídas e abra o relatório sempre que quiser revisitar seus resultados.
      </div>

      <div style={{ height: 6 }} />

      <HistoryClient rows={(rows ?? []) as any} />
    </div>
  );
}