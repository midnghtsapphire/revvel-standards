#!/usr/bin/env python3
"""
Build a sellable catalogue PDF from skills/SKILLS_INDEX.yml.
Output: products/dist/Revvel-AI-Skills-Vault.pdf
Pure reportlab (no system deps).
"""
import os
import yaml
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.platypus import (
    BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer, PageBreak,
    Table, TableStyle, HRFlowable, KeepTogether, NextPageTemplate,
)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INDEX = os.path.join(ROOT, "skills", "SKILLS_INDEX.yml")
OUTDIR = os.path.join(ROOT, "products", "dist")
os.makedirs(OUTDIR, exist_ok=True)
OUT = os.path.join(OUTDIR, "Revvel-AI-Skills-Vault.pdf")

# ---- brand palette ----
INK = colors.HexColor("#0B1020")
ACCENT = colors.HexColor("#6C5CE7")
ACCENT2 = colors.HexColor("#00D1B2")
MUTED = colors.HexColor("#5B6478")
PALE = colors.HexColor("#F4F5FB")

styles = getSampleStyleSheet()
def st(name, **kw):
    base = kw.pop("parent", styles["Normal"])
    return ParagraphStyle(name, parent=base, **kw)

H_TITLE = st("Htitle", fontName="Helvetica-Bold", fontSize=30, leading=34, textColor=colors.white)
H_SUB   = st("Hsub", fontName="Helvetica", fontSize=13, leading=18, textColor=colors.HexColor("#C9CEE6"))
H_CAT   = st("Hcat", fontName="Helvetica-Bold", fontSize=15, leading=19, textColor=INK, spaceBefore=14, spaceAfter=6)
H_SKILL = st("Hskill", fontName="Helvetica-Bold", fontSize=11, leading=14, textColor=INK)
P_BODY  = st("Pbody", fontName="Helvetica", fontSize=10, leading=15, textColor=colors.HexColor("#26304A"))
P_TRIG  = st("Ptrig", fontName="Helvetica-Oblique", fontSize=8.5, leading=12, textColor=MUTED)
P_LEAD  = st("Plead", fontName="Helvetica", fontSize=11, leading=17, textColor=colors.HexColor("#26304A"))
P_FOOT  = st("Pfoot", fontName="Helvetica", fontSize=8, textColor=MUTED, alignment=TA_CENTER)


def cover(canvas, doc):
    canvas.saveState()
    w, h = letter
    canvas.setFillColor(INK)
    canvas.rect(0, 0, w, h, fill=1, stroke=0)
    canvas.setFillColor(ACCENT)
    canvas.rect(0, h - 0.5 * inch, w, 0.5 * inch, fill=1, stroke=0)
    canvas.setFillColor(ACCENT2)
    canvas.rect(0, 0, w, 0.18 * inch, fill=1, stroke=0)
    canvas.restoreState()


def footer(canvas, doc):
    canvas.saveState()
    w, _ = letter
    canvas.setStrokeColor(colors.HexColor("#E3E6F0"))
    canvas.line(0.9 * inch, 0.7 * inch, w - 0.9 * inch, 0.7 * inch)
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(MUTED)
    canvas.drawString(0.9 * inch, 0.52 * inch, "Revvel AI Skills Vault  ·  © Revvel / MIDNGHTSAPPHIRE")
    canvas.drawRightString(w - 0.9 * inch, 0.52 * inch, "Page %d" % doc.page)
    canvas.restoreState()


def build():
    data = yaml.safe_load(open(INDEX))
    skills = data["skills"]

    doc = BaseDocTemplate(
        OUT, pagesize=letter,
        leftMargin=0.9 * inch, rightMargin=0.9 * inch,
        topMargin=0.9 * inch, bottomMargin=0.9 * inch,
        title="Revvel AI Skills Vault", author="Revvel / MIDNGHTSAPPHIRE",
    )
    frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="main")
    cover_frame = Frame(0.9 * inch, 1.2 * inch, letter[0] - 1.8 * inch, letter[1] - 2.8 * inch, id="cover")
    doc.addPageTemplates([
        PageTemplate(id="cover", frames=[cover_frame], onPage=cover),
        PageTemplate(id="body", frames=[frame], onPage=footer),
    ])

    story = []

    # ---------- COVER ----------
    story += [Spacer(1, 2.4 * inch)]
    story += [Paragraph("THE REVVEL", H_SUB)]
    story += [Paragraph("AI&nbsp;Skills&nbsp;Vault", H_TITLE)]
    story += [Spacer(1, 0.18 * inch)]
    story += [Paragraph(
        f"{len(skills)} production-ready agent skills for Claude Code, Cursor, "
        "Windsurf, Cline &amp; any AI coding agent. Copy-paste playbooks that turn "
        "a generic agent into a domain expert — code review, automation, OSINT, "
        "compliance, analytics, product ops &amp; more.", H_SUB)]
    story += [Spacer(1, 0.5 * inch)]
    story += [Paragraph("v" + str(data.get("vault_version", "1.0")) +
                        "  ·  updated " + str(data.get("last_updated", "")), H_SUB)]
    story += [NextPageTemplate("body"), PageBreak()]

    # ---------- INTRO ----------
    story.append(Paragraph("What's inside", H_CAT))
    story.append(Paragraph(
        "A <b>skill</b> is a focused, copy-paste playbook that gives an AI agent expert "
        "instructions for one domain. Load it at the start of a task and the agent instantly "
        "knows the rules, workflow and tools for that domain — no trial and error.", P_LEAD))
    story.append(Spacer(1, 8))
    story.append(Paragraph(
        f"This vault contains <b>{len(skills)} skills</b> across "
        f"<b>{len({s.get('category','') for s in skills})} categories</b>. Each entry below lists "
        "what it does and the trigger keywords that activate it.", P_LEAD))
    story.append(Spacer(1, 12))

    # how to use box
    how = Table([[Paragraph(
        "<b>How to use</b>&nbsp;&nbsp;1) Pick the skill for your task.&nbsp; "
        "2) Paste its playbook into your agent / project rules.&nbsp; "
        "3) Use a trigger keyword and the agent applies the workflow automatically.",
        P_BODY)]], colWidths=[doc.width])
    how.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), PALE),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#D9DCEC")),
        ("LEFTPADDING", (0, 0), (-1, -1), 12), ("RIGHTPADDING", (0, 0), (-1, -1), 12),
        ("TOPPADDING", (0, 0), (-1, -1), 10), ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
    ]))
    story.append(how)
    story.append(PageBreak())

    # ---------- CATALOGUE ----------
    # group by category, preserve order of first appearance
    order, groups = [], {}
    for s in skills:
        cat = s.get("category", "Other")
        if cat not in groups:
            groups[cat] = []
            order.append(cat)
        groups[cat].append(s)

    story.append(Paragraph("The Catalogue", H_CAT))
    story.append(HRFlowable(width="100%", thickness=2, color=ACCENT, spaceAfter=6))

    for cat in order:
        block = [Paragraph(cat.upper(), st("catlabel", fontName="Helvetica-Bold",
                                           fontSize=9.5, textColor=ACCENT, spaceBefore=10, spaceAfter=2))]
        story.append(KeepTogether(block))
        for s in groups[cat]:
            title = s.get("title", s.get("name", ""))
            trig = s.get("triggers", [])[:6]
            persona = s.get("persona", "")
            rows = [Paragraph(title, H_SKILL)]
            if persona:
                rows.append(Paragraph(f"Persona: {persona}", P_TRIG))
            if trig:
                rows.append(Paragraph("Triggers: " + ", ".join(trig), P_TRIG))
            tbl = Table([[r] for r in rows], colWidths=[doc.width])
            tbl.setStyle(TableStyle([
                ("LEFTPADDING", (0, 0), (-1, -1), 10), ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ("LINEBEFORE", (0, 0), (0, -1), 2, ACCENT2),
                ("BACKGROUND", (0, 0), (-1, -1), colors.white),
            ]))
            story.append(KeepTogether([tbl, Spacer(1, 6)]))

    # ---------- CLOSING ----------
    story.append(PageBreak())
    story.append(Paragraph("Get the full vault", H_CAT))
    story.append(Paragraph(
        "This catalogue is the map. The full vault download includes every skill file "
        "(<i>SKILL.md / .skill.yml</i>) ready to drop into your repo, plus the machine-readable "
        "index so your agents can auto-load the right skill per task.", P_LEAD))
    story.append(Spacer(1, 10))
    story.append(Paragraph(
        "Single skill packs · $29   |   Full vault (all skills) · $99", H_CAT))
    story.append(Paragraph(
        "Licensed for use in your own projects. Not for resale or redistribution as a competing pack.",
        P_TRIG))

    doc.build(story)
    print("WROTE", OUT, "(%.0f KB)" % (os.path.getsize(OUT) / 1024))


if __name__ == "__main__":
    build()
