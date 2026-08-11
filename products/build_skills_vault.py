"""Build the Skills Vault PDF catalogue.

This module renders a marketing/reference PDF listing the skills offered.
The rendering has been decomposed into small helper functions so each
section (cover, intro, catalogue, closing) can be tested and modified
independently.
"""
from __future__ import annotations

from collections import defaultdict
from pathlib import Path
from typing import Dict, Iterable, List, Sequence

try:
    from reportlab.lib.pagesizes import LETTER
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import inch
    from reportlab.lib import colors
    from reportlab.platypus import (
        SimpleDocTemplate,
        Paragraph,
        Spacer,
        PageBreak,
        Table,
        TableStyle,
    )
except ImportError:  # pragma: no cover - reportlab optional at import time
    SimpleDocTemplate = None  # type: ignore


OUTPUT_PATH = Path(__file__).parent / "dist" / "skills_vault.pdf"


SKILLS: List[Dict[str, str]] = [
    {"category": "Automation", "name": "GitHub Actions Pipelines", "price": "$1,500"},
    {"category": "Automation", "name": "Polar.sh Funding Setup", "price": "$750"},
    {"category": "OSINT", "name": "Threat Intel Dashboards", "price": "$2,500"},
    {"category": "OSINT", "name": "Domain Recon Toolkit", "price": "$1,200"},
    {"category": "Product", "name": "Automated Product Pipeline", "price": "$5,000"},
]


def _group_skills_by_category(skills: Iterable[Dict[str, str]]) -> Dict[str, List[Dict[str, str]]]:
    """Return skills grouped by their ``category`` field, preserving order."""
    grouped: Dict[str, List[Dict[str, str]]] = defaultdict(list)
    for skill in skills:
        grouped[skill["category"]].append(skill)
    return dict(grouped)


def _render_cover(styles) -> List:
    title_style = ParagraphStyle(
        "CoverTitle",
        parent=styles["Title"],
        fontSize=36,
        leading=42,
        alignment=1,
        spaceAfter=24,
    )
    subtitle_style = ParagraphStyle(
        "CoverSubtitle",
        parent=styles["Normal"],
        fontSize=16,
        alignment=1,
        textColor=colors.grey,
    )
    return [
        Spacer(1, 2 * inch),
        Paragraph("Skills Vault", title_style),
        Paragraph("Productized services for scaling from $10k → $10M", subtitle_style),
        PageBreak(),
    ]


def _render_intro(styles) -> List:
    heading = Paragraph("Introduction", styles["Heading1"])
    body = Paragraph(
        "This catalogue lists the productized skills available for engagement. "
        "Each offering is designed to compound revenue toward the $10M goal.",
        styles["BodyText"],
    )
    return [heading, Spacer(1, 0.15 * inch), body, Spacer(1, 0.3 * inch)]


def _render_catalogue_section(
    grouped: Dict[str, List[Dict[str, str]]],
    styles,
    available_width: float,
) -> List:
    story: List = [Paragraph("Catalogue", styles["Heading1"]), Spacer(1, 0.2 * inch)]
    col_widths: Sequence[float] = [available_width * 0.7, available_width * 0.3]

    for category, items in grouped.items():
        story.append(Paragraph(category, styles["Heading2"]))
        data = [["Skill", "Price"]]
        data.extend([[item["name"], item["price"]] for item in items])
        table = Table(data, colWidths=col_widths, hAlign="LEFT")
        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#222222")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("GRID", (0, 0), (-1, -1), 0.25, colors.grey),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.whitesmoke, colors.white]),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 8),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ]
            )
        )
        story.append(table)
        story.append(Spacer(1, 0.25 * inch))

    return story


def _render_closing(styles) -> List:
    return [
        PageBreak(),
        Paragraph("Next Steps", styles["Heading1"]),
        Spacer(1, 0.15 * inch),
        Paragraph(
            "Reach out via Polar.sh or GitHub Sponsors to engage on any listed offering. "
            "Custom bundles are available on request.",
            styles["BodyText"],
        ),
    ]


def render_catalogue(output_path: Path = OUTPUT_PATH) -> Path:
    """Render the Skills Vault PDF and return its path."""
    if SimpleDocTemplate is None:  # pragma: no cover
        raise RuntimeError("reportlab is required to render the Skills Vault PDF")

    output_path.parent.mkdir(parents=True, exist_ok=True)

    doc = SimpleDocTemplate(
        str(output_path),
        pagesize=LETTER,
        leftMargin=0.75 * inch,
        rightMargin=0.75 * inch,
        topMargin=0.75 * inch,
        bottomMargin=0.75 * inch,
        title="Skills Vault",
    )

    styles = getSampleStyleSheet()
    grouped = _group_skills_by_category(SKILLS)

    story: List = []
    story.extend(_render_cover(styles))
    story.extend(_render_intro(styles))
    story.extend(_render_catalogue_section(grouped, styles, doc.width))
    story.extend(_render_closing(styles))

    doc.build(story)
    return output_path


if __name__ == "__main__":  # pragma: no cover
    path = render_catalogue()
    print(f"Skills Vault PDF written to {path}")
