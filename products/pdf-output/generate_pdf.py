#!/usr/bin/env python3
"""
generate_pdf.py — render a sellable PDF from a markdown source.

Usage:
    python3 generate_pdf.py \
        --source docs/USDA_LOAN_PACKAGER_DEEP_RESEARCH.md \
        --title "The Rural Homebuyer's USDA Loan Playbook" \
        --subtitle "How to get 100% financing on a home — and the eligibility rules nobody tells you" \
        --author "Audrey Evans" \
        --out products/pdf-output/usda-playbook.pdf

Builds a cover page, TOC, and rendered body. No LaTeX, no external services —
pure Python via fpdf2 + Pillow. Runs in seconds.
"""
import argparse
import os
import re
from fpdf import FPDF
from PIL import Image, ImageDraw, ImageFont


def make_cover(title, subtitle, author, out_path):
    """Generate an 8.5x11 cover image — gradient + white type."""
    W, H = 1700, 2200
    img = Image.new("RGB", (W, H), (12, 30, 52))
    draw = ImageDraw.Draw(img)
    # Vertical gradient
    for y in range(H):
        t = y / H
        r = int(12 + (40 - 12) * t)
        g = int(30 + (80 - 30) * t)
        b = int(52 + (130 - 52) * t)
        draw.line([(0, y), (W, y)], fill=(r, g, b))
    # Title block band
    band_h = 700
    band_top = (H - band_h) // 2 - 200
    draw.rectangle([0, band_top, W, band_top + band_h], fill=(255, 255, 255, 240))
    # Fonts — DejaVu ships with fpdf2's deps OR PIL default
    try:
        title_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 90)
        sub_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 42)
        author_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 36)
    except OSError:
        title_font = ImageFont.load_default()
        sub_font = ImageFont.load_default()
        author_font = ImageFont.load_default()
    # Wrap title to 2 lines
    title_lines = wrap_text(title, 22)
    y = band_top + 100
    for line in title_lines:
        bbox = draw.textbbox((0, 0), line, font=title_font)
        w = bbox[2] - bbox[0]
        draw.text(((W - w) // 2, y), line, fill=(12, 30, 52), font=title_font)
        y += 110
    # Subtitle
    y += 30
    sub_lines = wrap_text(subtitle, 50)
    for line in sub_lines:
        bbox = draw.textbbox((0, 0), line, font=sub_font)
        w = bbox[2] - bbox[0]
        draw.text(((W - w) // 2, y), line, fill=(60, 80, 110), font=sub_font)
        y += 60
    # Author at bottom
    author_text = f"BY {author.upper()}"
    bbox = draw.textbbox((0, 0), author_text, font=author_font)
    w = bbox[2] - bbox[0]
    draw.text(((W - w) // 2, H - 220), author_text, fill=(255, 255, 255), font=author_font)
    img.save(out_path, "PNG", optimize=True)


def wrap_text(text, width_chars):
    words = text.split()
    lines = []
    cur = ""
    for word in words:
        if len(cur) + len(word) + 1 <= width_chars:
            cur = (cur + " " + word).strip()
        else:
            if cur:
                lines.append(cur)
            cur = word
    if cur:
        lines.append(cur)
    return lines


class PDF(FPDF):
    def __init__(self, title, author):
        super().__init__(orientation="P", unit="mm", format="Letter")
        self.title_str = title
        self.author_str = author
        self.set_margins(20, 22, 20)
        self.set_auto_page_break(auto=True, margin=22)

    def header(self):
        if self.page_no() <= 2:
            return  # no header on cover/TOC
        self.set_y(8)
        self.set_font("Helvetica", "", 9)
        self.set_text_color(120, 120, 120)
        self.cell(0, 5, self.title_str, 0, 0, "L")
        self.cell(0, 5, f"p. {self.page_no()}", 0, 1, "R")

    def footer(self):
        if self.page_no() <= 1:
            return
        self.set_y(-15)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(150, 150, 150)
        self.cell(0, 5, f"© {self.author_str} — for personal use only", 0, 0, "C")


def parse_markdown_sections(md_text):
    """Split markdown into ordered sections by heading.

    Returns a list of (level, title, body_lines) tuples.
    Drops the file-level H1 (we use the cover for that).
    """
    lines = md_text.splitlines()
    sections = []
    cur_level = None
    cur_title = None
    cur_body = []

    def flush():
        if cur_title is not None:
            sections.append((cur_level, cur_title, "\n".join(cur_body).strip()))

    for line in lines:
        m = re.match(r"^(#{1,6})\s+(.+?)\s*$", line)
        if m:
            flush()
            cur_body = []
            cur_level = len(m.group(1))
            cur_title = m.group(2).strip()
        else:
            cur_body.append(line)
    flush()
    # Drop first H1 (it's the title repeated)
    if sections and sections[0][0] == 1:
        sections = sections[1:]
    return sections


def render_body(pdf, sections):
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 22)
    pdf.set_text_color(12, 30, 52)
    pdf.cell(0, 14, "Table of Contents", 0, 1, "L")
    pdf.ln(4)
    pdf.set_font("Helvetica", "", 11)
    pdf.set_text_color(40, 40, 40)
    # Only level <=2 in TOC
    for level, title, _ in sections:
        if level == 1 or level == 2:
            indent = "  " * (level - 1)
            pdf.cell(0, 7, f"{indent}{title}", 0, 1, "L")

    # Body
    for level, title, body in sections:
        if level == 1 or level == 2:
            pdf.add_page()
            pdf.set_font("Helvetica", "B", 20 if level == 1 else 16)
            pdf.set_text_color(12, 30, 52)
            pdf.multi_cell(0, 10, title, 0, "L")
            pdf.ln(4)
        else:
            pdf.set_font("Helvetica", "B", 13)
            pdf.set_text_color(40, 60, 100)
            pdf.multi_cell(0, 7, title, 0, "L")
            pdf.ln(2)
        if body:
            render_body_text(pdf, body)


def render_body_text(pdf, text):
    """Render paragraphs / lists / quotes from markdown body."""
    pdf.set_text_color(30, 30, 30)
    paragraphs = re.split(r"\n\s*\n", text)
    for para in paragraphs:
        para = para.strip()
        if not para:
            continue
        # Bullet list
        if re.match(r"^[\*\-]\s", para.splitlines()[0]):
            pdf.set_font("Helvetica", "", 11)
            for ln in para.splitlines():
                m = re.match(r"^[\*\-]\s+(.*)$", ln.strip())
                if m:
                    item = clean_md(m.group(1))
                    pdf.set_x(pdf.l_margin + 4)
                    pdf.cell(5, 6, chr(149), 0, 0)
                    pdf.multi_cell(0, 6, item, 0, "L")
            pdf.ln(2)
        elif para.startswith(">"):
            # Blockquote
            pdf.set_font("Helvetica", "I", 11)
            pdf.set_text_color(80, 80, 100)
            for ln in para.splitlines():
                pdf.multi_cell(0, 6, clean_md(ln.lstrip("> ")), 0, "L")
            pdf.set_text_color(30, 30, 30)
            pdf.ln(2)
        elif para.startswith("|"):
            # Table — render simply, no fancy borders
            pdf.set_font("Helvetica", "", 9)
            for ln in para.splitlines():
                if re.match(r"^\|\s*-+", ln):
                    continue
                row = [c.strip() for c in ln.strip().strip("|").split("|")]
                pdf.multi_cell(0, 5, "  ·  ".join(c for c in row if c), 0, "L")
            pdf.ln(2)
        else:
            pdf.set_font("Helvetica", "", 11)
            pdf.multi_cell(0, 6, clean_md(para), 0, "J")
            pdf.ln(2)


def clean_md(s):
    s = re.sub(r"\*\*(.+?)\*\*", r"\1", s)  # bold
    s = re.sub(r"\*(.+?)\*", r"\1", s)  # italic
    s = re.sub(r"`([^`]+)`", r"\1", s)  # inline code
    s = re.sub(r"\[([^\]]+)\]\([^\)]+\)", r"\1", s)  # links
    # fpdf doesn't like some unicode; replace common ones
    s = (
        s.replace("—", "-")
        .replace("–", "-")
        .replace("‘", "'")
        .replace("’", "'")
        .replace("“", '"')
        .replace("”", '"')
        .replace(" ", " ")
        .replace("…", "...")
    )
    # Strip remaining non-Latin-1
    return s.encode("latin-1", errors="replace").decode("latin-1")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--source", required=True, help="Markdown source file")
    ap.add_argument("--title", required=True)
    ap.add_argument("--subtitle", required=True)
    ap.add_argument("--author", required=True)
    ap.add_argument("--out", required=True, help="Output PDF path")
    args = ap.parse_args()

    cover_path = args.out.replace(".pdf", "-cover.png")
    make_cover(args.title, args.subtitle, args.author, cover_path)

    with open(args.source) as f:
        md = f.read()
    sections = parse_markdown_sections(md)

    pdf = PDF(args.title, args.author)
    # Cover page
    pdf.add_page()
    pdf.image(cover_path, x=0, y=0, w=215.9, h=279.4)

    render_body(pdf, sections)

    pdf.output(args.out)
    size_kb = os.path.getsize(args.out) // 1024
    print(f"✓ wrote {args.out} ({size_kb} KB)")
    print(f"✓ cover {cover_path}")


if __name__ == "__main__":
    main()
