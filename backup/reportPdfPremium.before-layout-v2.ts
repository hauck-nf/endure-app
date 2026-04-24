import { PDFDocument, PDFFont, PDFImage, rgb } from "pdf-lib";
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

const COLORS = {
  navy: rgb(0.06, 0.22, 0.39),
  blue: rgb(0.24, 0.38, 0.56),
  text: rgb(0.16, 0.24, 0.35),
  muted: rgb(0.46, 0.54, 0.64),
  border: rgb(0.82, 0.86, 0.9),
  light: rgb(0.94, 0.95, 0.97),
  panel: rgb(0.985, 0.988, 0.992),
  white: rgb(1, 1, 1),
};

const MODEL_PT: Record<string, string[]> = {
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

function fmtPct(p: number | null | undefined) {
  if (p === null || p === undefined || Number.isNaN(Number(p))) return "—";
  return `${Math.round(Number(p))}`;
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

function factorToDimension(scaleName: string) {
  const s = String(scaleName ?? "").trim().toLowerCase();
  for (const [dimension, components] of Object.entries(MODEL_PT)) {
    for (const item of components) {
      if (item.trim().toLowerCase() === s) return dimension;
    }
  }
  return null;
}

function computeBroadDimensions(factors: FactorScore[]): BroadDimension[] {
  return Object.entries(MODEL_PT).map(([name, components]) => {
    const subset = factors.filter((f) => factorToDimension(f.score_scale) === name);
    const valid = subset.filter(
      (f) =>
        f.t_score !== null &&
        f.t_score !== undefined &&
        !Number.isNaN(Number(f.t_score)) &&
        (f.n_items_scored ?? 0) > 0
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

    const weightedSum = valid.reduce((acc, f) => {
      return acc + (tToZ(f.t_score) ?? 0) * Number(f.n_items_scored ?? 0);
    }, 0);

    const totalWeight = valid.reduce((acc, f) => acc + Number(f.n_items_scored ?? 0), 0);

    const z = totalWeight > 0 ? weightedSum / totalWeight : null;
    const percentile = z === null ? null : normalCdf(z) * 100;

    let summary = "Perfil intermediário nesta dimensão.";
    if (name === "Afetividade negativa") {
      if ((percentile ?? 50) < 35) summary = "Perfil com baixa ativação de afetos negativos e menor propensão à perseveração emocional.";
      else if ((percentile ?? 50) > 65) summary = "Perfil com maior ativação de afetos negativos, sugerindo atenção a ansiedade, ruminação ou desgaste emocional.";
      else summary = "Perfil intermediário de afetividade negativa, sem extremos pronunciados nesta avaliação.";
    } else if (name === "Afetividade positiva") {
      if ((percentile ?? 50) < 35) summary = "Perfil com menor energia psicológica e menor presença de crença positiva orientada ao desempenho.";
      else if ((percentile ?? 50) > 65) summary = "Perfil com boa energia psicológica, orientação para metas e crença na própria capacidade.";
      else summary = "Perfil intermediário de afetividade positiva, com recursos presentes de forma moderada.";
    } else if (name === "Autorregulação") {
      if ((percentile ?? 50) < 35) summary = "Perfil com menor repertório de autorregulação e margem para fortalecer foco, coping e persistência.";
      else if ((percentile ?? 50) > 65) summary = "Perfil com recursos robustos de autorregulação, persistência e gestão do foco.";
      else summary = "Perfil intermediário de autorregulação, com recursos funcionais e espaço para refinamento.";
    }

    return { name, z_score: z, percentile, components, summary };
  });
}

function sortFactorsAlphabetically(factors: FactorScore[]) {
  return [...factors].sort((a, b) =>
    String(a.score_scale ?? "").localeCompare(String(b.score_scale ?? ""), "pt-BR")
  );
}

function sortFactorsByPercentile(factors: FactorScore[]) {
  return [...factors].sort((a, b) => Number(b.percentile ?? -999) - Number(a.percentile ?? -999));
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number) {
  const words = String(text ?? "").replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    const width = font.widthOfTextAtSize(test, size);
    if (width <= maxWidth) {
      current = test;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }

  if (current) lines.push(current);
  return lines;
}

function drawWrappedText(opts: {
  page: any;
  text: string;
  x: number;
  y: number;
  maxWidth: number;
  font: PDFFont;
  size: number;
  color: any;
  lineHeight?: number;
  maxLines?: number;
}) {
  const {
    page, text, x, y, maxWidth, font, size, color,
    lineHeight = size + 4,
    maxLines = 99,
  } = opts;

  const lines = wrapText(text, font, size, maxWidth).slice(0, maxLines);
  let currentY = y;

  for (const line of lines) {
    page.drawText(line, { x, y: currentY, size, font, color });
    currentY -= lineHeight;
  }

  return currentY;
}

function drawImage(page: any, image: PDFImage, x: number, y: number, width: number, height: number, opacity = 1) {
  page.drawImage(image, { x, y, width, height, opacity });
}

function drawFooter(page: any, footerMark: PDFImage, regular: PDFFont, pageNumber: number) {
  page.drawRectangle({
    x: 0,
    y: 0,
    width: PAGE_W,
    height: 48,
    color: COLORS.navy,
  });

  drawImage(page, footerMark, 18, 6, 32, 32);

  const footerText = "Relatório de avaliação socioemocional  ·  Prof. Dr. Nelson Hauck Filho";
  page.drawText(footerText, {
    x: 72,
    y: 17,
    size: 10,
    font: regular,
    color: COLORS.white,
  });

  page.drawText(String(pageNumber), {
    x: PAGE_W - 28,
    y: 17,
    size: 11,
    font: regular,
    color: COLORS.white,
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

function drawRoundedPanel(page: any, x: number, y: number, w: number, h: number) {
  page.drawRectangle({
    x, y, width: w, height: h,
    color: COLORS.white,
    borderColor: COLORS.border,
    borderWidth: 1,
  });
}

export async function buildEndurePremiumPdf(params: {
  athlete: AthleteRow;
  assessment: AssessmentRow;
  factors: FactorScore[];
}) {
  const { athlete, assessment, factors } = params;

  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont("Helvetica");
  const bold = await pdf.embedFont("Helvetica-Bold");

  const assets = await loadReportAssets();
  const img = await embedAssets(pdf, assets);

  const factorsAlpha = sortFactorsAlphabetically(factors);
  const broad = computeBroadDimensions(factors);

  let pageNumber = 1;

  // CAPA
  {
    const page = pdf.addPage([PAGE_W, PAGE_H]);
    page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: COLORS.panel });

    page.drawRectangle({
      x: 16, y: 16, width: PAGE_W - 32, height: PAGE_H - 32,
      borderColor: rgb(0.72, 0.78, 0.84), borderWidth: 1,
    });

    drawImage(page, img.cornerLines, PAGE_W - 74, PAGE_H - 170, 64, 150, 0.85);
    drawImage(page, img.coverMountains, 0, 0, PAGE_W, 165, 0.9);
    drawImage(page, img.coverRunner, PAGE_W - 130, 30, 100, 160, 0.98);

    drawImage(page, img.logo, 150, PAGE_H - 170, 300, 90);

    page.drawText("Avaliação socioemocional", {
      x: 95, y: PAGE_H - 300, size: 32, font: bold, color: COLORS.navy,
    });
    page.drawText("para atletas de endurance", {
      x: 92, y: PAGE_H - 348, size: 32, font: bold, color: COLORS.navy,
    });

    page.drawText("Relatório fictício de devolutiva", {
      x: 198, y: PAGE_H - 420, size: 15, font: regular, color: COLORS.muted,
    });

    page.drawLine({
      start: { x: 265, y: PAGE_H - 450 },
      end: { x: 330, y: PAGE_H - 450 },
      thickness: 1.4,
      color: COLORS.blue,
    });

    const cardX = 78;
    const cardY = 282;
    const cardW = 440;
    const cardH = 145;
    drawRoundedPanel(page, cardX, cardY, cardW, cardH);

    const leftX = cardX + 18;
    const rightX = cardX + 262;

    page.drawLine({
      start: { x: cardX + 220, y: cardY + 12 },
      end: { x: cardX + 220, y: cardY + cardH - 12 },
      thickness: 1,
      color: COLORS.border,
    });

    const rowsLeft = [
      [img.user, "NOME", athlete.full_name ?? "—"],
      [img.shoe, "MODALIDADE PRINCIPAL", athlete.sport_primary ?? "—"],
      [img.user, "SEXO", athlete.sex ?? "—"],
    ] as const;

    const rowsRight = [
      [img.calendar, "DATA DA AVALIAÇÃO", fmtDateBR(assessment.submitted_at ?? assessment.created_at)],
      [img.clock, "HORA", fmtTimeBR(assessment.submitted_at ?? assessment.created_at)],
      [img.clipboard, "VERSÃO DO INSTRUMENTO", assessment.instrument_version ?? "—"],
    ] as const;

    let yL = cardY + 100;
    for (const [icon, label, value] of rowsLeft) {
      drawImage(page, icon, leftX, yL - 8, 26, 26);
      page.drawText(label, { x: leftX + 40, y: yL + 4, size: 8.5, font: bold, color: COLORS.muted });
      page.drawText(String(value), { x: leftX + 40, y: yL - 18, size: 11.5, font: regular, color: COLORS.text });
      yL -= 46;
      if (yL > cardY + 5) {
        page.drawLine({
          start: { x: cardX + 8, y: yL + 14 },
          end: { x: cardX + 210, y: yL + 14 },
          thickness: 1,
          color: COLORS.border,
        });
      }
    }

    let yR = cardY + 100;
    for (const [icon, label, value] of rowsRight) {
      drawImage(page, icon, rightX, yR - 8, 26, 26);
      page.drawText(label, { x: rightX + 40, y: yR + 4, size: 8.5, font: bold, color: COLORS.muted });
      page.drawText(String(value), { x: rightX + 40, y: yR - 18, size: 11.5, font: regular, color: COLORS.text });
      yR -= 46;
      if (yR > cardY + 5) {
        page.drawLine({
          start: { x: cardX + 230, y: yR + 14 },
          end: { x: cardX + cardW - 8, y: yR + 14 },
          thickness: 1,
          color: COLORS.border,
        });
      }
    }

    drawImage(page, img.shield, 284, 190, 28, 28);
    drawWrappedText({
      page,
      text: "Escalas de Níveis de Desenvolvimento e Utilização de Recursos Emocionais em atletas.",
      x: 180,
      y: 168,
      maxWidth: 240,
      font: regular,
      size: 10.5,
      color: COLORS.blue,
      lineHeight: 15,
      maxLines: 3,
    });

    drawFooter(page, img.footerMark, regular, pageNumber++);
  }

  // VISÃO GERAL
  {
    const page = pdf.addPage([PAGE_W, PAGE_H]);
    page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: COLORS.panel });
    page.drawRectangle({
      x: 16, y: 16, width: PAGE_W - 32, height: PAGE_H - 32,
      borderColor: rgb(0.72, 0.78, 0.84), borderWidth: 1,
    });

    drawImage(page, img.cornerLines, PAGE_W - 74, PAGE_H - 100, 64, 90, 0.85);
    drawImage(page, img.logoLight, 28, PAGE_H - 58, 84, 26);
    page.drawText("VISÃO GERAL DOS RESULTADOS", {
      x: PAGE_W - 220, y: PAGE_H - 44, size: 10, font: regular, color: COLORS.navy,
    });
    page.drawLine({
      start: { x: 28, y: PAGE_H - 70 },
      end: { x: PAGE_W - 28, y: PAGE_H - 70 },
      thickness: 1,
      color: COLORS.blue,
    });

    page.drawText("Visão geral dos resultados", {
      x: 28, y: PAGE_H - 130, size: 28, font: bold, color: COLORS.navy,
    });
    page.drawLine({
      start: { x: 28, y: PAGE_H - 150 },
      end: { x: 70, y: PAGE_H - 150 },
      thickness: 1.6,
      color: COLORS.blue,
    });

    drawRoundedPanel(page, 28, PAGE_H - 280, PAGE_W - 56, 74);
    drawImage(page, img.shield, 42, PAGE_H - 248, 36, 36);
    drawWrappedText({
      page,
      text: "A ENDURE é uma bateria de autorrelato de avaliação de características psicológicas empiricamente relacionadas ao desempenho em atletas de endurance.",
      x: 95,
      y: PAGE_H - 228,
      maxWidth: PAGE_W - 150,
      font: regular,
      size: 10.8,
      color: COLORS.text,
      lineHeight: 16,
      maxLines: 3,
    });

    page.drawText("Resultado geral", {
      x: 28, y: PAGE_H - 332, size: 16, font: bold, color: COLORS.navy,
    });
    page.drawLine({
      start: { x: 28, y: PAGE_H - 350 },
      end: { x: 62, y: PAGE_H - 350 },
      thickness: 1.4,
      color: COLORS.blue,
    });

    const tableX = 28;
    const tableY = PAGE_H - 594;
    const tableW = PAGE_W - 56;
    const colW = [140, 100, 110, 95, 110];
    const rowH = 28;
    const headerH = 30;
    const rows = sortFactorsAlphabetically(factors).slice(0, 8);

    page.drawRectangle({ x: tableX, y: tableY + rowH * rows.length, width: tableW, height: headerH, color: COLORS.navy });

    const headers = ["FATOR", "ESCORE BRUTO", "ESCORE T", "PERCENTIL", "CLASSIFICAÇÃO"];
    let hx = tableX + 10;
    headers.forEach((h, i) => {
      page.drawText(h, { x: hx, y: tableY + rowH * rows.length + 10, size: 8.5, font: bold, color: COLORS.white });
      hx += colW[i];
    });

    rows.forEach((r, idx) => {
      const y = tableY + rowH * (rows.length - 1 - idx);
      page.drawRectangle({
        x: tableX, y, width: tableW, height: rowH,
        color: idx % 2 === 0 ? rgb(0.985, 0.988, 0.992) : rgb(0.97, 0.975, 0.98),
        borderColor: COLORS.border,
        borderWidth: 0.5,
      });

      let x = tableX + 10;
      const vals = [
        r.score_scale ?? "—",
        fmtNum(r.raw_score, 0),
        fmtNum(r.t_score, 0),
        fmtPct(r.percentile),
        r.band_label ?? "—",
      ];

      vals.forEach((v, i) => {
        page.drawText(String(v), {
          x,
          y: y + 9,
          size: 10,
          font: i === 0 ? regular : regular,
          color: i === 4 ? COLORS.blue : COLORS.text,
        });
        x += colW[i];
      });
    });

    page.drawText("Destaques", {
      x: 28, y: 190, size: 16, font: bold, color: COLORS.navy,
    });
    page.drawLine({
      start: { x: 28, y: 176 },
      end: { x: 62, y: 176 },
      thickness: 1.4,
      color: COLORS.blue,
    });

    const low = sortFactorsAlphabetically(factors).filter((f) => Number(f.percentile ?? 101) < 25).slice(0, 3);
    const high = sortFactorsAlphabetically(factors).filter((f) => Number(f.percentile ?? -1) > 75).slice(0, 3);

    drawRoundedPanel(page, 28, 48, 220, 118);
    drawRoundedPanel(page, 276, 48, 291, 118);

    drawImage(page, img.chart, 42, 132, 28, 28);
    page.drawText("Potenciais a serem desenvolvidos", {
      x: 86, y: 136, size: 12, font: bold, color: COLORS.navy,
    });

    drawImage(page, img.star, 290, 132, 28, 28);
    page.drawText("Competências bem desenvolvidas", {
      x: 334, y: 136, size: 12, font: bold, color: COLORS.navy,
    });

    let yl = 104;
    low.forEach((f) => {
      page.drawText(`• ${f.score_scale}`, { x: 42, y: yl, size: 10.5, font: regular, color: COLORS.text });
      yl -= 26;
    });

    if (low.length === 0) {
      page.drawText("Nenhum fator em faixa baixa.", { x: 42, y: 104, size: 10.5, font: regular, color: COLORS.text });
    }

    let yh = 104;
    high.forEach((f) => {
      page.drawText(`• ${f.score_scale}`, { x: 290, y: yh, size: 10.5, font: regular, color: COLORS.text });
      yh -= 26;
    });

    if (high.length === 0) {
      page.drawText("Nenhum fator em faixa alta.", { x: 290, y: 104, size: 10.5, font: regular, color: COLORS.text });
    }

    drawFooter(page, img.footerMark, regular, pageNumber++);
  }

  // PÁGINAS DE FATORES EM ORDEM ALFABÉTICA
  for (const factor of factorsAlpha) {
    const page = pdf.addPage([PAGE_W, PAGE_H]);
    page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: COLORS.panel });
    page.drawRectangle({
      x: 16, y: 16, width: PAGE_W - 32, height: PAGE_H - 32,
      borderColor: rgb(0.72, 0.78, 0.84), borderWidth: 1,
    });

    drawImage(page, img.cornerLines, PAGE_W - 74, PAGE_H - 100, 64, 90, 0.85);
    drawImage(page, img.pageRunner, PAGE_W - 122, 48, 92, 150, 0.96);
    drawImage(page, img.mountainsStrip, 0, 0, PAGE_W, 170, 0.95);

    drawImage(page, img.logoLight, 26, PAGE_H - 64, 94, 28);
    page.drawLine({
      start: { x: 150, y: PAGE_H - 62 },
      end: { x: 150, y: PAGE_H - 34 },
      thickness: 1,
      color: COLORS.blue,
    });
    page.drawText("FATORES SOCIOEMOCIONAIS", {
      x: 170, y: PAGE_H - 49, size: 12, font: bold, color: COLORS.navy,
    });
    page.drawText("Detalhe de fator", {
      x: 170, y: PAGE_H - 67, size: 10, font: regular, color: COLORS.blue,
    });

    page.drawText(String(factor.score_scale ?? "—"), {
      x: 28, y: PAGE_H - 170, size: 40, font: bold, color: COLORS.navy,
    });

    const subtitle = factor.text_port?.trim()
      ? factor.text_port.trim().split(". ")[0]
      : "Descrição interpretativa do fator socioemocional avaliado.";

    drawWrappedText({
      page,
      text: subtitle,
      x: 28,
      y: PAGE_H - 212,
      maxWidth: 360,
      font: regular,
      size: 10.8,
      color: COLORS.blue,
      lineHeight: 15,
      maxLines: 3,
    });

    drawRoundedPanel(page, 28, PAGE_H - 348, 520, 92);

    const metricW = 124;
    const metrics = [
      ["ESCORE BRUTO", fmtNum(factor.raw_score, 0), img.clipboard],
      ["ESCORE T", fmtNum(factor.t_score, 0), img.chart],
      ["PERCENTIL", fmtPct(factor.percentile), img.target],
      ["CLASSIFICAÇÃO", factor.band_label ?? "—", img.shield],
    ] as const;

    metrics.forEach(([label, value, icon], i) => {
      const x = 40 + i * metricW;
      drawImage(page, icon, x + 22, PAGE_H - 310, 22, 22);
      page.drawText(label, { x, y: PAGE_H - 334, size: 9, font: regular, color: COLORS.muted });
      page.drawText(String(value), {
        x,
        y: PAGE_H - 378 + 20,
        size: label === "CLASSIFICAÇÃO" ? 20 : 26,
        font: bold,
        color: COLORS.navy,
      });
      if (i < 3) {
        page.drawLine({
          start: { x: x + 90, y: PAGE_H - 338 },
          end: { x: x + 90, y: PAGE_H - 270 },
          thickness: 1,
          color: COLORS.border,
        });
      }
    });

    // gráfico
    drawRoundedPanel(page, 28, 242, 250, 154);
    page.drawText("Distribuição normal (escore T)", {
      x: 78, y: 376, size: 10, font: bold, color: COLORS.navy,
    });

    const cx = 48;
    const cy = 286;
    const w = 210;
    const h = 86;

    const points: Array<{ x: number; y: number }> = [];
    const N = 90;
    for (let i = 0; i <= N; i++) {
      const t = -3 + (6 * i) / N;
      const dens = Math.exp(-(t * t) / 2);
      const px = cx + (i / N) * w;
      const py = cy + dens * h;
      points.push({ x: px, y: py });
    }

    for (let i = 1; i < points.length; i++) {
      page.drawLine({
        start: points[i - 1],
        end: points[i],
        thickness: 1.5,
        color: COLORS.navy,
      });
    }

    page.drawLine({ start: { x: cx, y: cy }, end: { x: cx + w, y: cy }, thickness: 1, color: COLORS.muted });
    [20,30,40,50,60,70,80].forEach((tick, i) => {
      const tx = cx + (i / 6) * w;
      page.drawText(String(tick), { x: tx - 6, y: cy - 14, size: 8.5, font: regular, color: COLORS.muted });
    });

    const tScore = Number(factor.t_score ?? 50);
    const p = Math.max(20, Math.min(80, tScore));
    const markerX = cx + ((p - 20) / 60) * w;
    const markerY = cy + Math.exp(-(((p - 50) / 10) ** 2) / 2) * h * 0.85;

    page.drawCircle({ x: markerX, y: markerY, size: 5, color: COLORS.navy });
    page.drawLine({
      start: { x: markerX + 8, y: markerY + 8 },
      end: { x: markerX + 26, y: markerY + 8 },
      thickness: 1,
      color: COLORS.blue,
    });
    page.drawText("Você está\naqui", {
      x: markerX + 30,
      y: markerY + 2,
      size: 8,
      font: bold,
      color: COLORS.navy,
      lineHeight: 10,
    } as any);

    drawRoundedPanel(page, 302, 242, 246, 154);
    page.drawText("Interpretação", {
      x: 320, y: 376, size: 16, font: bold, color: COLORS.navy,
    });
    page.drawLine({
      start: { x: 320, y: 360 },
      end: { x: 354, y: 360 },
      thickness: 1.2,
      color: COLORS.blue,
    });

    const qualitative = factor.text_port?.trim()
      ? factor.text_port.trim()
      : "Atletas típicos nessa faixa de escores apresentam um padrão interpretativo compatível com este nível normativo. A leitura deve ser contextualizada com treino, histórico do atleta e objetivos de intervenção.";

    drawWrappedText({
      page,
      text: qualitative,
      x: 320,
      y: 338,
      maxWidth: 210,
      font: regular,
      size: 10.2,
      color: COLORS.text,
      lineHeight: 16,
      maxLines: 9,
    });

    drawRoundedPanel(page, 28, 168, 380, 54);
    drawImage(page, img.brain, 44, 184, 24, 24);
    page.drawText("Leitura prática", {
      x: 84, y: 195, size: 11.5, font: bold, color: COLORS.navy,
    });

    const bullets = [
      `Leitura baseada na classificação ${String(factor.band_label ?? "—").toLowerCase()}.`,
      `Percentil ${fmtPct(factor.percentile)} nesta amostra normativa.`,
      `Escore T de ${fmtNum(factor.t_score, 0)} para o fator avaliado.`,
    ];

    let by = 178;
    bullets.forEach((b) => {
      page.drawText(`• ${b}`, { x: 84, y: by, size: 9.5, font: regular, color: COLORS.text });
      by -= 14;
    });

    drawFooter(page, img.footerMark, regular, pageNumber++);
  }

  // MODELO GERAL
  {
    const page = pdf.addPage([PAGE_W, PAGE_H]);
    page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: COLORS.panel });
    page.drawRectangle({
      x: 16, y: 16, width: PAGE_W - 32, height: PAGE_H - 32,
      borderColor: rgb(0.72, 0.78, 0.84), borderWidth: 1,
    });

    drawImage(page, img.cornerLines, PAGE_W - 74, PAGE_H - 170, 64, 150, 0.85);
    drawImage(page, img.mountainsStrip, 0, 0, PAGE_W, 150, 0.95);

    drawImage(page, img.logoLight, 220, PAGE_H - 78, 154, 46);

    page.drawText("Modelo geral", {
      x: 176, y: PAGE_H - 150, size: 34, font: bold, color: COLORS.navy,
    });

    page.drawText("Síntese dos escores em dimensões amplas", {
      x: 142, y: PAGE_H - 182, size: 15, font: regular, color: COLORS.blue,
    });

    page.drawLine({
      start: { x: 268, y: PAGE_H - 202 },
      end: { x: 328, y: PAGE_H - 202 },
      thickness: 1.4,
      color: COLORS.blue,
    });

    const intro =
      "A síntese final abaixo organiza as escalas da ENDURE em três dimensões amplas. Os escores apresentados correspondem a uma média ponderada, pelo número de itens, dos escores z das escalas componentes, seguida de conversão para percentis.";

    drawWrappedText({
      page,
      text: intro,
      x: 118,
      y: PAGE_H - 230,
      maxWidth: 360,
      font: regular,
      size: 10.2,
      color: COLORS.text,
      lineHeight: 15,
      maxLines: 4,
    });

    const icons = [img.brain, img.star, img.target];

    let y = PAGE_H - 410;
    broad.forEach((dim, idx) => {
      drawRoundedPanel(page, 48, y, 500, 108);

      page.drawRectangle({
        x: 48, y, width: 54, height: 108, color: COLORS.navy,
      });
      drawImage(page, icons[idx] ?? img.brain, 61, y + 62, 28, 28);

      page.drawText(`${idx + 1}. ${dim.name}`, {
        x: 114, y: y + 82, size: 14.5, font: bold, color: COLORS.navy,
      });

      page.drawText("COMPONENTES", {
        x: 114, y: y + 58, size: 8.5, font: bold, color: COLORS.muted,
      });

      let cy = y + 42;
      dim.components.slice(0, 8).forEach((c) => {
        page.drawText(`• ${c}`, { x: 114, y: cy, size: 9, font: regular, color: COLORS.text });
        cy -= 13;
      });

      page.drawLine({
        start: { x: 250, y: y + 10 },
        end: { x: 250, y: y + 98 },
        thickness: 1,
        color: COLORS.border,
      });

      page.drawText("ESCORE Z", {
        x: 290, y: y + 62, size: 8.5, font: regular, color: COLORS.muted,
      });
      page.drawText(fmtNum(dim.z_score, 2), {
        x: 285, y: y + 28, size: 22, font: bold, color: COLORS.navy,
      });

      page.drawText("PERCENTIL", {
        x: 292, y: y + 6, size: 8.5, font: regular, color: COLORS.muted,
      });
      page.drawText(fmtPct(dim.percentile), {
        x: 297, y: y - 26 + 28,
        size: 22,
        font: bold,
        color: COLORS.navy,
      });

      page.drawLine({
        start: { x: 372, y: y + 10 },
        end: { x: 372, y: y + 98 },
        thickness: 1,
        color: COLORS.border,
      });

      page.drawText("MARCADOR PERCENTÍLICO", {
        x: 390, y: y + 70, size: 8.5, font: regular, color: COLORS.muted,
      });

      page.drawLine({
        start: { x: 390, y: y + 46 },
        end: { x: 520, y: y + 46 },
        thickness: 6,
        color: rgb(0.8, 0.84, 0.89),
      });

      const px = 390 + (Math.max(0, Math.min(100, Number(dim.percentile ?? 50))) / 100) * 130;
      page.drawLine({
        start: { x: px, y: y + 38 },
        end: { x: px, y: y + 58 },
        thickness: 2,
        color: COLORS.navy,
      });

      page.drawText("SÍNTESE", {
        x: 390, y: y + 16, size: 8.5, font: bold, color: COLORS.navy,
      });

      drawWrappedText({
        page,
        text: dim.summary,
        x: 390,
        y: y - 2,
        maxWidth: 130,
        font: regular,
        size: 8.8,
        color: COLORS.text,
        lineHeight: 12,
        maxLines: 4,
      });

      y -= 126;
    });

    drawFooter(page, img.footerMark, regular, pageNumber++);
  }

  return await pdf.save();
}
