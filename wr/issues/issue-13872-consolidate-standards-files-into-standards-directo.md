# WR: [WR] Consolidate Standards Files into standards/ Directory

**Issue:** #13872  
**Repository:** [midnghtsapphire/revvel-standards](https://github.com/midnghtsapphire/revvel-standards)  
**Research Date:** 2026-05-24  
**Researcher:** Jules (Google) + OpenRouter  
**WR Status:** 🟡 In Progress

---


# Otherwise, use WR_TEMPLATE_BASIC.md instead (recommended)

#

# ─────────────────────────────────────────────────────────────────────────────

#

# WR: midnghtsapphire/revvel-standards

**Repository:** [midnghtsapphire/revvel-standards](https://github.com/midnghtsapphire/revvel-standards)  
**Created:** 2026-05-24  
**Last Updated:** 2026-05-24  
**Language:** JavaScript  
**Research Date:** 2026-05-24 <!-- Use YYYY-MM-DD format -->  
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
| Created | 2026-05-24 |
| Last Updated | 2026-05-24 |
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

Consolidate Standards Files into standards/ Directory

### Objective

Detailed Recommendations
REC-001: Consolidate Standards Files into standards/ Directory
Priority: P2 | Effort: Medium (1 day) | Impact: High discoverability

Problem: 30+ *_STANDARD.md files at the root level make the root cluttered and hard to navigate. New contributors don't know where to start.

Solution: Move all *_STANDARD.md files into standards/ with shortened names:

standards/
├── README.md              # Index of all standards
├── accessibility.md       # was ACCESSIBILITY_STANDARD.md
├── agent-factory.md       # was AGENT_FACTORY_STANDARD.md
├── affiliate-marketing.md
├── audrey-agent.md
├── auto-documentation.md
├── code-review.md
├── compliance-rubric.md
├── concurrent-development.md
├── content.md
├── database-architecture.md
├── data-model.md
├── deployment.md
├── field-mapping.md
├── github-projects.md
├── leads.md
├── marketing-automation.md
├── mcp.md
├── runbook.md
├── security.md
├── seo-metadata.md
├── syntax-error-prevention.md
├── testing.md             # MOST IMPORTANT — link to this everywhere
└── vault-agent.md
Implementation Steps:

Create standards/ directory
Copy each file with new name (keep originals temporarily with redirect notice)
Update all cross-references in README.md and other documents
After 2 weeks, remove originals with git history preserved
GitHub Issue Template:

Title: [Folder Structure] Move standards files into standards/ directory
Labels: enhancement, documentation, New Project
Assign: midnghtsapphire

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

- [ ] This WR defines a bundled outcome, not just a minimum acceptable patch.
- [ ] Explicitly requested secondary items should not be silently deferred.
- [ ] If the PR is partial, the blocker must be documented.
- [ ] The PR should reflect the WR's required bundle and definition of done. |
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

**Last Updated:** 2026-05-24  
**Next Review:** [Date in YYYY-MM-DD format or "After implementation"]

# ─────────────────────────────────────────────────────────────────────────────

# END ADVANCED TEMPLATE

#

# For advanced users who want full control

# Use WR_TEMPLATE_BASIC.md for simple WRs (recommended)

# ─────────────────────────────────────────────────────────────────────────────
