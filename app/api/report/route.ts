import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BUCKET = process.env.SUPABASE_REPORTS_BUCKET || "reports";

type BandKey = "low" | "mid" | "high";

type ScoredFactor = {
  score_scale: string;
  raw_score: number;
  n_items_scored: number;
  percentile: number | null;
  t_score: number | null;
  theta_hat: number | null;
  band: BandKey;
  band_label: string;
  text_port: string | null;
};

function fmtDatePt(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso);
  return d.toLocaleString("pt-BR");
}

function n(x: any): number | null {
  const v = Number(x);
  return Number.isFinite(v) ? v : null;
}

function safeStr(x: any) {
  return (x === null || x === undefined) ? "" : String(x);
}

// ===== PDF helpers (paginação simples e robusta) =====
type PdfCtx = {
  pdf: PDFDocument;
  page: any;
  w: number;
  h: number;
  margin: number;
  y: number;
  font: any;
  fontBold: any;
  pageNo: number;
  headerLeft: string;
};

function drawHeaderFooter(ctx: PdfCtx) {
  const { page, w, h, margin, font, fontBold, pageNo, headerLeft } = ctx;

  // header
  page.drawText(headerLeft, {
    x: margin,
    y: h - margin + 10,
    size: 9,
    font: fontBold,
    color: rgb(0.15, 0.18, 0.23),
  });

  page.drawLine({
    start: { x: margin, y: h - margin },
    end: { x: w - margin, y: h - margin },
    thickness: 1,
    color: rgb(0.9, 0.91, 0.93),
  });

  // footer
  page.drawLine({
    start: { x: margin, y: margin - 10 },
    end: { x: w - margin, y: margin - 10 },
    thickness: 1,
    color: rgb(0.9, 0.91, 0.93),
  });

  page.drawText("Endure — Avaliação socioemocional para atletas • Prof. Dr. Nelson Hauck Filho • hauck.nf@gmail.com", {
    x: margin,
    y: margin - 26,
    size: 8.5,
    font,
    color: rgb(0.42, 0.45, 0.5),
  });

  page.drawText(String(pageNo), {
    x: w - margin - 10,
    y: margin - 26,
    size: 8.5,
    font,
    color: rgb(0.42, 0.45, 0.5),
  });
}

function newPage(ctx: PdfCtx) {
  ctx.page = ctx.pdf.addPage([595.28, 841.89]); // A4
  ctx.w = 595.28;
  ctx.h = 841.89;
  ctx.pageNo += 1;
  ctx.y = ctx.h - ctx.margin - 24;
  drawHeaderFooter(ctx);
}

function ensureSpace(ctx: PdfCtx, needed: number) {
  if (ctx.y - needed < ctx.margin + 30) newPage(ctx);
}

function wrapLines(text: string, maxChars = 105) {
  const words = (text || "").split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const cand = line ? (line + " " + w) : w;
    if (cand.length > maxChars) {
      if (line) lines.push(line);
      line = w;
    } else line = cand;
  }
  if (line) lines.push(line);
  return lines;
}

function h1(ctx: PdfCtx, t: string) {
  ensureSpace(ctx, 26);
  ctx.page.drawText(t, {
    x: ctx.margin,
    y: ctx.y,
    size: 18,
    font: ctx.fontBold,
    color: rgb(0.07, 0.09, 0.16),
  });
  ctx.y -= 26;
}

function h2(ctx: PdfCtx, t: string) {
  ensureSpace(ctx, 18);
  ctx.page.drawText(t, {
    x: ctx.margin,
    y: ctx.y,
    size: 13,
    font: ctx.fontBold,
    color: rgb(0.07, 0.09, 0.16),
  });
  ctx.y -= 18;
}

function p(ctx: PdfCtx, t: string) {
  const lines = wrapLines(t, 105);
  for (const ln of lines) {
    ensureSpace(ctx, 12);
    ctx.page.drawText(ln, {
      x: ctx.margin,
      y: ctx.y,
      size: 10.5,
      font: ctx.font,
      color: rgb(0.15, 0.18, 0.23),
    });
    ctx.y -= 12;
  }
  ctx.y -= 6;
}

function kv(ctx: PdfCtx, k: string, v: string) {
  ensureSpace(ctx, 14);
  ctx.page.drawText(k, { x: ctx.margin, y: ctx.y, size: 10.5, font: ctx.fontBold, color: rgb(0.15, 0.18, 0.23) });
  ctx.page.drawText(v, { x: ctx.margin + 130, y: ctx.y, size: 10.5, font: ctx.font, color: rgb(0.15, 0.18, 0.23) });
  ctx.y -= 14;
}

function percentBar(ctx: PdfCtx, pctl: number | null) {
  ensureSpace(ctx, 30);
  const x = ctx.margin;
  const y = ctx.y;
  const barW = 420;
  const barH = 10;

  ctx.page.drawRectangle({
    x, y, width: barW, height: barH,
    borderColor: rgb(0.9, 0.91, 0.93),
    borderWidth: 1,
    color: rgb(0.98, 0.98, 0.99),
  });

  if (pctl !== null && !Number.isNaN(pctl)) {
    const px = x + Math.max(0, Math.min(100, pctl)) / 100 * barW;
    ctx.page.drawLine({
      start: { x: px, y: y - 4 },
      end: { x: px, y: y + barH + 4 },
      thickness: 2,
      color: rgb(0.07, 0.09, 0.16),
    });
    ctx.page.drawText("Você está aqui", {
      x: Math.min(px + 6, x + barW - 80),
      y: y + barH + 6,
      size: 9,
      font: ctx.font,
      color: rgb(0.42, 0.45, 0.5),
    });
  }

  ctx.page.drawText("0", { x, y: y - 14, size: 8.5, font: ctx.font, color: rgb(0.42, 0.45, 0.5) });
  ctx.page.drawText("100", { x: x + barW - 22, y: y - 14, size: 8.5, font: ctx.font, color: rgb(0.42, 0.45, 0.5) });

  ctx.y -= 30;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as any));
    const assessment_id = body?.assessment_id as string | undefined;

    if (!assessment_id) {
      return NextResponse.json({ ok: false, error: "assessment_id ausente" }, { status: 400 });
    }

    // 1) assessment + athlete
    const { data: a, error: eA } = await supabaseAdmin
      .from("assessments")
      .select("assessment_id, athlete_id, instrument_version, reference_window, created_at, submitted_at")
      .eq("assessment_id", assessment_id)
      .single();
    if (eA) throw eA;

    const { data: ath, error: eB } = await supabaseAdmin
      .from("athletes")
      .select("athlete_id, full_name, birth_date, sex, gender, sport_primary, team, email")
      .eq("athlete_id", a.athlete_id)
      .single();
    if (eB) throw eB;

    // 2) assessment_scores (fonte oficial)
    const { data: sc, error: eC } = await supabaseAdmin
      .from("assessment_scores")
      .select("assessment_id, readiness_score, scores_json, scoring_version, computed_at")
      .eq("assessment_id", assessment_id)
      .single();
    if (eC) throw eC;

    const instrument = safeStr(a.instrument_version);
    const scores_json: any = sc?.scores_json ?? {};
    const factors: ScoredFactor[] = Array.isArray(scores_json?.factors) ? scores_json.factors : [];

    // se não tiver factors, relatório não tem o que renderizar
    if (!factors.length) {
      return NextResponse.json({
        ok: false,
        error: "scores_json.factors vazio. Rode /api/score para este assessment antes de gerar o relatório.",
      }, { status: 400 });
    }

    // 3) PDF
    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

    const ctx: PdfCtx = {
      pdf,
      page: null,
      w: 595.28,
      h: 841.89,
      margin: 48,
      y: 0,
      font,
      fontBold,
      pageNo: 0,
      headerLeft: "Avaliação socioemocional em atletas",
    };

    // pág 1: identificação
    newPage(ctx);
    h1(ctx, "Relatório de avaliação socioemocional");
    p(ctx, "Este relatório sintetiza os resultados da avaliação ENDURE e apresenta indicadores normativos e interpretações qualitativas por escala.");

    h2(ctx, "Dados de identificação do atleta");
    kv(ctx, "Nome", safeStr(ath.full_name) || "—");
    kv(ctx, "Nascimento", ath.birth_date ? String(ath.birth_date) : "—");
    kv(ctx, "Sexo", safeStr(ath.sex) || "—");
    kv(ctx, "Gênero", safeStr(ath.gender) || "—");
    kv(ctx, "Esporte", safeStr(ath.sport_primary) || "—");
    kv(ctx, "Equipe", safeStr(ath.team) || "—");
    kv(ctx, "Email", safeStr(ath.email) || "—");

    ctx.y -= 8;
    h2(ctx, "Dados da avaliação");
    kv(ctx, "Instrumento", instrument || "—");
    kv(ctx, "Janela", safeStr(a.reference_window) || "—");
    kv(ctx, "Criado em", fmtDatePt(a.created_at));
    kv(ctx, "Submetido em", fmtDatePt(a.submitted_at));
    kv(ctx, "Scoring", safeStr(sc.scoring_version) || "—");

    // pág 2: visão geral
    newPage(ctx);
    h1(ctx, "Visão geral");

    const readiness = sc.readiness_score === null || sc.readiness_score === undefined ? null : Number(sc.readiness_score);
    kv(ctx, "Prontidão (0–100)", readiness === null || Number.isNaN(readiness) ? "—" : readiness.toFixed(1));

    h2(ctx, "Resumo por escala");
    p(ctx, "A tabela abaixo resume percentis e classificações por escala (Baixo/Médio/Alto).");

    // cabeçalho tabela
    const colX = [ctx.margin, ctx.margin + 260, ctx.margin + 340, ctx.margin + 430];
    ensureSpace(ctx, 14);
    ctx.page.drawText("Escala", { x: colX[0], y: ctx.y, size: 10, font: ctx.fontBold, color: rgb(0.35, 0.4, 0.45) });
    ctx.page.drawText("Percentil", { x: colX[1], y: ctx.y, size: 10, font: ctx.fontBold, color: rgb(0.35, 0.4, 0.45) });
    ctx.page.drawText("Faixa", { x: colX[2], y: ctx.y, size: 10, font: ctx.fontBold, color: rgb(0.35, 0.4, 0.45) });
    ctx.page.drawText("T-score", { x: colX[3], y: ctx.y, size: 10, font: ctx.fontBold, color: rgb(0.35, 0.4, 0.45) });
    ctx.y -= 14;

    const sorted = [...factors].sort((a, b) => a.score_scale.localeCompare(b.score_scale, "pt-BR"));

    for (const f of sorted) {
      ensureSpace(ctx, 14);
      const pctl = n(f.percentile);
      const tscore = n(f.t_score);

      ctx.page.drawText(f.score_scale || "—", { x: colX[0], y: ctx.y, size: 10, font: ctx.font, color: rgb(0.15, 0.18, 0.23) });
      ctx.page.drawText(pctl === null ? "—" : pctl.toFixed(1), { x: colX[1], y: ctx.y, size: 10, font: ctx.font, color: rgb(0.15, 0.18, 0.23) });
      ctx.page.drawText(f.band_label || "—", { x: colX[2], y: ctx.y, size: 10, font: ctx.font, color: rgb(0.15, 0.18, 0.23) });
      ctx.page.drawText(tscore === null ? "—" : tscore.toFixed(1), { x: colX[3], y: ctx.y, size: 10, font: ctx.font, color: rgb(0.15, 0.18, 0.23) });

      ctx.y -= 14;
    }

    // páginas por escala
    for (const f of sorted) {
      newPage(ctx);
      h1(ctx, f.score_scale || "Escala");

      const pctl = n(f.percentile);
      const tscore = n(f.t_score);

      p(ctx, `Raw score: ${safeStr(f.raw_score)} (${safeStr(f.n_items_scored)} itens) • Percentil: ${pctl === null ? "—" : pctl.toFixed(1)} • T-score: ${tscore === null ? "—" : tscore.toFixed(1)} • Classificação: ${safeStr(f.band_label) || "—"}`);
      percentBar(ctx, pctl);

      h2(ctx, "Interpretação qualitativa");
      if (f.text_port) p(ctx, String(f.text_port));
      else p(ctx, "Texto qualitativo não disponível para esta escala/faixa.");
    }

    const pdfBytes = await pdf.save();

    // 4) upload no storage
    const storagePath = `${a.athlete_id}/${assessment_id}.pdf`;
    const { error: eUp } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(storagePath, pdfBytes, { upsert: true, contentType: "application/pdf" });
    if (eUp) throw eUp;

    // 5) registrar em assessment_reports
    const { error: eR } = await supabaseAdmin
      .from("assessment_reports")
      .upsert(
        { assessment_id, pdf_path: storagePath, generated_at: new Date().toISOString() },
        { onConflict: "assessment_id" }
      );
    if (eR) throw eR;

    return NextResponse.json({ ok: true, pdf_path: storagePath });
  } catch (e: any) {
    console.log("[/api/report] error", e?.message ?? String(e));
    return NextResponse.json({ ok: false, error: e.message ?? String(e) }, { status: 500 });
  }
}
