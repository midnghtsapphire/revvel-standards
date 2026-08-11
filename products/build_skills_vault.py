"""Build the Skills Vault PDF catalogue.

This module renders a polished PDF catalogue describing the skills, services
and automation products offered. The rendering logic is decomposed into small,
single-responsibility helper functions to keep :func:`render_catalogue`
concise and testable.

Prime directive: support the $10k/month → $10M in 3 years pipeline by
producing a professional artifact that can be sold, gifted with Polar.sh
funding tiers, or bundled with OSINT tool offerings.
"""

from __future__ import annotations

import os
from collections import OrderedDict
from datetime import datetime
from typing import Dict, Iterable, List, Tuple

try:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import LETTER
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.lib.units import inch
    from reportlab.platypus import (
        PageBreak,
        Paragraph,
        SimpleDocTemplate,
        Spacer,
        Table,
        TableStyle,
    )
except ImportError:  # pragma: no cover - reportlab is an optional dep at import time
    colors = None  # type: ignore[assignment]
    LETTER = (612, 792)  # type: ignore[assignment]
    ParagraphStyle = None  # type: ignore[assignment]
    getSampleStyleSheet = None  # type: ignore[assignment]
    inch = 72  # type: ignore[assignment]
    PageBreak = Paragraph = SimpleDocTemplate = Spacer = Table = TableStyle = None  # type: ignore[assignment]


OUTPUT_PATH = os.path.join(os.path.dirname(__file__), "skills_vault.pdf")

SKILLS: List[Dict[str, str]] = [
    {
        "category": "Automation",
        "name": "Automated Product Pipeline",
        "description": "End-to-end pipeline that ideates, builds, and ships digital products.",
        "price": "$2,500",
    },
    {
        "category": "Automation",
        "name": "GitHub → Polar.sh Funding Bot",
        "description": "Automates sponsor tiers, receipts, and delivery via Polar.sh.",
        "price": "$1,200",
    },
    {
        "category": "OSINT",
        "name": "OSINT Reconnaissance Toolkit",
        "description": "Modular toolkit for people, domain, and infrastructure enrichment.",
        "price": "$3,000",
    },
    {
        "category": "OSINT",
        "name": "Threat Intel Dashboard",
        "description": "Real-time dashboard aggregating IOC feeds with alerting.",
        "price": "$4,500",
    },
    {
        "category": "Consulting",
        "name": "Revenue Roadmap Sprint",
        "description": "2-week sprint mapping $10k → $10M revenue milestones.",
        "price": "$5,000",
    },
]


def _group_skills_by_category(
    skills: Iterable[Dict[str, str]],
) -> "OrderedDict[str, List[Dict[str, str]]]":
    """Group skill entries by their ``category`` field preserving order."""
    grouped: "OrderedDict[str, List[Dict[str, str]]]" = OrderedDict()
    for skill in skills:
        grouped.setdefault(skill["category"], []).append(skill)
    return grouped


def _build_styles() -> Dict[str, "ParagraphStyle"]:
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle(
            "VaultTitle",
            parent=base["Title"],
            fontSize=32,
            leading=38,
            textColor=colors.HexColor("#0B3D91"),
            spaceAfter=18,
        ),
        "subtitle": ParagraphStyle(
            "VaultSubtitle",
            parent=base["Heading2"],
            fontSize=16,
            textColor=colors.HexColor("#333333"),
            spaceAfter=24,
        ),
        "h2": ParagraphStyle(
            "VaultH2",
            parent=base["Heading2"],
            fontSize=18,
            textColor=colors.HexColor("#0B3D91"),
            spaceBefore=12,
            spaceAfter=12,
        ),
        "body": ParagraphStyle(
            "VaultBody",
            parent=base["BodyText"],
            fontSize=11,
            leading=15,
            spaceAfter=10,
        ),
        "small": ParagraphStyle(
            "VaultSmall",
            parent=base["BodyText"],
            fontSize=9,
            leading=12,
            textColor=colors.HexColor("#666666"),
        ),
    }


def _render_cover(styles: Dict[str, "ParagraphStyle"]) -> List[object]:
    """Build the cover section flowables."""
    today = datetime.utcnow().strftime("%B %Y")
    return [
        Spacer(1, 1.5 * inch),
        Paragraph("The Skills Vault", styles["title"]),
        Paragraph(
            "A catalogue of automation, OSINT, and revenue-focused offerings.",
            styles["subtitle"],
        ),
        Spacer(1, 0.5 * inch),
        Paragraph(f"Edition: {today}", styles["small"]),
        Paragraph("Prime directive: $10k/month → $10M in 3 years.", styles["small"]),
        PageBreak(),
    ]


def _render_intro(styles: Dict[str, "ParagraphStyle"]) -> List[object]:
    """Build the introduction section flowables."""
    return [
        Paragraph("Introduction", styles["h2"]),
        Paragraph(
            "This vault is a curated list of high-leverage services engineered "
            "to move an operator from $10k/month to $10M in three years. Every "
            "line item is priced for outcomes, not hours.",
            styles["body"],
        ),
        Paragraph(
            "Fund any offering via Polar.sh sponsorship tiers or engage "
            "directly for bespoke scoping.",
            styles["body"],
        ),
        Spacer(1, 0.25 * inch),
    ]


def _skills_to_table_rows(skills: List[Dict[str, str]]) -> List[List[str]]:
    rows: List[List[str]] = [["Offering", "Description", "Price"]]
    for skill in skills:
        rows.append([skill["name"], skill["description"], skill["price"]])
    return rows


def _render_catalogue_section(
    styles: Dict[str, "ParagraphStyle"],
    grouped: "OrderedDict[str, List[Dict[str, str]]]",
    available_width: float,
) -> List[object]:
    """Build the catalogue tables grouped by category."""
    story: List[object] = [Paragraph("Catalogue", styles["h2"])]
    col_widths = [
        available_width * 0.28,
        available_width * 0.55,
        available_width * 0.17,
    ]

    for category, items in grouped.items():
        story.append(Paragraph(category, styles["h2"]))
        table = Table(_skills_to_table_rows(items), colWidths=col_widths, hAlign="LEFT")
        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0B3D91")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, -1), 10),
                    ("BOTTOMPADDING", (0, 0), (-1, 0), 8),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.whitesmoke, colors.white]),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#CCCCCC")),
                ]
            )
        )
        story.append(table)
        story.append(Spacer(1, 0.2 * inch))

    return story


def _render_closing(styles: Dict[str, "ParagraphStyle"]) -> List[object]:
    """Build the closing / call-to-action section."""
    return [
        Spacer(1, 0.25 * inch),
        Paragraph("Next Steps", styles["h2"]),
        Paragraph(
            "Pick the smallest offering that unblocks your next revenue "
            "milestone. Stack the rest as retainers.",
            styles["body"],
        ),
        Paragraph(
            "Contact via Polar.sh or open a discovery issue in the repo.",
            styles["small"],
        ),
    ]


def render_catalogue(
    skills: Iterable[Dict[str, str]] = SKILLS,
    output_path: str = OUTPUT_PATH,
) -> str:
    """Render the Skills Vault catalogue to ``output_path``.

    The rendering pipeline is composed of small helpers so each section
    (cover, intro, catalogue tables, closing) can be tested and adjusted
    independently.

    Returns the path of the written PDF.
    """
    if SimpleDocTemplate is None:  # pragma: no cover - guard for missing dep
        raise RuntimeError(
            "reportlab is required to render the Skills Vault PDF. "
            "Install it with `pip install reportlab`."
        )

    doc = SimpleDocTemplate(
        output_path,
        pagesize=LETTER,
        leftMargin=0.75 * inch,
        rightMargin=0.75 * inch,
        topMargin=0.75 * inch,
        bottomMargin=0.75 * inch,
        title="The Skills Vault",
        author="Revvel Standards",
    )

    styles = _build_styles()
    grouped = _group_skills_by_category(skills)

    story: List[object] = []
    story.extend(_render_cover(styles))
    story.extend(_render_intro(styles))
    story.extend(_render_catalogue_section(styles, grouped, doc.width))
    story.extend(_render_closing(styles))

    doc.build(story)
    return output_path


if __name__ == "__main__":  # pragma: no cover
    path = render_catalogue()
    print(f"Wrote {path}")
