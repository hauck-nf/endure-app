import json, sys
from pathlib import Path
from math import exp, sqrt, pi
import tempfile

from PIL import Image as PILImage

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    PageBreak,
    Flowable,
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont


# ---------- helpers ----------
def normal_pdf(x: float) -> float:
    return (1.0 / sqrt(2 * pi)) * exp(-0.5 * x * x)


def clamp(v, lo, hi):
    return max(lo, min(hi, v))


def classify_p25_p75(p):
    if p is None:
        return "—"
    try:
        p = float(p)
    except Exception:
        return "—"
    if p < 25:
        return "Baixo"
    if p > 75:
        return "Alto"
    return "Médio"


def band_key_from_percentile(p):
    """
    Mapeia percentil para banda:
      <25  -> low
      25-75 -> mid
      >75  -> high
    """
    if p is None:
        return None
    try:
        p = float(p)
    except Exception:
        return None
    if p < 25:
        return "low"
    if p > 75:
        return "high"
    return "mid"


def crop_whitespace_png(src_path: Path, white_thresh: int = 245) -> Path:
    """
    Recorta margens brancas (ou quase brancas) ao redor da imagem.
    Retorna um caminho para um PNG temporário recortado.
    """
    img = PILImage.open(src_path).convert("RGBA")
    w, h = img.size

    def is_bg(px):
        r, g, b, a = px
        if a == 0:
            return True
        return (r >= white_thresh and g >= white_thresh and b >= white_thresh)

    mask = PILImage.new("L", (w, h), 0)
    mask_px = mask.load()

    px = img.load()
    for y in range(h):
        for x in range(w):
            mask_px[x, y] = 255 if not is_bg(px[x, y]) else 0

    bbox = mask.getbbox()
    if not bbox:
        return src_path

    cropped = img.crop(bbox)
    tmp = Path(tempfile.gettempdir()) / f"endure_logo_cropped_{next(tempfile._get_candidate_names())}.png"
    cropped.save(tmp, "PNG")
    return tmp


def make_logo_flowable(logo_path: Path, target_width_cm: float, white_thresh: int = 245):
    """
    Retorna um Flowable Image com logo auto-cortada e escalada para target_width_cm.
    Mantém proporção e evita distorção.
    """
    from reportlab.platypus import Image as RLImage

    cropped_path = crop_whitespace_png(logo_path, white_thresh=white_thresh)

    img = PILImage.open(cropped_path)
    w_px, h_px = img.size
    img.close()

    target_w = target_width_cm * cm
    scale = target_w / float(w_px)
    target_h = float(h_px) * scale

    rl = RLImage(str(cropped_path))
    rl.drawWidth = target_w
    rl.drawHeight = target_h
    return rl


def draw_normal_curve(canvas, x, y, w, h, percentile=None):
    """
    Desenha curva normal padronizada numa caixa (x,y,w,h).
    Percentil marca uma linha vertical aproximada na posição (p/100).
    """
    canvas.saveState()

    # caixa
    canvas.setStrokeColor(colors.HexColor("#E5E7EB"))
    canvas.setLineWidth(1)
    canvas.rect(x, y, w, h, stroke=1, fill=0)

    pad = 10
    ix, iy = x + pad, y + pad
    iw, ih = w - 2 * pad, h - 2 * pad

    xs, ys = [], []
    for i in range(0, 121):
        t = -3 + 6 * (i / 120)
        xs.append(t)
        ys.append(normal_pdf(t))

    ymax = max(ys) if ys else 1.0

    canvas.setStrokeColor(colors.HexColor("#111827"))
    canvas.setLineWidth(2)

    def sx(t):
        return ix + (t + 3) / 6 * iw

    def sy(v):
        return iy + (v / ymax) * ih * 0.95

    path = canvas.beginPath()
    path.moveTo(sx(xs[0]), sy(ys[0]))
    for t, v in zip(xs[1:], ys[1:]):
        path.lineTo(sx(t), sy(v))
    canvas.drawPath(path, stroke=1, fill=0)

    if percentile is not None:
        p = clamp(float(percentile), 0.0, 100.0)
        mx = ix + (p / 100.0) * iw
        canvas.setStrokeColor(colors.HexColor("#6B7280"))
        canvas.setLineWidth(1.5)
        canvas.line(mx, iy, mx, iy + ih)

        canvas.setFillColor(colors.HexColor("#111827"))
        canvas.setFont("DejaVuSans", 9)
        canvas.drawString(mx + 4, iy + ih - 10, "Você está aqui")

    canvas.setFillColor(colors.HexColor("#6B7280"))
    canvas.setFont("DejaVuSans", 8)
    canvas.drawString(x + 10, y + 4, "Percentil")
    canvas.drawRightString(x + w - 10, y + 4, "0–100")

    canvas.restoreState()


def header_footer(canvas, doc, logo_header_path=None):
    w, h = A4
    canvas.saveState()

    # logo pequena no cabeçalho (opcional)
    if logo_header_path:
        img = PILImage.open(logo_header_path)
        w_px, h_px = img.size
        img.close()

        target_w = 2.8 * cm  # <<< ajuste tamanho aqui
        scale = target_w / float(w_px)
        target_h = float(h_px) * scale

        canvas.drawImage(
            str(logo_header_path),
            2.2 * cm,
            h - 1.35 * cm,
            width=target_w,
            height=target_h,
            mask="auto",
        )

    # header minimalista
    canvas.setFillColor(colors.HexColor("#6B7280"))
    canvas.setFont("DejaVuSans", 9)
    canvas.drawString(2.2 * cm + (3.2 * cm), h - 1.2 * cm, "Avaliação socioemocional em atletas")

    canvas.setStrokeColor(colors.HexColor("#E5E7EB"))
    canvas.setLineWidth(1)
    canvas.line(2.2 * cm, h - 1.45 * cm, w - 2.2 * cm, h - 1.45 * cm)

    # footer
    canvas.setFillColor(colors.HexColor("#9CA3AF"))
    canvas.setFont("DejaVuSans", 8.5)
    canvas.drawString(2.2 * cm, 1.1 * cm, "Prof. Dr. Nelson Hauck Filho")
    canvas.drawRightString(w - 2.2 * cm, 1.1 * cm, str(doc.page))

    canvas.restoreState()


# ---------- main ----------
def main():
    if len(sys.argv) < 3:
        print("Usage: python generate_report.py <input_json> <output_pdf>", file=sys.stderr)
        sys.exit(1)

    in_path = Path(sys.argv[1])
    out_path = Path(sys.argv[2])
    payload = json.loads(in_path.read_text(encoding="utf-8"))

    assets_dir = Path(__file__).parent / "assets"
    font_reg = assets_dir / "DejaVuSans.ttf"
    font_bold = assets_dir / "DejaVuSans-Bold.ttf"
    logo_path = assets_dir / "endure_logo.png"

    # fontes com acentuação
    pdfmetrics.registerFont(TTFont("DejaVuSans", str(font_reg)))
    pdfmetrics.registerFont(TTFont("DejaVuSans-Bold", str(font_bold)))

    athlete = payload["athlete"]
    assessment = payload["assessment"]
    scores = payload.get("scores", {}) or {}
    readiness = payload.get("readiness_score", None)

    # textos qualitativos: qual_texts[factor][band] -> texto
    qual_texts = payload.get("qual_texts", {}) or {}

    # tenta fatores primeiro; se não existir, cai em scales
    factors = scores.get("factors", None)
    if factors is None:
        factors = scores.get("scales", {}) or {}

    # prepara logo recortada para o cabeçalho
    logo_header_path = None
    if logo_path.exists():
        logo_header_path = crop_whitespace_png(logo_path, white_thresh=245)

    doc = SimpleDocTemplate(
        str(out_path),
        pagesize=A4,
        leftMargin=2.2 * cm,
        rightMargin=2.2 * cm,
        topMargin=2.0 * cm,
        bottomMargin=1.7 * cm,
        title="ENDURE - Relatório",
        author="Prof. Dr. Nelson Hauck Filho",
    )

    styles = getSampleStyleSheet()

    title = ParagraphStyle(
        "Title",
        parent=styles["Title"],
        fontName="DejaVuSans-Bold",
        fontSize=18,
        textColor=colors.HexColor("#111827"),
        spaceAfter=10,
        alignment=1,  # center
    )

    h2 = ParagraphStyle(
        "H2",
        parent=styles["Heading2"],
        fontName="DejaVuSans-Bold",
        fontSize=12,
        textColor=colors.HexColor("#111827"),
        spaceBefore=10,
        spaceAfter=6,
    )

    body = ParagraphStyle(
        "Body",
        parent=styles["BodyText"],
        fontName="DejaVuSans",
        fontSize=10.5,
        leading=14,
        textColor=colors.HexColor("#111827"),
        alignment=4,  # justify
    )

    subtle = ParagraphStyle(
        "Subtle",
        parent=body,
        textColor=colors.HexColor("#6B7280"),
        fontSize=9.5,
        leading=13,
    )

    story = []

    # ---------- CAPA (premium minimalista) ----------
    if logo_path.exists():
        story.append(Spacer(1, 0.8 * cm))
        story.append(make_logo_flowable(logo_path, target_width_cm=6.0))
        story.append(Spacer(1, 1.0 * cm))

    story.append(Paragraph("Relatório de avaliação socioemocional", title))
    story.append(
        Paragraph(
            "ENDURE — Escalas de Níveis de Desenvolvimento e Utilização de Recursos Emocionais em atletas",
            subtle,
        )
    )
    story.append(Spacer(1, 0.8 * cm))
    story.append(Paragraph("Prof. Dr. Nelson Hauck Filho", subtle))
    story.append(Spacer(1, 1.2 * cm))

    full_name = athlete.get("full_name", "—")
    birth = athlete.get("birth_date") or "—"
    sex = athlete.get("sex") or "—"
    sport = athlete.get("sport_primary") or "—"
    team = athlete.get("team") or "—"
    dt = assessment.get("submitted_at") or assessment.get("created_at") or ""

    story.append(
        Paragraph(
            f"<b>{full_name}</b>",
            ParagraphStyle("Name", parent=body, fontName="DejaVuSans-Bold", fontSize=12),
        )
    )
    story.append(Spacer(1, 0.2 * cm))
    story.append(Paragraph(f"Data de nascimento: {birth} &nbsp;&nbsp;•&nbsp;&nbsp; Sexo: {sex}", subtle))
    story.append(Paragraph(f"Esporte: {sport} &nbsp;&nbsp;•&nbsp;&nbsp; Equipe: {team}", subtle))
    story.append(Spacer(1, 0.6 * cm))
    story.append(
        Paragraph(
            f"Versão: <b>{assessment.get('instrument_version','—')}</b> &nbsp;&nbsp;•&nbsp;&nbsp; Data/hora: {dt}",
            subtle,
        )
    )

    story.append(PageBreak())

    # ---------- VISÃO GERAL ----------
    story.append(Paragraph("Visão geral", h2))
    if readiness is None:
        story.append(Paragraph("Prontidão socioemocional: —", body))
    else:
        story.append(Paragraph(f"Prontidão socioemocional: <b>{float(readiness):.2f}</b>", body))
    story.append(Spacer(1, 0.4 * cm))

    story.append(Paragraph("Resumo de percentis por fator", h2))

    data = [["Fator", "Percentil", "Classificação"]]
    for name in sorted(factors.keys()):
        p = factors[name].get("percentile", None)
        p_txt = "—" if p is None else f"{float(p):.1f}"
        cls = classify_p25_p75(p)
        data.append([name, p_txt, cls])

    t = Table(data, colWidths=[10.0 * cm, 3.0 * cm, 3.0 * cm])
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#FAFAFA")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#111827")),
                ("FONTNAME", (0, 0), (-1, 0), "DejaVuSans-Bold"),
                ("FONTSIZE", (0, 0), (-1, 0), 10),
                ("FONTNAME", (0, 1), (-1, -1), "DejaVuSans"),
                ("FONTSIZE", (0, 1), (-1, -1), 9.5),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E5E7EB")),
                ("ALIGN", (1, 1), (1, -1), "RIGHT"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#FCFCFC")]),
            ]
        )
    )
    story.append(t)
    story.append(PageBreak())

    # ---------- PÁGINA POR FATOR ----------
    class CurveBox(Flowable):
        def __init__(self, percentile):
            super().__init__()
            self.p = percentile
            self.w = 16.0 * cm
            self.h = 4.8 * cm

        def wrap(self, availWidth, availHeight):
            return self.w, self.h

        def draw(self):
            draw_normal_curve(self.canv, 0, 0, self.w, self.h, self.p)

    for name in sorted(factors.keys()):
        obj = factors[name]
        p = obj.get("percentile", None)
        cls = classify_p25_p75(p)

        story.append(Paragraph(name, ParagraphStyle("FactorTitle", parent=h2, fontSize=14)))
        story.append(
            Paragraph(
                f"Percentil: <b>{'—' if p is None else f'{float(p):.1f}'}</b> &nbsp;&nbsp;•&nbsp;&nbsp; Classificação: <b>{cls}</b>",
                body,
            )
        )
        story.append(Spacer(1, 0.2 * cm))

        # texto qualitativo por faixa (low/mid/high)
        band = band_key_from_percentile(p)
        txt = None
        if band:
            txt = (qual_texts.get(name, {}) or {}).get(band, None)

        if not txt:
            txt = "Uma pessoa típica nessa faixa de escore tende a apresentar padrões compatíveis com o nível indicado para este fator."

        story.append(Paragraph(txt, body))
        story.append(Spacer(1, 0.6 * cm))
        story.append(CurveBox(p))
        story.append(PageBreak())

    # build com header/footer + logo no cabeçalho
    doc.build(
        story,
        onFirstPage=lambda c, d: header_footer(c, d, logo_header_path),
        onLaterPages=lambda c, d: header_footer(c, d, logo_header_path),
    )


if __name__ == "__main__":
    main()