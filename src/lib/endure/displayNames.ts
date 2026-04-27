function normKey(x: any): string {
  return String(x ?? "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/_/g, "-")
    .replace(/\s+/g, "-");
}

const SCALE_DISPLAY_NAMES_PT: Record<string, string> = {
  "agreeableness": "Amabilidade",
  "anger": "Raiva",
  "anxiety": "Ansiedade",
  "autodialogo": "Autodiálogo",
  "conscientiousness": "Conscienciosidade",
  "depression": "Depressão",
  "emotional-intelligence": "Inteligência emocional",
  "extraversion": "Extroversão",
  "fatigue": "Fadiga",
  "grit": "Grit",
  "mastery-goals": "Metas de domínio",
  "mental-practice": "Prática mental",
  "mindfulness": "Mindfulness",
  "negative-affectivity": "Afetividade negativa",
  "openness": "Abertura à experiência",
  "performance-goals": "Metas de desempenho",
  "perfectionism-concerns": "Preocupações perfeccionistas",
  "perfectionism-strivings": "Esforços perfeccionistas",
  "rumination": "Ruminação",
  "self-efficacy": "Autoeficácia",
  "task-oriented-coping": "Coping orientado à tarefa",
  "vigor": "Vigor",
  "well-being": "Bem-estar",

  // Aliases antigos, para não quebrar relatórios já gerados ou nomes residuais
  "mastery-approach-goals": "Metas de domínio",
  "mastery-avoidance-goals": "Metas de domínio",
  "performance-approach-goals": "Metas de desempenho",
  "performance-avoidance-goals": "Metas de desempenho",
  "strivings": "Esforços perfeccionistas",
  "concerns": "Preocupações perfeccionistas",
  "vigor-energia": "Vigor",
  "vigor/energia": "Vigor",
  "self-talk": "Autodiálogo"
};

export function displayScaleName(scale: any): string {
  const original = String(scale ?? "").trim();
  const key = normKey(original);

  return SCALE_DISPLAY_NAMES_PT[key] ?? original;
}

export function displayScaleNames(scales: any[]): string[] {
  return scales.map(displayScaleName);
}
export function sortScaleNamesForDisplay(scales: string[]): string[] {
  return [...scales].sort((a, b) =>
    displayScaleName(a).localeCompare(displayScaleName(b), "pt-BR")
  );
}