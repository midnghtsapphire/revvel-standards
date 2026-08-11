"""Build the Skills Vault PDF catalogue.

This module renders a marketing/reference PDF catalogue of monetizable skills.
The rendering logic is decomposed into small, single-responsibility helper
functions so each section (cover, intro, catalogue, closing) can be tested,
modified, or reused independently.

Part of the $10k/month → $10M pipeline: this catalogue seeds Polar.sh product
listings and OSINT/automation offers.
"""
from __future__ import annotations

from collections import defaultdict
from pathlib import Path
from typing import Dict, List, Tuple

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
except ImportError:  # pragma: no cover - reportlab is an optional runtime dep
    colors = None  # type: ignore
    LETTER = (612, 792)  # type: ignore


OUTPUT_PATH = Path(__file__).parent / "skills_vault.pdf"


# Catalogue data — each skill entry: (name, category, monthly_potential, description)
SKILLS: List[Tuple[str, str, str, str]] = [
    ("Polar.sh Setup", "Monetization", "$500-$2k", "Configure GitHub sponsorship + product tiers."),
    ("OSINT Report", "Intelligence", "$1k-$5k", "Structured open-source intel briefings."),
    ("Automation Pipeline", "Engineering", "$2k-$10k", "End-to-end product delivery automation."),
    ("Lead Enrichment", "Intelligence", "$500-$3k", "Enrich CRM records with public data."),
    ("Landing Page", "Marketing", "$300-$1.5k", "High-converting single-page site."),
    ("Email Sequence", "Marketing", "$400-$2k", "5-7 email nurture flow."),
    ("API Integration", "Engineering", "$1k-$5k", "Connect SaaS tools via API."),
    ("Data Scraping", "Engineering", "$500-$3k", "Ethical web scraping pipelines."),
]


def _group_skills_by_category(
    skills: List[Tuple[str, str, str, str]],
) -> Dict[str, List[Tuple[str, str, str, str]]]:
    """Group skill tuples by their category (second element)."""
    grouped: Dict[str, List[Tuple[str, str, str, str]]] = defaultdict(list)
    for entry in skills:
        grouped[entry[1]].append(entry)
    return grouped


def _render_cover(styles) -> list:
    """Render the cover page flowables."""
    title_style = ParagraphStyle(
        "CoverTitle",
        parent=styles["Title"],
        fontSize=32,
        leading=38,
        alignment=1,
    )
    subtitle_style = ParagraphStyle(
        "CoverSubtitle",
        parent=styles["Normal"],
        fontSize=14,
        alignment=1,
        textColor=colors.grey if colors else None,
    )
    return [
        Spacer(1, 2 * inch),
        Paragraph("Skills Vault", title_style),
        Spacer(1, 0.3 * inch),
        Paragraph("Monetizable Skills Catalogue — $10k/mo → $10M", subtitle_style),
        PageBreak(),
    ]


def _render_intro(styles) -> list:
    """Render the introduction section flowables."""
    body = (
        "This catalogue lists productized skills you can offer today. "
        "Each entry maps to a Polar.sh tier or a standalone deliverable. "
        "Start with the highest-margin offers and layer automation to scale."
    )
    return [
        Paragraph("Introduction", styles["Heading1"]),
        Spacer(1, 0.15 * inch),
        Paragraph(body, styles["BodyText"]),
        Spacer(1, 0.3 * inch),
    ]


def _render_catalogue_section(
    styles,
    grouped: Dict[str, List[Tuple[str, str, str, str]]],
    available_width: float,
) -> list:
    """Render the categorized catalogue tables."""
    flowables: list = [Paragraph("Catalogue", styles["Heading1"]), Spacer(1, 0.2 * inch)]

    for category in sorted(grouped):
        flowables.append(Paragraph(category, styles["Heading2"]))
        flowables.append(Spacer(1, 0.1 * inch))

        rows = [["Skill", "Monthly Potential", "Description"]]
        for name, _cat, potential, desc in grouped[category]:
            rows.append([name, potential, desc])

        col_widths = [
            available_width * 0.25,
            available_width * 0.20,
            available_width * 0.55,
        ]
        table = Table(rows, colWidths=col_widths, repeatRows=1)
        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#222222")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, -1), 9),
                    ("BOTTOMPADDING", (0, 0), (-1, 0), 8),
                    ("GRID", (0, 0), (-1, -1), 0.25, colors.grey),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.whitesmoke, colors.white]),
                ]
            )
        )
        flowables.append(table)
        flowables.append(Spacer(1, 0.25 * inch))

    return flowables


def _render_closing(styles) -> list:
    """Render the closing / call-to-action section."""
    cta = (
        "Next step: pick one skill, publish it as a Polar.sh product this week, "
        "and route inbound leads through an automated intake form. "
        "Compound weekly — that is the path to $10M."
    )
    return [
        PageBreak(),
        Paragraph("Next Steps", styles["Heading1"]),
        Spacer(1, 0.15 * inch),
        Paragraph(cta, styles["BodyText"]),
    ]


def render_catalogue(output_path: Path = OUTPUT_PATH) -> Path:
    """Render the full Skills Vault PDF to ``output_path``.

    Composes the document from small helper functions, one per section.
    Returns the path to the generated PDF.
    """
    if colors is None:  # pragma: no cover
        raise RuntimeError("reportlab is required to render the catalogue PDF.")

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

    story: list = []
    story.extend(_render_cover(styles))
    story.extend(_render_intro(styles))
    story.extend(_render_catalogue_section(styles, grouped, doc.width))
    story.extend(_render_closing(styles))

    doc.build(story)
    return output_path


if __name__ == "__main__":  # pragma: no cover
    path = render_catalogue()
    print(f"Wrote {path}")
