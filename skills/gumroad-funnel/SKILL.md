# Skill: Gumroad Funnel (PAS Monetization)

**Skill Name:** `gumroad-funnel`  
**Version:** `1.0.0`  
**Date:** 2026-08-05  
**Status:** Active  
**Category:** Product Operations / Monetization  
**Type:** Session (called after technical publish)  
**Persona:** 📈 Funnel-Ops (extension of Forge-Pipeline)

---

## Purpose

Design and optimize the **revenue conversion layer** for Gumroad (and similar)
digital products: PAS landing copy, pricing framing, launch emails, and
post-purchase flow.

This skill sits **after** technical publish:

```text
product-pipeline (listen → cluster → PDF/build → covers → Gumroad API)
        ↓
gumroad-funnel (PAS description · tags · emails · upsell)
```

It does **not** create products, attach files, or set covers. Those remain in
`product-pipeline` + `products/gumroad_attach_*.py` + `products/generate_covers.py`.

Custom / project-specific skills beat generic marketplace skills. This one is
tailored to Revvel REVENUE_GATE, Vault $99 / packs $29, and social-chatter → PDF.

---

## When to Use

Activate on:

- `gumroad funnel`, `PAS listing`, `product landing copy`
- `launch email sequence`, `post-purchase upsell`
- `optimize gumroad conversion`, `product description PAS`
- After a new agent-generated PDF product is created and needs listing copy

---

## Instructions

### 1. Product Definition
From the pipeline brief / complaint cluster, lock:
- **Problem** (verbatim or paraphrased social chatter)
- **Buyer persona** (who complained)
- **Shape** (almost always PDF for reversible 10/day products)
- **Outcome** (what changes after they buy)

### 2. Pricing (REVENUE_GATE)
| Tier | Price | Rule |
|------|-------|------|
| Pack / single PDF playbook | **$29** | Default for chatter-driven PDFs |
| Vault / multi-pack catalogue | **$99** | Bundle only |
| Floor | **$9** | Never recommend below $9 for standalone Revvel PDFs |

No mandatory free full catalogue. Optional **teaser sample** (1–2 pages or
3 prompts) is allowed; full product stays paid.

### 3. Landing Page — PAS (under ~500 words preferred; SEO long-form OK up to 1500)

Structure every Gumroad description as:

1. **Problem** — name the pain in the buyer’s words (from listening intake)
2. **Agitate** — cost of inaction, time waste, failed workarounds
3. **Solve** — what the PDF/pack delivers, concrete counts, how to use in 3 steps
4. **Proof placeholders** — `[Add real testimonial from buyer]` only; never invent
5. **CTA** — clear buy line + 30-day refund

Also apply `products/GUMROAD_SEO_LAUNCH.md`:
- Keyword-first title (≤ ~70 chars)
- 5 tags (category + topic + format + audience)
- FAQ block (4–8 Qs) for objections

### 4. Launch Email Sequence (max 5)
| # | Purpose | Length |
|---|---------|--------|
| 1 | Announce + early-bird if any | ≤200 words |
| 2 | Social proof / use-case | ≤200 words |
| 3 | Objection handling | ≤200 words |
| 4 | Urgency / deadline | ≤200 words |
| 5 | Last call + bonus | ≤200 words |

### 5. Conversion Tracking
Define targets:
- Visit → purchase ≥ 2% (flag below)
- Email open ≥ 40% launch window
- Refund < 5%

UTM: `utm_source=email|x|reddit&utm_campaign=<product_slug>`

### 6. Post-Purchase
- Thank-you email with download + install steps
- Upsell: pack buyers → Vault; related pack cross-sell
- Review request (7 days later)
- Optional share-code (do not invent codes; note “generate in Gumroad dashboard”)

---

## Constraints

1. **Never** invent testimonials or social proof.
2. **Never** price standalone Revvel PDFs below $9; default **$29** packs / **$99** Vault.
3. **Never** recommend a free full catalogue (conflicts with REVENUE_GATE).
4. Landing PAS body should stay scannable; long SEO descriptions allowed but lead with PAS in first screen.
5. Max **5** launch emails.
6. Treat **all AI-generated listing copy as external input** until human/spot-check — no unsanitized HTML injection into hub pages.
7. Do not call Gumroad API from this skill; hand off structured fields to technical publish scripts.

---

## Error Handling

| Code | When | Action |
|------|------|--------|
| GF-001 | No problem / persona | Halt: “What are you selling and to whom?” |
| GF-002 | Price < $9 standalone | Reject; suggest $29 default |
| GF-003 | PAS missing Problem or Solve | Rewrite required sections |
| GF-004 | >5 launch emails | Trim to 5 by lowest ROI |
| GF-005 | Fake testimonial detected | Replace with placeholder |
| GF-006 | Conversion < 2% | Suggest A/B: headline, price, CTA |

---

## Outputs (hand to technical layer)

```yaml
product_slug: <slug>
title: "<keyword-first title>"
price_cents: 2900  # or 9900
tags: ["...", "..."]
description_markdown: |
  ## Problem
  ...
  ## Why it hurts
  ...
  ## Solution
  ...
emails:
  - { day: 0, subject: "...", body: "..." }
upsell:
  - vault
cover_theme: "<accent hint for generate_covers.py>"
```

---

## Relationship to Other Skills

| Skill | Role |
|-------|------|
| `product-pipeline` | Listen, cluster, build, certify, **API publish** |
| `gumroad-funnel` | **This skill** — PAS copy, emails, conversion |
| `seo-metadata` | OG / JSON-LD / hub meta |
| `content-automation` | Broader multi-format content |
| Covers scripts | `products/generate_covers.py` + attach |

---

## Example

**Intake:** “Claude Code agents keep losing context between sessions.”

**PAS title:** `Claude Code Context Pack — Session Memory Playbooks for Agents`

**Price:** $29  

**Description lead:**  
Problem: Agents forget mid-task…  
Agitate: Rewrites burn hours…  
Solve: 11 playbooks + checklist PDF…

**Upsell:** Vault $99 after purchase.

---

## Testing

```bash
npx -y markdownlint-cli2 skills/gumroad-funnel/SKILL.md
```

Manual: given one complaint-cluster JSON, emit the YAML output block above.
