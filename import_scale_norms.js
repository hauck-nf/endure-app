require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");
const XLSX = require("xlsx");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const VERSION = process.env.INSTRUMENT_VERSION || "ENDURE_v1";
const PATH = process.env.NORMS_XLSX_PATH;

function toNum(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

async function main() {
  if (!PATH) throw new Error("NORMS_XLSX_PATH não definido no .env");

  const wb = XLSX.readFile(PATH);
  if (!wb.Sheets["Normas_long"]) {
    throw new Error("Aba 'Normas_long' não encontrada no XLSX.");
  }

  const sheet = wb.Sheets["Normas_long"];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: null });

  // Esperado: colunas score_scale, raw_score, theta_hat, percentile, t_score
  const payload = rows
    .map((r) => ({
      instrument_version: VERSION,
      score_scale: String(r.score_scale ?? "").trim(),
      raw_score: Number(r.raw_score),
      theta_hat: toNum(r.theta_hat),
      percentile: toNum(r.percentile),
      t_score: toNum(r.t_score),
    }))
    .filter((p) => p.score_scale && Number.isFinite(p.raw_score));

  // Upsert
  const { error } = await supabase
    .from("scale_norms")
    .upsert(payload, { onConflict: "instrument_version,score_scale,raw_score" });

  if (error) throw error;

  console.log(`OK! Normas importadas: ${payload.length} (versão: ${VERSION})`);
}

main().catch((e) => {
  console.error("ERRO:", e.message || e);
  process.exit(1);
});