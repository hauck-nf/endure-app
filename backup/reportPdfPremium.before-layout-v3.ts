import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFImage,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";
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
    "Mastery avoidance goals",
    "Performance avoidance goals",
    "Concerns",
  ],
  "Afetividade positiva": [
    "Energy",
    "Mastery approach goals",
    "Performance approach goals",
    "Self-efficacy",
  ],
  "Autorregulação": [
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

function cleanText(s: string | null | undefined) {
  return String(s ?? "").replace(/\s+/g, " ").trim();
}

function firstSentence(s: string | null | undefined) {
  const txt = cleanText(s);
  if (!txt) return "";
  const parts = txt.split(/(?<=[.!?])\s+/);
  return parts[0] ?? txt;
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
  regular: PDFFont,
  bold: PDFFont
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
    cx: x + 26,
    cy: y + h - 24,
    diameter: 28,
  });

  page.drawText(label, {
    x: x + 14,
    y: y + 24,
    size: 8.5,
    font: regular,
    color: C.steel,
  });

  const valueSize = value.length > 10 ? 13 : value.length > 6 ? 16 : 22;
  page.drawText(value, {
    x: x + 14,
    y: y + h - 62,
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
    size: 10.5,
    font: bold,
    color: C.navy,
  });

  const curveX = x + 20;
  const curveY = y + 52;
  const curveW = w - 40;
  const curveH = h - 96;

  const points: Array<{ x: number; y: number }> = [];
  const n = 100;
  for (let i = 0; i <= n; i++) {
    const z = -3 + (6 * i) / n;
    const density = Math.exp(-(z * z) / 2);
    const px = curveX + (i / n) * curveW;
    const py = curveY + density * curveH;
    points.push({ x: px, y: py });
  }

  // eixo
  page.drawLine({
    start: { x: curveX, y: curveY },
    end: { x: curveX + curveW, y: curveY },
    thickness: 1,
    color: C.steel,
  });

  // marca média
  const meanX = curveX + curveW / 2;
  page.drawLine({
    start: { x: meanX, y: curveY },
    end: { x: meanX, y: curveY + curveH * 0.92 },
    thickness: 0.8,
    color: C.line,
  });

  // curva
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

  // linha marcador
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

  // label
  page.drawLine({
    start: { x: markerX + 7, y: markerY + 8 },
    end: { x: markerX + 22, y: markerY + 8 },
    thickness: 1,
    color: C.navy2,
  });

  page.drawText("Você está aqui", {
    x: markerX + 26,
    y: markerY + 3,
    size: 8.8,
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
    size: 8.5,
    font: regular,
    color: C.steel,
  });
  page.drawText("Médio", {
    x: curveX + curveW / 2 - 14,
    y: y + 16,
    size: 8.5,
    font: bold,
    color: C.navy2,
  });
  page.drawText("Alto", {
    x: curveX + curveW - 18,
    y: y + 16,
    size: 8.5,
    font: regular,
    color: C.steel,
  });

  if (bandLabel) {
    drawBadge(page, bandLabel, x + w - 86, y + h - 34, 68, 20, regular, bold);
  }

  if (percentile !== null && percentile !== undefined && !Number.isNaN(Number(percentile))) {
    page.drawText(`Percentil ${fmtPct(percentile)}`, {
      x: x + 18,
      y: y + h - 42,
      size: 8.5,
      font: regular,
      color: C.steel,
    });
  }
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

  // =========================
  // CAPA
  // =========================
  {
    const page = pdf.addPage([PAGE_W, PAGE_H]);
    drawPageFrame(page, img.cornerLines);

    drawImageContain({
      page,
      image: img.coverMountains,
      x: 16,
      y: FOOTER_H,
      w: PAGE_W - 32,
      h: 150,
      alignX: "center",
      alignY: "bottom",
      opacity: 0.95,
    });

    drawImageContain({
      page,
      image: img.coverRunner,
      x: PAGE_W - 132,
      y: FOOTER_H + 4,
      w: 96,
      h: 158,
      alignX: "right",
      alignY: "bottom",
      opacity: 0.98,
    });

    drawImageContain({
      page,
      image: img.logo,
      x: 145,
      y: PAGE_H - 162,
      w: 305,
      h: 76,
      alignX: "center",
      alignY: "middle",
    });

    page.drawText("Avaliação socioemocional", {
      x: 96,
      y: PAGE_H - 300,
      size: 31,
      font: bold,
      color: C.navy,
    });

    page.drawText("para atletas de endurance", {
      x: 86,
      y: PAGE_H - 344,
      size: 31,
      font: bold,
      color: C.navy,
    });

    page.drawText("Relatório fictício de devolutiva", {
      x: 196,
      y: PAGE_H - 408,
      size: 14.5,
      font: regular,
      color: C.steel,
    });

    page.drawLine({
      start: { x: 262, y: PAGE_H - 432 },
      end: { x: 333, y: PAGE_H - 432 },
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

  // =========================
  // VISÃO GERAL
  // =========================
  {
    const page = pdf.addPage([PAGE_W, PAGE_H]);
    drawPageFrame(page, img.cornerLines);
    drawHeader(page, img.logoLight, "VISÃO GERAL DOS RESULTADOS", regular, bold);

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
    drawIconCircle({ page, image: img.shield, cx: 60, cy: PAGE_H - 243, diameter: 34 });

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

    const tableX = 28;
    const tableTop = PAGE_H - 370;
    const tableW = PAGE_W - 56;
    const headerH = 28;
    const rowH = 27;
    const colW = [180, 78, 78, 82, 95];
    const rows = factorList.slice(0, 8);

    page.drawRectangle({
      x: tableX,
      y: tableTop - headerH,
      width: tableW,
      height: headerH,
      color: C.navy,
    });

    const headers = ["FATOR", "ESCORE BRUTO", "ESCORE T", "PERCENTIL", "CLASSIFICAÇÃO"];
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
        page.drawText(v, {
          x,
          y: y + 9,
          size: i === 0 ? 10 : 9.8,
          font: i === 4 ? bold : regular,
          color: i === 4 ? C.navy2 : C.ink,
        });
        x += colW[i];
      });
    });

    page.drawText("Destaques", {
      x: 28,
      y: 184,
      size: 16,
      font: bold,
      color: C.navy,
    });

    page.drawLine({
      start: { x: 28, y: 168 },
      end: { x: 64, y: 168 },
      thickness: 1.3,
      color: C.navy2,
    });

    const low = factorList.filter((f) => Number(f.percentile ?? 101) < 25).slice(0, 3);
    const high = factorList.filter((f) => Number(f.percentile ?? -1) > 75).slice(0, 3);

    drawPanel(page, 28, 56, 236, 102, C.white);
    drawPanel(page, 290, 56, 277, 102, C.white);

    drawIconCircle({ page, image: img.chart, cx: 50, cy: 134, diameter: 28 });
    page.drawText("Potenciais a serem desenvolvidos", {
      x: 70,
      y: 130,
      size: 11.8,
      font: bold,
      color: C.navy,
    });

    let yl = 104;
    if (low.length === 0) {
      page.drawText("Nenhum fator em faixa baixa.", {
        x: 42,
        y: yl,
        size: 10.4,
        font: regular,
        color: C.ink,
      });
    } else {
      low.forEach((f) => {
        page.drawText(`• ${cleanText(f.score_scale)}`, {
          x: 42,
          y: yl,
          size: 10.2,
          font: regular,
          color: C.ink,
        });
        yl -= 21;
      });
    }

    drawIconCircle({ page, image: img.star, cx: 312, cy: 134, diameter: 28 });
    page.drawText("Competências bem desenvolvidas", {
      x: 332,
      y: 130,
      size: 11.8,
      font: bold,
      color: C.navy,
    });

    let yh = 104;
    if (high.length === 0) {
      page.drawText("Nenhum fator em faixa alta.", {
        x: 304,
        y: yh,
        size: 10.4,
        font: regular,
        color: C.ink,
      });
    } else {
      high.forEach((f) => {
        page.drawText(`• ${cleanText(f.score_scale)}`, {
          x: 304,
          y: yh,
          size: 10.2,
          font: regular,
          color: C.ink,
        });
        yh -= 21;
      });
    }

    drawFooter(page, img.footerMark, regular, pageNumber++);
  }

  // =========================
  // FATORES
  // =========================
  for (const factor of factorList) {
    const page = pdf.addPage([PAGE_W, PAGE_H]);
    drawPageFrame(page, img.cornerLines);

    drawImageContain({
      page,
      image: img.mountainsStrip,
      x: 16,
      y: FOOTER_H,
      w: PAGE_W - 32,
      h: 110,
      alignX: "center",
      alignY: "bottom",
      opacity: 0.92,
    });

    drawImageContain({
      page,
      image: img.pageRunner,
      x: PAGE_W - 126,
      y: FOOTER_H,
      w: 94,
      h: 130,
      alignX: "right",
      alignY: "bottom",
      opacity: 0.97,
    });

    drawImageContain({
      page,
      image: img.logoLight,
      x: 28,
      y: PAGE_H - 64,
      w: 90,
      h: 28,
      alignX: "left",
      alignY: "middle",
    });

    page.drawLine({
      start: { x: 138, y: PAGE_H - 63 },
      end: { x: 138, y: PAGE_H - 34 },
      thickness: 1,
      color: C.navy2,
    });

    page.drawText("FATORES SOCIOEMOCIONAIS", {
      x: 154,
      y: PAGE_H - 48,
      size: 12,
      font: bold,
      color: C.navy,
    });

    page.drawText("Detalhe de fator", {
      x: 154,
      y: PAGE_H - 66,
      size: 10,
      font: regular,
      color: C.navy2,
    });

    const title = cleanText(factor.score_scale) || "—";
    page.drawText(title, {
      x: 28,
      y: PAGE_H - 162,
      size: 36,
      font: bold,
      color: C.navy,
    });

    const qual = cleanText(factor.text_port);
    const subtitle =
      firstSentence(qual) ||
      "Descrição interpretativa do fator socioemocional avaliado.";

    drawParagraph({
      page,
      text: subtitle,
      x: 28,
      y: PAGE_H - 198,
      maxWidth: 370,
      font: regular,
      size: 10.8,
      color: C.navy2,
      lineHeight: 15,
      maxLines: 3,
    });

    drawBadge(page, factor.band_label ?? "—", PAGE_W - 108, PAGE_H - 166, 72, 24, regular, bold);

    // Métricas
    const metricY = 530;
    const gap = 10;
    const boxW = 125;
    const boxH = 78;
    const startX = 28;

    drawMetricBox({
      page,
      x: startX,
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
      x: startX + boxW + gap,
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
      x: startX + (boxW + gap) * 2,
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
      x: startX + (boxW + gap) * 3,
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
      y: 274,
      w: 244,
      h: 220,
      tScore: factor.t_score,
      percentile: factor.percentile,
      bandLabel: factor.band_label,
      regular,
      bold,
    });

    drawPanel(page, 290, 274, 268, 220, C.white);
    page.drawText("Interpretação", {
      x: 308,
      y: 466,
      size: 16,
      font: bold,
      color: C.navy,
    });

    page.drawLine({
      start: { x: 308, y: 450 },
      end: { x: 345, y: 450 },
      thickness: 1.2,
      color: C.navy2,
    });

    const fallbackInterpretation =
      "Atletas típicos nessa faixa de escores apresentam um padrão interpretativo compatível com este nível normativo. A leitura deve ser contextualizada com treino, histórico do atleta e objetivos de intervenção.";

    drawParagraph({
      page,
      text: qual || fallbackInterpretation,
      x: 308,
      y: 428,
      maxWidth: 230,
      font: regular,
      size: 10.2,
      color: C.ink,
      lineHeight: 16,
      maxLines: 10,
    });

    drawPanel(page, 28, 172, 380, 76, C.white);
    drawIconCircle({ page, image: img.brain, cx: 52, cy: 210, diameter: 32 });

    page.drawText("Leitura prática", {
      x: 80,
      y: 220,
      size: 12,
      font: bold,
      color: C.navy,
    });

    const bullets = [
      `Leitura baseada na classificação ${cleanText(factor.band_label || "—").toLowerCase()}.`,
      `Percentil ${fmtPct(factor.percentile)} nesta amostra normativa.`,
      `Escore T de ${fmtNum(factor.t_score, 0)} para o fator avaliado.`,
    ];

    let by = 198;
    bullets.forEach((b) => {
      page.drawText(`• ${b}`, {
        x: 80,
        y: by,
        size: 9.6,
        font: regular,
        color: C.ink,
      });
      by -= 15;
    });

    drawFooter(page, img.footerMark, regular, pageNumber++);
  }

  // =========================
  // WORKING MODEL
  // =========================
  {
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
      opacity: 0.92,
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
    let y = 404;

    broad.forEach((dim, idx) => {
      drawPanel(page, 46, y, 502, 116, C.white);

      page.drawRectangle({
        x: 46,
        y,
        width: 56,
        height: 116,
        color: C.navy,
      });

      drawImageContain({
        page,
        image: icons[idx] ?? img.brain,
        x: 60,
        y: y + 62,
        w: 28,
        h: 28,
      });

      page.drawText(`${idx + 1}. ${dim.name}`, {
        x: 116,
        y: y + 88,
        size: 14.2,
        font: bold,
        color: C.navy,
      });

      page.drawText("COMPONENTES", {
        x: 116,
        y: y + 64,
        size: 8.3,
        font: bold,
        color: C.steel,
      });

      let cy = y + 48;
      dim.components.slice(0, 8).forEach((c) => {
        page.drawText(`• ${c}`, {
          x: 116,
          y: cy,
          size: 9,
          font: regular,
          color: C.ink,
        });
        cy -= 12;
      });

      page.drawLine({
        start: { x: 258, y: y + 10 },
        end: { x: 258, y: y + 106 },
        thickness: 1,
        color: C.line,
      });

      page.drawText("ESCORE Z", {
        x: 278,
        y: y + 70,
        size: 8.3,
        font: regular,
        color: C.steel,
      });

      page.drawText(fmtNum(dim.z_score, 2), {
        x: 278,
        y: y + 34,
        size: 23,
        font: bold,
        color: C.navy,
      });

      page.drawText("PERCENTIL", {
        x: 278,
        y: y + 16,
        size: 8.3,
        font: regular,
        color: C.steel,
      });

      page.drawText(fmtPct(dim.percentile), {
        x: 278,
        y: y - 8,
        size: 23,
        font: bold,
        color: C.navy,
      });

      page.drawLine({
        start: { x: 360, y: y + 10 },
        end: { x: 360, y: y + 106 },
        thickness: 1,
        color: C.line,
      });

      page.drawText("MARCADOR PERCENTÍLICO", {
        x: 378,
        y: y + 78,
        size: 8.3,
        font: regular,
        color: C.steel,
      });

      // trilho
      page.drawLine({
        start: { x: 378, y: y + 56 },
        end: { x: 520, y: y + 56 },
        thickness: 6,
        color: C.panel2,
      });

      const px = 378 + (Math.max(0, Math.min(100, Number(dim.percentile ?? 50))) / 100) * 142;
      page.drawCircle({
        x: px,
        y: y + 56,
        size: 5,
        color: C.navy,
      });

      page.drawText("SÍNTESE", {
        x: 378,
        y: y + 30,
        size: 8.3,
        font: bold,
        color: C.navy,
      });

      drawParagraph({
        page,
        text: dim.summary,
        x: 378,
        y: y + 12,
        maxWidth: 142,
        font: regular,
        size: 8.7,
        color: C.ink,
        lineHeight: 12,
        maxLines: 4,
      });

      y -= 126;
    });

    drawFooter(page, img.footerMark, regular, pageNumber++);
  }

  return await pdf.save();
}
