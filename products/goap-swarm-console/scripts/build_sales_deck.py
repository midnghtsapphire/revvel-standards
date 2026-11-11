"""Build the sales PDF from sales/slides.json.

Requires reportlab. Run from any directory; optionally pass an output PDF path.
The default is public/goap-agent-sales-deck.pdf, so Next serves the deliverable.

2026-11-11 MarketShipper, WR #18334: the slide list is sales/deck.md, written
to sales/slides.json for the Next page. This script draws that JSON. The deck
must stay between 10 and 15 slides. The previous scraper, which read ["..."]
lines from the TSX page and required exactly 12, is commented in load_slides().
Restoring it makes the PDF drift from deck.md as soon as the TSX array moves.
"""
import json
from pathlib import Path
import re
import sys
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfgen.canvas import Canvas
from reportlab.platypus import Paragraph

ROOT = Path(__file__).resolve().parents[1]
# SOURCE = ROOT / "app/agent-as-fte/deck/page.tsx"  # retired 2026-11-11; see load_slides
OUTPUT = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "public/goap-agent-sales-deck.pdf"


def load_slides():
    # 2026-11-10 Codex extractor, retired in place (do not run it):
    # slides = [json.loads(line.strip().rstrip(",")) for line in SOURCE.read_text(encoding="utf-8").splitlines()
    #           if line.strip().startswith('["')]
    # if len(slides) != 12 or any(len(slide) != 3 for slide in slides):
    #     raise ValueError("Expected exactly twelve complete title/subtitle/body slides")
    payload = json.loads((ROOT / "sales/slides.json").read_text(encoding="utf-8"))
    if not isinstance(payload, list) or not 10 <= len(payload) <= 15:
        raise ValueError("sales/slides.json must contain 10 to 15 slides")
    slides = []
    for item in payload:
        if (not isinstance(item, list) or len(item) != 3
                or not all(isinstance(part, str) and part.strip() for part in item)):
            raise ValueError("each slide must be three non-empty strings")
        slides.append(item)
    return slides


def pdf_page_count(data):
    # Count page objects. The parent node is /Type /Pages and must not count.
    return len(re.findall(br"/Type\s*/Page(?!s)", data))


def normalized(text):
    # Helvetica's base-14 glyphs do not cover every browser punctuation mark.
    return text.replace("–", "-").replace("—", "-").replace("→", " / ")


def build():
    slides = load_slides()
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    canvas = Canvas(str(OUTPUT), pagesize=(960, 540), pageCompression=1)
    canvas.setTitle("REVVEL GOAP Agent Operations - Sales Deck")
    canvas.setAuthor("REVVEL / Audrey Evans")
    for number, (title, subtitle, body) in enumerate(slides, 1):
        canvas.setFillColor(colors.HexColor("#071323"))
        canvas.rect(0, 0, 960, 540, fill=1, stroke=0)
        canvas.setFillColor(colors.HexColor("#67E8F9"))
        canvas.rect(52, 435, 5, 55, fill=1, stroke=0)
        canvas.setFont("Helvetica-Bold", 11)
        canvas.drawString(76, 475, "REVVEL  /  GOAP AGENT OPERATIONS")
        y = 422
        for text, size, color, spacing in [
            (title, 32, "#F8FAFC", 30),
            (subtitle, 21, "#67E8F9", 24),
            (body, 19, "#CBD5E1", 0),
        ]:
            paragraph = Paragraph(escape(normalized(text)), ParagraphStyle(
                "slide", fontName="Helvetica-Bold" if size == 32 else "Helvetica",
                fontSize=size, leading=size * 1.35, textColor=colors.HexColor(color)))
            _, height = paragraph.wrap(800, 400)
            if y - height < 90:
                raise ValueError(f"Slide {number} exceeds its safe text area")
            paragraph.drawOn(canvas, 76, y - height)
            y -= height + spacing
        canvas.setStrokeColor(colors.HexColor("#294059"))
        canvas.line(76, 63, 876, 63)
        canvas.setFillColor(colors.HexColor("#94A3B8"))
        canvas.setFont("Helvetica", 10)
        canvas.drawString(76, 40, "Pilot proposal  /  Assumptions require validation  /  November 2026")
        canvas.drawRightString(876, 40, f"{number:02d} / {len(slides):02d}")
        canvas.showPage()
    canvas.save()
    count = pdf_page_count(OUTPUT.read_bytes())
    if count != len(slides):
        raise ValueError(f"PDF has {count} pages for {len(slides)} slides")
    print(f"{OUTPUT} pages={count}")


if __name__ == "__main__":
    build()
