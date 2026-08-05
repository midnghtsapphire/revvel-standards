# Skill: DRAGNET Scaffold Mode

**Skill Name:** `dragnet-scaffold`
**Version:** 1.0.0
**Date:** 2026-07-05
**Status:** Active
**Category:** Product Operations / Autonomous Triage
**LLM:** Claude Sonnet (primary via `repo_surgery` profile), OpenRouter fallback
**Type:** On-demand (comment-triggered)
**Persona:** 🕵️ DRAGNET (SCAFFOLD MODE)

---

## Purpose

DRAGNET SCAFFOLD MODE is the product-creation branch of the existing DRAGNET persona.
Where ERROR MODE hunts root causes in existing code, SCAFFOLD MODE extracts product
requirements from raw social signals (Reddit threads, screenshots, user-complaint
clusters) and produces a complete, immediately-actionable WR document.

This skill addresses the gap where product requests arrive as images or community
links rather than structured issue forms — input that the rest of the pipeline
(research-engine, wr-pr-creation) cannot fully process without structured requirements.

**Trigger aliases:** `/scaffold`, `/builder`, `/product-build`, `/dragnet` (when the task
describes a new product/feature rather than a bug)

---

## What This Skill Does

| Task | Description |
|---|---|
| **Extract** | Parse every screenshot, Reddit thread, and comment for user pain points |
| **Classify** | Pick the cheapest viable solution shape (PDF, one-button app, extension, API, CLI, MCP, full app) |
| **Score** | Run PLATO→JUDGE scoring matrix: Financial 25%, Legal 25%, Operational 20%, Strategic 15%, Risk 10%, Values 5% |
| **Gate** | Issue GREEN/YELLOW/RED verdict; stop on RED and name the specific blocker |
| **BOM** | Emit a Bill of Materials: product_slug, shape, MVP features (≤5), tech stack, price point, store, build cost, 90d revenue, ROI |
| **WR** | Output a complete WR following `wr/WR_TEMPLATE_FULL.md` with traceable source citations |

---

## Trigger Keywords

This skill activates when these phrases appear in a comment:

```text
/scaffold <product request>
/builder <product request>
/product-build <product request>
/dragnet <product request>   ← also triggers ERROR MODE for bugs
```

---

## Operating Modes

DRAGNET auto-detects which mode to use:

| Signal | Mode |
|--------|------|
| Task describes a bug, workflow failure, broken CI, runtime error | **ERROR MODE** |
| Task describes a new product, feature, or tool — especially with screenshots/social links | **SCAFFOLD MODE** |

Both modes are documented; this skill covers SCAFFOLD MODE only.
See `scripts/openrouter-personas.js` (dragnet `instructions`) for ERROR MODE.

---

## SCAFFOLD MODE Pipeline

### Step 1 — Extract Requirements

Read every piece of source material in the issue/comment:

- **Screenshots**: describe what is shown; extract every UI element, label, or complaint visible
- **Reddit / social links**: pull thread title, top comments (upvotes ≥ 50), pain-point phrases
- **Inline comments**: parse verbatim user quotes

Output a bulleted requirement list with a source citation for each item:

```markdown
- Users want one-click PDF export  
  _Source: screenshot 3 — "export to PDF" button mockup_
- ATS compatibility is the #1 concern  
  _Source: reddit.com/r/recruitinghell/... — top comment 1,847 upvotes_
```

### Step 2 — Classify Solution Shape

Apply the product-pipeline decision rubric:

| Score | Shape |
|-------|-------|
| One-shot reference, SEO-discoverable | PDF / booklet |
| Single deterministic action with output | One-button app |
| Fixing a vendor's web UI | Browser extension |
| Hands-free household | Alexa / Google skill |
| Developers want to call this | API |
| Developers want to script this locally | CLI |
| An LLM agent needs this tool | MCP server |
| Bigger, only after strong ROI justification | Full app |

### Step 3 — PLATO→JUDGE Scoring

Score each dimension 0–100, then apply thresholds:

| Dimension | Weight |
|-----------|--------|
| Financial | 25% |
| Legal | 25% |
| Operational | 20% |
| Strategic | 15% |
| Risk | 10% |
| Values | 5% |

**Thresholds:**
- 🟢 GREEN ≥ 75 avg, no dimension < 50 → proceed
- 🟡 YELLOW ≥ 50 avg → proceed with conditions named
- 🔴 RED any dimension < 50 or avg < 50 → stop, name blocker, label to apply

### Step 4 — Bill of Materials (BOM)

```markdown
## BOM — <product_slug>

| Field | Value |
|-------|-------|
| product_slug | resume-generator-ats |
| shape | one-button app (web) |
| MVP features | form input, live preview, ATS-safe template, PDF export, client-side only |
| tech stack | Next.js, Tailwind, jsPDF |
| price point | Free (lead capture) / $9/mo Pro |
| primary store | Direct (Polar.sh) |
| build cost | ~$600 (est. 8h agent + 2h review) |
| 90d revenue projection | $2,400 (est. 80 paid users × $9 × 3 months) |
| ROI ratio | 4.0x |
```

### Step 5 — WR Output

Emit a complete WR following `wr/WR_TEMPLATE_FULL.md`.

Mandatory sections for SCAFFOLD MODE output:

```markdown
## Objective
<one-sentence product description>

## Requirements (extracted from source material)
- <requirement> — _Source: <citation>_

## MVP Definition (≤ 5 items)
- [ ] <feature 1>

## Solution Shape
<shape> — rationale: <one sentence>

## PLATO→JUDGE Verdict
🟢/🟡/🔴 — <score summary>

## BOM Reference
See BOM table above.

## Audience
<primary persona>, <secondary persona>

## SEO Keywords
<top 5–10 keywords>

## Monetization Path
<free tier / paid tier / Stripe price point / store>

## Competitor Snapshot
| Competitor | Score | Gap |
|---|---|---|

## Acceptance Gates
- [ ] <gate 1>

## Blockers
- <blocker if any, with label to apply>

## Next Steps
- [ ] Assign BOM to Coder for scaffold
- [ ] Apply `bom_ready` label once BOM is approved
```

---

## Example

**Trigger comment:**
```text
/scaffold Create a resume generator based on the screenshots in issue #15164 and the Reddit thread at https://www.reddit.com/r/recruitinghell/s/en2zyR33dj
```

**Expected output (condensed):**

```markdown
## DRAGNET SCAFFOLD MODE — resume-generator-ats

### Extracted Requirements
- ATS compatibility is the #1 concern  
  _Source: reddit.com/r/recruitinghell — "I've sent 200 applications and not one callback"_
- Single-column, clean template preferred  
  _Source: screenshot 1 — simple layout with standard section headers_
- One-click PDF export without watermark  
  _Source: screenshot 4 — "export PDF free" CTA_
- No sign-up required for basic use  
  _Source: reddit thread — "I hate tools that make me register just to try"_
- Mobile-friendly input form  
  _Source: screenshots 1–7 — all captured on mobile viewport_

### Solution Shape
**One-button web app** — single-purpose tool (fill form → preview → export PDF);
cheaper than full app, no vendor dependency.

### PLATO→JUDGE Verdict
🟢 GREEN — avg 78/100 (Financial 80, Legal 90, Operational 75, Strategic 70, Risk 75, Values 80)

### BOM
product_slug: resume-generator-ats | shape: one-button web app | MVP: form, live preview,
ATS template, PDF export, client-side | stack: Next.js + Tailwind + jsPDF | price: Free /
$9/mo Pro | store: Polar.sh | build cost: ~$600 | 90d rev: ~$2,400 | ROI: 4.0x

### Next Action
Apply `bom_ready` label after BOM review. Assign to Coder for scaffold.
```

---

## Integration

| System | Role |
|--------|------|
| `persona-comment-trigger.yml` | Invokes this skill when `/scaffold`, `/builder`, `/product-build`, or `/dragnet` is used |
| `wr-pr-creation.yml` | Consumes the WR output to generate the full WR PR |
| `product-pipeline` skill | Handles subsequent pipeline steps (Build → Certify → Deploy) after BOM is approved |
| `ui-creation-engine` skill | Used for the UI scaffolding step when shape = web app |
| `mvi-contract` skill | Wraps each SCAFFOLD session so scope is enforced |

---

## Quality Gates

SCAFFOLD MODE output is only valid when:

- [ ] Every requirement has a source citation (screenshot filename or URL + quote)
- [ ] Solution shape is explicitly chosen with a one-sentence rationale
- [ ] PLATO→JUDGE score is computed for all six dimensions
- [ ] BOM includes all eight required fields
- [ ] WR includes Objective, MVP Definition (≤5), Acceptance Gates, Monetization Path, and Next Steps
- [ ] RED verdict causes an immediate stop with the specific blocker named

---

## Related Skills

- **`product-pipeline`** — next step after BOM is approved
- **`ui-creation-engine`** — UI scaffolding for web/app shapes
- **`mvi-contract`** — scope enforcement per session
- **`vault-agent`** — API key provisioning named in BOM
- **`seo-metadata`** — SEO package for the market step

---

## Related Standards

- `standards/DRAGNET_FRAMEWORK.md` — PLATO→JUDGE scoring matrix
- `standards/AUTOMATED_PRODUCT_PIPELINE.md` — full pipeline from Listen → Measure
- `wr/WR_TEMPLATE_FULL.md` — WR output format
- `docs/AGENTS.md` — Prime Directive and orchestration rules

---

*DRAGNET SCAFFOLD MODE — extract, score, build.*
