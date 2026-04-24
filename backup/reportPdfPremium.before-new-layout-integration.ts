import { PDFDocument, PDFFont, StandardFonts, rgb } from "pdf-lib";
import { loadReportAssets, type ReportAssets } from "./reports/reportAssets";

type AthleteRow = {
  full_name: string | null;
  email: string | null;
  team: string | null;
  sport_primary: string | null;
  birth_date: string | null;
  sex: string | null;
  gender: string | null;
};

type AssessmentRow = {
  assessment_id: string;
  instrument_version: string | null;
  reference_window: string | null;
  created_at: string | null;
  submitted_at: string | null;
};

type FactorScore = {
  score_scale: string;
  raw_score: number | null;
  t_score: number | null;
  percentile: number | null;
  theta_hat: number | null;
  band: string | null;
  band_label: string | null;
  text_port: string | null;
  n_items_scored: number | null;
};

type BroadDimension = {
  name: string;
  z_score: number | null;
  percentile: number | null;
  scales: string[];
  summary: string;
};

type PdfPage = ReturnType<PDFDocument["addPage"]>;
type RGB = ReturnType<typeof rgb>;

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN_X = 42;
const FOOTER_H = 42;
const HEADER_Y = PAGE_H - 48;

const C = {
  bg: rgb(0.972, 0.976, 0.985),
  white: rgb(1, 1, 1),
  ink: rgb(0.08, 0.16, 0.27),
  navy: rgb(0.07, 0.18, 0.29),
  navy2: rgb(0.15, 0.28, 0.43),
  steel: rgb(0.38, 0.48, 0.6),
  muted: rgb(0.52, 0.58, 0.66),
  line: rgb(0.83, 0.87, 0.92),
  soft: rgb(0.945, 0.955, 0.97),
  soft2: rgb(0.91, 0.93, 0.955),
  lowBg: rgb(0.995, 0.95, 0.93),
  lowInk: rgb(0.56, 0.22, 0.12),
  midBg: rgb(0.93, 0.95, 0.98),
  midInk: rgb(0.23, 0.4, 0.62),
  highBg: rgb(0.93, 0.97, 0.94),
  highInk: rgb(0.12, 0.36, 0.22),
};

const WORKING_MODEL: Record<string, string[]> = {
  "Negative Affectivity": [
    "Anger",
    "Anxiety",
    "Depression",
    "Fatigue",
    "Rumination",
    "Mastery avoidance goals",
    "Performance avoidance goals",
    "Concerns",
  ],
  "Positive Affectivity": [
    "Energy",
    "Mastery approach goals",
    "Performance approach goals",
    "Self-efficacy",
  ],
  "Self-regulation": [
    "Strivings",
    "Task-oriented coping",
    "Mindfulness",
    "Mental practice",
    "Grit",
    "Autodiálogo",
    "Emotional intelligence",
    "Volatility",
  ],
};

const SCALE_DESCRIPTIONS: Record<string, string> = {
  "Self-efficacy": "Crença na própria capacidade de enfrentar demandas, desafios e metas esportivas.",
  Mindfulness: "Capacidade de manter atenção consciente, estável e não reativa à experiência presente.",
  Rumination: "Tendência a permanecer mentalmente preso a erros, preocupações e conteúdos negativos.",
  Grit: "Persistência e manutenção do esforço diante de obstáculos e metas de longo prazo.",
  Energy: "Sensação de vitalidade, disposição e prontidão psicológica para treinar e competir.",
  Anxiety: "Tendência a experimentar preocupação, tensão e ativação ansiosa em contextos de pressão.",
  "Task-oriented coping": "Tendência a lidar com demandas por meio de planejamento, ação e foco na tarefa.",
  "Emotional intelligence": "Capacidade de perceber, compreender e regular emoções em si e nos outros.",
};

function fmtDateBR(iso: string | null | undefined) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

function fmtDateTimeBR(iso: string | null | undefined) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

function fmtHourBR(iso: string | null | undefined) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleTimeString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtNum(n: number | null | undefined, digits = 0) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return "-";
  return Number(n).toFixed(digits).replace(".", ",");
}

function fmtPct(p: number | null | undefined) {
  if (p === null || p === undefined || Number.isNaN(Number(p))) return "-";
  return String(Math.round(Number(p)));
}

function textWidth(font: PDFFont, text: string, size: number) {
  return font.widthOfTextAtSize(text, size);
}

function centerText(page: PdfPage, text: string, x: number, y: number, w: number, size: number, font: PDFFont, color: RGB) {
  page.drawText(text, { x: x + (w - textWidth(font, text, size)) / 2, y, size, font, color });
}

function wrapTextByWidth(text: string, font: PDFFont, size: number, maxWidth: number) {
  const safe = String(text ?? "").replace(/\s+/g, " ").trim();
  if (!safe) return [""];

  const words = safe.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (textWidth(font, next, size) <= maxWidth) {
      current = next;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }

  if (current) lines.push(current);
  return lines;
}

function drawWrappedText(params: {
  page: PdfPage;
  text: string;
  x: number;
  yTop: number;
  maxWidth: number;
  font: PDFFont;
  size: number;
  color: RGB;
  lineGap?: number;
  maxLines?: number;
}) {
  const { page, text, x, yTop, maxWidth, font, size, color, lineGap = 3, maxLines = 999 } = params;
  const lines = wrapTextByWidth(text, font, size, maxWidth).slice(0, maxLines);
  let y = yTop;

  for (const line of lines) {
    page.drawText(line, { x, y, size, font, color });
    y -= size + lineGap;
  }

  return y + size + lineGap;
}

function drawCard(page: PdfPage, x: number, y: number, w: number, h: number, fill = C.white, border = C.line) {
  page.drawRectangle({ x, y, width: w, height: h, color: fill, borderColor: border, borderWidth: 1 });
}

function drawRule(page: PdfPage, x: number, y: number, w = 40, color = C.navy2) {
  page.drawLine({ start: { x, y }, end: { x: x + w, y }, thickness: 1.5, color });
}

function drawFrame(page: PdfPage) {
  page.drawRectangle({ x: 18, y: 18, width: PAGE_W - 36, height: PAGE_H - 36, borderWidth: 0.8, borderColor: C.line });
}

function drawAssetImage(page: PdfPage, image: any, x: number, y: number, width: number, height: number, opacity?: number) {
  page.drawImage(image, { x, y, width, height, opacity });
}

function drawFooter(page: PdfPage, assets: ReportAssets, pageNumber: number, regular: PDFFont, bold: PDFFont) {
  page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: FOOTER_H, color: C.navy });

  drawAssetImage(page, assets.footerMark, 28, 6, 30, 30);

  const label = "Relatório de avaliação socioemocional - Prof. Dr. Nelson Hauck Filho";
  centerText(page, label, 70, 15, PAGE_W - 150, 9.5, regular, C.white);

  const n = String(pageNumber);
  page.drawText(n, {
    x: PAGE_W - MARGIN_X - textWidth(bold, n, 10),
    y: 15,
    size: 10,
    font: bold,
    color: C.white,
  });
}

function drawHeader(page: PdfPage, assets: ReportAssets, section: string, regular: PDFFont) {
  drawAssetImage(page, assets.logo, MARGIN_X, HEADER_Y - 10, 82, 24);
  page.drawText(section.toUpperCase(), {
    x: PAGE_W - MARGIN_X - textWidth(regular, section.toUpperCase(), 9),
    y: HEADER_Y - 1,
    size: 9,
    font: regular,
    color: C.navy2,
  });
  page.drawLine({
    start: { x: MARGIN_X, y: PAGE_H - 66 },
    end: { x: PAGE_W - MARGIN_X, y: PAGE_H - 66 },
    thickness: 1,
    color: C.navy2,
  });
}

function erf(x: number) {
  const sign = x >= 0 ? 1 : -1;
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const ax = Math.abs(x);
  const t = 1 / (1 + p * ax);
  const y = 1 - (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t) * Math.exp(-ax * ax);
  return sign * y;
}

function normalCdf(z: number) {
  return 0.5 * (1 + erf(z / Math.SQRT2));
}

function tToZ(t: number | null | undefined) {
  if (t === null || t === undefined || Number.isNaN(Number(t))) return null;
  return (Number(t) - 50) / 10;
}

function inferBroadDimension(scaleName: string) {
  const normalized = String(scaleName ?? "").trim().toLowerCase();
  for (const [dimension, scales] of Object.entries(WORKING_MODEL)) {
    for (const s of scales) {
      if (normalized === s.trim().toLowerCase()) return dimension;
    }
  }
  return null;
}

function getBandLabel(f: FactorScore) {
  const label = String(f.band_label ?? f.band ?? "").toLowerCase();
  if (label.includes("alto") || label.includes("high")) return "Alto";
  if (label.includes("baixo") || label.includes("low")) return "Baixo";
  return "Médio";
}

function badgeColors(label: string) {
  if (label === "Alto") return { bg: C.highBg, ink: C.highInk };
  if (label === "Baixo") return { bg: C.lowBg, ink: C.lowInk };
  return { bg: C.midBg, ink: C.midInk };
}

function computeBroadDimensions(factors: FactorScore[]): BroadDimension[] {
  const summaryMap: Record<string, string> = {
    "Negative Affectivity": "Perfil com menor ativação relativa de afetos negativos e menor propensão a perseveração emocional.",
    "Positive Affectivity": "Perfil com boa energia psicológica, orientação para metas e crença na própria capacidade.",
    "Self-regulation": "Perfil com recursos robustos de autorregulação, persistência e gestão do foco.",
  };

  return Object.entries(WORKING_MODEL).map(([name, scales]) => {
    const valid = factors.filter(
      (f) =>
        inferBroadDimension(f.score_scale) === name &&
        f.t_score !== null &&
        f.t_score !== undefined &&
        !Number.isNaN(Number(f.t_score)) &&
        (f.n_items_scored ?? 0) > 0,
    );

    if (valid.length === 0) {
      return { name, z_score: null, percentile: null, scales, summary: summaryMap[name] ?? "" };
    }

    const weightedSum = valid.reduce((acc, f) => acc + ((tToZ(f.t_score) ?? 0) * Number(f.n_items_scored ?? 0)), 0);
    const totalWeight = valid.reduce((acc, f) => acc + Number(f.n_items_scored ?? 0), 0);
    const z = totalWeight > 0 ? weightedSum / totalWeight : null;
    const pct = z === null ? null : normalCdf(z) * 100;

    return { name, z_score: z, percentile: pct, scales, summary: summaryMap[name] ?? "" };
  });
}

function sortFactorsByPercentile(factors: FactorScore[]) {
  return [...factors].sort((a, b) => Number(b.percentile ?? 0) - Number(a.percentile ?? 0));
}

function selectHighlights(factors: FactorScore[], kind: "high" | "low", n = 3) {
  const sorted = sortFactorsByPercentile(factors);
  if (kind === "high") return sorted.filter((f) => Number(f.percentile ?? 0) >= 75).slice(0, n);
  return [...sorted].reverse().filter((f) => Number(f.percentile ?? 100) <= 25).slice(0, n);
}

function drawIdentificationGrid(params: {
  page: PdfPage;
  assets: ReportAssets;
  x: number;
  y: number;
  w: number;
  h: number;
  entries: Array<{ label: string; value: string; icon: keyof ReportAssets }>;
  regular: PDFFont;
  bold: PDFFont;
}) {
  const { page, assets, x, y, w, h, entries, regular, bold } = params;
  drawCard(page, x, y, w, h, C.white);

  const colW = w / 2;
  const rowH = h / 3;

  page.drawLine({ start: { x: x + colW, y: y + 10 }, end: { x: x + colW, y: y + h - 10 }, thickness: 1, color: C.line });
  page.drawLine({ start: { x: x + 10, y: y + rowH }, end: { x: x + w - 10, y: y + rowH }, thickness: 1, color: C.line });
  page.drawLine({ start: { x: x + 10, y: y + rowH * 2 }, end: { x: x + w - 10, y: y + rowH * 2 }, thickness: 1, color: C.line });

  entries.forEach((entry, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const cellX = x + col * colW + 18;
    const cellTop = y + h - row * rowH - 18;

    page.drawCircle({ x: cellX + 13, y: cellTop - 12, size: 15, color: C.soft });
    drawAssetImage(page, assets[entry.icon], cellX + 4, cellTop - 21, 18, 18);

    page.drawText(entry.label.toUpperCase(), {
      x: cellX + 38,
      y: cellTop - 9,
      size: 7.6,
      font: bold,
      color: C.steel,
    });
    page.drawText(entry.value, {
      x: cellX + 38,
      y: cellTop - 28,
      size: 10.2,
      font: regular,
      color: C.ink,
    });
  });
}

function drawBadge(page: PdfPage, x: number, y: number, w: number, h: number, label: string, bold: PDFFont) {
  const cc = badgeColors(label);
  page.drawRectangle({ x, y, width: w, height: h, color: cc.bg, borderColor: C.line, borderWidth: 0.6 });
  centerText(page, label, x, y + 7.2, w, 10, bold, cc.ink);
}

function drawResultTable(params: {
  page: PdfPage;
  x: number;
  yTop: number;
  w: number;
  rows: FactorScore[];
  regular: PDFFont;
  bold: PDFFont;
}) {
  const { page, x, yTop, w, rows, regular, bold } = params;
  const headerH = 32;
  const rowH = 28;
  const h = headerH + rows.length * rowH;
  const y = yTop - h;

  drawCard(page, x, y, w, h);
  page.drawRectangle({ x, y: yTop - headerH, width: w, height: headerH, color: C.navy });

  const cols = {
    factor: x + 16,
    raw: x + 245,
    t: x + 332,
    pct: x + 410,
    band: x + 492,
  };

  page.drawText("FATOR", { x: cols.factor, y: yTop - 21, size: 8.5, font: bold, color: C.white });
  page.drawText("BRUTO", { x: cols.raw, y: yTop - 21, size: 8.5, font: bold, color: C.white });
  page.drawText("T", { x: cols.t, y: yTop - 21, size: 8.5, font: bold, color: C.white });
  page.drawText("PERCENTIL", { x: cols.pct, y: yTop - 21, size: 8.5, font: bold, color: C.white });
  page.drawText("CLASSE", { x: cols.band, y: yTop - 21, size: 8.5, font: bold, color: C.white });

  rows.forEach((row, i) => {
    const yy = yTop - headerH - rowH * (i + 1);
    if (i % 2 === 0) page.drawRectangle({ x, y: yy, width: w, height: rowH, color: C.soft });
    page.drawLine({ start: { x, y: yy }, end: { x: x + w, y: yy }, thickness: 0.6, color: C.line });

    page.drawText(row.score_scale, { x: cols.factor, y: yy + 9.5, size: 9.4, font: regular, color: C.ink });
    page.drawText(fmtNum(row.raw_score, 0), { x: cols.raw + 10, y: yy + 9.5, size: 9.4, font: regular, color: C.ink });
    page.drawText(fmtNum(row.t_score, 0), { x: cols.t + 8, y: yy + 9.5, size: 9.4, font: regular, color: C.ink });
    page.drawText(fmtPct(row.percentile), { x: cols.pct + 16, y: yy + 9.5, size: 9.4, font: regular, color: C.ink });
    drawBadge(page, cols.band - 6, yy + 5, 62, 18, getBandLabel(row), bold);
  });
}

function drawHighlightBox(params: {
  page: PdfPage;
  assets: ReportAssets;
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  items: FactorScore[];
  icon: keyof ReportAssets;
  regular: PDFFont;
  bold: PDFFont;
}) {
  const { page, assets, x, y, w, h, title, items, icon, regular, bold } = params;
  drawCard(page, x, y, w, h);

  page.drawCircle({ x: x + 26, y: y + h - 28, size: 14, color: C.soft2 });
  drawAssetImage(page, assets[icon], x + 17, y + h - 37, 18, 18);
  page.drawText(title, { x: x + 50, y: y + h - 28, size: 10.5, font: bold, color: C.navy });
  drawRule(page, x + 50, y + h - 40, 25);

  const fallback = "Nenhum fator nessa faixa nesta avaliação.";
  const selected = items.length > 0 ? items : [];

  if (selected.length === 0) {
    drawWrappedText({ page, text: fallback, x: x + 22, yTop: y + h - 66, maxWidth: w - 44, font: regular, size: 9.2, color: C.steel, maxLines: 3 });
    return;
  }

  selected.forEach((item, i) => {
    const yy = y + h - 68 - i * 34;
    page.drawCircle({ x: x + 24, y: yy + 2, size: 7, borderColor: C.navy2, borderWidth: 1 });
    page.drawText(item.score_scale, { x: x + 40, y: yy + 4, size: 9.5, font: bold, color: C.ink });
    drawWrappedText({
      page,
      text: `Percentil ${fmtPct(item.percentile)} - classificação ${getBandLabel(item)}.`,
      x: x + 40,
      yTop: yy - 9,
      maxWidth: w - 56,
      font: regular,
      size: 8.2,
      color: C.steel,
      lineGap: 1,
      maxLines: 1,
    });
  });
}

function drawMetricTile(params: {
  page: PdfPage;
  assets: ReportAssets;
  icon: keyof ReportAssets;
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  value: string;
  regular: PDFFont;
  bold: PDFFont;
}) {
  const { page, assets, icon, x, y, w, h, label, value, regular, bold } = params;
  drawCard(page, x, y, w, h);
  page.drawCircle({ x: x + w / 2, y: y + h - 22, size: 14, color: C.soft });
  drawAssetImage(page, assets[icon], x + w / 2 - 8, y + h - 30, 16, 16);
  centerText(page, label.toUpperCase(), x, y + 29, w, 7.8, regular, C.steel);
  centerText(page, value, x, y + 9, w, 20, bold, C.navy);
}

function drawNormalCurveChart(params: {
  page: PdfPage;
  x: number;
  y: number;
  w: number;
  h: number;
  tScore: number | null;
  regular: PDFFont;
  bold: PDFFont;
}) {
  const { page, x, y, w, h, tScore, regular, bold } = params;
  drawCard(page, x, y, w, h);

  centerText(page, "Distribuição normal (escore T)", x, y + h - 22, w, 10, bold, C.navy);

  const left = x + 30;
  const right = x + w - 26;
  const bottom = y + 46;
  const top = y + h - 44;
  const chartW = right - left;
  const chartH = top - bottom;

  const points: Array<{ x: number; y: number }> = [];
  for (let i = 0; i <= 120; i++) {
    const z = -3 + (6 * i) / 120;
    const dens = Math.exp(-(z * z) / 2);
    points.push({ x: left + (i / 120) * chartW, y: bottom + dens * (chartH - 8) });
  }

  let path = `M ${left} ${bottom}`;
  for (const p of points) path += ` L ${p.x} ${p.y}`;
  path += ` L ${right} ${bottom} Z`;
  page.drawSvgPath(path, { color: C.soft2 });

  for (let i = 1; i < points.length; i++) {
    page.drawLine({ start: points[i - 1], end: points[i], thickness: 1.6, color: C.navy2 });
  }
  page.drawLine({ start: { x: left, y: bottom }, end: { x: right, y: bottom }, thickness: 0.8, color: C.steel });

  [20, 30, 40, 50, 60, 70, 80].forEach((t) => {
    const px = left + ((t - 20) / 60) * chartW;
    page.drawLine({ start: { x: px, y: bottom }, end: { x: px, y: bottom + (t === 50 ? chartH : 7) }, thickness: t === 50 ? 1 : 0.6, color: t === 50 ? C.steel : C.line });
    centerText(page, String(t), px - 12, bottom - 16, 24, 8.5, t === 50 ? bold : regular, C.navy2);
  });

  const labels = [
    { t: 25, label: "Muito baixo" },
    { t: 35, label: "Baixo" },
    { t: 50, label: "Médio" },
    { t: 65, label: "Alto" },
    { t: 75, label: "Muito alto" },
  ];

  labels.forEach((r) => {
    const px = left + ((r.t - 20) / 60) * chartW;
    centerText(page, r.label, px - 32, bottom - 34, 64, 7.6, regular, C.steel);
  });

  if (tScore !== null && tScore !== undefined && !Number.isNaN(Number(tScore))) {
    const t = Math.max(20, Math.min(80, Number(tScore)));
    const px = left + ((t - 20) / 60) * chartW;
    const z = (t - 50) / 10;
    const py = bottom + Math.exp(-(z * z) / 2) * (chartH - 8);
    page.drawCircle({ x: px, y: py, size: 5.4, color: C.navy });
    page.drawLine({ start: { x: px + 6, y: py + 8 }, end: { x: px + 26, y: py + 8 }, thickness: 1, color: C.navy2 });
    page.drawText("Você está aqui", { x: px + 30, y: py + 4, size: 8, font: regular, color: C.navy2 });
  }
}

function drawWorkingModelCard(params: {
  page: PdfPage;
  assets: ReportAssets;
  x: number;
  y: number;
  w: number;
  h: number;
  dim: BroadDimension;
  index: number;
  regular: PDFFont;
  bold: PDFFont;
}) {
  const { page, assets, x, y, w, h, dim, index, regular, bold } = params;
  drawCard(page, x, y, w, h);
  page.drawRectangle({ x, y, width: 58, height: h, color: C.navy });

  const icon = index === 1 ? assets.shield : index === 2 ? assets.star : assets.target;
  drawAssetImage(page, icon, x + 14, y + h - 48, 30, 30);

  page.drawText(`${index}. ${dim.name}`, { x: x + 74, y: y + h - 28, size: 13, font: bold, color: C.navy });
  page.drawText("Componentes", { x: x + 74, y: y + h - 50, size: 8, font: regular, color: C.steel });
  drawRule(page, x + 74, y + h - 56, 72, C.line);

  dim.scales.slice(0, 8).forEach((s, i) => {
    page.drawText(`- ${s}`, { x: x + 74, y: y + h - 72 - i * 12.5, size: 7.8, font: regular, color: C.ink });
  });

  const zText = fmtNum(dim.z_score, 2);
  const pText = fmtPct(dim.percentile);
  page.drawText("Escore z", { x: x + 255, y: y + h - 50, size: 8, font: regular, color: C.steel });
  drawCard(page, x + 242, y + h - 94, 66, 31, C.soft);
  centerText(page, zText, x + 242, y + h - 83, 66, 15, bold, C.navy);

  page.drawText("Percentil", { x: x + 252, y: y + h - 112, size: 8, font: regular, color: C.steel });
  drawCard(page, x + 242, y + h - 156, 66, 31, C.soft);
  centerText(page, pText, x + 242, y + h - 145, 66, 15, bold, C.navy);

  const barX = x + 348;
  const barY = y + h - 76;
  const barW = 150;
  page.drawText("Marcador percentílico", { x: barX, y: y + h - 50, size: 8, font: regular, color: C.steel });
  page.drawLine({ start: { x: barX, y: barY }, end: { x: barX + barW, y: barY }, thickness: 6, color: C.soft2 });
  if (dim.percentile !== null && dim.percentile !== undefined) {
    const pct = Math.max(0, Math.min(100, Number(dim.percentile)));
    const markerX = barX + (pct / 100) * barW;
    page.drawLine({ start: { x: barX, y: barY }, end: { x: markerX, y: barY }, thickness: 6, color: C.navy2 });
    page.drawCircle({ x: markerX, y: barY + 12, size: 9, color: C.navy });
    centerText(page, String(Math.round(pct)), markerX - 10, barY + 8.2, 20, 6.5, bold, C.white);
  }

  page.drawText("Síntese", { x: barX, y: y + h - 104, size: 8, font: regular, color: C.steel });
  drawWrappedText({ page, text: dim.summary, x: barX, yTop: y + h - 120, maxWidth: 140, font: regular, size: 8, color: C.ink, lineGap: 2, maxLines: 4 });
}

function drawCover(params: {
  pdf: PDFDocument;
  assets: ReportAssets;
  athlete: AthleteRow;
  assessment: AssessmentRow;
  regular: PDFFont;
  bold: PDFFont;
  pageNumber: number;
}) {
  const { pdf, assets, athlete, assessment, regular, bold, pageNumber } = params;
  const page = pdf.addPage([PAGE_W, PAGE_H]);
  page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: C.bg });
  drawFrame(page);

  drawAssetImage(page, assets.cornerLines, PAGE_W - 110, PAGE_H - 130, 90, 110, 0.55);
  drawAssetImage(page, assets.coverMountains, 0, 72, PAGE_W, 168, 0.95);
  drawAssetImage(page, assets.coverRunner, PAGE_W - 188, 94, 135, 190, 0.98);

  drawAssetImage(page, assets.logo, 144, PAGE_H - 205, 308, 96);

  page.drawText("Avaliação socioemocional", { x: 90, y: PAGE_H - 308, size: 27, font: bold, color: C.navy });
  page.drawText("para atletas de endurance", { x: 90, y: PAGE_H - 348, size: 27, font: bold, color: C.navy });
  centerText(page, "Relatório de devolutiva", 0, PAGE_H - 390, PAGE_W, 12.5, regular, C.steel);
  drawRule(page, PAGE_W / 2 - 25, PAGE_H - 410, 50);

  drawIdentificationGrid({
    page,
    assets,
    x: 76,
    y: PAGE_H - 590,
    w: PAGE_W - 152,
    h: 154,
    entries: [
      { label: "Nome", value: athlete.full_name ?? "-", icon: "user" },
      { label: "Data da avaliação", value: fmtDateBR(assessment.submitted_at ?? assessment.created_at), icon: "calendar" },
      { label: "Modalidade principal", value: athlete.sport_primary ?? "-", icon: "shoe" },
      { label: "Hora", value: fmtHourBR(assessment.submitted_at ?? assessment.created_at), icon: "clock" },
      { label: "Sexo", value: athlete.sex ?? "-", icon: "user" },
      { label: "Versão do instrumento", value: assessment.instrument_version ?? "ENDURE v1", icon: "clipboard" },
    ],
    regular,
    bold,
  });

  drawAssetImage(page, assets.shield, PAGE_W / 2 - 14, 142, 28, 28);
  centerText(page, "Escalas de Níveis de Desenvolvimento e", 0, 105, PAGE_W, 10, regular, C.navy2);
  centerText(page, "Utilização de Recursos Emocionais em atletas.", 0, 88, PAGE_W, 10, regular, C.navy2);

  drawFooter(page, assets, pageNumber, regular, bold);
}

function drawOverviewPage(params: {
  pdf: PDFDocument;
  assets: ReportAssets;
  factors: FactorScore[];
  regular: PDFFont;
  bold: PDFFont;
  pageNumber: number;
}) {
  const { pdf, assets, factors, regular, bold, pageNumber } = params;
  const page = pdf.addPage([PAGE_W, PAGE_H]);
  page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: C.bg });
  drawFrame(page);
  drawHeader(page, assets, "Visão geral dos resultados", regular);
  drawAssetImage(page, assets.cornerLines, PAGE_W - 82, PAGE_H - 150, 70, 100, 0.35);

  page.drawText("Visão geral dos resultados", { x: MARGIN_X, y: PAGE_H - 122, size: 28, font: bold, color: C.navy });
  drawRule(page, MARGIN_X, PAGE_H - 138, 42);

  drawCard(page, MARGIN_X, PAGE_H - 236, PAGE_W - MARGIN_X * 2, 66);
  page.drawCircle({ x: MARGIN_X + 44, y: PAGE_H - 203, size: 21, borderColor: C.line, borderWidth: 1 });
  drawAssetImage(page, assets.shield, MARGIN_X + 31, PAGE_H - 216, 26, 26);
  drawWrappedText({
    page,
    text: "A ENDURE é uma bateria de autorrelato de avaliação de características psicológicas empiricamente relacionadas ao desempenho em atletas de endurance.",
    x: MARGIN_X + 88,
    yTop: PAGE_H - 194,
    maxWidth: PAGE_W - MARGIN_X * 2 - 112,
    font: regular,
    size: 10.5,
    color: C.ink,
    lineGap: 4,
    maxLines: 3,
  });

  page.drawText("Resultado geral", { x: MARGIN_X, y: PAGE_H - 276, size: 15, font: bold, color: C.navy });
  drawRule(page, MARGIN_X, PAGE_H - 288, 34);

  const overviewRows = sortFactorsByPercentile(factors).slice(0, 8);
  drawResultTable({ page, x: MARGIN_X, yTop: PAGE_H - 310, w: PAGE_W - MARGIN_X * 2, rows: overviewRows, regular, bold });

  page.drawText("Destaques", { x: MARGIN_X, y: 225, size: 15, font: bold, color: C.navy });
  drawRule(page, MARGIN_X, 214, 34);

  const gap = 14;
  const boxW = (PAGE_W - MARGIN_X * 2 - gap) / 2;
  const low = selectHighlights(factors, "low", 3);
  const high = selectHighlights(factors, "high", 3);
  drawHighlightBox({ page, assets, x: MARGIN_X, y: 70, w: boxW, h: 132, title: "Potenciais a desenvolver", items: low, icon: "target", regular, bold });
  drawHighlightBox({ page, assets, x: MARGIN_X + boxW + gap, y: 70, w: boxW, h: 132, title: "Competências desenvolvidas", items: high, icon: "star", regular, bold });

  drawFooter(page, assets, pageNumber, regular, bold);
}

function drawFactorPage(params: {
  pdf: PDFDocument;
  assets: ReportAssets;
  factor: FactorScore;
  regular: PDFFont;
  bold: PDFFont;
  pageNumber: number;
}) {
  const { pdf, assets, factor, regular, bold, pageNumber } = params;
  const page = pdf.addPage([PAGE_W, PAGE_H]);
  page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: C.bg });
  drawFrame(page);
  drawHeader(page, assets, "Fatores socioemocionais", regular);
  drawAssetImage(page, assets.cornerLines, PAGE_W - 82, PAGE_H - 150, 70, 100, 0.3);
  drawAssetImage(page, assets.mountainsStrip, 0, 42, PAGE_W, 112, 0.42);
  drawAssetImage(page, assets.pageRunner, PAGE_W - 130, 63, 92, 56, 0.7);

  const band = getBandLabel(factor);
  page.drawText(factor.score_scale, { x: MARGIN_X, y: PAGE_H - 145, size: 32, font: bold, color: C.navy });
  drawWrappedText({
    page,
    text: SCALE_DESCRIPTIONS[factor.score_scale] ?? "Característica psicológica empiricamente relacionada ao desempenho em atletas de endurance.",
    x: MARGIN_X,
    yTop: PAGE_H - 176,
    maxWidth: PAGE_W - MARGIN_X * 2 - 90,
    font: regular,
    size: 11,
    color: C.steel,
    lineGap: 3,
    maxLines: 2,
  });
  drawBadge(page, PAGE_W - MARGIN_X - 92, PAGE_H - 154, 92, 26, band, bold);

  const tileY = PAGE_H - 315;
  const tileW = 104;
  const tileGap = 16;
  const totalW = tileW * 4 + tileGap * 3;
  let tileX = (PAGE_W - totalW) / 2;
  drawMetricTile({ page, assets, icon: "clipboard", x: tileX, y: tileY, w: tileW, h: 84, label: "Escore bruto", value: fmtNum(factor.raw_score, 0), regular, bold });
  tileX += tileW + tileGap;
  drawMetricTile({ page, assets, icon: "chart", x: tileX, y: tileY, w: tileW, h: 84, label: "Escore T", value: fmtNum(factor.t_score, 0), regular, bold });
  tileX += tileW + tileGap;
  drawMetricTile({ page, assets, icon: "target", x: tileX, y: tileY, w: tileW, h: 84, label: "Percentil", value: fmtPct(factor.percentile), regular, bold });
  tileX += tileW + tileGap;
  drawMetricTile({ page, assets, icon: "shield", x: tileX, y: tileY, w: tileW, h: 84, label: "Classificação", value: band, regular, bold });

  drawNormalCurveChart({ page, x: 70, y: 315, w: PAGE_W - 140, h: 180, tScore: factor.t_score, regular, bold });

  drawCard(page, 70, 170, PAGE_W - 140, 112);
  drawAssetImage(page, assets.brain, 88, 226, 34, 34);
  page.drawText("Interpretação", { x: 136, y: 252, size: 12.5, font: bold, color: C.navy });
  drawRule(page, 136, 241, 32);

  const qualitativeText = factor.text_port?.trim()
    ? factor.text_port.trim()
    : "Atletas típicos nessa faixa de escores apresentam um padrão de funcionamento coerente com a classificação observada. A interpretação deve considerar o conjunto do perfil socioemocional, o contexto de treino e competição e a história recente de demandas, fadiga e recuperação.";

  drawWrappedText({ page, text: qualitativeText, x: 136, yTop: 223, maxWidth: PAGE_W - 220, font: regular, size: 9.8, color: C.ink, lineGap: 3.5, maxLines: 6 });

  drawCard(page, 70, 100, PAGE_W - 140, 50);
  drawAssetImage(page, assets.target, 88, 110, 30, 30);
  page.drawText("Leitura prática", { x: 136, y: 127, size: 11.5, font: bold, color: C.navy });
  drawWrappedText({
    page,
    text: "Este resultado deve ser lido em conjunto com os demais fatores, priorizando padrões consistentes e possibilidades de desenvolvimento aplicadas ao treino e à competição.",
    x: 248,
    yTop: 130,
    maxWidth: PAGE_W - 332,
    font: regular,
    size: 8.5,
    color: C.ink,
    lineGap: 2,
    maxLines: 3,
  });

  drawFooter(page, assets, pageNumber, regular, bold);
}

function drawWorkingModelPage(params: {
  pdf: PDFDocument;
  assets: ReportAssets;
  broadDimensions: BroadDimension[];
  regular: PDFFont;
  bold: PDFFont;
  pageNumber: number;
}) {
  const { pdf, assets, broadDimensions, regular, bold, pageNumber } = params;
  const page = pdf.addPage([PAGE_W, PAGE_H]);
  page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: C.bg });
  drawFrame(page);
  drawAssetImage(page, assets.logo, PAGE_W / 2 - 74, PAGE_H - 90, 148, 44);
  drawAssetImage(page, assets.cornerLines, PAGE_W - 82, PAGE_H - 150, 70, 100, 0.35);
  drawAssetImage(page, assets.coverMountains, 0, 42, PAGE_W, 122, 0.55);
  drawAssetImage(page, assets.pageRunner, PAGE_W - 120, 72, 80, 48, 0.75);

  centerText(page, "Working model", 0, PAGE_H - 156, PAGE_W, 30, bold, C.navy);
  centerText(page, "Síntese dos escores em dimensões amplas", 0, PAGE_H - 184, PAGE_W, 12, regular, C.steel);
  drawRule(page, PAGE_W / 2 - 22, PAGE_H - 202, 44);

  drawWrappedText({
    page,
    text: "A síntese final organiza as escalas da ENDURE em três dimensões amplas. Os escores correspondem a uma média ponderada, pelo número de itens, dos escores z das escalas componentes, seguida de conversão para percentis.",
    x: 92,
    yTop: PAGE_H - 230,
    maxWidth: PAGE_W - 184,
    font: regular,
    size: 9.8,
    color: C.navy2,
    lineGap: 3.5,
    maxLines: 4,
  });

  let cardY = PAGE_H - 412;
  broadDimensions.forEach((dim, i) => {
    drawWorkingModelCard({ page, assets, x: 46, y: cardY, w: PAGE_W - 92, h: 136, dim, index: i + 1, regular, bold });
    cardY -= 148;
  });

  drawCard(page, 46, 86, PAGE_W - 138, 62);
  drawAssetImage(page, assets.brain, 64, 104, 32, 32);
  page.drawText("Síntese integrativa", { x: 112, y: 126, size: 12, font: bold, color: C.navy });
  drawWrappedText({
    page,
    text: "Este perfil geral deve ser interpretado como uma organização integrada de recursos socioemocionais, combinando afetividade, motivação, recuperação emocional e autorregulação aplicada ao esporte de endurance.",
    x: 112,
    yTop: 108,
    maxWidth: PAGE_W - 190,
    font: regular,
    size: 8.8,
    color: C.ink,
    lineGap: 2.5,
    maxLines: 4,
  });

  drawFooter(page, assets, pageNumber, regular, bold);
}

export async function buildEndurePremiumPdf(params: {
  athlete: AthleteRow;
  assessment: AssessmentRow;
  factors: FactorScore[];
}) {
  const { athlete, assessment, factors } = params;

  const pdf = await PDFDocument.create();
  const assets = await loadReportAssets(pdf);

  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let pageNumber = 1;

  drawCover({ pdf, assets, athlete, assessment, regular, bold, pageNumber: pageNumber++ });
  drawOverviewPage({ pdf, assets, factors, regular, bold, pageNumber: pageNumber++ });

  const factorPages = sortFactorsByPercentile(factors);
  for (const factor of factorPages) {
    drawFactorPage({ pdf, assets, factor, regular, bold, pageNumber: pageNumber++ });
  }

  const broadDimensions = computeBroadDimensions(factors);
  drawWorkingModelPage({ pdf, assets, broadDimensions, regular, bold, pageNumber: pageNumber++ });

  return pdf.save();
}
