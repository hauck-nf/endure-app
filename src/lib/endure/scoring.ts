export type BandKey = "low" | "mid" | "high";

export type InstrumentItem = {
  instrument_version: string;
  itemcode: string;
  quest_section: string;
  scale?: string | null;
  factor?: string | null;
  key?: number | null;              // 1 ou -1 (ou null)
  opt_json?: any | null;            // {"opt1":"...", ...}
  type?: string | null;
};

export type NormRow = {
  instrument_version: string;
  score_scale: string;
  raw_score: number;
  theta_hat: number | null;
  percentile: number | null;
  t_score: number | null;
};

export type BandTextRow = {
  instrument_version: string;
  factor: string;
  band: BandKey;
  text_port: string;
  band_label?: string | null;
  score_scale?: string | null;
};

export type ScoredFactor = {
  score_scale: string;            // o que vai casar com scale_norms.score_scale
  raw_score: number;
  n_items_scored: number;
  percentile: number | null;
  t_score: number | null;
  theta_hat: number | null;
  band: BandKey;
  band_label: string;             // "Baixo/Médio/Alto"
  text_port: string | null;
};

export type ScoreResult = {
  instrument_version: string;
  factors: ScoredFactor[];
  factors_by_key: Record<string, ScoredFactor>;
};

const ELIGIBLE_SECTIONS = new Set(["ENDURE", "Rest & well-being", "Socioemotional core"]);

function optCount(opt_json: any): number {
  if (!opt_json || typeof opt_json !== "object") return 0;
  const keys = Object.keys(opt_json)
    .filter((k) => /^opt\d+$/i.test(k))
    .sort((a, b) => Number(a.replace(/opt/i, "")) - Number(b.replace(/opt/i, "")));
  return keys.length;
}

function mapResponseToOrdinal(value: any, item: InstrumentItem): number | null {
  // Regra: primeira alternativa = 1, segunda = 2, etc.
  // O raw_responses pode vir como "opt3", 3, "3", ou texto da opção.
  if (value === null || value === undefined) return null;

  // múltipla resposta (ex.: sports Identification) não entra no scoring
  if (Array.isArray(value)) return null;

  const k = optCount(item.opt_json);
  if (!k) return null;

  const s = String(value).trim();

  // 1) "opt3"
  const m = s.match(/^opt(\d+)$/i);
  if (m) {
    const n = Number(m[1]);
    if (Number.isFinite(n) && n >= 1 && n <= k) return n;
  }

  // 2) "3" ou 3
  const asNum = Number(s);
  if (Number.isFinite(asNum) && asNum >= 1 && asNum <= k) return asNum;

  // 3) texto da opção
  const keys = Object.keys(item.opt_json || {})
    .filter((kk) => /^opt\d+$/i.test(kk))
    .sort((a, b) => Number(a.replace(/opt/i, "")) - Number(b.replace(/opt/i, "")));
  const opts = keys.map((kk) => String(item.opt_json?.[kk] ?? "").trim());
  const idx = opts.findIndex((t) => t === s);
  if (idx !== -1) return idx + 1;
  const idx2 = opts.findIndex((t) => t.toLowerCase() === s.toLowerCase());
  if (idx2 !== -1) return idx2 + 1;

  return null;
}

function invertIfNeeded(x: number, item: InstrumentItem): number {
  const k = optCount(item.opt_json);
  const key = Number(item.key ?? 1);
  if (key === -1 && k >= 2) {
    // inversão padrão: (k+1) - x
    return (k + 1) - x;
  }
  return x;
}

function bandFromPercentile(p: number | null): { band: BandKey; label: string } {
  if (p === null || Number.isNaN(p)) return { band: "mid", label: "Médio" };
  if (p <= 25) return { band: "low", label: "Baixo" };
  if (p <= 75) return { band: "mid", label: "Médio" };
  return { band: "high", label: "Alto" };
}

export function scoreEndureAssessment(args: {
  instrument_version: string;
  raw_responses: Record<string, any>;
  instrument_items: InstrumentItem[];
  scale_norms: NormRow[];
  factor_band_texts: BandTextRow[];
}) : ScoreResult {
  const { instrument_version, raw_responses, instrument_items, scale_norms, factor_band_texts } = args;

  // 1) limitar itens elegíveis (seções e itens com opt_json)
  const items = instrument_items
    .filter((it) => it.instrument_version === instrument_version)
    .filter((it) => ELIGIBLE_SECTIONS.has(String(it.quest_section || "").trim()))
    .filter((it) => optCount(it.opt_json) > 0);

  // 2) mapa de normas: score_scale__raw_score
  const normMap = new Map<string, NormRow>();
  for (const r of scale_norms) {
    if (r.instrument_version !== instrument_version) continue;
    normMap.set(`${r.score_scale}__${Number(r.raw_score)}`, r);
  }

  // 3) mapa de texto: factor__band
  const textMap = new Map<string, BandTextRow>();
for (const r of factor_band_texts) {
  if (r.instrument_version !== instrument_version) continue;

  const ss = String((r as any).score_scale ?? "").trim();
  const factor = String((r as any).factor ?? "").trim();
  const band = String((r as any).band ?? "").trim();

  // chave preferencial: score_scale__band
  if (ss && band) textMap.set(`${ss}__${band}`, r);

  // fallback: factor__band
  if (factor && band) textMap.set(`${factor}__${band}`, r);
}
// 4) regra principal: "score_scale" = it.factor (se existir) senão it.scale
  // (isso bate com seus itens do Negative affectivity: scale=Negative affectivity, factor=Anger/Anxiety/etc. :contentReference[oaicite:1]{index=1})
  const sumBy: Record<string, { sum: number; n: number }> = {};

  for (const it of items) {
    const score_scale = String((it.factor ?? it.scale ?? "")).trim();
    if (!score_scale) continue;

    // só pontua escalas que existirem em scale_norms (evita lixo e garante lookup)
    // se não houver nenhuma norma para esse score_scale, pula
    // (otimização: checar por qualquer raw_score é mais caro, mas ok para MVP)
    const hasAnyNorm = scale_norms.some((r) => r.instrument_version === instrument_version && r.score_scale === score_scale);
    if (!hasAnyNorm) continue;

    const rawVal = raw_responses[it.itemcode];
    const ord = mapResponseToOrdinal(rawVal, it);
    if (ord === null) continue;

    const ord2 = invertIfNeeded(ord, it);
    sumBy[score_scale] ??= { sum: 0, n: 0 };
    sumBy[score_scale].sum += ord2;
    sumBy[score_scale].n += 1;
  }

  // 5) montar fatores finais (lookup exato em scale_norms; se não existir, deixa null)
  const out: ScoredFactor[] = [];
  const outByKey: Record<string, ScoredFactor> = {};

  for (const [score_scale, agg] of Object.entries(sumBy)) {
    const raw_score = agg.sum;
    const n_items_scored = agg.n;

    const norm = normMap.get(`${score_scale}__${raw_score}`) ?? null;

    const percentile = norm?.percentile ?? null;
    const t_score = norm?.t_score ?? null;
    const theta_hat = norm?.theta_hat ?? null;

    const { band, label } = bandFromPercentile(percentile === null ? null : Number(percentile));
    const txtRow = textMap.get(`${score_scale}__${band}`) ?? null;

    const scored: ScoredFactor = {
      score_scale,
      raw_score,
      n_items_scored,
      percentile: percentile === null ? null : Number(percentile),
      t_score: t_score === null ? null : Number(t_score),
      theta_hat: theta_hat === null ? null : Number(theta_hat),
      band,
      band_label: (txtRow?.band_label ? String(txtRow.band_label) : label),
      text_port: txtRow?.text_port ? String(txtRow.text_port) : null,
    };

    out.push(scored);
    outByKey[score_scale] = scored;
  }

  // ordena por nome da escala pra ficar estável
  out.sort((a, b) => a.score_scale.localeCompare(b.score_scale, "pt-BR"));

  return {
    instrument_version,
    factors: out,
    factors_by_key: outByKey,
  };
}
