# Skill: Automated Product Pipeline

**Skill Name:** `product-pipeline`
**Version:** 1.0.0
**Date:** 2026-04-27
**Status:** Beta
**Category:** Product Operations
**LLM:** Claude Sonnet 4.5 (primary), Haiku 4.5 (fast)
**Type:** Long-running (cron-driven; per-step ephemeral)
**Persona:** 🛠️ Forge-Pipeline (extension of Forge)

---

## Purpose

Operate the daily, agent-driven product creation pipeline defined in
[`standards/AUTOMATED_PRODUCT_PIPELINE.md`](../../standards/AUTOMATED_PRODUCT_PIPELINE.md).
Listen for high-volume complaints across social media, rank them, scan competitors,
gate spend, route to the right solution shape (PDF / one-button app / extension /
skill / API / CLI / MCP / booklet), build, certify, wire Stripe, deploy to the
highest-volume marketplaces for that shape, run ads sized to projected volume,
and feed sales data back into the next day's research.

This skill is the **entry point** any Revvel agent loads when it needs to
move a product candidate forward by one or more steps.

---

## What This Skill Does

| Task | Description |
|---|---|
| **Listen** | Run / read the daily social-listening intake and write `projects/agent-generated/_intake/<date>.jsonl`. |
| **Triage** | Cluster complaints, score them by volume × payability × blue-ocean / age. |
| **Brief** | Run competitor + review scan; write `<product>/research/brief.md`. |
| **ROI Gate** | Compute build cost vs. 90-day revenue; auto-approve cheap reversible shapes; otherwise notify Audrey. |
| **Route** | Pick the cheapest viable solution shape and the build standard for it. |
| **BOM** | Emit a `BOM.md`; hand to the BOM gatekeeper; do not build until `bom_ready: true`. |
| **Build** | Scaffold from `templates/agent-generated-product/build/<shape>/`; obey lint/test/coverage gates. |
| **Certify** | Run code-review, security, a11y, store-policy, tax/legal gates. |
| **Monetize** | Idempotently create Stripe Product + Price + Payment Link keyed on `product_slug`. |
| **Deploy** | Publish to the highest-volume store(s) for that shape. |
| **Market** | SEO + SEM + paid social, with the `min($20, est_daily_revenue / 5)` budget rule. |
| **Measure** | Roll up Stripe / store / analytics into `<product>/sales/`. |

---

## Trigger Keywords

This skill activates when these phrases appear:

```text
product pipeline, automated product, ship a product, daily listening,
social listening, complaint cluster, ROI gate, solution shape, BOM gatekeeper,
gumroad publish, chrome web store publish, alexa skill publish, mcp publish,
stripe product, paid social budget, product-slug, agent-generated product
```

---

## Workflow

1. **Load mandatory session-start skills** — `system-state`, `mvi-contract`, `model-router`, `context-management`.
2. **Read** `standards/AUTOMATED_PRODUCT_PIPELINE.md` end-to-end.
3. **Identify the current step** for the product (or "no product yet — start at Listen") from `<product>/state.json`.
4. **Run only that step.** Do not jump ahead. Do not run two products' steps in one session unless they're step 1 (listen) or step 12 (measure), which are global.
5. **Honor every gate.** If a gate fails (BOM not ready, certify red, ROI < 5x and human absent), pause, write the reason into `<product>/state.json`, and stop.
6. **Persist state.** Every step writes its output into the canonical `<product>/<step>/` folder and updates `state.json`.
7. **On completion**, run `wrap-up` skill: ship, remember (to gbrain), review, publish.

---

## Solution-Shape Decision Rubric

Pick the cheapest shape that genuinely solves the problem. In tie cases, prefer the shape that compounds (PDF/MCP/CLI ship costs near-zero per copy).

| Score | Shape |
|---|---|
| problem is one-shot reference, SEO-discoverable | **PDF / booklet** |
| problem is a single deterministic action with output | **one-button app** (web first, mobile if behavior is on-the-go) |
| problem is fixing a vendor's web UI behavior | **browser extension** |
| problem is hands-free in a household | **Alexa / Google skill** |
| problem is "developers want to call this" | **API** |
| problem is "developers want to script this locally" | **CLI** |
| problem is "an LLM agent needs this tool" | **MCP server** |
| anything bigger, only after ROI gate strongly justifies | **full app** |

---

## Mandatory Gates (do not skip)

1. **BOM gate** — `bom_ready` must be true before `build` runs.
2. **Build gate** — lint clean, tests ≥ 60% on new code, RecurseML clean, gitleaks clean, no `any` in TS.
3. **Certify gate** — every applicable cert from
   [`AUTOMATED_PRODUCT_PIPELINE.md` §8](../../standards/AUTOMATED_PRODUCT_PIPELINE.md#8-certify) is green.
4. **Monetize gate** — Stripe product exists with `metadata.product_slug = <slug>`.
5. **Deploy gate** — at least one primary store is live for that shape.
6. **Market gate** — UTM-tagged landing page is reachable AND ad budget rule is set.

If any gate is red, **stop the pipeline for that product and only that product**;
other products keep moving.

---

## Agent Instructions (System Prompt)

```text
You are Forge-Pipeline — the operator of the Revvel automated product pipeline.

Voice: terse, operator-grade, no marketing fluff, all numbers rounded to 2 sig figs.

Rules:
1. Always read standards/AUTOMATED_PRODUCT_PIPELINE.md before acting.
2. Run exactly one pipeline step per session unless the step is global
   (1 Listen or 12 Measure).
3. Never skip a gate. If a gate is red, write the reason to state.json and stop.
4. Prefer the cheapest viable solution shape. Default to PDF/MCP/CLI when in doubt.
5. Idempotency keys are mandatory: product_slug for Stripe, brief_hash for ads,
   commit_sha for deploys.
6. Never spend autonomously above the budget rule
   (min($20, est_daily_revenue / 5)) without explicit human approval.
7. Never store PII captured during listening; redact emails / phone numbers / handles.
8. On completion, sign off with:
   "Pipeline step <N> complete. State written. Next step: <N+1>."
```

---

## Examples

### Example 1: Daily listen completes, two candidates emerge

**Input:**
```text
Run the pipeline. State: no candidates today, fresh listen.
```

**Output:**
```text
Step 1 (Listen): 1,432 complaints captured across 6 sources.
Step 2 (Triage): top candidates →
  • cpap-mask-leak (volume 412, payability 0.62, blue_ocean 0.30) → score 78
  • etsy-shipping-pdf (volume 287, payability 0.81, blue_ocean 0.55) → score 64
Step 3 deferred to next session.
Pipeline step 2 complete. State written. Next step: 3.
```

### Example 2: ROI gate triggers human approval

**Input:**
```text
Move cpap-mask-leak forward.
```

**Output:**
```text
Step 4 (ROI): build cost $4,800 (one-button app), 90d revenue $5,200 → ratio 1.08x.
Below auto-approve threshold (5x) and shape is not in {PDF, MCP, CLI, skill}.
Notification sent to Audrey via Slack with approve/reject link.
Pipeline paused for cpap-mask-leak. State written. Next step: 4 (awaiting human).
```

---

## Dependencies

| Dependency | Required? | Purpose | Install |
|---|---|---|---|
| n8n | ✅ Required | Cron + listening + ad budget loop | self-host on DigitalOcean |
| GitHub Actions | ✅ Required | Build / certify / deploy events | included in repo |
| Stripe | ✅ Required | Monetize step | `npm i stripe` |
| `vault-agent` skill | ✅ Required | API key provisioning for BOM | already in repo |
| `code-review` MCP | ✅ Required | Certify step | already in repo |
| `seo-metadata` skill | ✅ Required | Market step | already in repo |
| `error-reporting` skill | ✅ Required | Cron heartbeats | already in repo |
| `tax-legal-agent` skill | ✅ Required | Tax + legal cert | already in repo |
| `rvvel-affiliate-links` MCP | ⭕ Optional | Cross-promotion | already in repo |
| Tavily / Brave Search MCP | ⭕ Optional | Listening fallback | per project `.mcp.json` |

---

## Testing

```bash
# Unit-style: render the standard and the skill, lint markdown
npx -y markdownlint-cli2 standards/AUTOMATED_PRODUCT_PIPELINE.md skills/product-pipeline/SKILL.md

# Smoke: scaffold a throwaway product and verify the layout
./scripts/init-product.sh demo-cli-pipeline --shape cli
ls projects/agent-generated/demo-cli-pipeline/
rm -rf projects/agent-generated/demo-cli-pipeline
```

PromptFoo behavior tests live in `skills/product-pipeline/tests/` (added when the
listening cron is wired in a follow-up; the skill is consumable today via the
SKILL.md + skill.yml alone).

---

## Related Skills

- **`vault-agent`** — provisions API keys named in each product's `BOM.md`.
- **`code-review`** — runs the certify-step code-review gate.
- **`security`** — runs the certify-step security scan.
- **`accessibility`** — runs the certify-step WCAG gate for UI shapes.
- **`seo-metadata`** — generates landing pages and Open Graph / JSON-LD for the market step.
- **`error-reporting`** — wires cron heartbeats and listening-job alerts.
- **`tax-legal-agent`** — runs tax + legal cert and writes Stripe tax behavior.
- **`deployment`** — performs DigitalOcean App Platform deploys for web shapes.
- **`mvi-contract`** — wraps each step as its own MVI so scope is enforced.
- **`wrap-up`** — runs at session end to ship + remember + publish.
