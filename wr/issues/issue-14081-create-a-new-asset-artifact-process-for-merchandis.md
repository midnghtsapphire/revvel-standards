# WR: [WR] Create a new asset-artifact process for Merchandise

**Issue:** #14081  
**Repository:** [midnghtsapphire/revvel-standards](https://github.com/midnghtsapphire/revvel-standards)  
**Research Date:** 2026-05-29  
**Researcher:** Jules (Google) + OpenRouter  
**WR Status:** 🟡 In Progress

---


# Otherwise, use WR_TEMPLATE_BASIC.md instead (recommended)

#

# ─────────────────────────────────────────────────────────────────────────────

#

# WR: midnghtsapphire/revvel-standards

**Repository:** [midnghtsapphire/revvel-standards](https://github.com/midnghtsapphire/revvel-standards)  
**Created:** 2026-05-29  
**Last Updated:** 2026-05-29  
**Language:** JavaScript  
**Research Date:** 2026-05-29 <!-- Use YYYY-MM-DD format -->  
**Researcher:** Copilot Coding Agent  
**WR Status:** 🟡 In Progress

---

## ⚡ Pre-flight: Autonomous Research Defaults

> **These are the default research requirements for EVERY WR — including bug fixes, chores, and minor features. Do not skip any checked item. If a section is genuinely N/A, document why.**

### Research Checklist (pre-checked = required by default)

- [x] **Deep market research** — keywords, search volumes, CPCs, industry mechanics, pricing
- [x] **BOM (Bill of Materials)** — ranked API/tool list per category: which API is best, what it costs, why one beats another
- [x] **Community chatter** — Reddit, TrustPilot, forums: what buyers/users hate about current solutions
- [x] **Competitor analysis** — existing products, pricing, gaps, our competitive advantage
- [x] **Domain name strategy** — high-value patterns, TLD recommendations, SEO rationale
- [x] **Marketing best practices** — what's working now in this niche + how our product improves it
- [x] **Revenue / monetization model** — specific pricing, channels, subscription vs. one-time, reseller tier
- [x] **Compliance & legal surface** — TCPA, FCRA, CAN-SPAM, ToS of every data source, licensing
- [x] **Product / output selections** — explicitly choose artifact shapes (API, CLI, MCP, skill, PDF, deck, video, UI, docs, agent automation)
- [x] **Platform defaults** — Website in Test on Vercel, DigitalOcean integration default, website auth/admin requirements when UI is in scope
- [x] **Artifact engine map** — map every selected shape to the repo engine/standard or document the gap
- [x] **Agent self-healing journal** — institutionalize durable findings back into revvel-standards
- [ ] **A/B test hypothesis** — only if a UI/UX component is being shipped
- [ ] **Affiliate / reseller program** — only if a distribution network is in scope

### GitHub Actions Workflow Dispatch Inputs (for automated WR runs)

When this WR is executed via `workflow_dispatch`, the following inputs are pre-set to ensure autonomous research depth:

```yaml
# Paste into any workflow_dispatch trigger to enforce research standards
on:
  workflow_dispatch:
    inputs:
      deep_research:
        description: 'Run full deep market research (keywords, BOM, chatter, domain)'
        type: boolean
        default: true          # ← ALWAYS true
      include_bom:
        description: 'Generate Bill of Materials (API/tool comparison table)'
        type: boolean
        default: true          # ← ALWAYS true
      include_community_chatter:
        description: 'Research Reddit/forums/TrustPilot for buyer complaints'
        type: boolean
        default: true          # ← ALWAYS true
      include_competitor_teardown:
        description: 'Full competitor pricing + gap analysis'
        type: boolean
        default: true          # ← ALWAYS true
      research_depth:
        description: 'Research depth level'
        type: choice
        options: [standard, deep, exhaustive]
        default: deep           # ← default to deep, not standard
```

> **Fleet Instruction:** An agent receiving this WR must perform research at `deep` or `exhaustive` depth. User instructions are a *starting point* — agents must self-correct, cross-validate against live data, and never follow user WR content verbatim without checking it against current market reality.

---

## Executive Summary

[2-3 sentence summary of repository purpose, current state, and key recommendations]

---

## Step 1: Repository Discovery

### Repository Metadata

| Property | Value |
|----------|-------|
| Repository | [midnghtsapphire/revvel-standards](https://github.com/midnghtsapphire/revvel-standards) |
| Created | 2026-05-29 |
| Last Updated | 2026-05-29 |
| Primary Language | JavaScript |
| Stars | {STARS} |
| Open Issues | {OPEN_ISSUES} |
| Description | ### Output Type (required)

production-app

### PDF pipeline batch

None

### Research Mode

None

### Delivery Mode

None

### Lifecycle Mode

None

### Commercial Mode

None

### Summary

_No response_

### Objective

Create merchandising data on gumloop like t-shirts, mugs, et al with images or logos. 

<!-- Failed to upload "Screenshot_20260528_072540_Facebook.jpg" -->
<!-- Failed to upload "Screenshot_20260528_072609_Facebook.jpg" -->
<!-- Failed to upload "Screenshot_20260528_072629_Facebook.jpg" -->
<img width="944" height="1115" alt="Image" src="https://github.com/user-attachments/assets/b5fcd01b-6448-4827-b35d-252e76518d0d" />
<img width="944" height="1115" alt="Image" src="https://github.com/user-attachments/assets/fb1b4863-1bdf-4a50-b365-0e076948687d" />
<img width="944" height="1115" alt="Image" src="https://github.com/user-attachments/assets/3bc355d2-ac86-4389-a6f7-a05412698c2c" />
<img width="944" height="1115" alt="Image" src="https://github.com/user-attachments/assets/0cea887a-43de-42f0-824b-4655adb7b9b8" />
<img width="944" height="1115" alt="Image" src="https://github.com/user-attachments/assets/79cfe65d-c60c-489f-872d-8f99ecfd06f6" />
<img width="944" height="1115" alt="Image" src="https://github.com/user-attachments/assets/3f73c755-1404-4af6-b777-48702164ee74" />
<img width="944" height="1115" alt="Image" src="https://github.com/user-attachments/assets/4f010777-f5bb-44a9-99ae-e5a55abfcf0c" />
<img width="944" height="1115" alt="Image" src="https://github.com/user-attachments/assets/5459eb91-bf10-46d3-8ae0-6b14bed95928" />
<img width="944" height="1115" alt="Image" src="https://github.com/user-attachments/assets/f0d05b47-6bee-4209-ab29-c6b1f9fad008" />
<img width="944" height="1115" alt="Image" src="https://github.com/user-attachments/assets/c7a38a9c-46ba-46e5-96f2-93bcbf350085" />
<img width="1408" height="768" alt="Image" src="https://github.com/user-attachments/assets/4ab3fd61-a17e-4e5f-92ec-3da06066313e" />
<img width="1408" height="768" alt="Image" src="https://github.com/user-attachments/assets/e0c57047-8a7b-489f-8347-ce9e41d08123" />
<img width="1408" height="768" alt="Image" src="https://github.com/user-attachments/assets/2d191d52-ed58-4ea8-baab-02d9ac52cbef" />

We should be able to upload images-need to be converted to proper sizes. Or put in an api request prompt. I will provide some templates and branding colors for these images to reuse.

### Required Bundle

_No response_

### Definition of Done

_No response_

### Do Not Under-Scope

_No response_

### Explicit Exclusions

_No response_

### Delivery Shape

None

### Expected Scope

_No response_

### Validation Expectations

_No response_

### Blocker Rule

_No response_

### Acknowledgements

- [x] This WR defines a bundled outcome, not just a minimum acceptable patch.
- [x] Explicitly requested secondary items should not be silently deferred.
- [x] If the PR is partial, the blocker must be documented.
- [x] The PR should reflect the WR's required bundle and definition of done. |
| Private | {IS_PRIVATE} |
| Archived | {IS_ARCHIVED} |

### Current Status

- **Active Development:** [Yes/No - based on recent commits]
- **Last Commit:** [Date and summary]
- **Open PRs:** [Count and notable ones]
- **Open Issues:** [Count and critical ones]
- **Deployment Status:** [Deployed/Not Deployed - Vercel URL if exists]
- **CI/CD Status:** [Passing/Failing/Not configured]

### Repository Structure

```
[Tree structure of key directories and files]
```

### Key Technologies

- **Frontend:** [Framework/libraries]
- **Backend:** [Framework/libraries]
- **Database:** [Type and provider]
- **Deployment:** [Platform]
- **CI/CD:** [Tooling]

---

## Step 1A: Product / Output Selections

| Output shape | In scope? | Format / length | Primary engine / standard | Notes |
|--------------|-----------|-----------------|---------------------------|-------|
| Website / app UI | [Yes/No] | [site/app] | [engine] | [notes] |
| API | [Yes/No] | [REST/GraphQL/etc.] | [engine] | [notes] |
| CLI | [Yes/No] | [binary/package] | [engine] | [notes] |
| MCP | [Yes/No] | [server/router/tool manifest] | [engine] | [notes] |
| Skill | [Yes/No] | [skill type] | [engine] | [notes] |
| PDF | [Yes/No] | [report/guide/etc.] | [engine] | [notes] |
| PowerPoint / deck | [Yes/No] | [sales/training/review deck] | [engine] | [notes] |
| Video | [Yes/No] | [demo/training/review/YouTube + target length] | [engine] | [notes] |
| Docs | [Yes/No] | [site/spec/readme] | [engine] | [notes] |
| Agent automation | [Yes/No] | [workflow/agent/service] | [engine] | [notes] |

### Platform Defaults & Website Requirements

- **Website in Test:** [Vercel URL or documented gap]
- **Integration runtime:** [DigitalOcean by default / documented exception]
- **Admin surface:** [required / not required / gap]
- **User auth:** [Apple / Google / GitHub / other / not required]

---

## Step 2: Deep Web Research

> **Research Mandate:** Every WR MUST include ALL of the following subsections before implementation begins. Shallow research is insufficient. Discovery requires:
>
> - **(1) What is being used now** — existing solutions, pricing, mechanics
> - **(2) What problem are we solving** — specific pain points from community research
> - **(3) How much do people pay** — keyword CPCs, lead prices, subscription rates
> - **(4) What do buyers hate about current solutions** — sourced from forums, reviews, Reddit
> - **(5) High-value positioning data** — keywords, domain strategy, marketing ROI
> - **(6) API/Data BOM** — provider, best-for use case, data capability, cost model, strengths/risks, and compliance notes
>
> An LLM agent must be able to answer every question in this template from live web research before implementation begins.

### Market Opportunity Analysis

#### Current Market Trends

[Research findings about market trends in this domain — include data points, stats, and growth signals]

**Sources:**

#### Target Audience & Trigger Events

[Who buys this product/uses this service? What specific life events or triggers drive purchase intent? Include audience segments with size estimates.]

| Audience Segment | Trigger Event | Intent Level | Est. Market Size |
|-----------------|---------------|--------------|-----------------|
| [Segment 1] | [Trigger] | High/Med/Low | [Size] |
| [Segment 2] | [Trigger] | High/Med/Low | [Size] |

#### Regional/Cultural Design Input Set (when location-specific merch is in scope)

When the merch concept targets a specific city, school, or fan base, require a local motif pass in research before prompt finalization.

**Example motif candidates for Knoxville / Tennessee football-adjacent themes:**

- **Landmarks:** Sunsphere silhouette, Tennessee River context, Vol Navy dock/boats
- **Team-adjacent visual language:** checkerboard pattern accents, historic "V-O-L-S" stadium letter styling
- **Mascot and icon references:** subtle Smokey-inspired side element, background "Power T"-style geometry (only if licensing permits)
- **Volunteer-era texture ideas:** decorative muskets/tricorn accents in scroll/banner treatments

**Research gate for this section:**

| Candidate Motif | Visual Value | Licensing Risk | Cultural Fit | Keep/Drop |
|----------------|--------------|----------------|--------------|-----------|
| [Motif] | High/Med/Low | High/Med/Low | High/Med/Low | Keep/Drop |

**Output requirement:** Ship a ranked motif shortlist and a "safe-use" prompt pack (licensed-safe defaults + fallback variants) for the artifact generation engine.

#### Project-Scoped Palette Template Pack (Issue #14081)

Store this palette pack in revvel-standards as a reusable reference for similar location-themed requests, but treat it as project-scoped defaults for this merchandise pipeline.

| Palette Theme | Core Colors | Recommended Use |
|---------------|-------------|-----------------|
| Tennessee Signature | Tennessee Orange + White + Checkerboard pattern | Primary identity, hero treatments, sports-forward variants |
| Traditional Athletic Accent | Tennessee Orange + White + Smokey Grey (charcoal) | Outlines, depth, retail-ready apparel variants |
| Natural Knoxville Context | Smoky Mountain Blue/Purple + Deep Forest Greens + River Blues (+ restrained Orange accents) | Scenic/background variants, river/landmark compositions |
| Premium Dark Variant | Dark Smokey Grey base + golden-orange highlights + white contrast | Premium/night editions and high-contrast merch previews |

**Palette combo prompts to test:**

1. Tradition-Rich: Tennessee Orange + White + Smokey Grey
2. Checkerboard Power: Orange/White checkerboard borders + solid dark fields
3. UT Natural: Tennessee Orange + Smoky Mountain Blue + River Blue
4. Elegant Accents: Smokey Grey primary + sparse orange callouts

#### Concept Grid Prompt Templates (Project-Scoped)

Use these as baseline templates for preemptive research-engine prompt libraries and variant generation.

**Template A — Vol Navy / Sailgating 2x2 Grid**

> A vector graphic design showcase sheet featuring four logo variations in a clean 2x2 grid. Main character: cartoon banana mascot in cap and striped jersey steering a vintage wooden boat labeled "VOL NAVY" with checkerboard hull accents. Set on the Tennessee River with stylized Neyland Stadium, Sunsphere, and bridge in the background. Include a "Bananas" banner in bold cursive and a small Bluetick Coonhound side element near a baseball.  
> Palette variants: (1) classic Tennessee orange/white with deep navy field, (2) Smokey charcoal grey with muted orange accents, (3) river blues + smoky mountain purples + soft sunset golds, (4) premium dark grey with vibrant golden-orange highlights.  
> Style constraints: clean vector lines, screen-print aesthetic, no overlapping frames, single-sheet portfolio layout.

**Template B — Batting Emblem 2x2 Grid**

> A professional 2x2 design presentation sheet showing four variations of a circular sports emblem. Main emblem: cartoon banana mascot in batting stance with baseball bat, stadium scene with lights and scoreboard text "NEYLAND STADIUM HOME OF THE VOLS," and central ribbon scroll reading "Bananas" in thick script. Add a smaller lower emblem with a Bluetick Coonhound and baseball.  
> Palette variants: (1) white background + navy lines + bright golden-yellow, (2) cream background + deep navy + muted mustard-gold, (3) orange/white checkerboard outer-ring accents + deep blue fills, (4) warm sunset gradient + charcoal outlines + rich orange jersey accents.  
> Style constraints: flat vector color system, sharp typography, textured off-white presentation background, zero overlap.

#### SEO & Keyword Research

**This section is REQUIRED for any product with a web/content component.**

| Keyword | Monthly Volume (US) | Avg CPC | Competition | Intent |
|---------|---------------------|---------|-------------|--------|
| [primary keyword 1] | [volume] | [$CPC] | High/Med/Low | Transactional/Informational |
| [primary keyword 2] | [volume] | [$CPC] | High/Med/Low | Transactional/Informational |

**Long-tail / trigger-specific keywords:**

- [keyword]: [volume] — [why it matters]
- [keyword]: [volume] — [why it matters]

**Implication for this WR:** [What the keyword data tells us about the market opportunity and landing page strategy]

#### Bill of Materials (BOM) — APIs & Tools

> **This section is REQUIRED for EVERY WR, including bug fixes and chores.** List every API, CLI, MCP, GitHub App, or third-party service needed to build and operate this product. Rank by fit. Explain why one beats another.

**Category: [Primary Data Source]**

| API / Tool | Cost | Coverage | Best For | Verdict |
|------------|------|----------|----------|---------|
| [Option 1] | [$] | [Coverage] | [Use case] | ⭐ Recommended / ✅ Acceptable / ❌ Avoid |
| [Option 2] | [$] | [Coverage] | [Use case] | |

**Category: [Compliance / Validation]**

| API / Tool | Cost | Features | Best For | Verdict |
|------------|------|----------|----------|---------|
| [Option 1] | [$] | [Features] | [Use case] | |

**Category: [Delivery / Storefront]**

| Platform | Rev Share | Best For | Verdict |
|----------|-----------|----------|---------|
| [Option 1] | [%] | [Use case] | |

**BOM Cost Summary:**

| Category | Recommended Tool | Est. Monthly Cost |
|----------|-----------------|-------------------|
| [Category 1] | [Tool] | $[X] |
| [Category 2] | [Tool] | $[X] |
| **Total Infrastructure** | | **$[Total]/mo** |

> **ROI Check:** [How many units/sales cover infrastructure cost?]

#### How the Industry Works — Mechanics

[Explain exactly how the current market solves this problem. Include: how buyers find/purchase, how pricing works, what the conversion funnel looks like, and what makes a high-quality solution vs. a low-quality one.]

**Shared vs. Exclusive / Tiered pricing:**

| Solution Type | How It Works | Cost | Conversion Rate | Why Some Are Worth More |
|--------------|-------------|------|----------------|------------------------|
| [Type 1] | [Mechanics] | [$] | [Rate] | [Value drivers] |
| [Type 2] | [Mechanics] | [$] | [Rate] | [Value drivers] |

**Why some [units] are worth more than others:**
[Enumerate the specific factors that increase value — recency, exclusivity, intent signal, geography, verification, compliance documentation, etc. with % premium estimates where available]

#### Competitors & Alternatives

| Competitor | Type | Cost | Conversion/Quality | Gap / What They Don't Do |
|------------|------|------|-------------------|--------------------------|
| [Name 1] | [Type] | [Pricing] | [Quality/rate] | [Gap] |
| [Name 2] | [Type] | [Pricing] | [Quality/rate] | [Gap] |
| **This Engine** | [Type] | [Pricing] | [Expected] | [Our advantage] |

#### API / Data Source BOM (REQUIRED)

**Every WR must include a BOM-style source comparison for the core product dependencies (APIs, datasets, CLI/MCP integrations, GitHub Apps where relevant).**

If the WR involves outreach, messaging, or lead/contact data, the BOM must also define a **lookup-backed contactability model** (do not rely on a single yes/no compliance flag). Show which source types can start as contact-eligible, which require manual review, and which require pre-contact suppression/DNC checks.

| Provider/API | Best For | Data/Capability | Cost Model | Strengths | Weaknesses/Risks | Compliance Notes |
|--------------|----------|-----------------|------------|-----------|------------------|------------------|
| [Provider 1] | [Job-to-be-done] | [Output] | [Pricing] | [Strength] | [Risk] | [ToS/legal notes] |
| [Provider 2] | [Job-to-be-done] | [Output] | [Pricing] | [Strength] | [Risk] | [ToS/legal notes] |

**BOM Decision:**

- Primary provider stack: [choice + reason]
- Secondary/fallback stack: [choice + reason]
- Why this BOM is superior for this WR: [evidence]

#### Community Chatter — What Users Dislike About Current Solutions

**This section is REQUIRED. Research Reddit, forums, TrustPilot, Yelp, App Store reviews, ComplaintsBoard, or any relevant community to surface real pain points.**

**Top complaints (cite sources where possible):**

1. **[Complaint 1]:** [Quote or paraphrase from community research]
2. **[Complaint 2]:** [Quote or paraphrase from community research]
3. **[Complaint 3]:** [Quote or paraphrase from community research]

**What users/buyers actually want (opportunity signals):**

- [Want 1]: [Why this is an opening]
- [Want 2]: [Why this is an opening]

> **How this WR's solution addresses the top complaints:** [Explicit mapping of complaints to features]

#### Domain Name Strategy

**This section is REQUIRED for any product with a web presence.**

**High-value domain patterns for this niche:**

| Pattern | Examples | Rationale |
|---------|---------|-----------|
| [Pattern 1] | [Examples] | [Why it works] |
| [Pattern 2] | [Examples] | [Why it works] |

**Recommendation:** [Specific domain guidance — TLD preference, availability check strategy, priority]

#### Monetization Opportunities

1. **Direct Revenue:**
   - [Strategy 1]: [Description and potential]
   - [Strategy 2]: [Description and potential]

2. **Affiliate / Reseller Partnerships:**
   - [Partner 1]: [Commission structure]
   - [Partner 2]: [Commission structure]

3. **Subscription / Recurring:**
   - [Feature 1]: [Pricing potential]
   - [Feature 2]: [Pricing potential]

**Revenue Potential:** [Conservative/Moderate/Aggressive estimates with assumptions]

#### Marketing Best Practices — What's Working Now & How This Improves It

**This section is REQUIRED. Research current marketing strategies in this niche.**

| Strategy | What Works Now | How This WR Improves It |
|----------|---------------|------------------------|
| [Strategy 1] | [Current best practice + data] | [How our product is better] |
| [Strategy 2] | [Current best practice + data] | [How our product is better] |

**Inbound vs. Outbound ROI comparison:**

- Inbound ROI: [Data + timeframe]
- Outbound ROI: [Data + timeframe]
- Recommended approach for this WR: [Recommendation with rationale]

#### Research Fleet Plan & Review Fleet Plan (REQUIRED)

Define a layered research engine using two AI fleets:

1. **Research Fleet (Discovery):** [agents/roles that gather market data, BOM options, citations]
2. **Review Fleet (Verification):** [agents/roles that audit research quality, detect missing sections, and reject unsupported claims]

**Gate Rule:** WR research cannot be marked complete until the Review Fleet passes the Discovery output.

**Preemptive research requirement for design-heavy WRs:** Discovery must extract reusable prompt templates from successful concept iterations (palette grids, composition grids, mascot/layout variants), then normalize them into a project-scoped prompt pack saved in revvel-standards so future similar requests start from proven structures.

**Minimum pass criteria (required):**

- All REQUIRED sections in Step 2 are present and non-empty
- Zero unsupported factual claims in sampled checks
- Citation coverage for factual claims ≥ 90% (factual claim = any specific statistic, price, market-size number, conversion-rate figure, or legal/compliance assertion)
- Compliance section includes explicit legal/ToS constraints for every paid or scraped-prone source

**Threshold rationale:** 90% is the default to prevent low-evidence WRs while allowing a small margin for clearly marked exploratory assumptions. Any threshold change must be approved by repository maintainers/standards owners per `docs/WEEKLY_RESEARCH_PROCESS.md` and documented in the PR.

**How to measure citation coverage:** use a simple review scorecard (`factual_claim_count`, `claims_with_source`, `coverage_percent`) in the WR or PR comment. Until automation exists, this remains a permanent manual checkpoint owned by the WR author and verified by the PR reviewer.

**Counting example:**

- Claim requiring citation: "LinkedIn paid API costs ~$100/mo" → must include source
- Claim requiring citation: "Exclusive leads convert at 10–20%+" → must include source
- Opinion/strategy statement: "This approach is better for SMB agencies" → citation optional (label as opinion)

**If the WR is operationally complex, define support fleets explicitly (for example: Database Architecture, DBA/Reliability, Compliance Operations, Revenue Delivery) instead of collapsing everything into a single generic implementation team.**

**If the WR includes ranking, gating, confidence, or probability decisions, define a scoring model explicitly:** scoring dimensions, evidence inputs, weights or prioritization logic, threshold bands, blocking conditions, and explanation/audit outputs. Prefer reusable score-engine patterns over one-off magic numbers.

#### Instruction Normalization (REQUIRED)

User prompts and brainstorms are inputs, not immutable specs. Record:

- What was accepted as-is
- What was corrected/pivoted based on standards or evidence
- What was rejected and why

This prevents copy/paste execution of low-quality or conflicting ideas and keeps WRs aligned to repository standards.

---

## Step 3: Requirements from revvel-standards

### Prime Directive Alignment

**10M by 2030 Goal:**

- Current contribution: [$amount/month or $0]
- Potential contribution: [$amount/month]
- Path to contribution: [Strategy]

**$2000+/month Target (Start: May 1, 2026):**

- Revenue streams identified: [Count]
- Estimated monthly revenue: [$amount]
- Time to first revenue: [Weeks/months]

### Driven Autonomy Assessment

**Current Autonomy Level:** [Low/Medium/High]

**Blockers Identified:**

1. [Blocker 1]: [Impact] → [Solution]
2. [Blocker 2]: [Impact] → [Solution]

**Autonomous Capabilities:**

### Self-Healing Capabilities

**Current Self-Healing:** [None/Partial/Full]

**Implemented:**

- [Feature 1]: [Description]
- [Feature 2]: [Description]

**Missing:**

- [Feature 1]: [Description and priority]
- [Feature 2]: [Description and priority]

### Decision Scoring Model Gate

> Required when the WR ranks, filters, qualifies, prices, routes, or assigns confidence/probability to records.
> Follow [`standards/DECISION_SCORING_ENGINE_STANDARD.md`](../standards/DECISION_SCORING_ENGINE_STANDARD.md).

**Does this WR make scoring/ranking/confidence decisions?** [Yes/No]

**Model Name:** [e.g., contactability_v1, seo_opportunity_v1, product_viability_v1]

**Status Values:**

- [ ] `eligible`
- [ ] `manual_review`
- [ ] `blocked`
- [ ] `suppressed`
- [ ] Other: [define]

**Score Range:** 0-100

**Weighted Factors:**

| Factor | Weight | Source | Why it matters |
|---|---:|---|---|
| [factor] | [0.00] | [input/source] | [reason] |

**Threshold Bands:**

| Score Range | Status | Action |
|---|---|---|
| 80-100 | eligible | [export/route/approve] |
| 50-79 | manual_review | [review queue] |
| 0-49 | blocked | [suppress/reject] |

**Audit Trail Required:**

- [ ] Model version recorded
- [ ] Factor values recorded
- [ ] Explanation trail recorded
- [ ] Actor and timestamp recorded
- [ ] Manual-review route recorded when status is `manual_review`

**Async Safety Rule:** If the decision writes audit logs, calls APIs, or routes manual review, evaluate with `Promise.all` or `for...of` before filtering. Do not call async eligibility functions directly inside `Array.prototype.filter`.

**Tenant / Client Separation:**

- **Organization boundary:** [Audrey-owned / client / partner]
- **Project boundary:** [project/workstream ID]
- **Data domain:** [enterprise / client / product / research]
- **Rate-card or confidence lookup table required:** [Yes/No]

### Ship to Market Status

**Current Status:** [Not Ready / Needs Work / Ready / Deployed]

**Readiness Checklist:**

- [ ] All tests passing
- [ ] No linting errors
- [ ] No security vulnerabilities
- [ ] Deployment configured
- [ ] UI verified
- [ ] Documentation complete
- [ ] TEST section in README
- [ ] Vercel URL available

---

## Step 4: Redevelopment & Redesign

### Fix All Errors

#### Test Failures

**Current Status:** [Pass/Fail/No tests]

**Failures Identified:**

1. [Test 1]: [Issue] → [Fix]
2. [Test 2]: [Issue] → [Fix]

#### Linting Errors

**Current Status:** [Pass/Fail/No linter]

**Errors Identified:**

1. [Error 1]: [Location] → [Fix]
2. [Error 2]: [Location] → [Fix]

#### Security Vulnerabilities

**Critical:** [Count]

1. [Vulnerability]: [Impact] → [Fix]

**High:** [Count]
**Medium:** [Count]
**Low:** [Count]

#### Deployment Issues

**Current Status:** [Working/Broken/Not configured]

**Issues Identified:**

1. [Issue 1]: [Impact] → [Fix]
2. [Issue 2]: [Impact] → [Fix]

### Enhance Features

#### Missing Features from Research

1. **[Feature 1]:**
   - **Why:** [Market need]
   - **How:** [Implementation approach]
   - **Effort:** [Hours/days]

2. **[Feature 2]:**
   - **Why:** [Market need]
   - **How:** [Implementation approach]
   - **Effort:** [Hours/days]

#### UX/UI Improvements

**Current UX Score:** [Rating/10]

**Improvements:**

1. [Improvement 1]: [Issue] → [Solution] → [Impact]
2. [Improvement 2]: [Issue] → [Solution] → [Impact]

#### Accessibility Features

**Current Accessibility:** [WCAG level]

**Required:**

- [ ] Keyboard navigation
- [ ] Screen reader support
- [ ] Color contrast (WCAG AA)
- [ ] Alt text for images
- [ ] ARIA labels
- [ ] Focus indicators

#### Performance Optimization

**Current Performance:**

- Lighthouse Score: [Rating/100]
- Load Time: [Seconds]
- Bundle Size: [KB]

**Optimizations:**

1. [Optimization 1]: [Improvement] → [Expected gain]
2. [Optimization 2]: [Improvement] → [Expected gain]

### Add Monetization

#### Affiliate Links Integration

**revvel-affiliate-links MCP:**

- [ ] MCP server configured
- [ ] Affiliate links identified
- [ ] Links integrated in content
- [ ] Tracking configured

**Links to Add:**

| Product/Service | Affiliate Program | Commission | Location |
|----------------|-------------------|------------|----------|
| [Name] | [Program] | [Rate] | [Where to add] |

#### Payment Integration

**Gumroad:**

- [ ] Account setup
- [ ] Products created
- [ ] Integration implemented
- [ ] Checkout tested

**LemonSqueezy:**

- [ ] Account setup
- [ ] Products created
- [ ] Integration implemented
- [ ] Checkout tested

**Recommended Platform:** [Gumroad/LemonSqueezy/Both] - [Reason]

#### Tracking & Analytics

**Current Analytics:** [None/Partial/Full]

**To Implement:**

- [ ] Google Analytics 4
- [ ] Plausible Analytics (privacy-friendly alternative)
- [ ] Revenue tracking
- [ ] Conversion tracking
- [ ] User behavior tracking
- [ ] A/B testing setup

---

## Step 5: Deployment Verification

### Vercel Deployment

**Current Status:** [Deployed/Not deployed/Needs fix]

**Configuration:**

- [ ] `vercel.json` configured
- [ ] Environment variables set
- [ ] Build command correct
- [ ] Output directory correct
- [ ] Deployment protection configured

**URLs:**

- **Production:** [URL or "Not deployed"]
- **Preview:** [URL or "Not configured"]

**Deployment Issues:**
[List any issues and fixes]

### UI Verification

**Verification Checklist:**

- [ ] Homepage renders correctly
- [ ] All pages render correctly
- [ ] All forms work
- [ ] Authentication works (if applicable)
- [ ] API endpoints respond correctly
- [ ] Mobile responsive (tested on [devices])
- [ ] Tablet responsive
- [ ] Desktop responsive
- [ ] No console errors
- [ ] No 404 errors
- [ ] Images load correctly
- [ ] Links work correctly

**Issues Found:**

1. [Issue 1]: [Description] → [Fix]
2. [Issue 2]: [Description] → [Fix]

**Screenshots:**
[Link to screenshots or indicate if captured]

---

## Step 6: Documentation Requirements

### TEST Section

**Current README Status:** [Has TEST section / Missing / Needs update]

**Required Format:**

```markdown
## Test

| Feature | Status | URL |
|--------|--------|-----|
| Homepage | ✅ Working | https://{repo-name}.vercel.app |
| Dashboard | ✅ Working | https://{repo-name}.vercel.app/dashboard |
| API | ✅ Working | https://{repo-name}.vercel.app/api/health |
```

**Action Required:** [None / Add section / Update URLs]

### Deployment Section

**Current README Status:** [Has deployment section / Missing / Needs update]

**Required Format:**

```markdown
## Deployment

**Production:** https://{repo-name}.vercel.app
**Preview:** https://{repo-name}-preview.vercel.app
**Status:** ![Deployment Status](https://img.shields.io/badge/deploy-success-green)
```

**Action Required:** [None / Add section / Update URLs]

### Additional Documentation

**Existing Documentation:**

- [ ] README.md
- [ ] CONTRIBUTING.md
- [ ] LICENSE
- [ ] CODE_OF_CONDUCT.md
- [ ] SECURITY.md
- [ ] API documentation
- [ ] User guide

**Missing Documentation:**
[List what needs to be created]

---

## Step 7: Save This Prompt & Findings

### Saved Locations

- [x] `/home/runner/work/revvel-standards/revvel-standards/wr/repos/midnghtsapphire/revvel-standards.md` (this file)
- [ ] Pushed to revvel-standards repository
- [ ] WR_TRACKER.md updated
- [ ] Issue created in revvel-standards: #[number]

### Implementation Tasks Created

**Issues Created:**

1. [Issue #X]: [Title] - [Priority]
2. [Issue #Y]: [Title] - [Priority]

### Next Steps

1. [ ] [Action 1] - [Owner] - [Deadline]
2. [ ] [Action 2] - [Owner] - [Deadline]
3. [ ] [Action 3] - [Owner] - [Deadline]

---

## Recommendations

### Immediate Actions (P0)

1. **[Action 1]**
   - **Why:** [Critical impact on Prime Directive]
   - **How:** [Implementation steps]
   - **Effort:** [Hours/days]
   - **Revenue Impact:** [$amount/month]

2. **[Action 2]**
   - **Why:** [Critical impact]
   - **How:** [Implementation steps]
   - **Effort:** [Hours/days]
   - **Revenue Impact:** [$amount/month]

### Short-Term Actions (P1) - Within 1-2 Weeks

1. [Action 1]: [Description] - [Effort] - [Impact]
2. [Action 2]: [Description] - [Effort] - [Impact]

### Long-Term Actions (P2) - Within 1-2 Months

1. [Action 1]: [Description] - [Effort] - [Impact]
2. [Action 2]: [Description] - [Effort] - [Impact]

---

## Risks & Considerations

| Risk | Severity | Probability | Mitigation |
|------|----------|-------------|------------|
| [Risk 1] | High/Med/Low | High/Med/Low | [How to mitigate] |
| [Risk 2] | High/Med/Low | High/Med/Low | [How to mitigate] |

---

## Alternatives Considered

### Alternative 1: [Name]

**Pros:**

- [Pro 1]
- [Pro 2]

**Cons:**

- [Con 1]
- [Con 2]

**Decision:** [Accepted/Rejected] - [Reason]

### Alternative 2: [Name]

**Pros:**

- [Pro 1]
- [Pro 2]

**Cons:**

- [Con 1]
- [Con 2]

**Decision:** [Accepted/Rejected] - [Reason]

---

## References

### Documentation

- [AGENTS.md](/docs/AGENTS.md)
- [WEEKLY_RESEARCH_PROCESS.md](/docs/WEEKLY_RESEARCH_PROCESS.md)
- [promptforproject.md](/promptforproject.md)

### External Resources

### Research Sources

---

## Status Summary

**Research Status:** ✅ Complete / 🟡 In Progress / ⭕ Not Started  
**Implementation Priority:** P0 / P1 / P2  
**Revenue Potential:** $[amount]/month  
**Effort Required:** [Hours/days/weeks]  
**Ship-to-Market Ready:** [Yes/No]  
**Approval Required:** @midnghtsapphire

---

**Last Updated:** 2026-05-29  
**Next Review:** [Date in YYYY-MM-DD format or "After implementation"]

# ─────────────────────────────────────────────────────────────────────────────

# END ADVANCED TEMPLATE

#

# For advanced users who want full control

# Use WR_TEMPLATE_BASIC.md for simple WRs (recommended)

# ─────────────────────────────────────────────────────────────────────────────
