# WR: Life Insurance Lead Generation Engine

**Issue:** #13476-life-insurance  
**Repository:** [midnghtsapphire/revvel-standards](https://github.com/midnghtsapphire/revvel-standards)  
**Research Date:** 2026-05-16  
**Researcher:** Copilot Coding Agent + OpenRouter  
**WR Status:** ✅ Complete

---

## Executive Summary

This Work Request defines the architecture and deployment plan for an AI-powered **Life Insurance Lead Generation Engine**. The engine autonomously sources, qualifies, and compiles high-intent prospective life insurance buyers using publicly available life-event data (birth records, new homeowner filings, business formation records, etc.). Leads are packaged as small, curated **PDF batches of 10–20 exclusive leads** priced at **$40–$100 per PDF**, with a no-duplicates guarantee. The product is distributed via a landing page where buyers can request life insurance quotes, and through Polar.sh / Gumroad digital delivery. Birth and death record–sourced leads carry a lower per-lead price point due to higher cold-outreach effort required.

---

## Step 1: Repository Discovery

### Repository Metadata

| Property | Value |
|----------|-------|
| Repository | [midnghtsapphire/revvel-standards](https://github.com/midnghtsapphire/revvel-standards) |
| Created | 2026-05-16 |
| Last Updated | 2026-05-16 |
| Primary Language | JavaScript |
| Stars | 0 |
| Open Issues | Active |
| Description | SSOT standards, templates, and automation |
| Private | False |
| Archived | False |

### Current Status

- **Active Development:** Yes
- **Last Commit:** Added UI Creation Engine framework
- **Open PRs:** Tracking this WR
- **Deployment Status:** GitHub Actions automation
- **CI/CD Status:** Passing

### Repository Structure (Proposed)

```
scripts/
  life-insurance-lead-engine.js       ← Orchestrator script
  life-insurance-lead-qualifiers.js   ← Scoring & filtering logic
  life-insurance-pdf-builder.js       ← PDF batch builder (10–20 leads/PDF)
.github/workflows/
  life-insurance-lead-engine.yml      ← GitHub Actions trigger
docs/
  LIFE_INSURANCE_LEAD_ENGINE_GUIDE.md ← Usage documentation
landing/
  index.html                          ← Quote request landing page
```

### Key Technologies

- **Frontend:** Landing page (static HTML + form) for inbound quote requests
- **Backend:** Node.js (native `fetch`, no extra scraping libs needed)
- **PDF Generation:** pandoc / wkhtmltopdf — 10–20 leads per PDF batch
- **Database:** CSV / JSON output files, optional CRM webhook delivery
- **AI Layer:** OpenRouter (multi-model swarm: Scout → Qualify → Compile)
- **Deployment:** GitHub Actions
- **CI/CD:** GitHub Actions

---

## Step 2: Life Insurance Market Research

### Who Buys Life Insurance — Trigger Events

Life insurance leads are highest-intent when tied to specific life events. The engine focuses on identifying and surfacing these trigger moments:

| Life-Event Trigger | Lead Signal | Qualification Weight |
|-------------------|-------------|----------------------|
| New baby / pregnancy | Social posts, registry data | Very High |
| Recent marriage | Public records, social announcements | Very High |
| Home purchase | County deed / mortgage filings | High |
| Job change / promotion | LinkedIn activity | High |
| Age milestone (25, 30, 35, 40) | Census + social enrichment | Medium |
| Business formation | Secretary of State filings | Medium |
| Divorce / remarriage | Public court records | Medium |
| Retirement planning (50–64) | LinkedIn, AARP mentions | High |

### Target Audience Segments

1. **Young Families (Ages 25–40):** Recently married or new parents seeking term life coverage.
2. **New Homeowners:** Purchasing a home commonly triggers mortgage protection / life insurance interest.
3. **Small Business Owners:** Key-person insurance, buy-sell agreements, business continuity.
4. **Pre-Retirees (Ages 50–64):** Whole life, final expense, and annuity-adjacent products.
5. **Self-Employed Professionals:** No employer group coverage; high receptivity to individual plans.

### Lead Source Strategy

> **Compliance Note:** All sources used are limited to officially published public records, open government data portals, and licensed API programs. LinkedIn data is accessed exclusively via LinkedIn's paid API program (~$100/mo) — leads are **not scraped** from LinkedIn. Obituary / final-expense outreach targets bereaved *family members* only when publicly listed as estate contacts in official notices, and must comply with all applicable state solicitation laws before any outreach.

| Source Type | Method | Data Points Extracted | Lead Tier |
|-------------|--------|-----------------------|-----------|
| County Recorder / Deed Records | Official county open-data portals | Name, address, purchase date, mortgage amount | Warm ($40–$100/PDF) |
| State Business Filings | Secretary of State open data | Business owner name, registration date, address | Warm ($40–$100/PDF) |
| Vital Records — Birth Notices | State/county public birth announcement feeds | Parent name(s), city, approximate birth date | Cold ($25–$40/PDF) |
| Vital Records — Death / Estate Notices | Official county probate notices, newspaper legal notices | Surviving family member(s), estate contact, city | Cold ($25–$40/PDF) |
| Marriage License Records | County clerk open-data portals | Couple names, city, license date | Warm ($40–$100/PDF) |
| LinkedIn | LinkedIn paid API program (~$100/mo) — **not scraped** | Job title, employer, location, recent activity | Warm ($40–$100/PDF) |

### Competitors & Market Positioning

| Competitor | Type | Cost | Gap |
|------------|------|------|-----|
| EverQuote | Aggregator marketplace | $20–$60 per lead | Real-time only, no bulk historical |
| TransUnion TLO | Data broker | $500+/mo | Expensive; overkill for small IMOs |
| LeadIQ / Apollo | B2B focus | $99+/mo | Not life-insurance-specific |
| Datalot | Insurance-focused | Custom pricing | Locked ecosystem |
| **This Engine** | Autonomous, open | Infrastructure cost only | Open-source, customizable, niche-targeted |

### Revenue & Monetization

#### Product: Curated PDF Lead Packs

Each PDF contains **10–20 exclusive, de-duplicated leads** tied to a single life-event trigger and state. Leads are guaranteed unique across all previously sold PDFs (no duplicates).

| Product Tier | Source Type | Leads per PDF | Price per PDF | Price per Lead |
|-------------|-------------|--------------|--------------|----------------|
| Warm Leads Pack | New homeowner, marriage, new business | 10–20 | $40–$100 | $4–$10 |
| Cold Leads Pack | Birth notices, death/estate notices | 10–20 | $25–$40 | $2–$4 |

**Why lower pricing for birth/death record leads:** These require higher outreach effort from the buyer (cold contact, longer conversion cycle), so the per-lead price reflects the added friction.

**No-Duplicates Guarantee:** A central deduplication registry tracks all leads sold across all PDFs to ensure the same contact is never resold.

#### Landing Page — Inbound Quote Requests

A static landing page (`landing/index.html`) captures inbound prospects who are actively requesting a life insurance quote. These are the highest-intent leads.

- **Flow:** Visitor fills out name, state, phone/email, coverage type → submission is recorded → compiled into the next available PDF batch
- **Pricing for inbound leads:** Premium tier — these are self-identified, high-intent buyers. Price per PDF of 10 inbound leads: **$75–$150**
- **Platform:** Deploy via Vercel / GitHub Pages. Form backed by a GitHub Actions webhook or Make.com automation.

#### Sales Channels

1. **Polar.sh / Gumroad digital storefront** — Browse and buy PDFs by state + trigger type
2. **Landing page upsell** — Buyers landing on the quote page are offered related PDFs
3. **Direct / repeat buyers** — Insurance agents subscribe to get weekly fresh PDF batches: **$99–$199/mo**

**Revenue Target:** $1k–$3k/month (Month 1–2), scaling to $5k–$10k+/month (Month 4+) as PDF catalog and storefront grow

---

## Step 3: Technical Architecture

### OpenRouter Swarm Design

The engine uses a three-role swarm:

```
[ Scout Agent ]    →    [ Qualifier Agent ]    →    [ Compiler Agent ]
  Searches for            Scores each lead              Outputs structured
  raw prospect            against trigger                CSV / JSON with
  signals from            criteria and life-             enriched fields
  public sources          event relevance                ready for outreach
```

**Roles:**

| Role | OpenRouter Model | System Prompt Focus |
|------|-----------------|---------------------|
| Scout | `mistralai/mistral-7b-instruct` | "Find public signals of this life-event trigger type" |
| Qualifier | `openai/gpt-4o-mini` | "Score this lead 1–10 for life insurance intent based on..." |
| Compiler | `anthropic/claude-haiku` | "Format these qualified leads into a clean JSON array with fields: name, location, trigger, score, source_url" |

### Orchestrator Script — `scripts/life-insurance-lead-engine.js`

```javascript
// Pseudocode outline — implement per revvel-standards Node.js patterns
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const LINKEDIN_API_KEY = process.env.LINKEDIN_API_KEY; // LinkedIn paid API program (~$100/mo)

async function runLeadEngine({ triggerType, state, batchSize = 20 }) {
  // 1. Scout Phase: query public sources and LinkedIn API for trigger signals
  const rawSignals = await scoutAgent({ triggerType, state });

  // 2. Qualify Phase: score each signal for life insurance intent
  const qualifiedLeads = await qualifierAgent({ signals: rawSignals });

  // 3. TCPA filter: only include leads flagged tcpa_compliant: true
  const tcpaLeads = qualifiedLeads.filter(lead => lead.tcpa_compliant === true);

  // 4. Deduplicate: remove any leads already sold in previous batches
  const newLeads = await deduplicateLeads(tcpaLeads);

  // 5. Compile Phase: take top batchSize leads and structure output
  const batch = newLeads.slice(0, batchSize);
  const output = await compilerAgent({ leads: batch });

  // 6. Build PDF (10–20 leads per file) and mark leads as sold
  const pdfPath = await buildLeadPDF(output, { triggerType, state });
  await markLeadsAsSold(output);

  console.log(`✅ ${output.length} TCPA-compliant leads compiled → ${pdfPath}`);
}
```

**CLI Usage:**
```bash
node scripts/life-insurance-lead-engine.js \
  --trigger=new-homeowner \
  --state=TX \
  --batch-size=20
```

### GitHub Actions Workflow — `.github/workflows/life-insurance-lead-engine.yml`

```yaml
name: Life Insurance Lead Engine

on:
  workflow_dispatch:
    inputs:
      trigger_type:
        description: 'Life-event trigger (new-homeowner, marriage, new-business, birth-record, death-record)'
        required: true
        default: 'new-homeowner'
      state:
        description: 'US state abbreviation (e.g. TX, FL, CA)'
        required: true
        default: 'TX'
      batch_size:
        description: 'Number of leads per PDF (10–20 recommended)'
        required: false
        default: '20'

permissions:
  contents: read
  issues: write

jobs:
  generate-leads:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run Life Insurance Lead Engine
        env:
          OPENROUTER_API_KEY: ${{ secrets.OPENROUTER_API_KEY }}
          LINKEDIN_API_KEY: ${{ secrets.LINKEDIN_API_KEY }}
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          node scripts/life-insurance-lead-engine.js \
            --trigger=${{ github.event.inputs.trigger_type }} \
            --state=${{ github.event.inputs.state }} \
            --batch-size=${{ github.event.inputs.batch_size }} || {
              echo "::warning::Lead engine run failed - review logs"
              gh issue create \
                --title "[WR] Life Insurance Lead Engine run failed" \
                --label "Wr" \
                --body "Trigger: ${{ github.event.inputs.trigger_type }} | State: ${{ github.event.inputs.state }}"
            }

      - name: Upload Lead PDF
        uses: actions/upload-artifact@v4
        with:
          name: life-insurance-leads-${{ github.event.inputs.state }}-${{ github.event.inputs.trigger_type }}
          path: dist/leads/
          retention-days: 30
```

### Lead Output Schema

Each compiled lead record contains:

```json
{
  "id": "lead-uuid",
  "first_name": "string",
  "last_name": "string",
  "state": "TX",
  "city": "string",
  "trigger_type": "new-homeowner",
  "trigger_date": "YYYY-MM-DD",
  "intent_score": 8,
  "lead_tier": "warm",
  "source": "county-deed-record",
  "source_url": "https://...",
  "verified": true,
  "tcpa_compliant": true,
  "pdf_batch_id": "TX-new-homeowner-2026-05-16-batch-001",
  "sold": false,
  "exported_at": "ISO-8601 timestamp"
}
```

**PDF Batch:** Each generated PDF contains 10–20 records. The `pdf_batch_id` links all leads in a given PDF and is used by the deduplication registry to prevent reselling the same contact.

---

## Step 4: Requirements from revvel-standards

### Prime Directive Alignment

| Metric | Value |
|--------|-------|
| 10M by 2030 contribution path | PDF lead pack sales + inbound landing page + subscription |
| $2,000+/month target (May 2026) | Achievable Month 1–2: selling 30–50 PDFs/mo at $40–$100 each |
| Autonomy level | High — GitHub Actions generates + exports PDF on demand |
| Time to first revenue | ~1–2 weeks post-deployment |

### Obsessive Autonomy Assessment

**Current Autonomy Level:** Not Yet Implemented

**Required for Full Autonomy:**
1. `scripts/life-insurance-lead-engine.js` — Core orchestrator
2. `scripts/life-insurance-pdf-builder.js` — PDF batch builder (10–20 leads/PDF)
3. `.github/workflows/life-insurance-lead-engine.yml` — Trigger, build PDF, and upload artifact
4. `landing/index.html` — Inbound quote request landing page
5. Polar.sh / Gumroad product listing — Storefront for PDF sales
6. Deduplication registry (`dist/leads/sold-registry.json`) — No-duplicates guarantee

### Self-Healing Capabilities

**Required:**
- Exponential backoff for OpenRouter API rate limits (`429` responses)
- Idempotency check: skip re-running if output already exists for the same `{trigger_type}_{state}_{date}` combination
- Failure → auto-create GitHub Issue labeled `Wr` with actionable context

### Ship-to-Market Readiness

**Readiness Checklist:**
- [ ] Orchestrator script implemented
- [ ] PDF builder script implemented (10–20 leads per PDF)
- [ ] Deduplication registry implemented
- [ ] GitHub Actions workflow created
- [ ] Landing page deployed (inbound quote requests)
- [ ] Polar.sh / Gumroad product listings created
- [ ] At least one test run with real output
- [ ] Usage guide published
- [ ] README updated with lead engine section

---

## Step 5: Security & Compliance

### Data Privacy

| Concern | Mitigation |
|---------|------------|
| PII handling | Only surface officially published public records and data returned by licensed API programs; no scraping of gated/private systems |
| TCPA compliance | `tcpa_compliant: true/false` flag on every lead record; only leads with `tcpa_compliant: true` are included in exported PDFs; verified opt-out lists are filtered before each export |
| CAN-SPAM | Do not include email addresses unless sourced from a confirmed opt-in channel |
| FCRA | Lead PDFs are for sales/marketing outreach only; **not** for underwriting risk assessment, credit, employment, housing, or policy approval decisions |
| LinkedIn ToS | LinkedIn data accessed **only** via LinkedIn's paid API program (~$100/mo) — no scraping of LinkedIn profiles |
| Zillow / Redfin ToS | **Not used.** New homeowner data sourced only from official county recorder open-data portals |
| Death / estate outreach | Only official county probate legal notices used; outreach must comply with applicable state solicitation laws |
| Deduplication | Sold registry (`dist/leads/sold-registry.json`) ensures no contact is resold across PDF batches |

**Mandatory PDF Disclaimer (append to every exported PDF):**
> *"This lead list is compiled from publicly available government records and licensed data sources, and is intended for life insurance sales and marketing outreach only. All leads in this batch are flagged `tcpa_compliant: true`. It may not be used for underwriting risk assessment, policy approval, credit, employment, or housing decisions (FCRA). Verify compliance with applicable state and federal regulations (TCPA, CAN-SPAM, state solicitation laws) before contacting any individual. All contacts are exclusive to this PDF batch — no duplicates are knowingly resold."*

---

## Step 6: Implementation Tasks

### Immediate Actions

1. **Create `scripts/life-insurance-lead-engine.js`**  
   - Scout → Qualify → TCPA filter → Deduplicate → Compile pipeline
   - Sources: county deed records, marriage filings, SoS business filings, birth/death public notices, LinkedIn paid API  
   - Requires: `OPENROUTER_API_KEY`, `LINKEDIN_API_KEY` (LinkedIn paid API program, ~$100/mo)  
   - Effort: 4–6 hours

2. **Create `scripts/life-insurance-pdf-builder.js`**  
   - Accept array of 10–20 lead records → output a formatted PDF to `dist/leads/`  
   - Append the mandatory compliance disclaimer to every PDF  
   - Mark each lead as sold in `dist/leads/sold-registry.json`  
   - Effort: 2–3 hours

3. **Create `landing/index.html` — Quote Request Landing Page**  
   - Form: name, state, phone, email, coverage type (term / whole / final expense)  
   - Submission webhook → triggers GitHub Actions to compile inbound leads into a PDF batch  
   - Premium tier: inbound self-identified leads → $75–$150 per PDF of 10  
   - Effort: 2–3 hours

4. **Create `.github/workflows/life-insurance-lead-engine.yml`**  
   - `workflow_dispatch` with `trigger_type`, `state`, `batch_size` inputs  
   - Includes `GH_TOKEN` + `issues: write` permission for self-healing error issues  
   - Requires `OPENROUTER_API_KEY` and `LINKEDIN_API_KEY` secrets in repository settings  
   - Upload `dist/leads/*.pdf` as artifact  
   - Effort: 1–2 hours

5. **Write tests for TCPA filter and deduplication registry**  
   - Test: leads with `tcpa_compliant: false` are excluded from every PDF export  
   - Test: previously sold leads are filtered out from each new PDF batch  
   - Test: `sold-registry.json` is updated atomically after each export (handle concurrent writes if multiple batches run simultaneously)  
   - Test: no duplicates exist within a single PDF batch  
   - Effort: 1–2 hours

6. **Set up Polar.sh / Gumroad product listings**  
   - Separate listings by state + trigger type + tier (warm / cold)  
   - Connect to artifact download delivery  
   - Effort: 1 hour

### Short-Term Actions (Within 1–2 Weeks)

1. Add qualifier scoring tuned specifically to life insurance intent signals (new homeowner → mortgage protection, new baby → term life, etc.)
2. Implement batch pricing tiers: warm leads at $40–$100/PDF, cold (birth/death) leads at $25–$40/PDF
3. Add automated deduplication check against sold registry before every export

### Long-Term Actions (Within 1–2 Months)

1. Add OSINT pipeline integration for phone append and address verification
2. Build subscriber dashboard for agents to request on-demand PDF batches by state/trigger

---

## Step 7: Risks & Considerations

| Risk | Severity | Probability | Mitigation |
|------|----------|-------------|------------|
| OpenRouter rate limits | Medium | Medium | Exponential backoff; batch requests |
| Data quality / false positives | High | Medium | Qualifier agent scoring + spot-check before PDF is finalized |
| Legal compliance (state solicitation laws) | High | Low | Mandatory PDF disclaimer; legal review before launch in each state |
| Duplicate resale | High | Low | Sold registry enforced before every export; deduplication step in pipeline |
| Source instability (county open-data portals) | Medium | Medium | Abstract source layer; support fallback sources per state |
| Birth/death record data freshness | Medium | Medium | Query frequently; timestamp each lead with trigger_date |

---

## References

### Internal
- [AGENTS.md](/docs/AGENTS.md)
- [SECRETS_MANAGEMENT.md](/docs/SECRETS_MANAGEMENT.md)
- [WR_TEMPLATE.md](/wr/WR_TEMPLATE.md)
- [issue-13476 — General Lead Generation Engine](/wr/issues/issue-13476-lead-generation-engine-based-on-compilation-of-sou.md)

### External
- [OpenRouter API Docs](https://openrouter.ai/docs)
- [EverQuote Lead Marketplace](https://www.everquote.com/agents/)
- [TCPA Compliance Guide — NAIC](https://www.naic.org/)

---

## Status Summary

| Field | Value |
|-------|-------|
| Research Status | ✅ Complete |
| Implementation Status | 🟡 In Progress |
| Product Format | PDF packs of 10–20 exclusive leads |
| Pricing | $25–$40/PDF (cold: birth/death records) · $40–$100/PDF (warm: homeowner, marriage, business) |
| Revenue Potential | $1k–$3k/month (Month 1–2), $5k–$10k+/month (Month 4+) |
| Estimated Effort | 10–14 hours (scripts + landing page + workflow + storefronts) |
| Ship-to-Market Ready | After implementation tasks |
| Approval Required | @midnghtsapphire |

---

**Last Updated:** 2026-05-16  
**Next Review:** After `scripts/life-insurance-lead-engine.js` is implemented
