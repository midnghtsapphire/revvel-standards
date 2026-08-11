"""Build the Skills Vault catalogue PDF.

This module renders a marketing PDF that lists the skills available in the
Skills Vault product. The rendering logic is decomposed into small helper
functions so each section (cover, intro, catalogue, closing) can be tested
and modified independently.
"""
from __future__ import annotations

import os
from collections import defaultdict
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
        Table,
        TableStyle,
        PageBreak,
    )
except ImportError:  # pragma: no cover - reportlab is an optional dep
    colors = None  # type: ignore
    LETTER = (612.0, 792.0)  # type: ignore


# ---------------------------------------------------------------------------
# Data
# ---------------------------------------------------------------------------
SKILLS: List[Tuple[str, str, str]] = [
    ("OSINT", "Recon Automation", "Automated reconnaissance workflows for target discovery."),
    ("OSINT", "Breach Data Analysis", "Correlate leaked credentials with active assets."),
    ("OSINT", "Social Graph Mapping", "Map relationships across public social platforms."),
    ("Automation", "Pipeline Orchestration", "End-to-end product pipeline automation."),
    ("Automation", "Polar.sh Integration", "Monetize GitHub projects via Polar.sh funding."),
    ("Automation", "Issue-to-PR Agents", "Auto-resolve issues with LLM coding agents."),
    ("Revenue", "Tiered Pricing", "Design tiered offers to hit $10k → $100k/mo."),
    ("Revenue", "Sponsorship Funnels", "Convert GitHub stars into recurring sponsors."),
]

OUTPUT_PATH = os.path.join(os.path.dirname(__file__), "skills_vault_catalogue.pdf")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _group_skills_by_category(
    skills: Iterable[Tuple[str, str, str]],
) -> Dict[str, List[Tuple[str, str]]]:
    """Group ``(category, name, description)`` tuples by category."""
    grouped: Dict[str, List[Tuple[str, str]]] = defaultdict(list)
    for category, name, description in skills:
        grouped[category].append((name, description))
    return grouped


def _render_cover(styles) -> list:
    """Return flowables for the cover page."""
    title_style = ParagraphStyle(
        "CoverTitle",
        parent=styles["Title"],
        fontSize=32,
        leading=38,
        alignment=1,
        spaceAfter=24,
    )
    subtitle_style = ParagraphStyle(
        "CoverSubtitle",
        parent=styles["Normal"],
        fontSize=14,
        leading=18,
        alignment=1,
        textColor=colors.grey if colors else None,
    )
    return [
        Spacer(1, 2 * inch),
        Paragraph("The Skills Vault", title_style),
        Paragraph(
            "A curated catalogue of automation, OSINT, and revenue skills.",
            subtitle_style,
        ),
        PageBreak(),
    ]


def _render_intro(styles) -> list:
    """Return flowables for the introduction section."""
    heading = Paragraph("Why the Skills Vault?", styles["Heading1"])
    body = Paragraph(
        "The Skills Vault packages battle-tested playbooks for scaling a "
        "solo operator from $10k/month to $10M in three years. Every skill "
        "is production-ready and pipeline-friendly.",
        styles["BodyText"],
    )
    return [heading, Spacer(1, 0.15 * inch), body, Spacer(1, 0.4 * inch)]


def _render_catalogue_section(
    styles,
    grouped: Dict[str, List[Tuple[str, str]]],
    doc_width: float,
) -> list:
    """Return flowables for the catalogue tables, one per category."""
    story: list = [Paragraph("Catalogue", styles["Heading1"]), Spacer(1, 0.2 * inch)]
    for category, entries in grouped.items():
        story.append(Paragraph(category, styles["Heading2"]))
        data = [["Skill", "Description"]] + [[name, desc] for name, desc in entries]
        table = Table(data, colWidths=[doc_width * 0.3, doc_width * 0.7])
        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1f2937")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("GRID", (0, 0), (-1, -1), 0.25, colors.grey),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.whitesmoke, colors.white]),
                ]
            )
        )
        story.extend([table, Spacer(1, 0.3 * inch)])
    return story


def _render_closing(styles) -> list:
    """Return flowables for the closing call-to-action."""
    cta_style = ParagraphStyle(
        "CTA",
        parent=styles["Heading2"],
        alignment=1,
        textColor=colors.HexColor("#1f2937") if colors else None,
    )
    return [
        PageBreak(),
        Spacer(1, 2 * inch),
        Paragraph("Ready to unlock the vault?", cta_style),
        Spacer(1, 0.2 * inch),
        Paragraph(
            "Sponsor on Polar.sh to get instant access.",
            ParagraphStyle("CTABody", parent=styles["Normal"], alignment=1),
        ),
    ]


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------
def render_catalogue(output_path: str = OUTPUT_PATH) -> str:
    """Render the Skills Vault catalogue PDF to ``output_path``.

    The function composes the document from small helpers so each section is
    testable in isolation.
    """
    if colors is None:  # pragma: no cover - dependency missing
        raise RuntimeError("reportlab is required to render the catalogue")

    doc = SimpleDocTemplate(
        output_path,
        pagesize=LETTER,
        leftMargin=0.75 * inch,
        rightMargin=0.75 * inch,
        topMargin=0.75 * inch,
        bottomMargin=0.75 * inch,
        title="The Skills Vault",
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
