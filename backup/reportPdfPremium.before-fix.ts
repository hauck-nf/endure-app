import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

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
};

function fmtDateBR(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

function fmtNum(n: number | null | undefined, digits = 1) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return "—";
  return Number(n).toFixed(digits);
}

function fmtPct(p: number | null | undefined) {
  if (p === null || p === undefined || Number.isNaN(Number(p))) return "—";
  return `${Math.round(Number(p))}º`;
}

function wrapText(text: string, maxChars: number) {
  const words = (text ?? "").split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";

  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (next.length > maxChars) {
      if (line) lines.push(line);
      line = w;
    } else {
      line = next;
    }
  }

  if (line) lines.push(line);
  return lines;
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

function tToZ(t: number | null | undefined) {
  if (t === null || t === undefined || Number.isNaN(Number(t))) return null;
  return (Number(t) - 50) / 10;
}

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

function inferBroadDimension(scaleName: string) {
  const normalized = String(scaleName ?? "").trim().toLowerCase();

  for (const [dimension, scales] of Object.entries(WORKING_MODEL)) {
    for (const s of scales) {
      if (normalized === s.trim().toLowerCase()) return dimension;
    }
  }

  return null;
}

function computeBroadDimensions(factors: FactorScore[]): BroadDimension[] {
  return Object.keys(WORKING_MODEL).map((dimension) => {
    const subset = factors.filter((f) => inferBroadDimension(f.score_scale) === dimension);
    const valid = subset.filter(
      (f) =>
        f.t_score !== null &&
        f.t_score !== undefined &&
        !Number.isNaN(Number(f.t_score)) &&
        (f.n_items_scored ?? 0) > 0
    );

    if (valid.length === 0) {
      return { name: dimension, z_score: null, percentile: null };
    }

    const weightedSum = valid.reduce((acc, f) => {
      return acc + ((tToZ(f.t_score) ?? 0) * Number(f.n_items_scored ?? 0));
    }, 0);

    const totalWeight = valid.reduce((acc, f) => acc + Number(f.n_items_scored ?? 0), 0);

    const z = totalWeight > 0 ? weightedSum / totalWeight : null;
    const pct = z === null ? null : normalCdf(z) * 100;

    return { name: dimension, z_score: z, percentile: pct };
  });
}

function drawHeader(page: any, title: string, subtitle?: string) {
  const { width, height } = page.getSize();
  page.drawRectangle({
    x: 0,
    y: height - 64,
    width,
    height: 64,
    color: rgb(0.07, 0.09, 0.15),
  });

  page.drawText(title, {
    x: 40,
    y: height - 38,
    size: 18,
    color: rgb(1, 1, 1),
  });

  if (subtitle) {
    page.drawText(subtitle, {
      x: 40,
      y: height - 54,
      size: 9.5,
      color: rgb(0.86, 0.88, 0.92),
    });
  }
}

function drawFooter(page: any, text: string, pageNumber: number) {
  page.drawText(text, {
    x: 40,
    y: 24,
    size: 9,
    color: rgb(0.45, 0.48, 0.54),
  });

  page.drawText(String(pageNumber), {
    x: 555,
    y: 24,
    size: 9,
    color: rgb(0.45, 0.48, 0.54),
  });
}

function drawNormalCurve(page: any, x: number, y: number, w: number, h: number, percentile: number | null) {
  page.drawRectangle({
    x,
    y,
    width: w,
    height: h,
    borderWidth: 1,
    borderColor: rgb(0.88, 0.9, 0.93),
    color: rgb(0.985, 0.99, 1),
  });

  const points: Array<{ x: number; y: number }> = [];
  const n = 80;

  for (let i = 0; i <= n; i++) {
    const t = -3 + (6 * i) / n;
    const dens = Math.exp(-(t * t) / 2);
    const px = x + (i / n) * w;
    const py = y + 24 + dens * (h - 52);
    points.push({ x: px, y: py });
  }

  for (let i = 1; i < points.length; i++) {
    page.drawLine({
      start: points[i - 1],
      end: points[i],
      thickness: 1.8,
      color: rgb(0.12, 0.22, 0.45),
    });
  }

  if (percentile !== null && percentile !== undefined && !Number.isNaN(Number(percentile))) {
    const p = Math.max(1, Math.min(99, Number(percentile)));
    const markerX = x + (p / 100) * w;

    page.drawLine({
      start: { x: markerX, y: y + 16 },
      end: { x: markerX, y: y + h - 14 },
      thickness: 1.5,
      color: rgb(0.82, 0.18, 0.18),
    });

    page.drawRectangle({
      x: Math.max(x + 8, Math.min(markerX - 38, x + w - 84)),
      y: y + h - 24,
      width: 76,
      height: 16,
      color: rgb(0.82, 0.18, 0.18),
    });

    page.drawText("Você está aqui", {
      x: Math.max(x + 12, Math.min(markerX - 34, x + w - 80)),
      y: y + h - 19,
      size: 8.5,
      color: rgb(1, 1, 1),
    });
  }
}

export async function buildEndurePremiumPdf(params: {
  athlete: AthleteRow;
  assessment: AssessmentRow;
  factors: FactorScore[];
}) {
  const { athlete, assessment, factors } = params;

  const broadDimensions = computeBroadDimensions(factors);
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let pageNumber = 1;

  // CAPA
  {
    const page = pdf.addPage([595.28, 841.89]);
    const { width, height } = page.getSize();

    page.drawRectangle({
      x: 0,
      y: 0,
      width,
      height,
      color: rgb(0.985, 0.99, 1),
    });

    page.drawText("ENDURE", {
      x: 40,
      y: height - 90,
      size: 30,
      color: rgb(0.07, 0.09, 0.15),
    });

    page.drawText("avaliação socioemocional para atletas de endurance", {
      x: 40,
      y: height - 115,
      size: 12,
      color: rgb(0.38, 0.42, 0.48),
    });

    page.drawText("Relatório de avaliação socioemocional", {
      x: 40,
      y: height - 175,
      size: 22,
      color: rgb(0.07, 0.09, 0.15),
    });

    page.drawText("Prof. Dr. Nelson Hauck Filho", {
      x: 40,
      y: height - 205,
      size: 13,
      color: rgb(0.22, 0.25, 0.3),
    });

    page.drawRectangle({
      x: 40,
      y: height - 360,
      width: 515,
      height: 120,
      borderWidth: 1,
      borderColor: rgb(0.87, 0.9, 0.94),
      color: rgb(1, 1, 1),
    });

    const rows = [
      ["Nome", athlete.full_name ?? "—"],
      ["Nascimento", athlete.birth_date ?? "—"],
      ["Sexo", athlete.sex ?? "—"],
      ["Gênero", athlete.gender ?? "—"],
      ["Esporte", athlete.sport_primary ?? "—"],
      ["Equipe", athlete.team ?? "—"],
      ["Data/hora da avaliação", fmtDateBR(assessment.submitted_at ?? assessment.created_at)],
    ];

    let y = height - 270;
    for (const [k, v] of rows) {
      page.drawText(k, { x: 56, y, size: 10.5, font: fontBold, color: rgb(0.24, 0.27, 0.32) });
      page.drawText(v, { x: 210, y, size: 10.5, font, color: rgb(0.07, 0.09, 0.15) });
      y -= 15;
    }

    drawFooter(page, "ENDURE • Relatório de avaliação socioemocional", pageNumber++);
  }

  // SÍNTESE
  {
    const page = pdf.addPage([595.28, 841.89]);
    drawHeader(page, "Síntese geral", "Escalas, classificação e marcadores interpretativos");

    page.setFont(font);
    page.setFontSize(10.5);

    let y = 736;

    page.drawText("Tabela síntese", {
      x: 40,
      y,
      size: 14,
      font: fontBold,
      color: rgb(0.07, 0.09, 0.15),
    });

    y -= 24;

    const colX = { scale: 40, band: 280, pct: 380, t: 460 };

    page.drawText("Escala", { x: colX.scale, y, size: 10, font: fontBold, color: rgb(0.43, 0.46, 0.5) });
    page.drawText("Classificação", { x: colX.band, y, size: 10, font: fontBold, color: rgb(0.43, 0.46, 0.5) });
    page.drawText("Percentil", { x: colX.pct, y, size: 10, font: fontBold, color: rgb(0.43, 0.46, 0.5) });
    page.drawText("Escore T", { x: colX.t, y, size: 10, font: fontBold, color: rgb(0.43, 0.46, 0.5) });

    y -= 14;

    const sorted = [...factors].sort((a, b) => String(a.score_scale).localeCompare(String(b.score_scale)));

    for (const f of sorted) {
      if (y < 280) break;

      page.drawText(String(f.score_scale ?? "—"), {
        x: colX.scale,
        y,
        size: 10,
        font,
        color: rgb(0.07, 0.09, 0.15),
      });

      page.drawText(String(f.band_label ?? "—"), {
        x: colX.band,
        y,
        size: 10,
        font,
        color: rgb(0.07, 0.09, 0.15),
      });

      page.drawText(fmtPct(f.percentile), {
        x: colX.pct,
        y,
        size: 10,
        font,
        color: rgb(0.07, 0.09, 0.15),
      });

      page.drawText(fmtNum(f.t_score, 1), {
        x: colX.t,
        y,
        size: 10,
        font,
        color: rgb(0.07, 0.09, 0.15),
      });

      y -= 13;
    }

    const strengths = sorted.filter((f) => Number(f.percentile ?? -1) > 75).map((f) => f.score_scale);
    const potentials = sorted.filter((f) => Number(f.percentile ?? 101) < 25).map((f) => f.score_scale);

    page.drawRectangle({
      x: 40,
      y: 90,
      width: 245,
      height: 140,
      borderWidth: 1,
      borderColor: rgb(0.84, 0.92, 0.88),
      color: rgb(0.96, 0.99, 0.97),
    });

    page.drawRectangle({
      x: 310,
      y: 90,
      width: 245,
      height: 140,
      borderWidth: 1,
      borderColor: rgb(0.96, 0.88, 0.84),
      color: rgb(1, 0.975, 0.965),
    });

    page.drawText("Competências bem desenvolvidas", {
      x: 52,
      y: 212,
      size: 12,
      font: fontBold,
      color: rgb(0.1, 0.32, 0.18),
    });

    page.drawText("Potenciais a desenvolver", {
      x: 322,
      y: 212,
      size: 12,
      font: fontBold,
      color: rgb(0.55, 0.18, 0.12),
    });

    let y1 = 192;
    for (const s of strengths.slice(0, 7)) {
      page.drawText(`• ${s}`, { x: 52, y: y1, size: 10, font, color: rgb(0.12, 0.16, 0.22) });
      y1 -= 15;
    }
    if (strengths.length === 0) {
      page.drawText("Nenhuma escala em faixa alta.", { x: 52, y: 192, size: 10, font, color: rgb(0.12, 0.16, 0.22) });
    }

    let y2 = 192;
    for (const s of potentials.slice(0, 7)) {
      page.drawText(`• ${s}`, { x: 322, y: y2, size: 10, font, color: rgb(0.12, 0.16, 0.22) });
      y2 -= 15;
    }
    if (potentials.length === 0) {
      page.drawText("Nenhuma escala em faixa baixa.", { x: 322, y: 192, size: 10, font, color: rgb(0.12, 0.16, 0.22) });
    }

    drawFooter(page, "ENDURE • Síntese geral", pageNumber++);
  }

  // UMA PÁGINA POR FATOR
  for (const f of factors.sort((a, b) => String(a.score_scale).localeCompare(String(b.score_scale)))) {
    const page = pdf.addPage([595.28, 841.89]);
    drawHeader(page, String(f.score_scale ?? "Fator"), "Descrição qualitativa e posicionamento normativo");

    page.drawText(String(f.score_scale ?? "—"), {
      x: 40,
      y: 735,
      size: 20,
      font: fontBold,
      color: rgb(0.07, 0.09, 0.15),
    });

    page.drawRectangle({
      x: 430,
      y: 726,
      width: 125,
      height: 24,
      color:
        String(f.band_label ?? "").toLowerCase() === "alto"
          ? rgb(0.87, 0.96, 0.9)
          : String(f.band_label ?? "").toLowerCase() === "baixo"
          ? rgb(0.99, 0.9, 0.88)
          : rgb(0.94, 0.95, 0.98),
    });

    page.drawText(String(f.band_label ?? "—"), {
      x: 468,
      y: 733,
      size: 10,
      font: fontBold,
      color: rgb(0.12, 0.16, 0.22),
    });

    page.drawRectangle({
      x: 40,
      y: 640,
      width: 515,
      height: 58,
      borderWidth: 1,
      borderColor: rgb(0.89, 0.9, 0.93),
      color: rgb(1, 1, 1),
    });

    const meta = [
      ["Escore bruto", fmtNum(f.raw_score, 0)],
      ["Percentil", fmtPct(f.percentile)],
      ["Escore T", fmtNum(f.t_score, 1)],
      ["Theta", fmtNum(f.theta_hat, 2)],
    ];

    let mx = 56;
    for (const [k, v] of meta) {
      page.drawText(k, { x: mx, y: 675, size: 10, font: fontBold, color: rgb(0.36, 0.4, 0.46) });
      page.drawText(v, { x: mx, y: 655, size: 14, font, color: rgb(0.07, 0.09, 0.15) });
      mx += 120;
    }

    drawNormalCurve(page, 40, 470, 515, 130, f.percentile ?? null);

    page.drawText("Descrição qualitativa", {
      x: 40,
      y: 438,
      size: 13,
      font: fontBold,
      color: rgb(0.07, 0.09, 0.15),
    });

    const descLines = wrapText(
      f.text_port && f.text_port.trim().length > 0
        ? f.text_port
        : "Ainda não há texto qualitativo disponível para esta faixa de escore.",
      95
    );

    let ty = 414;
    for (const line of descLines.slice(0, 18)) {
      page.drawText(line, {
        x: 40,
        y: ty,
        size: 10.5,
        font,
        color: rgb(0.14, 0.17, 0.22),
      });
      ty -= 15;
    }

    drawFooter(page, `ENDURE • ${String(f.score_scale ?? "Fator")}`, pageNumber++);
  }

  // DIMENSÕES AMPLAS
  {
    const page = pdf.addPage([595.28, 841.89]);
    drawHeader(page, "Síntese final", "Modelo teórico de três dimensões amplas");

    page.drawText("Dimensões amplas", {
      x: 40,
      y: 735,
      size: 18,
      font: fontBold,
      color: rgb(0.07, 0.09, 0.15),
    });

    page.drawText(
      "Os escores abaixo representam a média ponderada, pelo número de itens, dos escores z das escalas pertencentes a cada dimensão ampla.",
      {
        x: 40,
        y: 710,
        size: 10,
        font,
        color: rgb(0.38, 0.42, 0.48),
      }
    );

    let y = 650;

    for (const d of broadDimensions) {
      page.drawRectangle({
        x: 40,
        y: y - 18,
        width: 515,
        height: 86,
        borderWidth: 1,
        borderColor: rgb(0.89, 0.9, 0.93),
        color: rgb(1, 1, 1),
      });

      page.drawText(d.name, {
        x: 56,
        y: y + 40,
        size: 14,
        font: fontBold,
        color: rgb(0.07, 0.09, 0.15),
      });

      page.drawText(`Escore z: ${fmtNum(d.z_score, 2)}`, {
        x: 56,
        y: y + 16,
        size: 11,
        font,
        color: rgb(0.14, 0.17, 0.22),
      });

      page.drawText(`Percentil: ${fmtPct(d.percentile)}`, {
        x: 200,
        y: y + 16,
        size: 11,
        font,
        color: rgb(0.14, 0.17, 0.22),
      });

      y -= 110;
    }

    drawFooter(page, "ENDURE • Síntese em dimensões amplas", pageNumber++);
  }

  return await pdf.save();
}
