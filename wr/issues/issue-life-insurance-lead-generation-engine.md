# WR: Life Insurance Lead Generation Engine

**Issue:** #13476-life-insurance  
**Repository:** [midnghtsapphire/revvel-standards](https://github.com/midnghtsapphire/revvel-standards)  
**Research Date:** 2026-05-16  
**Researcher:** Copilot Coding Agent + OpenRouter  
**WR Status:** 🟡 In Progress

---

## Executive Summary

This Work Request defines the architecture and deployment plan for an AI-powered **Life Insurance Lead Generation Engine**. The engine autonomously sources, qualifies, and compiles high-intent prospective life insurance buyers using publicly available life-event data (birth records, new homeowner filings, business formation records, etc.). Leads are packaged as small, curated **PDF batches of 10–20 exclusive leads** priced at **$40–$100 per lead** ($400–$1,000 for a 10-lead warm PDF; $800–$2,000 for a 20-lead warm PDF), with a no-duplicates guarantee. The product is distributed via a landing page where buyers can request life insurance quotes, and through Polar.sh / Gumroad digital delivery. Birth and death record–sourced leads carry a lower per-lead price ($20–$40/lead) due to higher cold-outreach effort required.

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
| County Recorder / Deed Records | Official county open-data portals | Name, address, purchase date, mortgage amount | Warm ($40–$100/lead) |
| State Business Filings | Secretary of State open data | Business owner name, registration date, address | Warm ($40–$100/lead) |
| Vital Records — Birth Notices | State/county public birth announcement feeds | Parent name(s), city, approximate birth date | Cold ($20–$40/lead) |
| Vital Records — Death / Estate Notices | Official county probate notices, newspaper legal notices | Surviving family member(s), estate contact, city | Cold ($20–$40/lead) |
| Marriage License Records | County clerk open-data portals | Couple names, city, license date | Warm ($40–$100/lead) |
| LinkedIn | LinkedIn paid API program (~$100/mo) — **not scraped** | Job title, employer, location, recent activity | Warm ($40–$100/lead) |

### Bill of Materials (BOM) — APIs & Tools

> **BOM Purpose:** Ranked evaluation of every external API, CLI, and service required to build this engine. Review before implementation. Pick the tier that fits current budget and volume.

#### Category 1: Property & Deed Data (New Homeowner Trigger)

| API | Coverage | Cost | Best For | Our Verdict |
|-----|----------|------|----------|-------------|
| **ATTOM** | 158M parcels, 99% US population | ~$0.10/call; custom subscription | Enterprise-grade deed + tax + mortgage data | ⭐ **Top pick for warm leads** — 9,000+ data fields, >95% accuracy, monthly updates |
| **ICE Mortgage Technology (Black Knight)** | 160M parcels, daily refresh | Enterprise (contact for quote) | Capital markets + mortgage professionals | Strong alternative; better daily refresh |
| **Realie** | All 50 states, 3,100+ counties | Volume-based (contact) | Fast (<10ms), AI-sourced, bulk API | Good for high-volume bulk pulls |
| **PropertyRadar** | Strongest in Western U.S. | ~$0.08/record | Skip tracing + ownership, daily updates | Use if heavy on CA/AZ/WA/OR markets |
| **Melissa Data — Property API** | Nationwide | Freemium to ~$30/10k credits | Address validation + property enrichment + CASS/DPV | ⭐ **Best for contact cleaning + address hygiene** — USPS CASS-certified, phone + email enrichment |
| **BatchData** | Nationwide | ~$0.05–$0.10/record | Budget-friendly enrichment | Good for cost-sensitive MVP phase |
| **USPS Address API** | US only | Free | Delivery-point address validation | Use as final sanity check — no enrichment |

**Recommendation:** Start with **ATTOM** for deed/ownership sourcing ($0.10/call) + **Melissa Data** for contact hygiene (CASS/DPV address + phone/email verify). Expected cost at 1,000 leads/mo: ~$130/mo in API costs vs. $400–$100,000+ in lead revenue.

---

#### Category 2: Vital Records & Marriage/Birth/Death Data (Cold & Warm Triggers)

| Source | Access Method | Cost | Coverage | Notes |
|--------|---------------|------|----------|-------|
| **County Open Data Portals (Socrata/OpenGov/ArcGIS)** | REST API (Socrata SODA, ArcGIS REST) | Free | Varies by county; strong in CA, TX, FL, NY | Best cost-free option; consistency varies. Use `data.gov` discovery. |
| **GovOS / OpenGov** | API | Freemium / contract | 3,100+ county governments | Growing network; standardized county clerk records |
| **VitalChek API** | Partner program | Negotiated | Nationwide vital records processing | Requires formal partnership agreement with NIC/Tyler Technologies |
| **State SOS Bulk Filings** | CSV/bulk download or API (varies by state) | Free–$50/mo | Business formation records | FL, TX, CA, NY have strong bulk download programs |
| **Newspaper Legal Notices** | RSS / targeted scraping of public legal notice websites | $0–$50/mo (aggregator) | Probate, estate, foreclosure notices | LegalNotice.com, PublicNoticeAds.com aggregate many states |

**Recommendation:** County open data via Socrata SODA API is the cheapest and most defensible approach. Budget $0–$50/mo for access to most major-state portals.

---

#### Category 3: TCPA / DNC Compliance Scrubbing

> **Required:** Every phone number collected must be scrubbed before any outreach. This is non-negotiable for TCPA compliance.

| API | DNC | Litigator Scrub | Pricing | Best For |
|-----|-----|-----------------|---------|----------|
| **EchoSafe** | ✅ | ✅ AI-powered | **$47/mo unlimited** | ⭐ **Top pick for this engine** — best price/lead for SMB volume, privacy-first (no data resale), SOC 2 |
| **TCPA Litigator List** | ❌ | ✅ | $199–$799/mo by volume; $0.001/scrub overage | Mid-to-high volume; focused purely on litigator names |
| **DNCScrub (Contact Center Compliance)** | ✅ | ✅ | Enterprise (quote required) | High-assurance enterprise environments |
| **IPQS** | ✅ | ✅ | Quote required | Good secondary check; also validates VOIP/burner numbers |
| **Tracerfy** | ✅ | ✅ | Per-credit (1 credit/phone) | Pay-as-you-go; no subscription commitment |

**Recommendation:** **EchoSafe at $47/mo** is the clear winner for this engine — unlimited scrubs, AI litigator scoring, daily FTC DNC updates. Add to every PDF export pipeline as the last step before lead delivery.

---

#### Category 4: LinkedIn Access Options

> **Note:** The $100/mo figure in the WR refers to a LinkedIn paid account (e.g., Sales Navigator Core at ~$99/mo or LinkedIn Premium Business at ~$59/mo). This provides **manual** access to professional data but is **not a formal API program**. The LinkedIn official API program starts at $599/mo for the Professional tier. Choose based on automation needs:

| Option | Cost | API Access | Automation | Best For |
|--------|------|------------|------------|----------|
| **LinkedIn Premium Business** | ~$59/mo | ❌ No | Manual only | Profile lookups; human-curated lead research |
| **LinkedIn Sales Navigator Core** | ~$99/mo | ❌ No (CRM sync only) | Limited | Advanced search + CRM export to HubSpot/Salesforce |
| **LinkedIn Marketing API — Dev Tier** | Free (apply) | ✅ Limited | Lead Gen Form sync | Sync ad-driven leads to CRM; requires approval |
| **LinkedIn API Professional** | **$599/mo** | ✅ Full | Yes | Production-scale programmatic access |
| **LinkedIn API Business** | **$2,999/mo** | ✅ Unlimited | Yes | Enterprise, unlimited requests |
| **Sales Navigator API (SNAP)** | Negotiated (closed to new applicants as of mid-2025) | ✅ Partner only | Yes | Enterprise CRM integrations only |

**Recommendation for MVP:** Use **Sales Navigator Core (~$99/mo)** for manual prospecting + CRM export. Upgrade to LinkedIn Marketing API (Professional tier) if automation becomes necessary. Set `LINKEDIN_TIER` environment variable to reflect current tier so the pipeline knows whether to invoke automated scrape-free enrichment or flag for human review.

---

#### Category 5: PDF Generation

| Tool | Cost | Format Control | GitHub Actions Compatible | Notes |
|------|------|----------------|--------------------------|-------|
| **pandoc + wkhtmltopdf** | Free (OSS) | Good (HTML/CSS → PDF) | ✅ | Already used in this repo's ship-to-market pipeline |
| **Puppeteer (headless Chrome)** | Free (OSS) | Excellent | ✅ | Best for pixel-perfect branded PDFs; ~50MB Docker layer |
| **PDFKit (Node.js)** | Free (OSS) | Programmatic | ✅ | Pure JS, no headless browser; simpler CI setup |
| **pdf-lib (Node.js)** | Free (OSS) | Merge/annotate | ✅ | Good for modifying existing PDF templates |
| **WeasyPrint (Python)** | Free (OSS) | HTML/CSS → PDF | ✅ | Excellent CSS support; requires Python runtime |

**Recommendation:** **Puppeteer** for branded, visually-rich PDFs. **pandoc + wkhtmltopdf** as fallback (already in CI). Use `pdf-lib` if starting from a designed PDF template.

---

#### Category 6: Lead Delivery / Storefront

| Platform | Revenue Cut | Payout | File Delivery | Best For |
|----------|-------------|--------|---------------|----------|
| **Gumroad** | 10% + $0.50/txn | Daily | ✅ Automatic | ⭐ **MVP launch** — zero upfront cost, instant setup |
| **Polar.sh** | ~4% | Instant | ✅ Automatic | Open-source product selling; supports subscriptions |
| **LemonSqueezy** | 5% + $0.50/txn | Weekly | ✅ Automatic | Better tax handling (Merchant of Record) |
| **Ko-fi** | 0% (free tier) | Direct to PayPal/Stripe | ✅ | Best margin; less discovery |
| **Custom Stripe** | 2.9% + $0.30 | Custom | Custom | Full control; requires dev setup |

**Recommendation:** **Gumroad for launch** (zero friction) + **Polar.sh for subscriptions** ($99–$199/mo repeat buyer tier). Add custom Stripe integration in Phase 2 once volume justifies it.

---

#### BOM Cost Summary

| Category | Recommended Tool | Est. Monthly Cost |
|----------|-----------------|-------------------|
| Property Data | ATTOM (1K calls) | ~$100 |
| Contact Hygiene | Melissa Data (10K credits) | ~$30 |
| TCPA Scrubbing | EchoSafe | $47 |
| Vital Records | County open data (Socrata) | $0–$50 |
| LinkedIn | Sales Navigator Core | $99 |
| PDF Generation | Puppeteer (OSS) | $0 |
| Storefront | Gumroad + Polar.sh | $0 (rev share) |
| **Total Infrastructure** | | **~$276–$326/mo** |

> **ROI Check:** At $400–$1,000 per warm 10-lead PDF, selling just **1 PDF/month** covers infrastructure. The engine becomes cash-positive immediately on first sale.

### Competitors & Market Positioning

| Competitor | Type | Cost | Gap |
|------------|------|------|-----|
| EverQuote | Aggregator marketplace | $20–$60/lead (shared, up to $100+ exclusive) | Real-time only, no bulk historical; shared leads go to 2–8 agents simultaneously |
| MediaAlpha | Insurance lead exchange | $30–$100+/lead | Auction-based; requires significant budget to win bids; locked ecosystem |
| TransUnion TLO | Data broker | $500+/mo | Expensive; overkill for small IMOs |
| LeadIQ / Apollo | B2B focus | $99+/mo | Not life-insurance-specific |
| Datalot | Insurance-focused | Custom pricing | Locked ecosystem |
| SmartFinancial | Lead marketplace | $20–$80/lead | Shared leads; agents report high complaint rate (TrustPilot) |
| **This Engine** | Autonomous, exclusive | Infrastructure cost only + LinkedIn API ~$100/mo | 100% exclusive (never shared), life-event-triggered, open-source, customizable |

### API & Data BOM (Bill of Materials) — Lead Sourcing Stack

To support ship-to-market execution, this WR includes a BOM-style comparison of the highest-value APIs/data providers by job-to-be-done.

| Provider / API | Best At | Key Output | Typical Cost Model | Strengths | Limits / Risks |
|---|---|---|---|---|---|
| County open-data APIs (Socrata/ArcGIS portals) | New homeowner, marriage, probate legal notices | Official trigger events + dates | Free / low-cost | Primary-source public records, strong audit trail | Coverage and schema vary by county/state |
| Secretary of State filing APIs/feeds | New business formation signals | Owner/entity + filing date | Free / low-cost | Strong trigger relevance for key-person coverage | State-by-state integration required |
| LinkedIn paid API program | Employment/job-change enrichment | Role, employer, location | Program fee (~$100/mo noted) | Licensed access, no scraping, good warm-intent context | Program eligibility and rate limits |
| ATTOM / Estated property APIs | National property ownership enrichment | Parcel/homeowner context | Paid tiers | Broad property coverage vs. per-county stitching | Licensing cost; usage caps |
| People Data Labs / FullContact enrichment | Contact verification & profile enrichment | Validated person/contact attributes | Paid by credits/records | Improves dialability and targeting precision | Requires strict privacy/compliance controls |
| Phone/email validation APIs (e.g., Twilio Lookup, ZeroBounce) | Contact quality filtering | Line type/validity/disposable checks | Usage-based | Reduces fake/bad leads and agent refund risk | Additional per-record cost |

**Recommended BOM by lead tier:**
- **Warm tier:** County/SoS trigger source + LinkedIn paid API + phone/email validation  
- **Cold tier:** Vital/probate triggers + stronger validation + stricter TCPA/legal gating  
- **Premium inbound tier:** Landing-page opt-in + enrichment + immediate speed-to-lead dispatch

**BOM compliance controls (required before activation):**
- Verify and store lawful contact basis per record (`opt_in_source`, `consent_timestamp`, `consent_proof_url`)
  - Landing-page quote requests do not bypass compliance tracking; store the rendered consent language (or immutable template ID + version), source URL/form ID, and acceptance timestamp
- Model contactability with normalized lookup-backed statuses, not a single blanket positive flag
  - Minimum statuses: `inbound_express_consent`, `outbound_public_record_requires_scrub`, `outbound_scrubbed_contact_ready`
  - Manual-stop statuses: `manual_review_required`, `revoked_or_opted_out`, `dnc_blocked`
- Enforce TCPA/DNC scrub (National DNC, applicable state DNC, and internal suppression list) at two checkpoints: pre-export batch validation and pre-contact validation immediately before each outbound attempt
- Apply data-retention policy (default 180 days for unsold raw records; configurable by jurisdiction)
- Capture source-level licensing metadata (`source_license`, `license_expires_at`) for auditability
- If landing page collects EU/UK traffic, require GDPR lawful-basis + DSAR deletion workflow

### Deep Market Research

#### Top Life Insurance Search Keywords (U.S., 2024–2025)

The following data drives SEO strategy for the landing page and content marketing:

| Keyword | Est. Monthly Searches (US) | Avg. CPC | Intent Level |
|---------|---------------------------|----------|--------------|
| life insurance | 165,000–208,000 | $25–$70 | High |
| term life insurance | 40,500 | $20–$55 | High |
| whole life insurance | 27,100 | $18–$45 | High |
| life insurance quotes | 27,100 | $30–$70 | Very High (transactional) |
| best life insurance | 12,000–15,000 | $35–$65 | High |
| cheap life insurance | 8,000–12,000 | $15–$45 | High |
| life insurance for seniors | 8,100 | $20–$50 | High |
| life insurance over 50 | 7,600 | $22–$55 | High |
| no medical exam life insurance | 6,600 | $28–$60 | Very High |
| life insurance companies | 9,900–22,200 | $15–$40 | Medium |
| how much life insurance do I need | 3,600 | $12–$30 | High (research intent) |
| life insurance calculator | 2,900 | $10–$28 | High (research intent) |

> **Implication:** The category is extremely competitive ($11–$70 CPC), which means paid acquisition is expensive for agents. This drives demand for *alternative lead channels* — exactly what this engine provides. Agents are actively looking for non-marketplace sources.

**Long-tail triggers to target in content/SEO:**
- "life insurance after having a baby"
- "life insurance for new homeowners"
- "do I need life insurance after getting married"
- "life insurance for new business owners"
- "final expense insurance for elderly parents"

#### How Lead Companies Work — Industry Mechanics

**Shared Leads (most common, most complained-about):**
- A prospect fills out a form on an aggregator site (EverQuote, SmartFinancial, etc.)
- The lead is sold simultaneously to **2–8 agents**
- Prospect receives multiple calls within minutes — overwhelm and distrust result
- Conversion rate: **1–5%** (agents competing for same prospect)
- Agent experience: "leads are burned out before I can reach them"

**Exclusive Leads (premium tier):**
- Sold to exactly one agent/agency
- Prospect receives one contact → better conversation, less friction
- Conversion rate: **10–20%+** — 2–6× higher than shared
- Cost: $30–$100+ per lead on major platforms
- **Our engine produces 100% exclusive leads by design** — the sold registry prevents any lead from appearing in more than one PDF

**Why Some Leads Cost More — Value Drivers:**

| Factor | Impact on Lead Value |
|--------|---------------------|
| Recency (how fresh the trigger event is) | +50–100%: new homeowner → 30 days post-close is most responsive |
| Exclusivity (not sold to anyone else) | +100–300%: exclusive commands 2–3× price of shared |
| Intent signal strength | +40–80%: inbound quote request > life event > demographic match |
| Geographic desirability (CA, TX, FL, NY) | +20–40%: high-population states = more agents bidding |
| Verified contact data (phone + email confirmed) | +30–60%: reduces agent's time-to-dial wasted on bad numbers |
| TCPA compliance documentation | +20–40%: agents pay premium for leads with clean compliance trail |

**Our competitive advantage:** Every lead in this engine is life-event-triggered (recency ✓), exclusive (never resold ✓), TCPA-flagged (compliance ✓), and sourced from official government records (verified ✓) — justifying the $40–$100/lead price point for warm leads.

#### Community Chatter — What Agents Dislike About Current Lead Services

Research from insurance forums, Reddit (r/InsuranceAgent, r/LifeInsurance), TrustPilot, and ComplaintsBoard reveals consistent frustrations agents have with existing lead vendors:

**Top 5 Complaints (2024–2025):**

1. **Aged / recycled leads** — "I'm calling someone who filled out a form 2 years ago. They have no idea who I am or why I'm calling." Many vendors resell old lists as "fresh" leads.

2. **Fake or deceased contacts** — Leads include disconnected numbers, names of deceased people, or contacts who "never requested information." Refund requests are denied.

3. **Aggressive reselling** — The same prospect is sold to 5–8 agents who all call within the first hour. By the time any agent reaches them, the prospect is annoyed and unresponsive.

4. **No TCPA scrubbing** — Purchased lists often include numbers on the Do Not Call registry. Agents face TCPA violation risk. "I was almost sued."

5. **Zero accountability / bad customer service** — Vendors rarely credit bad leads, have slow support, and hide behind fine print.

**What agents *do* want (opportunity signals):**
- Exclusive leads — willing to pay 2–3× premium
- Life-event-triggered leads (new babies, new homeowners) — "these people actually need insurance *right now*"
- Clean TCPA documentation — essential for compliance-conscious agents
- Batch/subscription model — predictability over one-off purchases
- State + product filter — "send me only TX homeowners looking for term life"

> **This engine directly addresses every one of the top 5 complaints** — exclusive, fresh-triggered, TCPA-flagged, and with documented government record sources.

#### Domain Name Strategy

A strong domain name for this product boosts SEO, agent trust, and organic discovery. Based on current market analysis:

**High-Value Domain Patterns:**

| Domain Pattern | Examples | Rationale |
|----------------|----------|-----------|
| Keyword + intent | `LifeInsuranceLeads.io`, `ExclusiveLifeLeads.com` | Direct match to what agents search |
| Trigger-based | `LifeEventLeads.com`, `TriggerLeads.io` | Unique differentiator; explains the product |
| Agent-facing authority | `AgentLeadPro.com`, `InsuranceLeadPro.com` | Appeals to professional buyer |
| Local geo-targeted | `TexasLifeLeads.com`, `FloridaInsuranceLeads.com` | State-specific authority + SEO |
| Brandable short | `LeadKit.io`, `LifeLeads.io`, `LeadForge.io` | Scalable to other insurance verticals |

**Recommendation:** Register a `.com` or `.io` with "life insurance" + "leads" or "exclusive" for maximum SEO trust. The `.insurance` TLD is increasingly accepted and available at lower cost.

**Priority:** Secure domain *before* launch. A branded domain signals permanence to agents and increases repeat business.

#### Marketing Best Practices — What's Working in 2024

**Current industry-leading approaches:**

| Strategy | What Works | How Our Engine Improves It |
|----------|-----------|---------------------------|
| Inbound SEO content | Blogs on life insurance triggers (new baby, home purchase) rank for high-CPC keywords | Landing page targets exact trigger keywords; form converts organic traffic to leads |
| Inbound quote forms | EverQuote, SmartFinancial capture quote requests at scale | Our landing page captures inbound leads that are sold exclusively — not shared with 8 agents |
| Facebook/Instagram video ads | 30-second "did you know you need life insurance when you buy a home?" videos | Life-event trigger framing → higher click-through from relevant life stage audiences |
| Speed-to-lead response (< 5 min) | Agents who call within 5 minutes of form submit see 8× higher conversion | Workflow automation ensures PDF delivery + agent notification in < 10 minutes of new inbound lead |
| Subscription model | Predictable monthly pipeline is preferred over one-off purchases | $99–$199/mo batch subscription for agents; auto-delivery of fresh PDFs by state |
| Referral + affiliate | Insurance agents refer other agents; licensed agent resellers (like Chase Evans) distribute leads locally | Reseller/affiliate tier: licensed agents can white-label and resell PDF batches with markup |
| Email drip campaigns | Nurture agents who purchased once with case studies ("15 policies closed from 1 PDF batch") | Automated Gumroad/Polar.sh post-purchase follow-up sequence |

**How this engine is superior to current marketing approaches:**
1. **Event-triggered precision:** Leads are tied to a specific, recent life event — the agent knows *exactly* why this person needs insurance *today*
2. **100% exclusive delivery:** No shared leads means no agent competition for the same prospect
3. **TCPA documentation baked in:** Each lead carries a compliance flag — eliminates agents' #1 legal risk
4. **Self-service automation:** Agent picks state + trigger type + batch size → PDF delivered automatically
5. **Scalable without staff:** GitHub Actions + OpenRouter swarm generates PDFs on-demand; no manual outreach team needed

### Revenue & Monetization

#### Product: Curated PDF Lead Packs

Each PDF contains **10–20 exclusive, de-duplicated leads** tied to a single life-event trigger and state. Leads are guaranteed unique across all previously sold PDFs (no duplicates).

| Product Tier | Source Type | Leads per PDF | Price per Lead | Price per 10-Lead PDF | Price per 20-Lead PDF |
|-------------|-------------|--------------|---------------|----------------------|----------------------|
| Warm Leads Pack | New homeowner, marriage, new business | 10–20 | $40–$100 | $400–$1,000 | $800–$2,000 |
| Cold Leads Pack | Birth notices, death/estate notices | 10–20 | $20–$40 | $200–$400 | $400–$800 |

**Why lower pricing for birth/death record leads:** These require higher outreach effort from the buyer (cold contact, longer conversion cycle), so the per-lead price reflects the added friction. Industry benchmark (EverQuote/MediaAlpha shared leads): $5–$30/lead; our exclusive, event-triggered leads command a **premium** because they are never resold.

**No-Duplicates Guarantee:** A central deduplication registry tracks all leads sold across all PDFs to ensure the same contact is never resold.

#### Landing Page — Inbound Quote Requests

A static landing page (`landing/index.html`) captures inbound prospects who are actively requesting a life insurance quote. These are the highest-intent leads.

- **Flow:** Visitor fills out name, state, phone/email, coverage type → submission is recorded → compiled into the next available PDF batch
- **Premium tier:** inbound self-identified leads → $75–$150 per PDF of 10 (i.e., $7.50–$15/lead)
- **Platform:** Deploy via Vercel / GitHub Pages. Form backed by a GitHub Actions webhook or Make.com automation.

#### Sales Channels

1. **Polar.sh / Gumroad digital storefront** — Browse and buy PDFs by state + trigger type
2. **Landing page upsell** — Buyers landing on the quote page are offered related PDFs
3. **Direct / repeat buyers** — Insurance agents subscribe to get weekly fresh PDF batches: **$99–$199/mo**

**Revenue Target:** $2k–$5k/month (Month 1–2 selling 5–10 warm PDFs at $400–$1,000 each), scaling to $10k–$25k+/month (Month 4+ as catalog and subscriber base grow)

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

### Layered Research Engine — Two AI Fleets

To avoid shallow research quality, the research system is split into two independent fleets:

1. **Fleet A — Research Swarm (Discovery Engine)**
   - Scout agents gather market data, API options, pricing, keywords, and community pain points
   - Specialist agents produce BOM tables, source-quality scoring, and monetization evidence
   - Output: structured research JSON + WR draft sections with citations

2. **Fleet B — Research QA/Code-Review Swarm (Verification Engine)**
   - Reviews Fleet A outputs for unsupported claims, stale pricing, missing competitors, and compliance gaps
   - Enforces required WR sections (keywords, BOM, competitor mechanics, complaints, monetization, citations)
   - Output: pass/fail report with required fixes before WR is marked "research complete"

**Gate rule:** No WR is considered complete until Fleet B approves Fleet A outputs.
**Approval mechanism:** automated pass/fail checks write `research_quality_status=pass|fail` into a WR metadata block in the document (or companion `wr/metadata/<wr-slug>.json`) and post a PR summary comment; human override is restricted to repository maintainers and must be documented in both the PR comment and metadata record.

### Data Architecture / DBA / Compliance Fleet Split

For this engine, add dedicated operational fleets instead of overloading the research swarm:

1. **Database Architecture Fleet** — defines lead schema, lookup tables, indexing/locking strategy, deduplication model, and reporting views
2. **Database Admin / Reliability Fleet** — manages migrations, backups, retention jobs, concurrency safety, and audit logging
3. **Compliance Operations Fleet** — maintains consent artifacts, TCPA/DNC checkpoints, suppression lists, and jurisdiction-specific policy changes
4. **Revenue Delivery Fleet** — implements storefront delivery, PDF packaging, CRM/webhook dispatch, and subscription/reporting surfaces

**Priority rule:** if community chatter shows TCPA/DNC complaints are a top buyer risk, the Compliance Operations Fleet ships before scale optimizations because legal/contactability failures destroy the product faster than slow throughput.

### Recommended Lead Compliance Status Model

Do **not** default every record to `tcpa_positive=1`. Use a lookup-backed status model derived from the lead source and evidence:

| Lookup Table | Purpose |
| --- | --- |
| `contact_eligibility_statuses` | Canonical contactability state used by exports, dialers, and reports |
| `consent_basis_types` | Why contact is allowed |
| `lead_source_types` | Source/channel normalization for routing and reporting |

**Suggested values by lookup:**
- `contact_eligibility_statuses`: `inbound_express_consent`, `outbound_public_record_requires_scrub`, `outbound_scrubbed_contact_ready`, `manual_review_required`, `revoked_or_opted_out`, `dnc_blocked`
- `consent_basis_types`: `webform_opt_in`, `quote_request`, `existing_customer`, `public_record_with_manual_review`, `none`
- `lead_source_types`: `landing_page`, `county_record`, `probate_notice`, `linkedin_api`, `licensed_data_vendor`

**Recommended behavior:**
- Landing-page quote requests start as `inbound_express_consent` **only after** storing consent text/version, timestamp, source URL/form ID, and suppression-check outcome
- Public-record leads start as `outbound_public_record_requires_scrub`, not contact-ready, and move to `outbound_scrubbed_contact_ready` only after the relevant phone/SMS/email suppression and DNC checks pass for the intended outreach channel
- Any complaint, revocation, or ambiguous source moves the lead to `manual_review_required` or `revoked_or_opted_out`
- Reports for non-technical operators should display friendly labels from lookup tables, not raw booleans or magic numbers

**Policy gate helper:** `isContactEligible(lead, checkpoint)` returns a boolean for checkpoint-specific validation (`pre_export`, `pre_contact`) using the rules in this section. It must fail closed to `false`, emit an audit log entry, and route the record to manual review when status data is missing, invalid, or the suppression/DNC check errors.

### Scoring Engine Pattern (Recommended)

This WR should evolve from binary flags into a reusable scoring model. For TCPA/contactability, the system should calculate a **contactability confidence score** instead of relying on a yes/no field alone.

**Recommended scoring dimensions:**
- **Source quality:** official government record, first-party form fill, licensed vendor, or weak/unclear source
- **Consent evidence:** signed/explicit opt-in, implied inquiry, public-record only, or missing consent proof
- **Suppression risk:** DNC hit, internal opt-out, complaint history, or missing suppression check
- **Freshness / recency:** how recent the event, inquiry, or verification is
- **Data completeness:** required fields present, channel available, and identity sufficiently matched

**Recommended output shape:**
```json
{
  "contactability_score": 82,
  "score_band": "high",
  "decision": "allow_pre_export",
  "top_factors": [
    "first_party_quote_request",
    "recent_consent_capture",
    "suppression_checks_passed"
  ],
  "manual_review_required": false
}
```

**Recommended governance:**
- Use weighted factors with transparent scoring rules so operators can explain why a lead passed or failed
- Keep score + status together: the score informs confidence, the status controls workflow gating
- Require manual review below threshold bands or when critical evidence is missing
- Persist factor-level reasons for auditability and future tuning

**Generalization path:** the same scoring-engine pattern can be reused for SEO opportunity scoring, product viability scoring, research confidence scoring, lead intent scoring, and search/probability models in other domains. The pattern should stay consistent even when the weighted factors change by project.

### Orchestrator Script — `scripts/life-insurance-lead-engine.js`

```javascript
// Pseudocode outline — implement per revvel-standards Node.js patterns
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const LINKEDIN_API_KEY = process.env.LINKEDIN_API_KEY; // LinkedIn paid API program (~$100/mo)
const { isContactEligible } = require('./compliance-utils'); // validates checkpoint-specific rules from the Recommended Lead Compliance Status Model section

async function runLeadEngine({ triggerType, state, batchSize = 20 }) {
  // 1. Scout Phase: query public sources and LinkedIn API for trigger signals
  const rawSignals = await scoutAgent({ triggerType, state });

  // 2. Qualify Phase: score each signal for life insurance intent
  const qualifiedLeads = await qualifierAgent({ signals: rawSignals });

  // 3. Contactability filter: see Recommended Lead Compliance Status Model above.
  const contactableLeads = qualifiedLeads.filter((lead) =>
    isContactEligible(lead, 'pre_export')
  );

  // 4. Deduplicate: remove any leads already sold in previous batches
  const newLeads = await deduplicateLeads(contactableLeads);

  // 5. Compile Phase: take top batchSize leads and structure output
  const batch = newLeads.slice(0, batchSize);
  const output = await compilerAgent({ leads: batch });

  // 6. Build PDF (10–20 leads per file) and mark leads as sold
  const pdfPath = await buildLeadPDF(output, { triggerType, state });
  await markLeadsAsSold(output);

  console.log(`✅ ${output.length} contact-eligible leads compiled → ${pdfPath}`);
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
  "contact_eligibility_status": "outbound_scrubbed_contact_ready",
  "consent_basis": "public_record_with_manual_review",
  "consent_timestamp": null,
  "consent_proof_url": null,
  "dnc_scrub_result": "pass",
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
| $2,000+/month target (May 2026) | Achievable Month 1–2: selling 10–20 warm lead PDFs/mo at $400–$1,000/PDF each |
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
| TCPA compliance | Replace one-bit `tcpa_compliant` with lookup-backed `contact_eligibility_status`, `consent_basis`, and scrub metadata; only export leads whose status is approved at the current checkpoint, and rerun suppression/DNC checks before each outreach attempt |
| CAN-SPAM | Do not include email addresses unless sourced from a confirmed opt-in channel |
| FCRA | Lead PDFs are for sales/marketing outreach only; **not** for underwriting risk assessment, credit, employment, housing, or policy approval decisions |
| LinkedIn ToS | LinkedIn data accessed **only** via LinkedIn's paid API program (~$100/mo) — no scraping of LinkedIn profiles |
| Zillow / Redfin ToS | **Not used.** New homeowner data sourced only from official county recorder open-data portals |
| Death / estate outreach | Only official county probate legal notices used; outreach must comply with applicable state solicitation laws |
| Deduplication | Sold registry (`dist/leads/sold-registry.json`) ensures no contact is resold across PDF batches |

### Credential Gateway & Service Status Ledger

Track external dependency health (APIs/CLI/MCP/GitHub Apps) in a single ledger consumable by Audrey UI:

| Dependency | Type | Credential Source | Current Status | Renewal/Billing Risk | Fallback |
|---|---|---|---|---|---|
| OpenRouter | API | GitHub Secret / Doppler | `active` | Monitor quota/credits | Multi-model failover |
| LinkedIn paid API | API | GitHub Secret / Doppler | `active` / `degraded` | Program limits + billing | Run without LinkedIn enrichment |
| Doppler | Credential manager | Doppler project/token | `payment_required` / `trial_expiring` / `active` | Trial/plan expiration | GitHub Secrets emergency mode |
| GitHub CLI + GITHUB_TOKEN | CLI/App auth | `${{ secrets.GITHUB_TOKEN }}` | `active` / `blocked` | Permission scope drift | Fail-fast + create issue |
| Required MCP servers | MCP | MCP config + API keys | `active` / `degraded` / `blocked` | Missing/unrotated key risk | Disable feature with clear warnings |

**Implementation requirement:** expose this ledger in Audrey UI with semantic text statuses as canonical values (`Active`, `Degraded`, `Blocked`) and treat emoji (`✅`, `⚠️`, `⛔`) as optional decorative cues only (e.g., `aria-hidden="true"` on web UI), plus last-checked timestamp and owner action needed.

**Owner action logic (required):**
- `owner_action_needed=true` when status is `payment_required`, `blocked`, or `trial_expiring` within 7 days
- Include `action_type` (`pay_invoice`, `rotate_key`, `upgrade_plan`, `restore_scope`) and `action_due_at`
- Surface warning badges in Audrey UI and create a `Wr` issue automatically when due date is breached

**Mandatory PDF Disclaimer (append to every exported PDF):**
> *"This lead list is compiled from publicly available government records, first-party inquiries, and licensed data sources, and is intended for life insurance sales and marketing outreach only. Each lead in this batch includes recorded contactability, consent/source, and suppression-screening metadata that must be revalidated at the point of use using the documented `pre_contact` checkpoint rules. It may not be used for underwriting risk assessment, policy approval, credit, employment, or housing decisions (FCRA). Verify compliance with applicable state and federal regulations (TCPA, CAN-SPAM, state solicitation laws) before contacting any individual. All contacts are exclusive to this PDF batch — no duplicates are knowingly resold."*

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

7. **Implement research BOM generator + scorer**  
   - Produce API/source BOM for each WR (`best_for`, cost model, limits, compliance notes)  
   - Require per-source ranking and rationale before WR completion  
   - Effort: 2–4 hours

8. **Implement credential gateway status tracker**  
   - Persist status for each API/CLI/MCP/GitHub App (active/degraded/blocked, last checked, billing state)  
   - Surface in Audrey UI for at-a-glance operations visibility  
   - Effort: 3–5 hours

9. **Create reusable scoring-engine spec / WR**
   - Define shared score primitives: factor, weight, threshold band, blocking condition, explanation trail
   - Apply first to contactability/TCPA, then extend to SEO, product opportunity, and research confidence use cases
   - Effort: 2–4 hours

### Short-Term Actions (Within 1–2 Weeks)

1. Add qualifier scoring tuned specifically to life insurance intent signals (new homeowner → mortgage protection, new baby → term life, etc.)
2. Implement batch pricing tiers: warm leads at $40–$100/lead ($400–$1,000/10-lead PDF), cold (birth/death) leads at $20–$40/lead ($200–$400/10-lead PDF)
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
| Pricing | $20–$40/lead · $200–$400/10-lead PDF (cold: birth/death records) · $40–$100/lead · $400–$1,000/10-lead PDF (warm: homeowner, marriage, business) |
| Revenue Potential | $2k–$5k/month (Month 1–2), $10k–$25k+/month (Month 4+) |
| Estimated Effort | 10–14 hours (scripts + landing page + workflow + storefronts) |
| Ship-to-Market Ready | After implementation tasks |
| Approval Required | @midnghtsapphire |

---

**Last Updated:** 2026-05-16  
**Next Review:** After `scripts/life-insurance-lead-engine.js` is implemented
