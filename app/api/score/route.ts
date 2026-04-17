import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// -------- helpers --------
function optionsFrom(opt_json: any): string[] {
  if (!opt_json) return [];
  const keys = Object.keys(opt_json)
    .filter((k) => k.toLowerCase().startsWith("opt"))
    .sort((a, b) => Number(a.replace(/opt/i, "")) - Number(b.replace(/opt/i, "")));
  return keys.map((k) => String(opt_json[k] ?? "").trim()).filter(Boolean);
}

function mapResponseToScore(value: any, item: any): number | null {
  const optJson = item.opt_json || null;
  const keys = optJson
    ? Object.keys(optJson)
        .filter((k: string) => k.toLowerCase().startsWith("opt"))
        .sort((a: string, b: string) => Number(a.replace(/opt/i, "")) - Number(b.replace(/opt/i, "")))
    : [];

  const opts = keys.map((k: string) => String(optJson[k] ?? "").trim()).filter(Boolean);
  if (!opts.length) return null;

  // MULTI: não pontuar (evita bagunçar o scoring). O único multi real é sports (Identification).
  if (Array.isArray(value)) return null;

  if (value === null || value === undefined) return null;

  // 1) se vier "opt3"
  const s0 = String(value).trim();
  const m = s0.match(/^opt(\d+)$/i);
  if (m) {
    const n = Number(m[1]);
    if (Number.isFinite(n) && n >= 1 && n <= opts.length) return n;
  }

  // 2) se vier "3" ou 3
  const asNum = Number(s0);
  if (Number.isFinite(asNum) && asNum >= 1 && asNum <= opts.length) return asNum;

  // 3) se vier o texto da opção
  const idx = opts.findIndex((t) => t === s0);
  if (idx !== -1) return idx + 1;

  // 4) fallback case-insensitive
  const idx2 = opts.findIndex((t) => t.toLowerCase() === s0.toLowerCase());
  if (idx2 !== -1) return idx2 + 1;

  return null;
}

function isNegativeAffectFactor(name: string): boolean {
  const s = name.toLowerCase();
  return (
    s.includes("negative affect") ||
    s.includes("afetividade negativa") ||
    s === "anger" ||
    s === "anxiety" ||
    s === "depression" ||
    s === "rumination" ||
    s === "volatility" ||
    s === "fatigue" ||
    s.includes("ansiedade") ||
    s.includes("raiva") ||
    s.includes("depress") ||
    s.includes("rumina") ||
    s.includes("volat") ||
    s.includes("fadig")
  );
}

function nearestNormRow(rows: any[], raw: number) {
  // tenta match exato
  const exact = rows.find((r) => Number(r.raw_score) === raw);
  if (exact) return exact;

  // fallback: mais próximo
  let best = rows[0];
  let bestD = Math.abs(Number(rows[0].raw_score) - raw);
  for (const r of rows.slice(1)) {
    const d = Math.abs(Number(r.raw_score) - raw);
    if (d < bestD) {
      best = r;
      bestD = d;
    }
  }
  return best;
}

// -------- route --------
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const assessment_id = body?.assessment_id;
    if (!assessment_id) {
      return NextResponse.json({ error: "assessment_id ausente" }, { status: 400 });
    }

    // 1) assessment + raw_responses
    const { data: a, error: eA } = await supabaseAdmin
      .from("assessments")
      .select("assessment_id, athlete_id, instrument_version, raw_responses, created_at, submitted_at")
      .eq("assessment_id", assessment_id)
      .single();
    if (eA) throw eA;

    const instrument_version = a.instrument_version;
    const raw: Record<string, any> = (a.raw_responses ?? {}) as any;

    // 2) itens do instrumento (para mapear item->factor e opt_json)
    const { data: items, error: eI } = await supabaseAdmin
      .from("instrument_items")
      .select("itemcode, quest_section, factor, opt_json, type")
      .eq("instrument_version", instrument_version);
    if (eI) throw eI;

    // 3) lista de fatores candidatos (tem factor preenchido)
    const candidateFactors = new Set<string>();
    const factorSection = new Map<string, Set<string>>(); // factor -> set(sections)
    for (const it of (items ?? []) as any[]) {
      const f = String(it.factor || "").trim();
      if (!f) continue;
      candidateFactors.add(f);
      const sec = String(it.quest_section || "").trim();
      if (!factorSection.has(f)) factorSection.set(f, new Set());
      if (sec) factorSection.get(f)!.add(sec);
    }

    const factorList = Array.from(candidateFactors);
    if (factorList.length === 0) {
      // nada para pontuar
      const scores_json = { instrument_version, factors: {} };
      await supabaseAdmin.from("assessment_scores").upsert(
        {
          assessment_id,
          scores_json,
          readiness_score: null,
          scoring_version: "ENDURE_score_v1",
          computed_at: new Date().toISOString(),
        },
        { onConflict: "assessment_id" }
      );
      return NextResponse.json({ ok: true, message: "Sem fatores com normas." });
    }

    // 4) buscar normas somente para fatores existentes (scale_norms.score_scale)
    const { data: normRows, error: eN } = await supabaseAdmin
      .from("scale_norms")
      .select("score_scale, raw_score, percentile, theta_hat, t_score")
      .eq("instrument_version", instrument_version)
      .in("score_scale", factorList);
    if (eN) throw eN;

    // normed factors set
    const normed = new Set<string>((normRows ?? []).map((r: any) => String(r.score_scale || "").trim()).filter(Boolean));

    // 5) itens elegíveis = tem factor e esse factor tem norma
    const eligibleItems = ((items ?? []) as any[]).filter((it) => {
      const f = String(it.factor || "").trim();
      if (!f) return false;
      if (!normed.has(f)) return false; // <<<<<< ESSA É A REGRA QUE EVITA "Rest & well-being" SEM NORMA
      return true;
    });

    // 6) somas por fator
    const sums: Record<string, number> = {};
    const nitems: Record<string, number> = {};

    for (const it of eligibleItems) {
      const itemcode = String(it.itemcode);
      const f = String(it.factor || "").trim();
      const val = raw[itemcode];

      // converte resposta -> escore (1..k)
      const scored = mapResponseToScore(val, it);

      // se não pontuável, IGNORA
      if (scored === null || scored === undefined) continue;

      sums[f] = (sums[f] ?? 0) + scored;
      nitems[f] = (nitems[f] ?? 0) + 1;
    }

    // 7) agrupa normas por fator
    const normsByFactor: Record<string, any[]> = {};
    for (const r of (normRows ?? []) as any[]) {
      const f = String(r.score_scale || "").trim();
      normsByFactor[f] ??= [];
      normsByFactor[f].push(r);
    }
    for (const f of Object.keys(normsByFactor)) {
      normsByFactor[f].sort((a, b) => Number(a.raw_score) - Number(b.raw_score));
    }

    // 8) monta scores_json.factors apenas para fatores que tiveram n_items_scored > 0
    const factorsOut: Record<string, any> = {};
    for (const f of Object.keys(sums)) {
      const raw_sum = sums[f];
      const rows = normsByFactor[f];
      if (!rows || rows.length === 0) continue;

      const nr = nearestNormRow(rows, raw_sum);

      factorsOut[f] = {
        raw_sum,
        theta_hat: nr.theta_hat ?? null,
        percentile: nr.percentile ?? null,
        t_score: nr.t_score ?? null,
        n_items_scored: nitems[f] ?? 0,
      };
    }

    // 9) prontidão (média theta em ENDURE, invertendo Negative Affectivity)
    // só considera fatores da seção ENDURE e que tenham theta_hat numérico
    const readinessThetas: number[] = [];
    for (const f of Object.keys(factorsOut)) {
      const secSet = factorSection.get(f);
      const isEndure = secSet ? secSet.has("ENDURE") : false;
      if (!isEndure) continue;

      const th = Number(factorsOut[f].theta_hat);
      if (!Number.isFinite(th)) continue;

      const adj = isNegativeAffectFactor(f) ? -th : th;
      readinessThetas.push(adj);
    }

    const readiness_score =
      readinessThetas.length > 0
        ? readinessThetas.reduce((a, b) => a + b, 0) / readinessThetas.length
        : null;

    // 10) salva
    const scores_json = {
      instrument_version,
      factors: factorsOut,
    };

    const { error: eUp } = await supabaseAdmin.from("assessment_scores").upsert(
      {
        assessment_id,
        scores_json,
        readiness_score,
        scoring_version: "ENDURE_score_v1",
        computed_at: new Date().toISOString(),
      },
      { onConflict: "assessment_id" }
    );
    if (eUp) throw eUp;

    return NextResponse.json({
      ok: true,
      n_factors_scored: Object.keys(factorsOut).length,
      readiness_score,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? String(e) }, { status: 500 });
  }
}