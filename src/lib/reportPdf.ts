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
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

function fmtPct(p: number | null | undefined) {
  if (p === null || p === undefined) return "—";
  return `${Math.round(p)}º`;
}

function fmtNum(n: number | null | undefined, digits = 1) {
  if (n === null || n === undefined) return "—";
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
  const page = pdf.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();

  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const M = 48;
  let y = height - 56;

  // Header
  page.drawText("Relatório de avaliação socioemocional", {
    x: M, y, size: 18, font: fontBold, color: rgb(0.07, 0.09, 0.15),
  });
  y -= 22;

  page.drawText("ENDURE • Avaliação socioemocional em atletas", {
    x: M, y, size: 10.5, font, color: rgb(0.42, 0.45, 0.50),
  });
  y -= 22;

  // Identification
  page.drawText("Dados de identificação do atleta", {
    x: M, y, size: 12.5, font: fontBold, color: rgb(0.07, 0.09, 0.15),
  });
  y -= 14;

  const leftLabelX = M;
  const leftValueX = M + 160;
  const lineH = 14;

  const idRows: Array<[string, string]> = [
    ["Nome", athlete.full_name ?? "—"],
    ["Nascimento", athlete.birth_date ?? "—"],
    ["Sexo", athlete.sex ?? "—"],
    ["Gênero", athlete.gender ?? "—"],
    ["Esporte", athlete.sport_primary ?? "—"],
    ["Equipe", athlete.team ?? "—"],
    ["Email", athlete.email ?? "—"],
  ];

  for (const [k, v] of idRows) {
    page.drawText(k, { x: leftLabelX, y, size: 10.5, font: fontBold, color: rgb(0.20, 0.23, 0.27) });
    page.drawText(v, { x: leftValueX, y, size: 10.5, font, color: rgb(0.07, 0.09, 0.15) });
    y -= lineH;
  }

  y -= 10;

  // Assessment meta
  page.drawText("Dados da avaliação", {
    x: M, y, size: 12.5, font: fontBold, color: rgb(0.07, 0.09, 0.15),
  });
  y -= 14;

  const aRows: Array<[string, string]> = [
    ["Instrumento", assessment.instrument_version ?? "—"],
    ["Janela", assessment.reference_window ?? "—"],
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
  page.drawText("Síntese por escala", {
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
        // paginação simples
        page = doc.addPage([595.28, 841.89]);
        y = 760;

        // título da seção
        page.drawText("Resultados por escala", { x: 50, y, size: 14, font: bold, color: rgb(0.05, 0.08, 0.15) });
        y -= 24;

        // cabeçalho da tabela
        page.drawLine({ start: { x: 50, y: y + 10 }, end: { x: 545, y: y + 10 }, thickness: 1, color: rgb(0.9, 0.9, 0.9) });
        page.drawText("Escala", { x: 50, y, size: 10, font: bold, color: rgb(0.2, 0.2, 0.2) });
        page.drawText("Raw", { x: 250, y, size: 10, font: bold, color: rgb(0.2, 0.2, 0.2) });
        page.drawText("T", { x: 300, y, size: 10, font: bold, color: rgb(0.2, 0.2, 0.2) });
        page.drawText("%", { x: 340, y, size: 10, font: bold, color: rgb(0.2, 0.2, 0.2) });
        page.drawText("Banda", { x: 385, y, size: 10, font: bold, color: rgb(0.2, 0.2, 0.2) });
        page.drawText("Interpretação", { x: 450, y, size: 10, font: bold, color: rgb(0.2, 0.2, 0.2) });

        y -= 16;
      }
    page.drawText(String(s.score_scale ?? "—"), { x: colX.scale, y, size: 10.5, font, color: rgb(0.07, 0.09, 0.15) });
    page.drawText(String(s.raw_score ?? "—"), { x: colX.raw, y, size: 10.5, font, color: rgb(0.07, 0.09, 0.15) });
    page.drawText(fmtNum(s.t_score, 1), { x: colX.t, y, size: 10.5, font, color: rgb(0.07, 0.09, 0.15) });
    page.drawText(fmtPct(s.percentile), { x: colX.pct, y, size: 10.5, font, color: rgb(0.07, 0.09, 0.15) });
    page.drawText(String(s.band_label ?? "—"), { x: colX.band, y, size: 10.5, font, color: rgb(0.07, 0.09, 0.15) });
    y -= rowH;
  }

  // Footer
  const footer = 'Endure • Avaliação socioemocional para atletas • Prof. Dr. Nelson Hauck Filho • Contato: hauck.nf@gmail.com';
  const footerLines = wrapText(footer, 92);
  let fy = 36;
  for (const line of footerLines) {
    page.drawText(line, { x: M, y: fy, size: 9, font, color: rgb(0.42, 0.45, 0.50) });
    fy += 11;
  }

  return await pdf.save();
}
