# Automated Product Pipeline Standard

**Status:** Active
**Owner:** @midnghtsapphire
**Related skills:** [`skills/product-pipeline/`](../skills/product-pipeline/SKILL.md)
**Related standards:** [`SAAS_PRODUCTS.md`](SAAS_PRODUCTS.md), [`ZERO_HUMAN_FRAMEWORK.md`](ZERO_HUMAN_FRAMEWORK.md), [`PRICING.md`](PRICING.md), [`CRON_SYSTEM.md`](CRON_SYSTEM.md), [`OAUDREY_DEPLOYMENT_STANDARD.md`](OAUDREY_DEPLOYMENT_STANDARD.md), [`MVI_CONTRACT_STANDARD.md`](MVI_CONTRACT_STANDARD.md)

---

## Purpose

A daily, agent-driven pipeline that turns high-volume social-media complaints into shipped, monetized products. The pipeline runs unattended, escalates only irreversible decisions to a human, and obeys every other Revvel standard (security, BOM gatekeeper, certs, Stripe, deployment, monitoring).

> **One sentence:** Listen → Cluster → Competitor-scan → ROI-gate → Route → BOM → Build → Certify → Monetize → Deploy → Market → Measure — every day, on cron, with the cheapest viable solution shape per problem.

---

## Pipeline Overview

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│  1. LISTEN (daily, cron)                                                     │
│     Social listening across X / Reddit / TikTok / YouTube comments / forums  │
│        ↓                                                                     │
│  2. CLUSTER & RANK                                                           │
│     Group complaints; rank by volume, recency, payability, blue-ocean score  │
│        ↓                                                                     │
│  3. COMPETITOR & REVIEW SCAN                                                 │
│     Existing products + reviews + SEO/SEM gaps + pricing                     │
│        ↓                                                                     │
│  4. ROI GATE  ← human approves only if irreversible                          │
│     Cost-to-build vs. addressable market vs. solution shape                  │
│        ↓                                                                     │
│  5. SOLUTION-SHAPE ROUTER                                                    │
│     PDF | one-button app | extension | skill | API | CLI | MCP | booklet    │
│        ↓                                                                     │
│  6. BOM GATEKEEPER                                                           │
│     Resolve every required asset/credential/API; auto-procure or flag        │
│        ↓                                                                     │
│  7. BUILD (per shape; existing revvel-standards)                             │
│        ↓                                                                     │
│  8. CERTIFY                                                                  │
│     Code-review, security, accessibility, store policies, legal/tax          │
│        ↓                                                                     │
│  9. MONETIZE                                                                 │
│     Stripe product + price + checkout + receipt + tax                        │
│        ↓                                                                     │
│ 10. DEPLOY                                                                   │
│     Highest-volume store(s) for that shape (research-driven)                 │
│        ↓                                                                     │
│ 11. MARKET                                                                   │
│     SEO/SEM + Meta/TikTok/etc. ads sized to projected volume                 │
│        ↓                                                                     │
│ 12. MEASURE                                                                  │
│     Sales, conversion, CAC, LTV, refunds, reviews → feed back into step 1   │
└──────────────────────────────────────────────────────────────────────────────┘
```

The pipeline is implemented as a chain of n8n / Make / Zapier / Gumloop workflows or GitHub Actions cron jobs (whichever is cheaper for that step — see [`CRON_SYSTEM.md`](CRON_SYSTEM.md)). Each step has a defined contract (input JSON, output JSON, success criteria) so steps are independently testable and replaceable.

---

## 1. Listen — Daily Social Research

| Source | Mechanism | Output |
|---|---|---|
| X / Twitter | `tavily` / `brave-search` MCP + public search | tweets w/ engagement |
| Reddit | Pushshift mirror / Reddit API | threads + comment counts |
| TikTok | TikTok Research API (or scraping fallback) | hashtags + comments |
| YouTube comments | YouTube Data API v3 | comments by video |
| Niche forums | RSS / scraping | thread headers |
| App store reviews | RSS feeds (App Store, Play Store) | low-star reviews |
| Amazon reviews | Keepa / public RSS | low-star reviews |

**Cron:** Daily at 02:00 UTC (overlaps with `ZERO_HUMAN_FRAMEWORK.md` schedule).
**Output:** `projects/agent-generated/_intake/<YYYY-MM-DD>.jsonl` — one normalized complaint per line:

```json
{
  "id": "...",
  "source": "reddit|x|tiktok|youtube|appstore|amazon|forum",
  "url": "...",
  "captured_at": "2026-04-27T02:00:00Z",
  "text": "...",
  "engagement": {"likes": 0, "comments": 0, "shares": 0},
  "tags": ["sleep", "snoring", "cpap"]
}
```

**Mandatory:** Do not store PII. Strip @handles, redact emails/phone numbers before persisting.

---

## 2. Cluster & Rank

| Field | Definition | Source |
|---|---|---|
| `volume` | distinct authors / 30 days | listening output |
| `recency` | days-since-first-occurrence (newer = higher) | timestamps |
| `payability` | "would they pay?" 0–1 | LLM rubric |
| `blue_ocean` | inverse of competitor count | competitor scan |
| `score` | `volume × payability × (1 + blue_ocean) / max(1, days_old)` | computed |

Top N (default N=10) per day move to step 3.

---

## 3. Competitor & Review Scan

For each top-N problem:

1. Search the top 10 existing products that claim to solve it.
2. Pull their store pages, pricing, top SEO keywords, and last 200 reviews.
3. Summarize: **what users praise, what users complain about, what's missing, headline price.**
4. Compute SEO / SEM gap (high-volume keywords competitors are not bidding on or ranking for).
5. Emit a **brief** (`brief.md`) into the candidate's working folder.

---

## 4. ROI Gate

The ROI gate is the **only** mandatory human-touch step in the default pipeline (because it is irreversible spend). The gate runs automatically and sends a single Slack/email summary with a one-click approve/reject link.

| Input | Threshold |
|---|---|
| Estimated build cost (`PRICING.md` daily rates × shape multiplier) | reported |
| Estimated 90-day revenue (volume × payability × est. ASP) | reported |
| Auto-approve if `revenue / cost ≥ 5` and shape ∈ {PDF, MCP, CLI, skill} | yes |
| Otherwise | human approves |

Decisions are logged in [`DECISIONS-TODAY.md`](../DECISIONS-TODAY.md) and the longer-term [`DECISIONS.md`](../DECISIONS.md).

---

## 5. Solution-Shape Router

| Shape | Pick when… | Build standard |
|---|---|---|
| **PDF / booklet** | One-shot reference content; no state; SEO-driven discovery | [`shapes/PDF.md`](shapes/PDF.md) |
| **CLI** | Developers; one binary; brew/scoop install | [`shapes/CLI.md`](shapes/CLI.md) |
| **MCP server** | LLM agents will call it | [`shapes/MCP.md`](shapes/MCP.md) |
| **API** | Other devs will call it; recurring revenue likely | [`shapes/API.md`](shapes/API.md) |
| **Agent skill** | Reusable procedure for ClawBot / OpenHands / other agents | [`shapes/SKILL.md`](shapes/SKILL.md) |
| **Excel / spreadsheet** | Business users; template-driven; data-heavy | [`shapes/EXCEL.md`](shapes/EXCEL.md) |
| **Token / credits** | Usage-based access; prepaid credits; gated content | [`shapes/TOKEN.md`](shapes/TOKEN.md) |
| **Full app** | Only when ROI gate strongly justifies | [`shapes/APP.md`](shapes/APP.md) |
| **Browser extension** | In-page action against a vendor site | `templates/agent-generated-product/build/extension/` |
| **Alexa/Google skill** | Voice-first, hands-free, household | shape-specific publish step |

The router output is a single string (`shape`) that selects the build standard and the deploy targets for steps 7 and 10. Each shape standard in [`shapes/`](shapes/README.md) defines the full lifecycle: research, create, design (Figma), publish, and required connections.

---

## 6. BOM Gatekeeper Integration

> **Full standard:** [`GATEKEEPER.md`](GATEKEEPER.md) — covers BOM validation, API/MCP registry, auto-provisioning, rotation scheduling, Kong integration, and drift detection.

Every candidate product MUST emit a `BOM.md` listing every required dependency (API key, hardware, font, asset, account, integration) before step 7 runs.

The Gatekeeper (enforced via [`.github/workflows/credential-gatekeeper.yml`](../.github/workflows/credential-gatekeeper.yml), [`templates/cicd/bom-self-heal.yml`](../templates/cicd/bom-self-heal.yml), and the central [`docs/_GATEKEEPER_REGISTRY.json`](../docs/_GATEKEEPER_REGISTRY.json)) runs against the product's `BOM.md`:

1. Reads `BOM.md`.
2. Cross-references [`docs/_GATEKEEPER_REGISTRY.json`](../docs/_GATEKEEPER_REGISTRY.json), [`docs/_MASTER_BOM.md`](../docs/_MASTER_BOM.md), and [`docs/_MASTER_INVENTORY.md`](../docs/_MASTER_INVENTORY.md).
3. For every line:
   - **already-have:** mark `✅ on hand`, add product to registry entry's `used_by`.
   - **purchasable autonomously** (free APIs, FOSS, ≤ $20/mo budgeted): Provisioner auto-procures, stores in Doppler, registers in Gatekeeper registry, syncs to GitHub Secrets.
   - **needs purchase or human action:** open an issue on `midnghtsapphire/revvel-standards` labeled `bom-block` with the missing item; pipeline pauses for that product only.
4. When all items are `✅`, the gatekeeper sets `bom_ready: true` in the product's `state.json` and the pipeline resumes.
5. **Post-build:** All provisioned credentials are tracked for rotation per [`GATEKEEPER.md`](GATEKEEPER.md) §4 (Rotator).

**Mandatory rule:** No build step may run while `bom_ready: false`.

---

## 7. Build — Per Shape

Each shape has a build standard already defined in this repo. Per-product builds live under:

```text
projects/agent-generated/<product-slug>/
  build/
    src/                # source code, scaffolded from the shape's template
    tests/              # mandatory; non-zero coverage gate
    Dockerfile          # required for any service shape
```

**Build gates (must all pass before step 8):**

- Lint clean (`ruff` / `eslint`).
- Tests pass with ≥ 60% coverage on new code.
- `recurse-rules.md` clean (RecurseML).
- No secrets in source (`gitleaks`).
- TypeScript: `strict: true`, no `any`.

---

## 8. Certify

| Cert | Required for | Tool |
|---|---|---|
| Code review | every shape | `code-review` skill / `validate_deployment_readiness` |
| Security scan | every shape | `security` skill (OWASP, Snyk-equivalent FOSS) |
| Accessibility | UI shapes | `accessibility` skill (WCAG 2.1 AA) |
| Store policy | extension / skill / app store / Play Store | shape-specific checklist |
| Tax / legal | any monetized shape | `tax-legal-agent` skill |
| Privacy policy + ToS | any product collecting input | autogen from `templates/legal/` |

Cert results are persisted to `<product>/certify/report.json`. Failures auto-create issues; the pipeline pauses that product until green.

---

## 9. Monetize — Stripe Wiring

Every shape gets a Stripe entry, even if "free" (so we can attach receipts and track conversions consistently):

1. Create Stripe **Product** with `metadata.product_slug = <product-slug>`.
2. Create one **Price** per pricing tier per [`PRICING.md`](PRICING.md) and [`SAAS_PRODUCTS.md`](SAAS_PRODUCTS.md).
3. Generate a **Payment Link** for each price; store in `<product>/monetize/links.json`.
4. Wire `checkout.session.completed` and `invoice.paid` webhooks to the org-wide event bus.
5. Tax: enable Stripe Tax on the product; store tax behavior in metadata.

**Idempotency key:** `product_slug` — re-runs never create duplicates.

---

## 10. Deploy — Highest-Volume Marketplaces

Deploy targets are **researched per shape** (the listening pipeline tracks where similar products earn the most). Defaults:

| Shape | Primary store(s) | Secondary |
|---|---|---|
| PDF / booklet | Gumroad, Etsy (digital), own site (Stripe) | Payhip, LemonSqueezy |
| One-button web app | own domain on DigitalOcean App Platform (`OAUDREY_DEPLOYMENT_STANDARD.md`) | ProductHunt launch |
| One-button mobile app | Apple App Store + Google Play (Expo EAS) | — |
| Extension | Chrome Web Store, Firefox Add-ons, Edge Add-ons | — |
| Alexa skill | Alexa Skills Store | Google Actions |
| API | RapidAPI, own docs site | Postman API Network |
| CLI | npm + Homebrew + Scoop | crates.io / pypi if applicable |
| MCP server | mcp.so registry, GitHub release | — |

Each store has a publish workflow under `templates/agent-generated-product/deploy/<store>/`. Deployment runs only if certify is green.

---

## 11. Market — SEO / SEM / Ads

For every shipped product:

1. Generate landing page with `seo-metadata` skill (Open Graph, JSON-LD product schema).
2. Submit sitemap to Google Search Console + Bing Webmaster Tools.
3. SEM: bid on the gap-keywords identified in step 3 (Google Ads + Bing Ads).
4. Social ads sized to projected volume (Meta + TikTok + sometimes Pinterest depending on shape):
   - Initial daily budget = `min($20, est_daily_revenue / 5)`. The `/5` caps ad spend at **20% of projected daily gross** so a unit-economics-positive product (≥ 5x cost-to-build ROI gate at step 4) cannot bleed money on launch even if conversion underperforms. The `$20` floor lets cheap shapes (PDF, MCP, CLI) buy enough impressions to learn before the budget loop converges.
   - Auto-pause creatives below 1% CTR after 1,000 impressions.
5. UTM tagging: `utm_source=<store>&utm_medium=<channel>&utm_campaign=<product-slug>-<launch|evergreen>`.
6. Affiliate links: register product with `rvvel-affiliate-links` MCP so other Revvel content can earn on it.

---

## 12. Measure — Sales & Marketing Stats

A single dashboard (Notion + Stripe + Plausible/PostHog) tracks per product:

| Metric | Source | SLA |
|---|---|---|
| Units sold | Stripe | live |
| Gross revenue | Stripe | live |
| Refund rate | Stripe | rolling 30d |
| Conversion rate | landing-page analytics | rolling 7d |
| CAC | ad spend / paid conversions | rolling 7d |
| LTV | Stripe subscription / repurchase | rolling 90d |
| Reviews / rating | store APIs | daily |
| SEO position (top 5 keywords) | Search Console | weekly |

Numbers loop back into step 2's `payability` weighting so the pipeline learns over time.

---

## Repository Layout for Agent-Generated Products

The pipeline writes every candidate and shipped product to a single, predictable folder structure (the same shape used by `templates/agent-generated-product/`):

```text
projects/agent-generated/
  _intake/                   # daily listening output (jsonl)
  _index.md                  # human-readable list of candidates and ships
  <product-slug>/
    state.json               # current pipeline step + flags (bom_ready, certified, …)
    research/                # complaints, competitors, reviews, SEO gap
      brief.md
    decision/                # ROI gate inputs/outputs, approval log
      roi.json
    build/                   # source for the chosen shape
    certify/                 # cert reports (code, security, a11y, store, legal)
    monetize/                # stripe products + price + payment links
    deploy/                  # per-store publish manifests + receipts
    market/                  # ad accounts, creatives, SEM keyword sets
    sales/                   # daily snapshots of measure-step metrics
    BOM.md                   # this product's bill of materials
```

This folder is created by `scripts/init-product.sh <slug>` (which copies from `templates/agent-generated-product/`).

---

## Cron Schedule

| Step | Cron | Where it runs |
|---|---|---|
| 1 Listen | `0 2 * * *` | n8n (or `.github/workflows/listen.yml`) |
| 2 Cluster + 3 Competitor scan | `30 2 * * *` | n8n |
| 4 ROI gate notification | `0 8 * * *` (after Audrey's morning) | n8n + Slack/email |
| 5–7 Build | event-driven on ROI approval | GitHub Actions |
| 8 Certify | event-driven on build green | GitHub Actions |
| 9 Monetize | event-driven on certify green | GitHub Actions |
| 10 Deploy | event-driven on monetize green | GitHub Actions |
| 11 Market | event-driven on deploy green + daily 0 12 ** * for budget review | n8n + GitHub Actions |
| 12 Measure | `0 * * * *` (hourly snapshot) + `0 6 * * *` (daily roll-up) | n8n |

All cron jobs comply with [`CRON_REQUIREMENTS.md`](CRON_REQUIREMENTS.md) and [`CRON_SYSTEM.md`](CRON_SYSTEM.md): they emit heartbeats, fail loudly, and self-heal on the next tick.

---

## Acceptance Criteria for "The Pipeline Is Live

- [ ] `skills/product-pipeline/` is registered in `skills/REGISTRY.md` and `skills/SKILLS_INDEX.yml`.
- [ ] `templates/agent-generated-product/` exists with the canonical layout above.
- [ ] `scripts/init-product.sh <slug>` scaffolds a new product folder.
- [ ] At least one full dry-run candidate folder exists under `projects/agent-generated/_examples/`.
- [ ] Listening cron is wired (n8n or Action) and writes to `_intake/`.
- [ ] BOM gatekeeper recognizes per-product `BOM.md`.
- [ ] Stripe wiring uses `product_slug` as idempotency key.
- [ ] Marketing budget rule (`min($20, est_daily_revenue / 5)`) is enforced.

---

## What This Standard Replaces

Nothing. This standard composes existing standards (`SAAS_PRODUCTS.md`, `ZERO_HUMAN_FRAMEWORK.md`, `PRICING.md`, `CRON_SYSTEM.md`, `OAUDREY_DEPLOYMENT_STANDARD.md`, `MVI_CONTRACT_STANDARD.md`) and existing skills (`product-pipeline`, `vault-agent`, `code-review`, `security`, `accessibility`, `seo-metadata`, `tax-legal-agent`, `error-reporting`, `deployment`, `mvi-contract`) into a single, named pipeline so every agent in every Revvel repo executes it the same way.

---

## ADDED: Money & Execution Ethic

### Monetization First
- **Ship to monetize in 24 hours** — not months
- **$1 day 1** — free then paid, upsell always
- **If it doesn't make money, kill it** — fast feedback loop
- **Revenue > vanity** — real users, real payments

### Extreme Programming Ethic
1. **One iteration** — ship complete, not perfect
2. **Test in production** — real data, real feedback
3. **Break things fast** — learn faster
4. **No meetings** — code talks
5. **No specs** — specs emerge from shipping
6. **Perfect is the enemy of done**
7. **Done means paid**
8. **Ship daily** — automate everything
9. **Automate or die** — manual = failure
10. **Revenue is the only metric**

### The Rule
- Create → Ship → Monetize → Iterate → Scale
- Skip any step = failure
- Reverse any step = failure

---

*ADDED: Phase 1 upgrade ($3k → $10k/month) + execution ethic*
