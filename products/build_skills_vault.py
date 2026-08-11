"""Build the Skills Vault catalogue PDF.

This module generates a professionally formatted PDF catalogue of skills
grouped by category. The rendering logic is decomposed into small helper
functions for readability and testability.

PRIME DIRECTIVE: $10k/month → $10M in 3 years.
This product is part of the automated product pipeline (Focus Area #3).
"""
from __future__ import annotations

import os
from collections import defaultdict
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
except ImportError:  # pragma: no cover - reportlab optional at import time
    colors = None  # type: ignore
    LETTER = None  # type: ignore
    ParagraphStyle = None  # type: ignore
    getSampleStyleSheet = None  # type: ignore
    inch = 72  # type: ignore
    PageBreak = Paragraph = SimpleDocTemplate = Spacer = Table = TableStyle = None  # type: ignore


# Sample skills catalogue data. Each entry: (category, skill, description, price)
DEFAULT_SKILLS: List[Tuple[str, str, str, str]] = [
    ("OSINT", "Email Recon Playbook", "Enumerate accounts and breaches from an email.", "$29"),
    ("OSINT", "Username Sweep", "Track a handle across 200+ platforms.", "$19"),
    ("OSINT", "Domain Intel Report", "WHOIS, DNS, subdomains, and tech stack.", "$49"),
    ("Automation", "GitHub Issue → PR Bot", "Turn issues into merged PRs automatically.", "$99"),
    ("Automation", "Polar.sh Funding Setup", "Configure GitHub sponsors + Polar tiers.", "$39"),
    ("Monetization", "$10k/mo Playbook", "Path from $0 to $10k MRR in 90 days.", "$149"),
    ("Monetization", "Product Pipeline Blueprint", "Ship one micro-product per week.", "$79"),
]


def _group_skills_by_category(
    skills: Iterable[Tuple[str, str, str, str]],
) -> Dict[str, List[Tuple[str, str, str]]]:
    """Group ``(category, name, description, price)`` tuples by category."""
    grouped: Dict[str, List[Tuple[str, str, str]]] = defaultdict(list)
    for category, name, description, price in skills:
        grouped[category].append((name, description, price))
    return dict(grouped)


def _build_styles():
    """Return the paragraph styles used across the document."""
    styles = getSampleStyleSheet()
    styles.add(
        ParagraphStyle(
            name="VaultTitle",
            parent=styles["Title"],
            fontSize=32,
            leading=38,
            textColor=colors.HexColor("#0B3D91"),
            spaceAfter=18,
        )
    )
    styles.add(
        ParagraphStyle(
            name="VaultSubtitle",
            parent=styles["Heading2"],
            fontSize=16,
            textColor=colors.HexColor("#333333"),
            spaceAfter=24,
        )
    )
    styles.add(
        ParagraphStyle(
            name="VaultCategory",
            parent=styles["Heading1"],
            fontSize=20,
            textColor=colors.HexColor("#0B3D91"),
            spaceBefore=18,
            spaceAfter=10,
        )
    )
    return styles


def _render_cover(styles) -> list:
    """Render the cover page story elements."""
    return [
        Spacer(1, 2 * inch),
        Paragraph("The Skills Vault", styles["VaultTitle"]),
        Paragraph(
            "A curated catalogue of high-leverage skills for the $10M journey.",
            styles["VaultSubtitle"],
        ),
        Spacer(1, 3 * inch),
        Paragraph(
            "Prime Directive: $10k/month → $10M in 3 years.",
            styles["Italic"],
        ),
        PageBreak(),
    ]


def _render_intro(styles) -> list:
    """Render the introduction section."""
    intro_text = (
        "This vault is organised into three focus areas: OSINT tooling, "
        "automation pipelines, and monetization playbooks. Each entry is "
        "designed to be shipped, sold, and scaled."
    )
    return [
        Paragraph("Introduction", styles["Heading1"]),
        Paragraph(intro_text, styles["BodyText"]),
        Spacer(1, 0.3 * inch),
    ]


def _render_catalogue_section(
    styles,
    grouped: Dict[str, List[Tuple[str, str, str]]],
    doc_width: float,
) -> list:
    """Render the per-category catalogue tables."""
    story: list = []
    for category in sorted(grouped):
        story.append(Paragraph(category, styles["VaultCategory"]))
        rows: List[List[str]] = [["Skill", "Description", "Price"]]
        rows.extend([name, description, price] for name, description, price in grouped[category])

        table = Table(
            rows,
            colWidths=[doc_width * 0.28, doc_width * 0.55, doc_width * 0.17],
            hAlign="LEFT",
        )
        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0B3D91")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("ALIGN", (2, 1), (2, -1), "RIGHT"),
                    ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#CCCCCC")),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F5F7FB")]),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 8),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                    ("TOPPADDING", (0, 0), (-1, -1), 6),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ]
            )
        )
        story.append(table)
        story.append(Spacer(1, 0.25 * inch))
    return story


def _render_closing(styles) -> list:
    """Render the closing call-to-action."""
    return [
        PageBreak(),
        Paragraph("Ship. Sell. Scale.", styles["VaultTitle"]),
        Paragraph(
            "Fund your journey via Polar.sh and GitHub Sponsors. "
            "Every skill in this vault compounds toward the $10M goal.",
            styles["BodyText"],
        ),
    ]


def render_catalogue(
    output_path: str,
    skills: Iterable[Tuple[str, str, str, str]] | None = None,
) -> str:
    """Render the Skills Vault catalogue to ``output_path`` and return the path."""
    if SimpleDocTemplate is None:
        raise RuntimeError(
            "reportlab is required to render the Skills Vault catalogue. "
            "Install it with `pip install reportlab`."
        )

    skills = list(skills) if skills is not None else DEFAULT_SKILLS
    grouped = _group_skills_by_category(skills)
    styles = _build_styles()

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

    story: list = []
    story.extend(_render_cover(styles))
    story.extend(_render_intro(styles))
    story.extend(_render_catalogue_section(styles, grouped, doc.width))
    story.extend(_render_closing(styles))

    doc.build(story)
    return output_path


def main() -> None:  # pragma: no cover - convenience entry point
    output_dir = os.path.join(os.path.dirname(__file__), "dist")
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, "skills_vault.pdf")
    render_catalogue(output_path)
    print(f"Wrote {output_path}")


if __name__ == "__main__":  # pragma: no cover
    main()
