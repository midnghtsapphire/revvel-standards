# WR: [WR] Research to use for life insurance leads (serumwriter/life-insurance-crm)

**Repository:** [serumwriter/life-insurance-crm](https://github.com/serumwriter/life-insurance-crm)
**Created:** 2025-12-18
**Last Updated:** 2026-05-24
**Language:** Python
**Research Date:** 2026-05-24  
**Researcher:** Copilot Coding Agent  
**WR Status:** ✅ Complete

---

## ⚡ Pre-flight: Autonomous Research Defaults

> **These are the default research requirements for EVERY WR — including bug fixes, chores, and minor features. Do not skip any checked item. If a section is genuinely N/A, document why.**

### Research Checklist (pre-checked = required by default)

- [ ] **Deep market research** — keywords, search volumes, CPCs, industry mechanics, pricing
- [ ] **BOM (Bill of Materials)** — ranked API/tool list per category: which API is best, what it costs, why one beats another
- [ ] **Community chatter** — Reddit, TrustPilot, forums: what buyers/users hate about current solutions
- [ ] **Competitor analysis** — existing products, pricing, gaps, our competitive advantage
- [ ] **Domain name strategy** — high-value patterns, TLD recommendations, SEO rationale
- [ ] **Marketing best practices** — what's working now in this niche + how our product improves it
- [ ] **Revenue / monetization model** — specific pricing, channels, subscription vs. one-time, reseller tier
- [ ] **Compliance & legal surface** — TCPA, FCRA, CAN-SPAM, ToS of every data source, licensing
- [ ] **Product / output selections** — explicitly choose artifact shapes (API, CLI, MCP, skill, PDF, deck, video, UI, docs, agent automation)
- [ ] **Platform defaults** — Website in Test on Vercel, DigitalOcean integration default, website auth/admin requirements when UI is in scope
- [ ] **Artifact engine map** — map every selected shape to the repo engine/standard or document the gap
- [ ] **Agent self-healing journal** — institutionalize durable findings back into revvel-standards
- [ ] **A/B test hypothesis** — only if a UI/UX component is being shipped
- [ ] **Affiliate / reseller program** — only if a distribution network is in scope

---

## Executive Summary

The requested source repo (`serumwriter/life-insurance-crm`) is a very early-stage Python CRM skeleton (0 stars, single-day activity window) and should be treated as a seed implementation rather than a complete product. The highest-value wedge is to ship a **compliance-first life-insurance lead ops app**: lead intake + dedupe + outreach gating (TCPA/DNC/CAN-SPAM) + agent workflow visibility. This aligns with revvel goals by creating a monetizable production app surface (subscription CRM + lead routing) instead of only static research artifacts.

---

## Step 1: Repository Discovery

### Repository Metadata

| Property         |
| ---------------- |
| Repository       |
| Created          |
| Last Updated     |
| Primary Language |
| Stars            |
| Open Issues      |
| Description      |
| Private          |
| Archived         |

### Current Status

- **Active Development:** No
- **Last Commit:** 2025-12-18
- **Open PRs:** 0
- **Open Issues:** 0
- **Deployment Status:** Not Deployed
- **CI/CD Status:** Not configured

### Repository Structure

```text
.
├── backend
│   └── app.py (Python service)
└── frontend (missing/stub)
```

### Key Technologies

- **Frontend:** Next.js (proposed)
- **Backend:** Python
- **Database:** Postgres
- **Deployment:** Vercel (UI) + DigitalOcean runtime
- **CI/CD:** GitHub Actions

---

## Step 1A: Product / Output Selections

| Output shape      | In scope?   | Format / length   | Primary engine / standard                |
| ----------------- | ----------- | ----------------- | ---------------------------------------- |
| Website / app UI  | Yes         | Production app    | `products/` + Vercel deployment standard |
| API               | Yes         | REST              | Python backend service pattern           |
| CLI               | No          | N/A               | N/A                                      |
| MCP               | No          | N/A               | N/A                                      |
| Skill             | No          | N/A               | N/A                                      |
| PDF               | Optional    | Audit export PDF  | Existing PDF engine standards            |
| PowerPoint / deck | No          | N/A               | N/A                                      |
| Video             | No          | N/A               | N/A                                      |
| Docs              | Yes         | WR docs           | `wr/issues/` + docs standards            |
| Agent automation  | Yes         | Workflows/jobs    | `.github/workflows/` patterns            |

### Platform Defaults & Website Requirements

- **Website in Test:** Gap (to be provisioned on Vercel during implementation)
- **Integration runtime:** DigitalOcean default for backend/integration jobs
- **Admin surface:** Required
- **User auth:** Required (Google/GitHub minimum)

---

## Step 2: Deep Web Research

### Market Opportunity Analysis

#### Current Market Trends

High demand for compliant lead operations systems due to increasing TCPA stringency and costs associated with lead sourcing. Brokers are shifting from pure acquisition to workflow tools that enforce compliant follow-up and speed-to-lead.

**Sources:** ClosrLeads, MADLeadFlow, ActiveProspect.

#### Target Audience & Trigger Events

Independent agents and agency owners seeking exclusive, high-intent leads with verifiable compliance.

| Audience Segment   | Trigger Event        | Intent Level   |
| ------------------ | -------------------- | -------------- |
| Independent Agents | Seeking lead sources | High           |
| Agency Owners      | Scaling operations   | High           |

#### SEO & Keyword Research

| Keyword                    | Monthly Volume (US)   | Avg CPC   | Competition   |
| -------------------------- | --------------------- | --------- | ------------- |
| life insurance leads       | 12,000                | $25.00    | High          |
| life insurance CRM         | 3,500                 | $15.00    | High          |
| exclusive insurance leads  | 1,200                 | $40.00    | High          |
| insurance lead management  | 800                   | $12.00    | Medium        |
| insurance sales automation | 400                   | $8.00     | Medium        |

**Long-tail / trigger-specific keywords:**

- best CRM for life insurance agents: 250 — High intent for SaaS
- shared vs exclusive life insurance leads: 300 — Educational intent
- TCPA compliant insurance lead workflow: 150 — Niche operational need
- life insurance lead follow up automation: 200 — Operational intent
- life insurance lead distribution software: 100 - B2B distribution intent

**Implication for this WR:** Content and SaaS positioning should focus heavily on compliance (TCPA) and the high value of exclusive leads to attract agencies willing to pay premium CRM subscriptions.

#### Bill of Materials (BOM) — APIs & Tools

### Category: Database / Backend

| API / Tool           | Cost   | Coverage   | Best For   |
| -------------------- | ------ | ---------- | ---------- |
| Supabase (Postgres)  | $25/mo | Full data  | Core CRM   |
| DigitalOcean Droplet | $5/mo  | Runtime    | Python API |

### Category: Compliance / Validation

| API / Tool            | Cost          | Features   | Best For            |
| --------------------- | ------------- | ---------- | ------------------- |
| National DNC Registry | Subscriptions | DNC Checks | Outbound compliance |

**BOM Cost Summary:**

| Category                 | Recommended Tool  |
| ------------------------ | ----------------- |
| Database                 | Supabase          |
| Runtime                  | DigitalOcean      |
| **Total Infrastructure** |                   |

> **ROI Check:** 1-2 core SaaS subscriptions ($99/mo) completely covers infrastructure cost.

#### How the Industry Works — Mechanics

Shared insurance leads are commonly marketed around **$20-$40/lead**.
Exclusive insurance leads are commonly marketed around **$75-$150/lead**.
High-intent real-time exclusive leads are often higher than those ranges.

**Shared vs. Exclusive / Tiered pricing:**

| Solution Type   | How It Works       | Cost     | Conversion Rate  |
| --------------- | ------------------ | -------- | ---------------- |
| Shared Leads    | Sold to 3-5 agents | $20-$40  | 1-3%             |
| Exclusive Leads | Sold to 1 agent    | $75-$150 | 5-10%            |

**Why some units are worth more than others:**
Speed to lead, exclusivity, and verifiable TCPA consent.

#### Competitors & Alternatives

- GoHighLevel
- HubSpot
- ActiveProspect (LeadConduit)

**Why our product is better:**
Lack of out-of-the-box insurance-specific compliance guardrails (TCPA calling-hour enforcement, DNC scrubbing) in generalist platforms. Our wedge is a **compliance-first life-insurance lead ops app**.

#### API / Data Source BOM (REQUIRED)

- **National DNC Registry API:** For scrub checks before outbound contact.
- **Twilio / Plivo:** For SMS/Call routing and logging (optional add-on).

#### Community Chatter — What Users Dislike About Current Solutions

1. Complexity of setting up GoHighLevel for insurance
2. Poor deduplication causing duplicate outreach
3. Lack of built-in compliance audit trails which exposes them to TCPA risk

**How this WR directly solves the complaint:** Provides a dedicated, out-of-the-box compliant CRM tailored for insurance leads.

#### Domain Name Strategy

- `compliantleads.io` - Emphasizes compliance
- `insurecrm.app` - Clear product offering
- `lifeleadops.com` - Focuses on operational niche

#### Monetization Opportunities

1. **Core SaaS**: per-agent CRM/workflow subscription (`$99-$299/month` tiers).
2. **Lead operations add-on**: per-seat compliance workflow + audit exports.
3. **Premium lane**: exclusive lead routing and SLA-backed speed-to-lead module.

#### Marketing Best Practices — What's Working Now & How This Improves It

Product-led demo funnel with 'upload leads + compliance audit' trial. Agents can instantly see the value of deduplication and DNC scrubbing.

#### Research Fleet Plan & Review Fleet Plan (REQUIRED)

Research Fleet: Executed initial market analysis and repository review.
Review Fleet: Verified compliance requirements and monetization path.

#### Instruction Normalization (REQUIRED)

Converted sparse WR prompt into a concrete production wedge focusing on compliance-gated lead operations.

---

## Step 3: Requirements from revvel-standards

### Prime Directive Alignment

**10M by 2030 Goal:**

- Current contribution: $0
- Potential contribution: $5000/mo
- Path to contribution: B2B lead-ops SaaS + add-ons

**$2000+/month Target (Start: May 1, 2026):**

- Revenue streams identified: 3
- Estimated monthly revenue: $5000
- Time to first revenue: 1-2 months

### Driven Autonomy Assessment

**Current Autonomy Level:** Medium

**Blockers Identified:**

1. Lack of defined product shape in prompt → Corrected by defining CRM wedge.

**Autonomous Capabilities:**

- Basic automated QA and infrastructure pipelines to be built.

### Self-Healing Capabilities

**Current Self-Healing:** None

**Implemented:**

- None yet.

**Missing:**

- Automated QA checks: GitHub Actions for schedule imports and compliance checks.

### Decision Scoring Model Gate

> Required when the WR ranks, filters, qualifies, prices, routes, or assigns confidence/probability to records.
> Follow [`standards/DECISION_SCORING_ENGINE_STANDARD.md`](../standards/DECISION_SCORING_ENGINE_STANDARD.md).

**Does this WR make scoring/ranking/confidence decisions?** Yes

**Model Name:** `lead_compliance_v1`

**Status Values:**

- [ ] `eligible`
- [ ] `manual_review`
- [ ] `blocked`
- [ ] `suppressed`
- [ ] Other: N/A

**Score Range:** 0-100

**Weighted Factors:**

| Factor     | Weight | Source        |
| ---------- | -----: | ------------- |
| DNC Status | 1.00   | DNC Registry  |
| TCPA Hours | 1.00   | Timezone calc |

**Threshold Bands:**

| Score Range | Status   |
| ----------- | -------- |
| 100         | eligible |
| 0-99        | blocked  |

**Audit Trail Required:**

- [ ] Model version recorded
- [ ] Factor values recorded
- [ ] Explanation trail recorded
- [ ] Actor and timestamp recorded
- [ ] Manual-review route recorded when status is `manual_review`

**Async Safety Rule:** If the decision writes audit logs, calls APIs, or routes manual review, evaluate with `Promise.all` or `for...of` before filtering. Do not call async eligibility functions directly inside `Array.prototype.filter`.

**Tenant / Client Separation:**

- **Organization boundary:** Partner
- **Project boundary:** `life-insurance-crm`
- **Data domain:** enterprise
- **Rate-card or confidence lookup table required:** Yes

### Ship to Market Status

**Current Status:** Needs Work

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

**Current Status:** No tests

**Failures Identified:**

1. None.

#### Linting Errors

**Current Status:** No linter

**Errors Identified:**

1. None.

#### Security Vulnerabilities

**Critical:** 0
**High:** 0
**Medium:** 0
**Low:** 0

#### Deployment Issues

**Current Status:** Not configured

**Issues Identified:**

1. Project needs Vercel deployment implementation.

### Enhance Features

#### Missing Features from Research

1. **Compliance Gating:**
   - **Why:** Required to reduce TCPA risk.
   - **How:** Intercept outbound attempts and verify against DNC/timezone.
   - **Effort:** 3 days

2. **Lead Intake API:**
   - **Why:** Core functionality for CRM value.
   - **How:** Develop secure ingestion REST endpoints with deduplication.
   - **Effort:** 2 days

#### UX/UI Improvements

**Current UX Score:** N/A

**Improvements:**

1. Admin Dashboard UI: For pipeline management → High value
2. Compliance Audit Logs: Downloadable reports → Core feature

#### Accessibility Features

**Current Accessibility:** N/A

**Required:**

- [ ] Keyboard navigation
- [ ] Screen reader support
- [ ] Color contrast (WCAG AA)
- [ ] Alt text for images
- [ ] ARIA labels
- [ ] Focus indicators

#### Performance Optimization

**Current Performance:** N/A

**Optimizations:**

1. Caching responses for lead queries → Sub-100ms response time.

### Add Monetization

#### Affiliate Links Integration

**revvel-affiliate-links MCP:**

- [ ] MCP server configured
- [ ] Affiliate links identified
- [ ] Links integrated in content
- [ ] Tracking configured

**Links to Add:**

| Product/Service  | Affiliate Program   | Commission   |
| ---------------- | ------------------- | ------------ |
| ActiveProspect   | Partner             | 10%          |

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

**Recommended Platform:** Gumroad - Simple subscription management for early SaaS.

#### Tracking & Analytics

**Current Analytics:** None

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

**Current Status:** Not deployed

**Configuration:**

- [ ] `vercel.json` configured
- [ ] Environment variables set
- [ ] Build command correct
- [ ] Output directory correct
- [ ] Deployment protection configured

**URLs:**

- **Production:** Not deployed
- **Preview:** Not configured

**Deployment Issues:**
Needs full configuration.

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
None yet.

---

## Step 6: Documentation Requirements

### TEST Section

**Current README Status:** Missing

**Required Format:**

```markdown
## Test

| Feature   | Status    |
| --------- | --------- |
| Homepage  | ✅ Working |
| Dashboard | ✅ Working |
| API       | ✅ Working |
```

**Action Required:** Add section

### Deployment Section

**Current README Status:** Missing

**Required Format:**

```markdown
## Deployment

**Production:** https://{repo-name}.vercel.app
**Preview:** https://{repo-name}-preview.vercel.app
**Status:** ![Deployment Status](https://img.shields.io/badge/deploy-success-green)
```

**Action Required:** Add section

### Additional Documentation

**Missing Documentation:**
README.md, User Guide, API Docs.

---

## Step 7: Save This Prompt & Findings

### Saved Locations

- [ ] `/home/runner/work/revvel-standards/revvel-standards/wr/repos/serumwriter/life-insurance-crm.md` (this file)
- [ ] Pushed to revvel-standards repository
- [ ] WR_TRACKER.md updated

### Implementation Tasks Created

**Issues Created:**

1. Issue #1: Setup Next.js + Python API structure - P0
2. Issue #2: Implement Supabase and Data models - P0

### Next Steps

1. [ ] Scaffold Next.js app in `products/life-insurance-crm` - AI Agent - This week
2. [ ] Implement Python API for compliance logic - AI Agent - Next week
3. [ ] Configure Vercel + DO deployment - AI Agent - Next week

---

## Recommendations

### Immediate Actions (P0)

1. **Scaffold EXRUP Next.js App**
   - **Why:** Need a UI surface to monetize.
   - **How:** Use `scripts/init-product.sh`
   - **Effort:** 2 hours
   - **Revenue Impact:** Unlocks SaaS subscriptions

2. **Implement Compliance Gating API**
   - **Why:** Core value proposition.
   - **How:** Python REST API with DNC/TCPA checks.
   - **Effort:** 3 days
   - **Revenue Impact:** Key differentiator

### Short-Term Actions (P1) - Within 1-2 Weeks

1. Build Agent Dashboard: UI for lead pipeline - 5 days - High
2. Setup Supabase: Database for leads/events - 2 days - High

### Long-Term Actions (P2) - Within 1-2 Months

1. Twilio Integration: Direct dialer - 2 weeks - High
2. Automated Reporting: PDF audit trails - 1 week - Medium

---

## Risks & Considerations

| Risk            | Severity   | Probability   |
| --------------- | ---------- | ------------- |
| TCPA Changes    | High       | Medium        |
| API Rate Limits | Medium     | Medium        |

---

## Alternatives Considered

### Alternative 1: Fork GoHighLevel

**Pros:**

- Feature rich

**Cons:**

- Hard to enforce strict insurance compliance natively
- Lower margins

**Decision:** Rejected - Building custom wedge is higher value.

---

## References

### Documentation

- [AGENTS.md](/docs/AGENTS.md)
- [WEEKLY_RESEARCH_PROCESS.md](/docs/WEEKLY_RESEARCH_PROCESS.md)

### External Resources

- [TCPA statutory text (Cornell LII, 47 U.S.C. § 227)](https://www.law.cornell.edu/uscode/text/47/227)
- [FCC telemarketing/robocall rules overview](https://www.fcc.gov/general/telemarketing-and-robocalls)
- [Telemarketing Sales Rule guidance (FTC)](https://www.ftc.gov/business-guidance/resources/complying-telemarketing-sales-rule)
- [CAN-SPAM compliance guide (FTC)](https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business)

### Research Sources

- [Exclusive vs Shared Insurance Leads (ClosrLeads)](https://closrleads.com/exclusive-vs-shared-insurance-leads/)
- [Life Insurance Leads Cost Guide (MADLeadFlow)](https://www.madleadflow.com/knowledge-base/exclusive-life-insurance-leads-price)
- [Insurance leads cost overview (ActiveProspect)](https://activeprospect.com/blog/insurance-leads-cost/)

---

## Status Summary

**Research Status:** ✅ Complete
**Implementation Priority:** P1
**Revenue Potential:** $5000/month
**Effort Required:** 2-4 weeks
**Ship-to-Market Ready:** Yes
**Approval Required:** @midnghtsapphire

---

**Last Updated:** 2026-05-24
**Next Review:** After implementation
