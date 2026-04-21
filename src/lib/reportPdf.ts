import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

type ScoreRow = {
  score_scale: string;
  raw_score: number | null;
  t_score: number | null;
  percentile: number | null;
  band_label?: string | null;
};

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

function fmtDateBR(iso: string | null | undefined) {
  if (!iso) return "â€”";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

function fmtPct(p: number | null | undefined) {
  if (p === null || p === undefined) return "â€”";
  return `${Math.round(p)}Âº`;
}

function fmtNum(n: number | null | undefined, digits = 1) {
  if (n === null || n === undefined) return "â€”";
  return Number(n).toFixed(digits);
}

function wrapText(text: string, maxChars: number) {
  const words = (text ?? "").split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const next = line ? (line + " " + w) : w;
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

export async function buildEndurePdf(params: {
  athlete: AthleteRow;
  assessment: AssessmentRow;
  scores: ScoreRow[];
}) {
  const { athlete, assessment, scores } = params;

  const pdf = await PDFDocument.create();
  let page = pdf.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();

  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const M = 48;
  let y = height - 56;

  // Header
  page.drawText("RelatÃ³rio de avaliaÃ§Ã£o socioemocional", {
    x: M, y, size: 18, font: fontBold, color: rgb(0.07, 0.09, 0.15),
  });
  y -= 22;

  page.drawText("ENDURE â€¢ AvaliaÃ§Ã£o socioemocional em atletas", {
    x: M, y, size: 10.5, font, color: rgb(0.42, 0.45, 0.50),
  });
  y -= 22;

  // Identification
  page.drawText("Dados de identificaÃ§Ã£o do atleta", {
    x: M, y, size: 12.5, font: fontBold, color: rgb(0.07, 0.09, 0.15),
  });
  y -= 14;

  const leftLabelX = M;
  const leftValueX = M + 160;
  const lineH = 14;

  const idRows: Array<[string, string]> = [
    ["Nome", athlete.full_name ?? "â€”"],
    ["Nascimento", athlete.birth_date ?? "â€”"],
    ["Sexo", athlete.sex ?? "â€”"],
    ["GÃªnero", athlete.gender ?? "â€”"],
    ["Esporte", athlete.sport_primary ?? "â€”"],
    ["Equipe", athlete.team ?? "â€”"],
    ["Email", athlete.email ?? "â€”"],
  ];

  for (const [k, v] of idRows) {
    page.drawText(k, { x: leftLabelX, y, size: 10.5, font: fontBold, color: rgb(0.20, 0.23, 0.27) });
    page.drawText(v, { x: leftValueX, y, size: 10.5, font, color: rgb(0.07, 0.09, 0.15) });
    y -= lineH;
  }

  y -= 10;

  // Assessment meta
  page.drawText("Dados da avaliaÃ§Ã£o", {
    x: M, y, size: 12.5, font: fontBold, color: rgb(0.07, 0.09, 0.15),
  });
  y -= 14;

  const aRows: Array<[string, string]> = [
    ["Instrumento", assessment.instrument_version ?? "â€”"],
    ["Janela", assessment.reference_window ?? "â€”"],
    ["Criado em", fmtDateBR(assessment.created_at)],
    ["Submetido em", fmtDateBR(assessment.submitted_at)],
    ["Scoring", "ENDURE_score_v2_local_engine"],
  ];

  for (const [k, v] of aRows) {
    page.drawText(k, { x: leftLabelX, y, size: 10.5, font: fontBold, color: rgb(0.20, 0.23, 0.27) });
    page.drawText(v, { x: leftValueX, y, size: 10.5, font, color: rgb(0.07, 0.09, 0.15) });
    y -= lineH;
  }

  y -= 18;

  // Scores table header
  page.drawText("SÃ­ntese por escala", {
    x: M, y, size: 12.5, font: fontBold, color: rgb(0.07, 0.09, 0.15),
  });
  y -= 14;

  const colX = {
    scale: M,
    raw: M + 280,
    t: M + 350,
    pct: M + 410,
    band: M + 470,
  };

  page.drawText("Escala", { x: colX.scale, y, size: 10, font: fontBold, color: rgb(0.42, 0.45, 0.50) });
  page.drawText("Raw",   { x: colX.raw,   y, size: 10, font: fontBold, color: rgb(0.42, 0.45, 0.50) });
  page.drawText("T",     { x: colX.t,     y, size: 10, font: fontBold, color: rgb(0.42, 0.45, 0.50) });
  page.drawText("Pct",   { x: colX.pct,   y, size: 10, font: fontBold, color: rgb(0.42, 0.45, 0.50) });
  page.drawText("Faixa", { x: colX.band,  y, size: 10, font: fontBold, color: rgb(0.42, 0.45, 0.50) });
  y -= 12;

  const sorted = [...scores].sort((a,b) => String(a.score_scale).localeCompare(String(b.score_scale)));
  const rowH = 13;

  for (const s of sorted) {
    if (y < 90) {
        // paginaÃ§Ã£o simples
        page = pdf.addPage([595.28, 841.89]);
        y = 760;

        // tÃ­tulo da seÃ§Ã£o
        page.drawText("Resultados por escala", { x: 50, y, size: 14, font: font, color: rgb(0.05, 0.08, 0.15) });
        y -= 24;

        // cabeÃ§alho da tabela
        page.drawLine({ start: { x: 50, y: y + 10 }, end: { x: 545, y: y + 10 }, thickness: 1, color: rgb(0.9, 0.9, 0.9) });
        page.drawText("Escala", { x: 50, y, size: 10, font: font, color: rgb(0.2, 0.2, 0.2) });
        page.drawText("Raw", { x: 250, y, size: 10, font: font, color: rgb(0.2, 0.2, 0.2) });
        page.drawText("T", { x: 300, y, size: 10, font: font, color: rgb(0.2, 0.2, 0.2) });
        page.drawText("%", { x: 340, y, size: 10, font: font, color: rgb(0.2, 0.2, 0.2) });
        page.drawText("Banda", { x: 385, y, size: 10, font: font, color: rgb(0.2, 0.2, 0.2) });
        page.drawText("InterpretaÃ§Ã£o", { x: 450, y, size: 10, font: font, color: rgb(0.2, 0.2, 0.2) });

        y -= 16;
      }
    page.drawText(String(s.score_scale ?? "â€”"), { x: colX.scale, y, size: 10.5, font, color: rgb(0.07, 0.09, 0.15) });
    page.drawText(String(s.raw_score ?? "â€”"), { x: colX.raw, y, size: 10.5, font, color: rgb(0.07, 0.09, 0.15) });
    page.drawText(fmtNum(s.t_score, 1), { x: colX.t, y, size: 10.5, font, color: rgb(0.07, 0.09, 0.15) });
    page.drawText(fmtPct(s.percentile), { x: colX.pct, y, size: 10.5, font, color: rgb(0.07, 0.09, 0.15) });
    page.drawText(String(s.band_label ?? "â€”"), { x: colX.band, y, size: 10.5, font, color: rgb(0.07, 0.09, 0.15) });
    y -= rowH;
  }

  // Footer
  const footer = 'Endure â€¢ AvaliaÃ§Ã£o socioemocional para atletas â€¢ Prof. Dr. Nelson Hauck Filho â€¢ Contato: hauck.nf@gmail.com';
  const footerLines = wrapText(footer, 92);
  let fy = 36;
  for (const line of footerLines) {
    page.drawText(line, { x: M, y: fy, size: 9, font, color: rgb(0.42, 0.45, 0.50) });
    fy += 11;
  }

  return await pdf.save();
}

