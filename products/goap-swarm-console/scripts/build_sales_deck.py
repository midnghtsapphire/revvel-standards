"""Build the 12-slide PDF from the same copy used by the sales deck route.

Requires reportlab. Run from any directory; optionally pass an output PDF path.
The default is public/goap-agent-sales-deck.pdf, so Next serves the deliverable.
"""
import json
from pathlib import Path
import sys
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfgen.canvas import Canvas
from reportlab.platypus import Paragraph

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "app/agent-as-fte/deck/page.tsx"
OUTPUT = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "public/goap-agent-sales-deck.pdf"


def normalized(text):
    # Helvetica's base-14 glyphs do not cover every browser punctuation mark.
    return text.replace("–", "-").replace("—", "-").replace("→", " / ")


def build():
    slides = [json.loads(line.strip().rstrip(",")) for line in SOURCE.read_text(encoding="utf-8").splitlines()
              if line.strip().startswith('["')]
    if len(slides) != 12 or any(len(slide) != 3 for slide in slides):
        raise ValueError("Expected exactly twelve complete title/subtitle/body slides")
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
        canvas.drawRightString(876, 40, f"{number:02d} / 12")
        canvas.showPage()
    canvas.save()
    print(OUTPUT)


if __name__ == "__main__":
    build()
