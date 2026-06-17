#!/usr/bin/env python3
"""generate_pdf_rl.py — render a sellable PDF from a markdown source via reportlab.

Pure Python, no native deps. Cover via Pillow.

Usage:
    python3 generate_pdf_rl.py \
        --source docs/USDA_LOAN_PACKAGER_DEEP_RESEARCH.md \
        --title "..." --subtitle "..." --author "..." \
        --out path.pdf
"""
import argparse
import os
import re

from PIL import Image, ImageDraw, ImageFont
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.colors import HexColor
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak,
    Image as RLImage, ListFlowable, ListItem, KeepTogether,
)


def wrap_text(text, width_chars):
    words = text.split()
    lines, cur = [], ""
    for w in words:
        if len(cur) + len(w) + 1 <= width_chars:
            cur = (cur + " " + w).strip()
        else:
            if cur:
                lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def make_cover(title, subtitle, author, out_path):
    W, H = 1700, 2200
    img = Image.new("RGB", (W, H), (12, 30, 52))
    draw = ImageDraw.Draw(img)
    for y in range(H):
        t = y / H
        r = int(12 + (40 - 12) * t)
        g = int(30 + (80 - 30) * t)
        b = int(52 + (130 - 52) * t)
        draw.line([(0, y), (W, y)], fill=(r, g, b))
    band_top = (H - 700) // 2 - 200
    draw.rectangle([0, band_top, W, band_top + 700], fill=(255, 255, 255))
    try:
        title_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 90)
        sub_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 42)
        author_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 36)
    except OSError:
        title_font = sub_font = author_font = ImageFont.load_default()
    y = band_top + 100
    for line in wrap_text(title, 22):
        bbox = draw.textbbox((0, 0), line, font=title_font)
        w = bbox[2] - bbox[0]
        draw.text(((W - w) // 2, y), line, fill=(12, 30, 52), font=title_font)
        y += 110
    y += 30
    for line in wrap_text(subtitle, 50):
        bbox = draw.textbbox((0, 0), line, font=sub_font)
        w = bbox[2] - bbox[0]
        draw.text(((W - w) // 2, y), line, fill=(60, 80, 110), font=sub_font)
        y += 60
    author_text = f"BY {author.upper()}"
    bbox = draw.textbbox((0, 0), author_text, font=author_font)
    w = bbox[2] - bbox[0]
    draw.text(((W - w) // 2, H - 220), author_text, fill=(255, 255, 255), font=author_font)
    img.save(out_path, "PNG", optimize=True)


def parse_sections(md_text):
    lines = md_text.splitlines()
    out = []
    cur = {"level": None, "title": None, "body": []}

    def flush():
        if cur["title"]:
            out.append((cur["level"], cur["title"], "\n".join(cur["body"]).strip()))

    for line in lines:
        m = re.match(r"^(#{1,6})\s+(.+?)\s*$", line)
        if m:
            flush()
            cur = {"level": len(m.group(1)), "title": m.group(2).strip(), "body": []}
        else:
            cur["body"].append(line)
    flush()
    # drop first H1 (cover repeats it)
    if out and out[0][0] == 1:
        out = out[1:]
    return out


def clean(s):
    s = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", s)
    s = re.sub(r"\*([^\*]+)\*", r"<i>\1</i>", s)
    s = re.sub(r"`([^`]+)`", r"<font name='Courier'>\1</font>", s)
    s = re.sub(r"\[([^\]]+)\]\(([^\)]+)\)", r'<link href="\2">\1</link>', s)
    return s


def build_pdf(source, title, subtitle, author, out_path):
    cover = out_path.replace(".pdf", "-cover.png")
    make_cover(title, subtitle, author, cover)

    with open(source) as f:
        md = f.read()
    sections = parse_sections(md)

    doc = SimpleDocTemplate(
        out_path, pagesize=LETTER,
        leftMargin=0.85*inch, rightMargin=0.85*inch,
        topMargin=0.85*inch, bottomMargin=0.85*inch,
        title=title, author=author,
    )
    styles = getSampleStyleSheet()
    style_h1 = ParagraphStyle("H1", parent=styles["Heading1"],
        fontSize=22, leading=26, textColor=HexColor("#0c1e34"), spaceAfter=12)
    style_h2 = ParagraphStyle("H2", parent=styles["Heading2"],
        fontSize=16, leading=20, textColor=HexColor("#0c1e34"), spaceAfter=10)
    style_h3 = ParagraphStyle("H3", parent=styles["Heading3"],
        fontSize=13, leading=17, textColor=HexColor("#284064"), spaceAfter=8)
    style_body = ParagraphStyle("Body", parent=styles["BodyText"],
        fontSize=11, leading=15, alignment=TA_JUSTIFY, spaceAfter=8, textColor=HexColor("#1e1e1e"))
    style_bullet = ParagraphStyle("Bullet", parent=style_body, leftIndent=18, spaceAfter=4)
    style_quote = ParagraphStyle("Quote", parent=style_body,
        leftIndent=20, rightIndent=20, fontName="Helvetica-Oblique",
        textColor=HexColor("#505064"), spaceAfter=8)
    style_toc_h1 = ParagraphStyle("TOCH1", parent=style_body, fontSize=12, leading=16,
        textColor=HexColor("#0c1e34"), spaceAfter=4)
    style_toc_h2 = ParagraphStyle("TOCH2", parent=style_body, fontSize=11, leading=15,
        leftIndent=14, textColor=HexColor("#283848"), spaceAfter=2)

    story = []
    # Cover — fit within the printable frame (page minus margins)
    # ~5% breathing room inside the printable frame
    cover_w = (8.5*inch - doc.leftMargin - doc.rightMargin) * 0.93
    cover_h = (11*inch - doc.topMargin - doc.bottomMargin) * 0.93
    cover_img = RLImage(cover, width=cover_w, height=cover_h)
    story.append(cover_img)
    story.append(PageBreak())

    # TOC
    story.append(Paragraph("Table of Contents", style_h1))
    story.append(Spacer(1, 8))
    for level, t, _ in sections:
        if level == 1:
            story.append(Paragraph(t, style_toc_h1))
        elif level == 2:
            story.append(Paragraph(t, style_toc_h2))
    story.append(PageBreak())

    # Body
    for level, t, body in sections:
        if level == 1:
            story.append(Paragraph(t, style_h1))
        elif level == 2:
            story.append(Paragraph(t, style_h2))
        else:
            story.append(Paragraph(t, style_h3))
        if not body:
            continue
        paragraphs = re.split(r"\n\s*\n", body)
        for para in paragraphs:
            p = para.strip()
            if not p:
                continue
            first = p.splitlines()[0].strip()
            if re.match(r"^[\*\-]\s", first):
                items = []
                for ln in p.splitlines():
                    m = re.match(r"^[\*\-]\s+(.*)$", ln.strip())
                    if m:
                        items.append(ListItem(Paragraph(clean(m.group(1)), style_body)))
                if items:
                    story.append(ListFlowable(items, bulletType="bullet", leftIndent=18, spaceBefore=4, spaceAfter=8))
            elif first.startswith(">"):
                qtxt = "<br/>".join(clean(ln.lstrip("> ").strip()) for ln in p.splitlines())
                story.append(Paragraph(qtxt, style_quote))
            elif first.startswith("|"):
                # Render table rows as plain bullet-less lines
                for ln in p.splitlines():
                    if re.match(r"^\|\s*-+", ln):
                        continue
                    cells = [c.strip() for c in ln.strip().strip("|").split("|") if c.strip()]
                    if cells:
                        story.append(Paragraph(" · ".join(clean(c) for c in cells), style_body))
            else:
                story.append(Paragraph(clean(p.replace("\n", " ")), style_body))

    doc.build(story)
    print(f"OK {out_path} ({os.path.getsize(out_path)//1024} KB) cover {cover}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--source", required=True)
    ap.add_argument("--title", required=True)
    ap.add_argument("--subtitle", required=True)
    ap.add_argument("--author", required=True)
    ap.add_argument("--out", required=True)
    a = ap.parse_args()
    build_pdf(a.source, a.title, a.subtitle, a.author, a.out)
