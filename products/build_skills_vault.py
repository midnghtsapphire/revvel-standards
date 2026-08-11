"""Build the Skills Vault PDF catalogue.

This module generates a PDF catalogue of skills, decomposed into small
helper functions for readability and testability.
"""
from __future__ import annotations

from collections import defaultdict
from pathlib import Path
from typing import Dict, Iterable, List, Tuple

try:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import LETTER
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import inch
    from reportlab.platypus import (
        SimpleDocTemplate,
        Paragraph,
        Spacer,
        PageBreak,
        Table,
        TableStyle,
    )
except ImportError:  # pragma: no cover - reportlab optional at import time
    colors = None  # type: ignore
    LETTER = None  # type: ignore
    getSampleStyleSheet = None  # type: ignore
    ParagraphStyle = None  # type: ignore
    inch = 72  # type: ignore
    SimpleDocTemplate = None  # type: ignore
    Paragraph = None  # type: ignore
    Spacer = None  # type: ignore
    PageBreak = None  # type: ignore
    Table = None  # type: ignore
    TableStyle = None  # type: ignore


SKILLS: List[Dict[str, str]] = [
    {
        "category": "OSINT",
        "name": "Domain Recon",
        "description": "Enumerate subdomains, DNS records, and exposed infrastructure.",
        "price": "$149",
    },
    {
        "category": "OSINT",
        "name": "Breach Data Search",
        "description": "Search leaked credentials across curated breach datasets.",
        "price": "$199",
    },
    {
        "category": "Automation",
        "name": "Product Pipeline Bot",
        "description": "Automated pipeline for shipping digital products end-to-end.",
        "price": "$299",
    },
    {
        "category": "Funding",
        "name": "Polar.sh Setup",
        "description": "Configure Polar.sh funding and tiers for GitHub projects.",
        "price": "$99",
    },
]


def _group_skills_by_category(
    skills: Iterable[Dict[str, str]],
) -> Dict[str, List[Dict[str, str]]]:
    """Group a flat list of skills by their category."""
    grouped: Dict[str, List[Dict[str, str]]] = defaultdict(list)
    for skill in skills:
        grouped[skill["category"]].append(skill)
    return dict(grouped)


def _styles():
    styles = getSampleStyleSheet()
    styles.add(
        ParagraphStyle(
            name="CoverTitle",
            fontName="Helvetica-Bold",
            fontSize=32,
            leading=38,
            alignment=1,
            spaceAfter=24,
        )
    )
    styles.add(
        ParagraphStyle(
            name="CoverSubtitle",
            fontName="Helvetica",
            fontSize=16,
            leading=20,
            alignment=1,
            textColor=colors.grey,
        )
    )
    styles.add(
        ParagraphStyle(
            name="SectionHeader",
            fontName="Helvetica-Bold",
            fontSize=20,
            leading=24,
            spaceBefore=12,
            spaceAfter=12,
            textColor=colors.HexColor("#1a1a2e"),
        )
    )
    return styles


def _render_cover(styles) -> List:
    return [
        Spacer(1, 2 * inch),
        Paragraph("Skills Vault", styles["CoverTitle"]),
        Paragraph(
            "OSINT · Automation · Funding · $10k → $10M",
            styles["CoverSubtitle"],
        ),
        PageBreak(),
    ]


def _render_intro(styles) -> List:
    intro = (
        "Welcome to the Skills Vault — a curated catalogue of high-leverage "
        "skills designed to move you from $10k/month to $10M in three years. "
        "Each skill is a productised offer you can deploy immediately."
    )
    return [
        Paragraph("Introduction", styles["SectionHeader"]),
        Paragraph(intro, styles["BodyText"]),
        Spacer(1, 0.3 * inch),
    ]


def _render_catalogue_section(
    grouped: Dict[str, List[Dict[str, str]]],
    styles,
    doc_width: float,
) -> List:
    story: List = [Paragraph("Catalogue", styles["SectionHeader"])]
    for category, items in grouped.items():
        story.append(Paragraph(category, styles["Heading2"]))
        rows: List[Tuple[str, str, str]] = [("Skill", "Description", "Price")]
        for item in items:
            rows.append((item["name"], item["description"], item["price"]))
        table = Table(
            rows,
            colWidths=[doc_width * 0.25, doc_width * 0.55, doc_width * 0.2],
        )
        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1a1a2e")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.whitesmoke, colors.white]),
                ]
            )
        )
        story.append(table)
        story.append(Spacer(1, 0.25 * inch))
    return story


def _render_closing(styles) -> List:
    closing = (
        "Deploy one skill this week. Compound weekly. Reach $10k/month within "
        "six months and scale toward $10M within three years."
    )
    return [
        PageBreak(),
        Paragraph("Next Steps", styles["SectionHeader"]),
        Paragraph(closing, styles["BodyText"]),
    ]


def render_catalogue(
    output_path: str | Path = "skills_vault.pdf",
    skills: Iterable[Dict[str, str]] | None = None,
) -> Path:
    """Render the Skills Vault catalogue to a PDF file.

    Composes the document from small helpers:
    - :func:`_group_skills_by_category`
    - :func:`_render_cover`
    - :func:`_render_intro`
    - :func:`_render_catalogue_section`
    - :func:`_render_closing`
    """
    if SimpleDocTemplate is None:
        raise RuntimeError(
            "reportlab is required to render the catalogue. "
            "Install it via `pip install reportlab`."
        )

    output_path = Path(output_path)
    skills = list(skills) if skills is not None else SKILLS
    grouped = _group_skills_by_category(skills)

    doc = SimpleDocTemplate(
        str(output_path),
        pagesize=LETTER,
        leftMargin=0.75 * inch,
        rightMargin=0.75 * inch,
        topMargin=0.75 * inch,
        bottomMargin=0.75 * inch,
        title="Skills Vault",
    )
    styles = _styles()

    story: List = []
    story.extend(_render_cover(styles))
    story.extend(_render_intro(styles))
    story.extend(_render_catalogue_section(grouped, styles, doc.width))
    story.extend(_render_closing(styles))

    doc.build(story)
    return output_path


if __name__ == "__main__":  # pragma: no cover
    path = render_catalogue()
    print(f"Wrote {path}")
