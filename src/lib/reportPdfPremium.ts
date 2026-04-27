import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFImage,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";
import { loadReportAssets, type ReportAssets } from "./reports/reportAssets";
import { displayScaleName } from "./endure/displayNames";

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
  definition?: string | null;
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
  components: string[];
  summary: string;
};

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const FOOTER_H = 48;

const C = {
  bg: rgb(0.972, 0.976, 0.985),
  white: rgb(1, 1, 1),
  ink: rgb(0.09, 0.15, 0.24),
  inkSoft: rgb(0.28, 0.36, 0.48),
  navy: rgb(0.06, 0.20, 0.36),
  navy2: rgb(0.16, 0.31, 0.48),
  steel: rgb(0.47, 0.56, 0.66),
  line: rgb(0.82, 0.86, 0.91),
  panel: rgb(0.985, 0.988, 0.993),
  panel2: rgb(0.955, 0.965, 0.978),
  lowBg: rgb(0.991, 0.952, 0.944),
  lowInk: rgb(0.56, 0.24, 0.16),
  midBg: rgb(0.936, 0.955, 0.983),
  midInk: rgb(0.22, 0.38, 0.58),
  highBg: rgb(0.93, 0.97, 0.94),
  highInk: rgb(0.12, 0.38, 0.24),
};

const WORKING_MODEL_PT: Record<string, string[]> = {
  "Afetividade negativa": [
    "Anger",
    "Anxiety",
    "Depression",
    "Fatigue",
    "Rumination",
    "Mastery goals",
    "Performance goals",
    "Perfectionism-concerns",
  ],
  "Afetividade positiva": [
    "Vigor",
    "Mastery goals",
    "Performance goals",
    "Self-efficacy",
  ],
  "Autorregulação": [
    "Perfectionism-strivings",
    "Task-oriented coping",
    "Mindfulness",
    "Mental practice",
    "Grit",
    "Autodiálogo",
    "Emotional intelligence",
    "Volatility",
  ],
};

function cleanText(s: string | null | undefined) {
  return String(s ?? "").replace(/\s+/g, " ").trim();
}

function firstSentence(s: string | null | undefined) {
  const txt = cleanText(s);
  if (!txt) return "";
  const parts = txt.split(/(?<=[.!?])\s+/);
  return parts[0] ?? txt;
}

function fmtDateBR(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

function fmtTimeBR(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleTimeString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtNum(n: number | null | undefined, digits = 0) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return "—";
  return Number(n).toFixed(digits);
}

function fmtPct(n: number | null | undefined) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return "—";
  return `${Math.round(Number(n))}`;
}

function tToZ(t: number | null | undefined) {
  if (t === null || t === undefined || Number.isNaN(Number(t))) return null;
  return (Number(t) - 50) / 10;
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
  const y =
    1 -
    (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t) *
      Math.exp(-ax * ax);
  return sign * y;
}

function normalCdf(z: number) {
  return 0.5 * (1 + erf(z / Math.SQRT2));
}

function dimensionOfScale(scaleName: string) {
  const s = cleanText(scaleName).toLowerCase();
  for (const [dim, components] of Object.entries(WORKING_MODEL_PT)) {
    if (components.some((c) => cleanText(c).toLowerCase() === s)) return dim;
  }
  return null;
}

function computeBroadDimensions(factors: FactorScore[]): BroadDimension[] {
  return Object.entries(WORKING_MODEL_PT).map(([name, components]) => {
    const subset = factors.filter((f) => dimensionOfScale(f.score_scale) === name);
    const valid = subset.filter(
      (f) =>
        f.t_score !== null &&
        f.t_score !== undefined &&
        !Number.isNaN(Number(f.t_score)) &&
        Number(f.n_items_scored ?? 0) > 0
    );

    if (valid.length === 0) {
      return {
        name,
        z_score: null,
        percentile: null,
        components,
        summary: "Sem escalas suficientes para compor esta dimensão nesta avaliação.",
      };
    }

    const totalWeight = valid.reduce((acc, f) => acc + Number(f.n_items_scored ?? 0), 0);
    const weightedZ = valid.reduce((acc, f) => {
      return acc + (tToZ(f.t_score) ?? 0) * Number(f.n_items_scored ?? 0);
    }, 0);

    const z = totalWeight > 0 ? weightedZ / totalWeight : null;
    const pct = z === null ? null : normalCdf(z) * 100;

    let summary = "Perfil intermediário nesta dimensão.";
    if (name === "Afetividade negativa") {
      if ((pct ?? 50) < 35) {
        summary = "Perfil com baixa ativação de afetos negativos e menor propensão à perseveração emocional.";
      } else if ((pct ?? 50) > 65) {
        summary = "Perfil com maior ativação de afetos negativos, sugerindo atenção a ansiedade, ruminação ou desgaste emocional.";
      } else {
        summary = "Perfil intermediário de afetividade negativa, sem extremos pronunciados nesta avaliação.";
      }
    } else if (name === "Afetividade positiva") {
      if ((pct ?? 50) < 35) {
        summary = "Perfil com menor energia psicológica e menor crença positiva orientada ao desempenho.";
      } else if ((pct ?? 50) > 65) {
        summary = "Perfil com boa energia psicológica, orientação para metas e crença na própria capacidade.";
      } else {
        summary = "Perfil intermediário de afetividade positiva, com recursos presentes de forma moderada.";
      }
    } else if (name === "Autorregulação") {
      if ((pct ?? 50) < 35) {
        summary = "Perfil com menor repertório de autorregulação e margem para fortalecer foco, coping e persistência.";
      } else if ((pct ?? 50) > 65) {
        summary = "Perfil com recursos robustos de autorregulação, persistência e gestão do foco.";
      } else {
        summary = "Perfil intermediário de autorregulação, com recursos funcionais e espaço para refinamento.";
      }
    }

    return {
      name,
      z_score: z,
      percentile: pct,
      components,
      summary,
    };
  });
}

function sortFactorsAlphabetically(factors: FactorScore[]) {
  return [...factors].sort((a, b) =>
    cleanText(a.score_scale).localeCompare(cleanText(b.score_scale), "pt-BR")
  );
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number) {
  const words = cleanText(text).split(" ").filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(test, size) <= maxWidth) {
      current = test;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }

  if (current) lines.push(current);
  return lines;
}

function getParagraphMetrics(opts: {
  text: string;
  font: PDFFont;
  size: number;
  maxWidth: number;
  lineHeight?: number;
  maxLines?: number;
}) {
  const {
    text,
    font,
    size,
    maxWidth,
    lineHeight = size + 4,
    maxLines = 99,
  } = opts;
  const lines = wrapText(text, font, size, maxWidth).slice(0, maxLines);
  const height = lines.length > 0 ? lineHeight * lines.length : lineHeight;
  return { lines, height, lineHeight };
}

function drawParagraph(opts: {
  page: PDFPage;
  text: string;
  x: number;
  y: number;
  maxWidth: number;
  font: PDFFont;
  size: number;
  color: ReturnType<typeof rgb>;
  lineHeight?: number;
  maxLines?: number;
}) {
  const {
    page,
    text,
    x,
    y,
    maxWidth,
    font,
    size,
    color,
    lineHeight = size + 4,
    maxLines = 99,
  } = opts;

  const lines = wrapText(text, font, size, maxWidth).slice(0, maxLines);
  let yy = y;
  for (const line of lines) {
    page.drawText(line, { x, y: yy, size, font, color });
    yy -= lineHeight;
  }
  return yy;
}

function drawPanel(page: PDFPage, x: number, y: number, w: number, h: number, fill = C.white) {
  page.drawRectangle({
    x,
    y,
    width: w,
    height: h,
    color: fill,
    borderColor: C.line,
    borderWidth: 1,
  });
}

function fitContain(img: PDFImage, boxW: number, boxH: number) {
  const scale = Math.min(boxW / img.width, boxH / img.height);
  return {
    width: img.width * scale,
    height: img.height * scale,
  };
}

function drawImageContain(opts: {
  page: PDFPage;
  image: PDFImage;
  x: number;
  y: number;
  w: number;
  h: number;
  alignX?: "left" | "center" | "right";
  alignY?: "bottom" | "middle" | "top";
  opacity?: number;
}) {
  const {
    page,
    image,
    x,
    y,
    w,
    h,
    alignX = "center",
    alignY = "middle",
    opacity = 1,
  } = opts;

  const fitted = fitContain(image, w, h);
  let dx = x;
  let dy = y;

  if (alignX === "center") dx = x + (w - fitted.width) / 2;
  if (alignX === "right") dx = x + (w - fitted.width);

  if (alignY === "middle") dy = y + (h - fitted.height) / 2;
  if (alignY === "top") dy = y + (h - fitted.height);

  page.drawImage(image, {
    x: dx,
    y: dy,
    width: fitted.width,
    height: fitted.height,
    opacity,
  });

  return { x: dx, y: dy, width: fitted.width, height: fitted.height };
}

function drawIconCircle(opts: {
  page: PDFPage;
  image: PDFImage;
  cx: number;
  cy: number;
  diameter?: number;
}) {
  const { page, image, cx, cy, diameter = 34 } = opts;
  page.drawCircle({
    x: cx,
    y: cy,
    size: diameter / 2,
    color: C.panel2,
    borderColor: C.line,
    borderWidth: 0.8,
  });

  drawImageContain({
    page,
    image,
    x: cx - diameter / 2 + 6,
    y: cy - diameter / 2 + 6,
    w: diameter - 12,
    h: diameter - 12,
  });
}

function drawBadge(
  page: PDFPage,
  label: string,
  x: number,
  y: number,
  w: number,
  h: number,
  regular: PDFFont,
  bold: PDFFont
) {
  const txt = cleanText(label) || "—";

  let fill = C.midBg;
  let ink = C.midInk;

  if (txt.toLowerCase() === "baixo") {
    fill = C.lowBg;
    ink = C.lowInk;
  } else if (txt.toLowerCase() === "alto") {
    fill = C.highBg;
    ink = C.highInk;
  }

  page.drawRectangle({
    x,
    y,
    width: w,
    height: h,
    color: fill,
    borderColor: C.line,
    borderWidth: 0.8,
  });

  const font = txt.length <= 10 ? bold : regular;
  const size = txt.length <= 10 ? 11 : 10;
  const tw = font.widthOfTextAtSize(txt, size);

  page.drawText(txt, {
    x: x + (w - tw) / 2,
    y: y + (h - size) / 2 + 1,
    size,
    font,
    color: ink,
  });
}

function buildBulletRows(items: string[], font: PDFFont, size: number, maxWidth: number) {
  const rows: Array<{ text: string; firstLine: boolean }> = [];
  const bulletPrefix = "• ";
  const bulletWidth = font.widthOfTextAtSize(bulletPrefix, size);

  for (const item of items) {
    const clean = String(item ?? "").trim();
    if (!clean) continue;

    const wrapped = wrapText(clean, font, size, Math.max(20, maxWidth - bulletWidth));
    if (!wrapped.length) continue;

    wrapped.forEach((line, idx) => {
      rows.push({ text: line, firstLine: idx === 0 });
    });
  }

  return rows;
}

function drawBulletRows(params: {
  page: PDFPage;
  rows: Array<{ text: string; firstLine: boolean }>;
  x: number;
  yTop: number;
  textX: number;
  font: PDFFont;
  size: number;
  color: ReturnType<typeof rgb>;
  lineGap?: number;
}) {
  const { page, rows, x, yTop, textX, font, size, color, lineGap = 2.4 } = params;
  const step = size + lineGap;

  rows.forEach((row, idx) => {
    const yy = yTop - idx * step;
    if (row.firstLine) {
      page.drawText("•", { x, y: yy, size, font, color });
    }
    page.drawText(row.text, { x: textX, y: yy, size, font, color });
  });

  return yTop - rows.length * step;
}

function estimateBulletBoxHeight(items: string[], regular: PDFFont, size: number, maxWidth: number) {
  const rows = buildBulletRows(items, regular, size, maxWidth);
  return Math.max(56, 30 + rows.length * (size + 2.8));
}

async function embedAssets(pdf: PDFDocument, assets: ReportAssets) {
  return {
    logo: await pdf.embedPng(assets.logo),
    logoLight: await pdf.embedPng(assets.logoLight),
    footerMark: await pdf.embedPng(assets.footerMark),

    coverMountains: await pdf.embedPng(assets.coverMountains),
    coverRunner: await pdf.embedPng(assets.coverRunner),

    mountainsStrip: await pdf.embedPng(assets.mountainsStrip),
    pageRunner: await pdf.embedPng(assets.pageRunner),
    cornerLines: await pdf.embedPng(assets.cornerLines),

    user: await pdf.embedPng(assets.user),
    calendar: await pdf.embedPng(assets.calendar),
    clock: await pdf.embedPng(assets.clock),
    shield: await pdf.embedPng(assets.shield),
    target: await pdf.embedPng(assets.target),
    brain: await pdf.embedPng(assets.brain),
    chart: await pdf.embedPng(assets.chart),
    star: await pdf.embedPng(assets.star),
    shoe: await pdf.embedPng(assets.shoe),
    clipboard: await pdf.embedPng(assets.clipboard),
  };
}

function drawPageFrame(page: PDFPage, cornerLines?: PDFImage) {
  page.drawRectangle({
    x: 0,
    y: 0,
    width: PAGE_W,
    height: PAGE_H,
    color: C.bg,
  });

  page.drawRectangle({
    x: 16,
    y: 16,
    width: PAGE_W - 32,
    height: PAGE_H - 32,
    borderColor: rgb(0.72, 0.78, 0.84),
    borderWidth: 1,
  });

  if (cornerLines) {
    drawImageContain({
      page,
      image: cornerLines,
      x: PAGE_W - 86,
      y: PAGE_H - 152,
      w: 64,
      h: 96,
      alignX: "right",
      alignY: "top",
      opacity: 0.92,
    });
  }
}

function drawFooter(
  page: PDFPage,
  footerMark: PDFImage,
  regular: PDFFont,
  pageNumber: number
) {
  page.drawRectangle({
    x: 0,
    y: 0,
    width: PAGE_W,
    height: FOOTER_H,
    color: C.navy,
  });

  drawImageContain({
    page,
    image: footerMark,
    x: 18,
    y: 8,
    w: 28,
    h: 28,
  });

  const footerText = "Relatório de avaliação socioemocional  ·  Prof. Dr. Nelson Hauck Filho";
  page.drawText(footerText, {
    x: 64,
    y: 17,
    size: 10,
    font: regular,
    color: C.white,
  });

  page.drawText(String(pageNumber), {
    x: PAGE_W - 28,
    y: 17,
    size: 11,
    font: regular,
    color: C.white,
  });
}

function drawHeader(
  page: PDFPage,
  logoLight: PDFImage,
  titleRight: string,
  regular: PDFFont
) {
  drawImageContain({
    page,
    image: logoLight,
    x: 26,
    y: PAGE_H - 62,
    w: 84,
    h: 26,
    alignX: "left",
    alignY: "middle",
  });

  page.drawText(titleRight, {
    x: PAGE_W - 210,
    y: PAGE_H - 46,
    size: 10,
    font: regular,
    color: C.navy,
  });

  page.drawLine({
    start: { x: 28, y: PAGE_H - 68 },
    end: { x: PAGE_W - 28, y: PAGE_H - 68 },
    thickness: 1,
    color: C.navy2,
  });
}

function drawMetricBox(opts: {
  page: PDFPage;
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  value: string;
  icon: PDFImage;
  regular: PDFFont;
  bold: PDFFont;
}) {
  const { page, x, y, w, h, label, value, icon, regular, bold } = opts;
  drawPanel(page, x, y, w, h, C.white);

  drawIconCircle({
    page,
    image: icon,
    cx: x + w / 2,
    cy: y + h - 20,
    diameter: 24,
  });

  const labelSize = 8.2;
  const valueSize = value.length > 10 ? 13 : value.length > 6 ? 15 : 18;

  const labelWidth = regular.widthOfTextAtSize(label, labelSize);
  page.drawText(label, {
    x: x + (w - labelWidth) / 2,
    y: y + h - 50,
    size: labelSize,
    font: regular,
    color: C.steel,
  });

  const valueWidth = bold.widthOfTextAtSize(value, valueSize);
  page.drawText(value, {
    x: x + (w - valueWidth) / 2,
    y: y + 12,
    size: valueSize,
    font: bold,
    color: C.navy,
  });
}

function drawNormalCurveCard(opts: {
  page: PDFPage;
  x: number;
  y: number;
  w: number;
  h: number;
  tScore: number | null;
  percentile: number | null;
  bandLabel: string | null;
  regular: PDFFont;
  bold: PDFFont;
}) {
  const { page, x, y, w, h, tScore, percentile, bandLabel, regular, bold } = opts;

  drawPanel(page, x, y, w, h, C.white);

  page.drawText("Distribuição normal (escore T)", {
    x: x + 18,
    y: y + h - 24,
    size: 10.2,
    font: bold,
    color: C.navy,
  });

  const curveX = x + 20;
  const curveY = y + 52;
  const curveW = w - 40;
  const curveH = h - 100;

  const points: Array<{ x: number; y: number }> = [];
  const n = 100;
  for (let i = 0; i <= n; i++) {
    const z = -3 + (6 * i) / n;
    const density = Math.exp(-(z * z) / 2);
    const px = curveX + (i / n) * curveW;
    const py = curveY + density * curveH;
    points.push({ x: px, y: py });
  }

  page.drawLine({
    start: { x: curveX, y: curveY },
    end: { x: curveX + curveW, y: curveY },
    thickness: 1,
    color: C.steel,
  });

  const meanX = curveX + curveW / 2;
  page.drawLine({
    start: { x: meanX, y: curveY },
    end: { x: meanX, y: curveY + curveH * 0.92 },
    thickness: 0.8,
    color: C.line,
  });

  for (let i = 1; i < points.length; i++) {
    page.drawLine({
      start: points[i - 1],
      end: points[i],
      thickness: 1.7,
      color: C.navy,
    });
  }

  const t = Math.max(20, Math.min(80, Number(tScore ?? 50)));
  const markerX = curveX + ((t - 20) / 60) * curveW;
  const zMarker = (t - 50) / 10;
  const markerY = curveY + Math.exp(-(zMarker * zMarker) / 2) * curveH;

  page.drawLine({
    start: { x: markerX, y: curveY },
    end: { x: markerX, y: markerY + 2 },
    thickness: 1.1,
    color: C.navy2,
  });

  page.drawCircle({
    x: markerX,
    y: markerY,
    size: 4.7,
    color: C.navy,
    borderColor: C.white,
    borderWidth: 0.8,
  });

  page.drawLine({
    start: { x: markerX + 7, y: markerY + 8 },
    end: { x: markerX + 22, y: markerY + 8 },
    thickness: 1,
    color: C.navy2,
  });

  page.drawText("Você está aqui", {
    x: markerX + 26,
    y: markerY + 3,
    size: 8.5,
    font: bold,
    color: C.navy,
  });

  const ticks = [20, 30, 40, 50, 60, 70, 80];
  ticks.forEach((tick, i) => {
    const tx = curveX + (i / 6) * curveW;
    page.drawText(String(tick), {
      x: tx - 6,
      y: curveY - 15,
      size: 8,
      font: regular,
      color: C.steel,
    });
  });

  page.drawText("Baixo", {
    x: curveX + 0,
    y: y + 16,
    size: 8.2,
    font: regular,
    color: C.steel,
  });
  page.drawText("Médio", {
    x: curveX + curveW / 2 - 14,
    y: y + 16,
    size: 8.2,
    font: bold,
    color: C.navy2,
  });
  page.drawText("Alto", {
    x: curveX + curveW - 18,
    y: y + 16,
    size: 8.2,
    font: regular,
    color: C.steel,
  });

  if (bandLabel) {
    drawBadge(page, bandLabel, x + w - 88, y + h - 34, 70, 20, regular, bold);
  }

  if (percentile !== null && percentile !== undefined && !Number.isNaN(Number(percentile))) {
    page.drawText(`Percentil ${fmtPct(percentile)}`, {
      x: x + 18,
      y: y + h - 42,
      size: 8.3,
      font: regular,
      color: C.steel,
    });
  }
}

function drawDynamicPracticalBox(opts: {
  page: PDFPage;
  x: number;
  y: number;
  w: number;
  bullets: string[];
  icon: PDFImage;
  regular: PDFFont;
  bold: PDFFont;
}) {
  const { page, x, y, w, bullets, icon, regular, bold } = opts;

  const title = "Leitura prática";
  const textX = x + 72;
  const textW = w - 92;
  const titleSize = 11.5;
  const bulletSize = 9.0;
  const bulletGap = 3.0;

  const rows = buildBulletRows(bullets, regular, bulletSize, textW);
  const step = bulletSize + bulletGap;
  const boxH = Math.max(66, 44 + rows.length * step + 12);

  drawPanel(page, x, y, w, boxH, C.white);
  drawIconCircle({ page, image: icon, cx: x + 22, cy: y + boxH - 22, diameter: 28 });

  page.drawText(title, {
    x: textX,
    y: y + boxH - 18,
    size: titleSize,
    font: bold,
    color: C.navy,
  });

  drawBulletRows({
    page,
    rows,
    x: textX,
    yTop: y + boxH - 40,
    textX: textX + 12,
    font: regular,
    size: bulletSize,
    color: C.ink,
    lineGap: bulletGap,
  });
}

function drawWorkingModelCard(opts: {
  page: PDFPage;
  x: number;
  y: number;
  w: number;
  dimension: BroadDimension;
  idx: number;
  icon: PDFImage;
  regular: PDFFont;
  bold: PDFFont;
}) {
  const { page, x, y, w, dimension, idx, icon, regular, bold } = opts;

  const leftBarW = 54;
  const innerX = x + leftBarW + 16;
  const col1W = 126;
  const col2W = 82;
  const col3W = 156;

  const componentItems = dimension.components.slice(0, 6);
  const componentRows = buildBulletRows(componentItems, regular, 8.4, col1W);
  const summaryLines = wrapText(dimension.summary, regular, 8.5, col3W - 8);

  const componentBlockH = Math.max(40, componentRows.length * 11.0);
  const summaryBlockH = Math.max(34, summaryLines.length * 11.2);
  const contentH = Math.max(componentBlockH, summaryBlockH, 58);
  const cardH = Math.max(126, 62 + contentH);

  drawPanel(page, x, y, w, cardH, C.white);

  page.drawRectangle({ x, y, width: leftBarW, height: cardH, color: C.navy });

  drawImageContain({ page, image: icon, x: x + 14, y: y + cardH - 42, w: 26, h: 26 });

  page.drawText(`${idx + 1}. ${dimension.name}`, {
    x: innerX,
    y: y + cardH - 22,
    size: 14,
    font: bold,
    color: C.navy,
  });

  page.drawText("COMPONENTES", {
    x: innerX,
    y: y + cardH - 46,
    size: 8.2,
    font: bold,
    color: C.steel,
  });

  drawBulletRows({
    page,
    rows: componentRows,
    x: innerX,
    yTop: y + cardH - 64,
    textX: innerX + 12,
    font: regular,
    size: 8.4,
    color: C.ink,
    lineGap: 2.6,
  });

  const sep1 = innerX + col1W + 18;
  page.drawLine({ start: { x: sep1, y: y + 12 }, end: { x: sep1, y: y + cardH - 12 }, thickness: 1, color: C.line });

  const col2X = sep1 + 16;
  page.drawText("ESCORE Z", { x: col2X, y: y + cardH - 40, size: 8.2, font: regular, color: C.steel });
  page.drawText(fmtNum(dimension.z_score, 2), { x: col2X, y: y + cardH - 72, size: 15, font: bold, color: C.navy });
  page.drawText("PERCENTIL", { x: col2X, y: y + cardH - 92, size: 8.2, font: regular, color: C.steel });
  page.drawText(fmtPct(dimension.percentile), { x: col2X, y: y + cardH - 124, size: 15, font: bold, color: C.navy });

  const sep2 = col2X + col2W;
  page.drawLine({ start: { x: sep2, y: y + 12 }, end: { x: sep2, y: y + cardH - 12 }, thickness: 1, color: C.line });

  const col3X = sep2 + 18;
  page.drawText("MARCADOR PERCENTÍLICO", { x: col3X, y: y + cardH - 32, size: 8.2, font: regular, color: C.steel });
  page.drawLine({ start: { x: col3X, y: y + cardH - 48 }, end: { x: col3X + 150, y: y + cardH - 48 }, thickness: 6, color: C.panel2 });
  const px = col3X + (Math.max(0, Math.min(100, Number(dimension.percentile ?? 50))) / 100) * 150;
  page.drawCircle({ x: px, y: y + cardH - 48, size: 5, color: C.navy });

  page.drawText("SÍNTESE", { x: col3X, y: y + cardH - 76, size: 8.2, font: bold, color: C.navy });
  drawParagraph({
    page,
    text: dimension.summary,
    x: col3X,
    y: y + cardH - 94,
    maxWidth: col3W - 8,
    font: regular,
    size: 8.5,
    color: C.ink,
    lineHeight: 11.2,
    maxLines: 6,
  });

  return cardH;
}


function factorDisplayName(f: any): string {
  return displayScaleName(f?.score_scale ?? f?.scale ?? "");
}

function factorName(f: any): string {
  const direct = String(f?.display_scale ?? "").trim();
  if (direct) return direct;

  return displayScaleName(f?.score_scale ?? f?.scale ?? "");
}
export async function buildEndurePremiumPdf(params: {
  athlete: AthleteRow;
  assessment: AssessmentRow;
  factors: FactorScore[];
}) {
  const { athlete, assessment, factors } = params;

  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const assets = await loadReportAssets();
  const img = await embedAssets(pdf, assets);

  const factorList = sortFactorsAlphabetically(factors);
  const broad = computeBroadDimensions(factorList);

  let pageNumber = 1;

  {
    const page = pdf.addPage([PAGE_W, PAGE_H]);
    drawPageFrame(page, img.cornerLines);

    const mountainsY = FOOTER_H;
    const mountainsH = 205;

    drawImageContain({
      page,
      image: img.coverMountains,
      x: 0,
      y: mountainsY,
      w: PAGE_W,
      h: mountainsH,
      alignX: "center",
      alignY: "bottom",
      opacity: 0.98,
    });

    drawImageContain({
      page,
      image: img.coverRunner,
      x: PAGE_W - 118,
      y: mountainsY + 10,
      w: 84,
      h: 150,
      alignX: "right",
      alignY: "bottom",
      opacity: 0.98,
    });

    const coverLogoW = 305;
    const coverLogoH = 76;
    const coverLogoX = (PAGE_W - coverLogoW) / 2;

    drawImageContain({
      page,
      image: img.logo,
      x: coverLogoX,
      y: PAGE_H - 162,
      w: coverLogoW,
      h: coverLogoH,
      alignX: "center",
      alignY: "middle",
    });

    const coverTitleSize = 31;
    const coverTitleLine1 = "Avaliação socioemocional";
    const coverTitleLine2 = "para atletas de endurance";

    const coverTitleLine1W = bold.widthOfTextAtSize(coverTitleLine1, coverTitleSize);
    const coverTitleLine2W = bold.widthOfTextAtSize(coverTitleLine2, coverTitleSize);

    const coverTitleLine1X = (PAGE_W - coverTitleLine1W) / 2;
    const coverTitleLine2X = (PAGE_W - coverTitleLine2W) / 2;

    page.drawText(coverTitleLine1, {
      x: coverTitleLine1X,
      y: PAGE_H - 300,
      size: coverTitleSize,
      font: bold,
      color: C.navy,
    });

    page.drawText(coverTitleLine2, {
      x: coverTitleLine2X,
      y: PAGE_H - 344,
      size: coverTitleSize,
      font: bold,
      color: C.navy,
    });

    const coverSubtitle = "Relatório de avaliação";
    const coverSubtitleSize = 14.5;
    const coverSubtitleW = regular.widthOfTextAtSize(coverSubtitle, coverSubtitleSize);
    const coverSubtitleX = (PAGE_W - coverSubtitleW) / 2;

    page.drawText(coverSubtitle, {
      x: coverSubtitleX,
      y: PAGE_H - 408,
      size: coverSubtitleSize,
      font: regular,
      color: C.steel,
    });

    const coverLineW = 72;
    const coverLineX1 = (PAGE_W - coverLineW) / 2;
    const coverLineX2 = coverLineX1 + coverLineW;

    page.drawLine({
      start: { x: coverLineX1, y: PAGE_H - 432 },
      end: { x: coverLineX2, y: PAGE_H - 432 },
      thickness: 1.2,
      color: C.navy2,
    });

    const cardX = 78;
    const cardY = 240;
    const cardW = 440;
    const cardH = 160;

    drawPanel(page, cardX, cardY, cardW, cardH, C.white);

    page.drawLine({
      start: { x: cardX + cardW / 2, y: cardY + 12 },
      end: { x: cardX + cardW / 2, y: cardY + cardH - 12 },
      thickness: 1,
      color: C.line,
    });

    const leftRows = [
      { icon: img.user, label: "NOME", value: athlete.full_name ?? "—" },
      { icon: img.shoe, label: "MODALIDADE PRINCIPAL", value: athlete.sport_primary ?? "—" },
      { icon: img.user, label: "SEXO", value: athlete.sex ?? "—" },
    ];

    const rightRows = [
      {
        icon: img.calendar,
        label: "DATA DA AVALIAÇÃO",
        value: fmtDateBR(assessment.submitted_at ?? assessment.created_at),
      },
      {
        icon: img.clock,
        label: "HORA",
        value: fmtTimeBR(assessment.submitted_at ?? assessment.created_at),
      },
      {
        icon: img.clipboard,
        label: "VERSÃO DO INSTRUMENTO",
        value: assessment.instrument_version ?? "—",
      },
    ];

    let ly = cardY + cardH - 36;
    for (let i = 0; i < leftRows.length; i++) {
      const row = leftRows[i];
      drawIconCircle({ page, image: row.icon, cx: cardX + 30, cy: ly + 4, diameter: 28 });
      page.drawText(row.label, {
        x: cardX + 56,
        y: ly + 8,
        size: 8.2,
        font: bold,
        color: C.steel,
      });
      page.drawText(String(row.value), {
        x: cardX + 56,
        y: ly - 14,
        size: 11.5,
        font: regular,
        color: C.ink,
      });

      if (i < leftRows.length - 1) {
        page.drawLine({
          start: { x: cardX + 12, y: ly - 24 },
          end: { x: cardX + cardW / 2 - 12, y: ly - 24 },
          thickness: 1,
          color: C.line,
        });
      }
      ly -= 46;
    }

    let ry = cardY + cardH - 36;
    for (let i = 0; i < rightRows.length; i++) {
      const row = rightRows[i];
      drawIconCircle({
        page,
        image: row.icon,
        cx: cardX + cardW / 2 + 30,
        cy: ry + 4,
        diameter: 28,
      });
      page.drawText(row.label, {
        x: cardX + cardW / 2 + 56,
        y: ry + 8,
        size: 8.2,
        font: bold,
        color: C.steel,
      });
      page.drawText(String(row.value), {
        x: cardX + cardW / 2 + 56,
        y: ry - 14,
        size: 11.5,
        font: regular,
        color: C.ink,
      });

      if (i < rightRows.length - 1) {
        page.drawLine({
          start: { x: cardX + cardW / 2 + 12, y: ry - 24 },
          end: { x: cardX + cardW - 12, y: ry - 24 },
          thickness: 1,
          color: C.line,
        });
      }
      ry -= 46;
    }

    drawImageContain({
      page,
      image: img.shield,
      x: 278,
      y: 156,
      w: 36,
      h: 36,
    });

    drawParagraph({
      page,
      text: "Escalas de Níveis de Desenvolvimento e Utilização de Recursos Emocionais em atletas.",
      x: 160,
      y: 128,
      maxWidth: 270,
      font: regular,
      size: 10.6,
      color: C.navy2,
      lineHeight: 15,
      maxLines: 3,
    });

    drawFooter(page, img.footerMark, regular, pageNumber++);
  }

  {
  const tableX = 28;
  const tableW = PAGE_W - 56;
  const headerH = 28;
  const rowH = 27;
  const bottomY = FOOTER_H + 34;
  const colW = [180, 78, 78, 82, 95];
  const headers = ["FATOR", "ESCORE BRUTO", "ESCORE T", "PERCENTIL", "CLASSIFICAÇÃO"];

  const drawTableHeader = (page: PDFPage, tableTop: number) => {
    page.drawRectangle({
      x: tableX,
      y: tableTop - headerH,
      width: tableW,
      height: headerH,
      color: C.navy,
    });

    let hx = tableX + 10;

    headers.forEach((h, i) => {
      page.drawText(h, {
        x: hx,
        y: tableTop - 19,
        size: 8.4,
        font: bold,
        color: C.white,
      });

      hx += colW[i];
    });
  };

  const drawResultRows = (page: PDFPage, rows: FactorScore[], tableTop: number) => {
    rows.forEach((r, idx) => {
      const y = tableTop - headerH - rowH * (idx + 1);

      page.drawRectangle({
        x: tableX,
        y,
        width: tableW,
        height: rowH,
        color: idx % 2 === 0 ? C.white : C.panel,
        borderColor: C.line,
        borderWidth: 0.5,
      });

      let x = tableX + 10;

      const vals = [
        cleanText(r.score_scale) || "—",
        fmtNum(r.raw_score, 0),
        fmtNum(r.t_score, 0),
        fmtPct(r.percentile),
        cleanText(r.band_label) || "—",
      ];

      vals.forEach((v, i) => {
        const txt = String(v ?? "—");
        const maxChars = i === 0 ? 28 : 14;
        const safeTxt = txt.length > maxChars ? `${txt.slice(0, maxChars - 1)}…` : txt;

        page.drawText(safeTxt, {
          x,
          y: y + 9,
          size: i === 0 ? 9.6 : 9.4,
          font: i === 4 ? bold : regular,
          color: i === 4 ? C.navy2 : C.ink,
        });

        x += colW[i];
      });
    });
  };

  let remainingRows = [...factorList];
  let overviewPageIndex = 0;

  while (remainingRows.length > 0 || overviewPageIndex === 0) {
    const page = pdf.addPage([PAGE_W, PAGE_H]);

    drawPageFrame(page, img.cornerLines);
    drawHeader(page, img.logoLight, "VISÃO GERAL DOS RESULTADOS", regular);

    let tableTop = PAGE_H - 160;

    if (overviewPageIndex === 0) {
      page.drawText("Visão geral dos resultados", {
        x: 28,
        y: PAGE_H - 130,
        size: 28,
        font: bold,
        color: C.navy,
      });

      page.drawLine({
        start: { x: 28, y: PAGE_H - 150 },
        end: { x: 70, y: PAGE_H - 150 },
        thickness: 1.6,
        color: C.navy2,
      });

      drawPanel(page, 28, PAGE_H - 280, PAGE_W - 56, 74, C.white);

      drawIconCircle({
        page,
        image: img.shield,
        cx: 60,
        cy: PAGE_H - 243,
        diameter: 34,
      });

      drawParagraph({
        page,
        text: "A ENDURE é uma bateria de autorrelato de avaliação de características psicológicas empiricamente relacionadas ao desempenho em atletas de endurance.",
        x: 96,
        y: PAGE_H - 230,
        maxWidth: PAGE_W - 140,
        font: regular,
        size: 10.8,
        color: C.ink,
        lineHeight: 16,
        maxLines: 3,
      });

      page.drawText("Resultado geral", {
        x: 28,
        y: PAGE_H - 330,
        size: 16,
        font: bold,
        color: C.navy,
      });

      page.drawLine({
        start: { x: 28, y: PAGE_H - 347 },
        end: { x: 64, y: PAGE_H - 347 },
        thickness: 1.3,
        color: C.navy2,
      });

      tableTop = PAGE_H - 370;
    } else {
      page.drawText("Resultado geral", {
        x: 28,
        y: PAGE_H - 128,
        size: 22,
        font: bold,
        color: C.navy,
      });

      page.drawText("continuação", {
        x: 28,
        y: PAGE_H - 150,
        size: 10.5,
        font: regular,
        color: C.steel,
      });

      page.drawLine({
        start: { x: 28, y: PAGE_H - 166 },
        end: { x: 64, y: PAGE_H - 166 },
        thickness: 1.3,
        color: C.navy2,
      });

      tableTop = PAGE_H - 190;
    }

    const maxRowsThisPage = Math.max(
      1,
      Math.floor((tableTop - headerH - bottomY) / rowH)
    );

    const rowsThisPage = remainingRows.slice(0, maxRowsThisPage);

    drawTableHeader(page, tableTop);
    drawResultRows(page, rowsThisPage, tableTop);

    remainingRows = remainingRows.slice(rowsThisPage.length);

    drawFooter(page, img.footerMark, regular, pageNumber++);

    overviewPageIndex += 1;
  }
}

{
  const page = pdf.addPage([PAGE_W, PAGE_H]);

  drawPageFrame(page, img.cornerLines);
  drawHeader(page, img.logoLight, "DESTAQUES", regular);

  page.drawText("Destaques", {
    x: 28,
    y: PAGE_H - 130,
    size: 28,
    font: bold,
    color: C.navy,
  });

  page.drawLine({
    start: { x: 28, y: PAGE_H - 150 },
    end: { x: 70, y: PAGE_H - 150 },
    thickness: 1.6,
    color: C.navy2,
  });

  drawParagraph({
    page,
    text: "Esta seção resume competências bem desenvolvidas, competências a desenvolver e elementos negativos salientes, considerando a classificação obtida em cada escala.",
    x: 28,
    y: PAGE_H - 188,
    maxWidth: PAGE_W - 56,
    font: regular,
    size: 10.8,
    color: C.ink,
    lineHeight: 16,
    maxLines: 3,
  });

  const canonical = (s: string | null | undefined) =>
    cleanText(s)
      .toLowerCase()
      .replace(/_/g, "-")
      .replace(/\s+/g, "-");

  const displayNameByKey: Record<string, string> = {
    "autodiálogo": "Autodiálogo",
    "grit": "Grit",
    "mastery-approach-goals": "Mastery goals",
    "mental-practice": "Mental practice",
    "mindfulness": "Mindfulness",
    "performance-approach-goals": "Performance goals",
    "perfectionism-strivings": "Perfectionism-strivings",
    "self-efficacy": "Self-efficacy",
    "task-oriented-coping": "Task-oriented coping",
    "vigor": "Vigor",

    "anger": "Anger",
    "anxiety": "Anxiety",
    "depression": "Depression",
    "fatigue": "Fatigue",
    "mastery-avoidance-goals": "Mastery goals",
    "perfectionism-concerns": "Perfectionism-concerns",
    "rumination": "Rumination"
  };

  const positiveCompetenceKeys = [
    "autodiálogo",
    "grit",
    "mastery-approach-goals",
    "mental-practice",
    "mindfulness",
    "performance-approach-goals",
    "perfectionism-strivings",
    "self-efficacy",
    "task-oriented-coping",
    "vigor"
  ];

  const negativeElementKeys = [
    "anger",
    "anxiety",
    "depression",
    "fatigue",
    "mastery-avoidance-goals",
    "perfectionism-concerns",
    "rumination"
  ];

  const byKey = new Map<string, FactorScore>();

  for (const f of factorList) {
    byKey.set(canonical(f.score_scale), f);
  }

  const isHigh = (f: FactorScore | undefined) =>
    cleanText(f?.band_label).toLowerCase() === "alto";

  const isLow = (f: FactorScore | undefined) =>
    cleanText(f?.band_label).toLowerCase() === "baixo";

  const makeItem = (key: string) => {
    const f = byKey.get(key);
    const label = displayNameByKey[key] ?? cleanText(f?.score_scale) ?? key;
    const pct = f?.percentile == null ? "—" : fmtPct(f.percentile);
    return `${label} (P${pct})`;
  };

  const wellDeveloped = positiveCompetenceKeys
    .filter((key) => isHigh(byKey.get(key)))
    .map(makeItem);

  const toDevelop = positiveCompetenceKeys
    .filter((key) => isLow(byKey.get(key)))
    .map(makeItem);

  const salientNegative = negativeElementKeys
    .filter((key) => isHigh(byKey.get(key)))
    .map(makeItem);

  const drawHighlightBox = (opts: {
    title: string;
    icon: PDFImage;
    x: number;
    yTop: number;
    w: number;
    items: string[];
    emptyText: string;
  }) => {
    const { title, icon, x, yTop, w, items, emptyText } = opts;

    const rows = items.length
      ? buildBulletRows(items, regular, 9.4, w - 44)
      : buildBulletRows([emptyText], regular, 9.4, w - 44);

    const headerSpace = 62;
    const rowHeight = 13.2;
    const bottomPadding = 20;
    const h = Math.max(88, headerSpace + rows.length * rowHeight + bottomPadding);
    const y = yTop - h;

    drawPanel(page, x, y, w, h, C.white);

    drawIconCircle({
      page,
      image: icon,
      cx: x + 25,
      cy: yTop - 32,
      diameter: 30,
    });

    page.drawText(title, {
      x: x + 48,
      y: yTop - 37,
      size: 12,
      font: bold,
      color: C.navy,
    });

    drawBulletRows({
      page,
      rows,
      x: x + 18,
      textX: x + 30,
      yTop: yTop - 70,
      font: regular,
      size: 9.4,
      color: C.ink,
      lineGap: 3,
    });

    return h;
  };

  let highlightYTop = PAGE_H - 270;
  const highlightGap = 18;
  const highlightW = PAGE_W - 56;

  const h1 = drawHighlightBox({
    title: "Competências bem desenvolvidas",
    icon: img.star,
    x: 28,
    yTop: highlightYTop,
    w: highlightW,
    items: wellDeveloped,
    emptyText: "Nenhuma competência positiva foi classificada como alta nesta avaliação.",
  });

  highlightYTop -= h1 + highlightGap;

  const h2 = drawHighlightBox({
    title: "Competências a desenvolver",
    icon: img.target,
    x: 28,
    yTop: highlightYTop,
    w: highlightW,
    items: toDevelop,
    emptyText: "Nenhuma competência positiva foi classificada como baixa nesta avaliação.",
  });

  highlightYTop -= h2 + highlightGap;

  drawHighlightBox({
    title: "Elementos negativos salientes",
    icon: img.chart,
    x: 28,
    yTop: highlightYTop,
    w: highlightW,
    items: salientNegative,
    emptyText: "Nenhum elemento negativo foi classificado como alto nesta avaliação.",
  });

  drawFooter(page, img.footerMark, regular, pageNumber++);
}

for (const factor of factorList) {
    const page = pdf.addPage([PAGE_W, PAGE_H]);
    drawPageFrame(page, img.cornerLines);

    drawImageContain({
      page,
      image: img.mountainsStrip,
      x: 16,
      y: FOOTER_H,
      w: PAGE_W - 32,
      h: 96,
      alignX: "center",
      alignY: "bottom",
      opacity: 0.90,
    });

    drawImageContain({
      page,
      image: img.pageRunner,
      x: PAGE_W - 104,
      y: FOOTER_H + 2,
      w: 74,
      h: 112,
      alignX: "right",
      alignY: "bottom",
      opacity: 0.96,
    });

    drawHeader(page, img.logoLight, "FATORES SOCIOEMOCIONAIS", regular);


    const title = cleanText(factorName(factor)) || "—";
    page.drawText(title, {
      x: 28,
      y: PAGE_H - 162,
      size: 34,
      font: bold,
      color: C.navy,
    });

    const qual = cleanText(factor.text_port);
    const subtitle =
      cleanText((factor as any).definition) ||
      "Descrição interpretativa do fator socioemocional avaliado.";

    drawParagraph({
      page,
      text: subtitle,
      x: 28,
      y: PAGE_H - 198,
      maxWidth: 390,
      font: regular,
      size: 10.8,
      color: C.navy2,
      lineHeight: 15,
      maxLines: 3,
    });

    drawBadge(page, factor.band_label ?? "—", PAGE_W - 108, PAGE_H - 166, 72, 24, regular, bold);

    const metricY = 520;
    const boxW = 122;
    const boxH = 84;
    const gap = 10;

    drawMetricBox({
      page,
      x: 28,
      y: metricY,
      w: boxW,
      h: boxH,
      label: "ESCORE BRUTO",
      value: fmtNum(factor.raw_score, 0),
      icon: img.clipboard,
      regular,
      bold,
    });

    drawMetricBox({
      page,
      x: 28 + (boxW + gap),
      y: metricY,
      w: boxW,
      h: boxH,
      label: "ESCORE T",
      value: fmtNum(factor.t_score, 0),
      icon: img.chart,
      regular,
      bold,
    });

    drawMetricBox({
      page,
      x: 28 + (boxW + gap) * 2,
      y: metricY,
      w: boxW,
      h: boxH,
      label: "PERCENTIL",
      value: fmtPct(factor.percentile),
      icon: img.target,
      regular,
      bold,
    });

    drawMetricBox({
      page,
      x: 28 + (boxW + gap) * 3,
      y: metricY,
      w: boxW,
      h: boxH,
      label: "CLASSIFICAÇÃO",
      value: cleanText(factor.band_label) || "—",
      icon: img.shield,
      regular,
      bold,
    });

    drawNormalCurveCard({
      page,
      x: 28,
      y: 264,
      w: 252,
      h: 220,
      tScore: factor.t_score,
      percentile: factor.percentile,
      bandLabel: null,
      regular,
      bold,
    });

    drawPanel(page, 296, 264, 262, 220, C.white);
    page.drawText("Interpretação", {
      x: 314,
      y: 454,
      size: 16,
      font: bold,
      color: C.navy,
    });

    page.drawLine({
      start: { x: 314, y: 438 },
      end: { x: 350, y: 438 },
      thickness: 1.2,
      color: C.navy2,
    });

    const fallbackInterpretation =
      "Atletas típicos nessa faixa de escores apresentam um padrão interpretativo compatível com este nível normativo. A leitura deve ser contextualizada com treino, histórico do atleta e objetivos de intervenção.";

    drawParagraph({
      page,
      text: qual || fallbackInterpretation,
      x: 314,
      y: 416,
      maxWidth: 224,
      font: regular,
      size: 10.1,
      color: C.ink,
      lineHeight: 16,
      maxLines: 9,
    });

    const bullets = [
      `Leitura baseada na classificação ${cleanText(factor.band_label || "—").toLowerCase()}.`,
      `Percentil ${fmtPct(factor.percentile)} nesta amostra normativa.`,
      `Escore T de ${fmtNum(factor.t_score, 0)} para o fator avaliado.`,
    ];

    drawDynamicPracticalBox({
      page,
      x: 28,
      y: 154,
      w: 388,
      bullets,
      icon: img.brain,
      regular,
      bold,
    });

    drawFooter(page, img.footerMark, regular, pageNumber++);
  }

  {
    const page = pdf.addPage([PAGE_W, PAGE_H]);
    drawPageFrame(page, img.cornerLines);

    drawImageContain({
      page,
      image: img.mountainsStrip,
      x: 16,
      y: FOOTER_H,
      w: PAGE_W - 32,
      h: 92,
      alignX: "center",
      alignY: "bottom",
      opacity: 0.90,
    });

    drawImageContain({
      page,
      image: img.logoLight,
      x: 214,
      y: PAGE_H - 76,
      w: 168,
      h: 48,
      alignX: "center",
      alignY: "middle",
    });

    page.drawText("Modelo geral", {
      x: 180,
      y: PAGE_H - 146,
      size: 34,
      font: bold,
      color: C.navy,
    });

    page.drawText("Síntese dos escores em dimensões amplas", {
      x: 144,
      y: PAGE_H - 178,
      size: 15,
      font: regular,
      color: C.navy2,
    });

    page.drawLine({
      start: { x: 265, y: PAGE_H - 199 },
      end: { x: 330, y: PAGE_H - 199 },
      thickness: 1.2,
      color: C.navy2,
    });

    drawParagraph({
      page,
      text:
        "A síntese final abaixo organiza as escalas da ENDURE em três dimensões amplas. Os escores apresentados correspondem a uma média ponderada, pelo número de itens, dos escores z das escalas componentes, seguida de conversão para percentis.",
      x: 112,
      y: PAGE_H - 226,
      maxWidth: 372,
      font: regular,
      size: 10.1,
      color: C.ink,
      lineHeight: 15,
      maxLines: 4,
    });

    const icons = [img.brain, img.star, img.target];
    let y = 400;

    broad.forEach((dim, idx) => {
      const cardH = drawWorkingModelCard({
        page,
        x: 46,
        y,
        w: 502,
        dimension: dim,
        idx,
        icon: icons[idx] ?? img.brain,
        regular,
        bold,
      });
      y -= cardH + 12;
    });

    drawFooter(page, img.footerMark, regular, pageNumber++);
  }

  return await pdf.save();
}





