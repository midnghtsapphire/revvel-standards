"""Build the Skills Vault PDF catalogue.

This module renders a PDF catalogue of skills grouped by category.
The main entry point is :func:`render_catalogue`, which composes the
document from small, single-responsibility helper functions.
"""
from __future__ import annotations

from collections import defaultdict
from pathlib import Path
from typing import Iterable, List, Mapping, Sequence

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
except ImportError:  # pragma: no cover - optional dependency
    SimpleDocTemplate = None  # type: ignore


DEFAULT_OUTPUT = Path("dist/skills_vault.pdf")


def _group_skills_by_category(skills: Iterable[Mapping[str, str]]) -> dict[str, list[Mapping[str, str]]]:
    """Group skill entries by their ``category`` field."""
    grouped: dict[str, list[Mapping[str, str]]] = defaultdict(list)
    for skill in skills:
        grouped[skill.get("category", "Uncategorized")].append(skill)
    return dict(grouped)


def _render_cover(styles) -> list:
    """Build the cover page flowables."""
    return [
        Spacer(1, 2 * inch),
        Paragraph("Skills Vault", styles["Title"]),
        Spacer(1, 0.3 * inch),
        Paragraph("A curated catalogue of monetizable skills", styles["Heading2"]),
        PageBreak(),
    ]


def _render_intro(styles) -> list:
    """Build the introduction section flowables."""
    return [
        Paragraph("Introduction", styles["Heading1"]),
        Spacer(1, 0.2 * inch),
        Paragraph(
            "This catalogue lists skills organised by category. Use it to "
            "identify offerings you can package as products or services.",
            styles["BodyText"],
        ),
        PageBreak(),
    ]


def _render_catalogue_section(
    grouped: Mapping[str, Sequence[Mapping[str, str]]],
    styles,
    doc_width: float,
) -> list:
    """Build the catalogue tables grouped by category."""
    story: list = []
    for category in sorted(grouped):
        story.append(Paragraph(category, styles["Heading1"]))
        story.append(Spacer(1, 0.15 * inch))

        rows = [["Skill", "Description"]]
        for skill in grouped[category]:
            rows.append([skill.get("name", ""), skill.get("description", "")])

        table = Table(rows, colWidths=[doc_width * 0.3, doc_width * 0.7])
        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#222222")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("GRID", (0, 0), (-1, -1), 0.25, colors.grey),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.whitesmoke, colors.white]),
                ]
            )
        )
        story.append(table)
        story.append(PageBreak())
    return story


def _render_closing(styles) -> list:
    """Build the closing section flowables."""
    return [
        Paragraph("Next Steps", styles["Heading1"]),
        Spacer(1, 0.2 * inch),
        Paragraph(
            "Pick 1-3 skills to productize this week. Track outcomes and iterate.",
            styles["BodyText"],
        ),
    ]


def render_catalogue(
    skills: Sequence[Mapping[str, str]],
    output_path: Path = DEFAULT_OUTPUT,
) -> Path:
    """Render the Skills Vault PDF catalogue.

    Composes the document from small helper functions so each section can
    be reasoned about and tested independently.
    """
    if SimpleDocTemplate is None:  # pragma: no cover
        raise RuntimeError("reportlab is required to build the catalogue PDF")

    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    doc = SimpleDocTemplate(
        str(output_path),
        pagesize=LETTER,
        title="Skills Vault",
        author="Revvel Standards",
    )
    styles = getSampleStyleSheet()
    if "BodyText" not in styles.byName:  # pragma: no cover - defensive
        styles.add(ParagraphStyle(name="BodyText"))

    grouped = _group_skills_by_category(skills)

    story: List = []
    story.extend(_render_cover(styles))
    story.extend(_render_intro(styles))
    story.extend(_render_catalogue_section(grouped, styles, doc.width))
    story.extend(_render_closing(styles))

    doc.build(story)
    return output_path


if __name__ == "__main__":  # pragma: no cover
    sample_skills = [
        {"category": "Automation", "name": "n8n Workflows", "description": "Build automated pipelines."},
        {"category": "OSINT", "name": "Recon Reports", "description": "Deliver actionable intel."},
        {"category": "Content", "name": "Newsletter", "description": "Weekly monetized digest."},
    ]
    render_catalogue(sample_skills)
