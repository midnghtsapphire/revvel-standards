#!/usr/bin/env python3
"""
Generate themed $29 Gumroad packs by slicing the skills vault into categories.
Reuses the renderer in build_skills_vault.py.

Output:
  products/dist/pack-*.pdf          one PDF per theme
  products/GUMROAD-PACKS.md         ready-to-paste listing copy for every pack

Requires: reportlab, PyYAML  ->  pip install reportlab pyyaml
"""
import os
from build_skills_vault import load_skills, render_catalogue, OUTDIR, ROOT

# theme key -> (filename slug, product title, hero kicker, one-line hook, [categories])
THEMES = [
    ("agent-ops", "AI Agent Operations Pack", "REVVEL PACK",
     "Run a reliable multi-agent stack — routing, memory, handoffs, fallbacks &amp; self-eval.",
     ["Agent Operations"]),
    ("dev-workflow", "Developer Workflow Pack", "REVVEL PACK",
     "The day-to-day playbooks that make an AI coding agent actually ship.",
     ["Developer Workflow"]),
    ("review-testing", "Code Review &amp; Testing Pack", "REVVEL PACK",
     "Autonomous review, bug detection &amp; test coverage — quality on autopilot.",
     ["Code Quality & Autonomous Review", "Testing & Quality"]),
    ("devops-automation", "DevOps &amp; Automation Pack", "REVVEL PACK",
     "Deploy, automate &amp; wire up bots and finance flows without babysitting.",
     ["DevOps & Deployment", "DevOps & Automation", "Automation & Finance", "Bot Creation"]),
    ("security-compliance", "Security &amp; Compliance Pack", "REVVEL PACK",
     "Credential hygiene, GRC, ADA/accessibility — keep agents safe and compliant.",
     ["Security & Credential Management", "Security & Compliance", "Accessibility & Compliance"]),
    ("growth-analytics", "Growth, Content &amp; Analytics Pack", "REVVEL PACK",
     "Content automation, marketing ops &amp; product analytics, agent-driven.",
     ["Content & Marketing", "Marketing Automation", "Product Analytics"]),
    ("founder-ops", "Founder Ops Pack — Product, Finance &amp; Tax", "REVVEL PACK",
     "Product pipeline, real-estate/finance &amp; multi-entity tax playbooks for solo founders.",
     ["Product Operations", "Product Development", "Real Estate & Finance", "Tax & Legal"]),
]

PRICE = "This pack · $29   |   Full vault (all 49 skills) · $99"


def main():
    _data, skills = load_skills()
    by_cat = {}
    for s in skills:
        by_cat.setdefault(s.get("category", "Other"), []).append(s)

    listing_lines = [
        "# Gumroad listings — themed Skill Packs",
        "",
        "Each pack is a standalone $29 product (cover = page 1 of its PDF). "
        "The full vault stays the $99 anchor. Upload each `dist/pack-*.pdf` (or zip it "
        "with the matching skill folders) as its own Gumroad product.",
        "",
        "**Shared tags:** ai agents, claude, claude code, cursor, automation, developer tools, ai workflow",
        "",
    ]

    made = 0
    for slug, title, kicker, hook, cats in THEMES:
        sel = [s for c in cats for s in by_cat.get(c, [])]
        if not sel:
            print("skip (no skills):", title)
            continue
        plain_title = title.replace("&amp;", "&")
        out = os.path.join(OUTDIR, f"pack-{slug}.pdf")
        render_catalogue(
            out,
            doc_title=plain_title,
            hero_kicker=kicker,
            hero_title=title,
            skills=sel,
            hero_sub=hook + f" {len(sel)} ready-to-use skills.",
            price_line=PRICE,
            closing_lead=("Every skill ships as its SKILL.md / &lt;skill&gt;.skill.yml, ready to "
                          "drop into Claude Code, Cursor, Windsurf or Cline. Want all 49? Grab the full vault."),
        )
        made += 1
        listing_lines += [
            f"## {plain_title} — $29",
            f"_{hook.replace('&amp;', '&')}_",
            "",
            f"- **File:** `dist/pack-{slug}.pdf`",
            f"- **Includes:** {len(sel)} skills — " + ", ".join(s.get("title", s.get("name", "")) for s in sel),
            "",
            "**Description (paste):**",
            f"> {len(sel)} production-ready AI-agent skills for {plain_title.split('—')[0].strip().lower()}. "
            "Copy-paste playbooks for Claude Code, Cursor, Windsurf & Cline — drop one in, use a trigger "
            "keyword, and your agent applies the workflow automatically. Want the whole set? Get the full "
            "49-skill Revvel AI Skills Vault for $99.",
            "",
            "---",
            "",
        ]

    with open(os.path.join(ROOT, "products", "GUMROAD-PACKS.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(listing_lines))
    print(f"\nDONE — {made} themed packs + products/GUMROAD-PACKS.md")


if __name__ == "__main__":
    main()
