import { supabaseBrowser } from "@/src/lib/supabaseBrowser";

export async function getMyAthleteId(): Promise<string> {
  // ✅ Mobile-safe: getSession (local) é muito mais confiável que getUser() no primeiro carregamento
  const { data: sess } = await supabaseBrowser.auth.getSession();
  const user = sess?.session?.user;

  if (!user) {
    throw new Error("Usuário não autenticado");
  }

  // Busca athlete_id pelo user_id (sessão)
  const { data, error } = await supabaseBrowser
    .from("athletes")
    .select("athlete_id")
    .eq("user_id", user.id)
    .single();

  if (error) throw error;

  const athleteId = data?.athlete_id;
  if (!athleteId) {
    throw new Error("Atleta não encontrado para este usuário");
  }

  return String(athleteId);
}
