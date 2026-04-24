export type InstrumentItem = {
  instrument_version?: string | null;
  itemcode: string;
  quest_section?: string | null;
  type?: string | null;
  effect?: string | null;
  scale?: string | null;
  definition?: string | null;
  key?: number | string | null;
  item_text_port?: string | null;
  instruction?: string | null;
  [key: string]: any;
};

export type NormRow = {
  instrument_version?: string | null;
  scale?: string | null;
  raw_score: number | string;
  n_items?: number | string | null;
  theta_hat?: number | string | null;
  percentile?: number | string | null;
  t_score?: number | string | null;
  expected_score_at_theta?: number | string | null;
  [key: string]: any;
};

export type BandTextRow = {
  instrument_version?: string | null;
  scale?: string | null;
  band?: string | null;
  band_label?: string | null;
  text_port?: string | null;
  notes?: string | null;
  [key: string]: any;
};

export type ScoredScale = {
  scale: string;
  score_scale: string;
  raw_score: number;
  n_items_scored: number;
  percentile: number | null;
  t_score: number | null;
  theta_hat: number | null;
  band: string;
  band_label: string;
  text_port: string | null;
};

export type ScoreResult = {
  instrument_version: string;
  factors: ScoredScale[];
  factors_by_key: Record<string, ScoredScale>;
};

const ELIGIBLE_SECTIONS = new Set([
  "ENDURE",
  "Rest & well-being",
  "Socioemotional core",
  "Well-being",
]);

function normText(x: any): string {
  return String(x ?? "").trim();
}

function normScale(row: any): string {
  return normText(row?.scale);
}

function parseMaybeNumber(x: any): number | null {
  if (x === null || x === undefined || x === "") return null;
  if (typeof x === "number") return Number.isFinite(x) ? x : null;

  const s = String(x).trim().replace(/\./g, "").replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function parseMaybeInteger(x: any): number | null {
  const n = parseMaybeNumber(x);
  if (n === null) return null;
  return Math.round(n);
}

function normalizeBandLabelToKey(label: string | null | undefined): string | null {
  const s = normText(label).toLowerCase();
  if (!s) return null;
  if (s === "baixo") return "low";
  if (s === "médio" || s === "medio") return "mid";
  if (s === "alto") return "high";
  if (s === "grupo clínico" || s === "grupo clinico") return "clinical";
  if (s === "grupo controle") return "control";
  return null;
}

function extractOptions(item: InstrumentItem): string[] {
  const out: string[] = [];
  for (let i = 1; i <= 11; i++) {
    const v = normText(item[`opt${i}`]);
    if (v) out.push(v);
  }
  return out;
}

function optCount(item: InstrumentItem): number {
  return extractOptions(item).length;
}

function mapResponseToOrdinal(value: any, item: InstrumentItem): number | null {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) return null;

  const options = extractOptions(item);
  const k = options.length;
  if (!k) return null;

  const s = String(value).trim();

  const m = s.match(/^opt(\d+)$/i);
  if (m) {
    const n = Number(m[1]);
    if (Number.isFinite(n) && n >= 1 && n <= k) return n;
  }

  const asNum = Number(s);
  if (Number.isFinite(asNum) && asNum >= 1 && asNum <= k) return asNum;

  const idx = options.findIndex((t) => t === s);
  if (idx !== -1) return idx + 1;

  const idx2 = options.findIndex((t) => t.toLowerCase() === s.toLowerCase());
  if (idx2 !== -1) return idx2 + 1;

  return null;
}

function invertIfNeeded(x: number, item: InstrumentItem): number {
  const k = optCount(item);
  const key = Number(item.key ?? 1);
  if (key === -1 && k >= 2) return (k + 1) - x;
  return x;
}

function percentileBand(percentile: number | null): { band: string; band_label: string } {
  if (percentile === null || Number.isNaN(percentile)) {
    return { band: "mid", band_label: "Médio" };
  }
  if (percentile <= 25) return { band: "low", band_label: "Baixo" };
  if (percentile <= 75) return { band: "mid", band_label: "Médio" };
  return { band: "high", band_label: "Alto" };
}

function wellBeingBand(raw_score: number): { band: string; band_label: string } {
  if (raw_score >= 1 && raw_score <= 12) {
    return { band: "clinical", band_label: "Grupo clínico" };
  }
  return { band: "control", band_label: "Grupo controle" };
}

export function scoreEndureAssessment(args: {
  instrument_version: string;
  raw_responses: Record<string, any>;
  instrument_items: InstrumentItem[];
  scale_norms: NormRow[];
  factor_band_texts: BandTextRow[];
}): ScoreResult {
  const {
    instrument_version,
    raw_responses,
    instrument_items,
    scale_norms,
    factor_band_texts,
  } = args;

  const items = instrument_items
    .filter((it) => {
      const sec = normText(it.quest_section);
      return !sec || ELIGIBLE_SECTIONS.has(sec);
    })
    .filter((it) => !!normScale(it))
    .filter((it) => optCount(it) > 0)
    .filter((it) => {
      const rowVersion = normText(it.instrument_version);
      return !rowVersion || rowVersion === instrument_version;
    });

  const normMap = new Map<string, NormRow>();
  for (const r of scale_norms) {
    const rowVersion = normText(r.instrument_version);
    if (rowVersion && rowVersion !== instrument_version) continue;

    const scale = normScale(r);
    const raw = parseMaybeInteger(r.raw_score);
    if (!scale || raw === null) continue;

    normMap.set(`${scale}__${raw}`, r);
  }

  const textMap = new Map<string, BandTextRow>();
  for (const r of factor_band_texts) {
    const rowVersion = normText(r.instrument_version);
    if (rowVersion && rowVersion !== instrument_version) continue;

    const scale = normScale(r);
    if (!scale) continue;

    const band = normText(r.band).toLowerCase();
    const bandLabel = normText(r.band_label);
    const bandFromLabel = normalizeBandLabelToKey(bandLabel);

    if (band) textMap.set(`${scale}__${band}`, r);
    if (bandLabel) textMap.set(`${scale}__label__${bandLabel}`, r);
    if (bandFromLabel) textMap.set(`${scale}__${bandFromLabel}`, r);
  }

  const sumBy: Record<string, { sum: number; n: number }> = {};

  for (const it of items) {
    const scale = normScale(it);
    if (!scale) continue;

    const rawVal = raw_responses[it.itemcode];
    const ord = mapResponseToOrdinal(rawVal, it);
    if (ord === null) continue;

    const ord2 = invertIfNeeded(ord, it);

    sumBy[scale] ??= { sum: 0, n: 0 };
    sumBy[scale].sum += ord2;
    sumBy[scale].n += 1;
  }

  const out: ScoredScale[] = [];
  const outByKey: Record<string, ScoredScale> = {};

  for (const [scale, agg] of Object.entries(sumBy)) {
    const raw_score = agg.sum;
    const n_items_scored = agg.n;

    let percentile: number | null = null;
    let t_score: number | null = null;
    let theta_hat: number | null = null;
    let band = "mid";
    let band_label = "Médio";

    if (scale === "Well-being") {
      const wb = wellBeingBand(raw_score);
      band = wb.band;
      band_label = wb.band_label;
    } else {
      const norm = normMap.get(`${scale}__${raw_score}`) ?? null;

      percentile = parseMaybeNumber(norm?.percentile);
      t_score = parseMaybeNumber(norm?.t_score);
      theta_hat = parseMaybeNumber(norm?.theta_hat);

      const b = percentileBand(percentile);
      band = b.band;
      band_label = b.band_label;
    }

    const txtRow =
      textMap.get(`${scale}__${band}`) ??
      textMap.get(`${scale}__label__${band_label}`) ??
      null;

    const scored: ScoredScale = {
      scale,
      score_scale: scale,
      raw_score,
      n_items_scored,
      percentile,
      t_score,
      theta_hat,
      band,
      band_label,
      text_port: txtRow?.text_port ? String(txtRow.text_port) : null,
    };

    out.push(scored);
    outByKey[scale] = scored;
  }

  out.sort((a, b) => a.scale.localeCompare(b.scale, "pt-BR"));

  return {
    instrument_version,
    factors: out,
    factors_by_key: outByKey,
  };
}
