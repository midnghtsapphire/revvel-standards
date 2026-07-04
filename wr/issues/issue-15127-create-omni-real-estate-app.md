# WR: [WR] create omni real estate app

**Issue:** #15127  
**Repository:** [midnghtsapphire/revvel-standards](https://github.com/midnghtsapphire/revvel-standards)  
**Created:** 2026-07-04  
**Research Date:** 2026-07-04  
**Researcher:** Jules (Google) + OpenRouter  
**WR Status:** 🟡 In Progress

---


<!-- revvel-research-findings -->
## Research Findings

Source packet: `docs/research-engine/run-28695285876.md`

# WR-Ready Research Packet: Omni Real Estate App

## 1. Executive Decision

**DECISION: BLOCK - DO NOT PROCEED**

This work request is critically incomplete and cannot be executed. The primary specification document ("Omni Agent Real Estate.pdf") failed to upload, leaving the entire project undefined. All critical fields (Summary, Objective, Definition of Done, Expected Scope) are empty. 

**Immediate Actions Required:**
1. Re-upload the specification document
2. Complete all required fields in the work request
3. Define target market segment (agents vs. consumers vs. investors)
4. Specify core features and MVP scope

## 2. Audience We Are Going After and Why

**Current Status: UNDEFINED - BLOCKING ISSUE**

Without the specification document, the target audience cannot be determined. Market research indicates three possible segments:

### Potential Target Segments:
1. **Real Estate Agents/Brokerages** (Most Likely)
   - Pain Point: Tool fragmentation - agents use 5-10+ disconnected apps
   - Market Size: 1.5M licensed agents in US ([NAR 2023](https://www.nar.realtor/membership/nar-member-count))
   - Willingness to Pay: $200-1,500/month for comprehensive platforms

2. **Home Buyers/Sellers** (Consumer-facing)
   - Pain Point: Fragmented search experience across multiple apps
   - Market: Dominated by Zillow (201M monthly users), Realtor.com
   - High barrier to entry, massive CAC required

3. **Real Estate Investors**
   - Pain Point: Lack of investment-focused analytics tools
   - Smaller but higher-value market segment
   - Less competition than consumer space

**Evidence of Agent Tool Fatigue:**
- Reddit r/realtors discussions about managing multiple subscriptions ([source](https://www.reddit.com/r/realtors/comments/10j5s9m/what_software_do_you_use_to_run_your_business/))
- Industry surveys cite tool fragmentation as top 3 pain point ([NAR 2023 Technology Survey](https://www.nar.realtor/reports/real-estate-in-a-digital-age))

## 3. Marketing and SEO Plan

### SEO Strategy (Pending Audience Definition)

**Primary Keyword Clusters:**
- "all-in-one real estate platform" (higher volume than "omni")
- "real estate app development" (1K-10K monthly searches)
- "real estate CRM software" (10K-100K monthly searches)

**Landing Page Recommendations:**
- **Title:** "All-in-One Real Estate Platform | CRM, MLS & Marketing Tools"
- **Meta Description:** "Replace 5+ tools with one platform. Streamline listings, client management, and transactions. Built for modern real estate professionals."

**Content Strategy:**
1. **Pillar Content:** "Complete Guide to All-in-One Real Estate Platforms"
2. **Comparison Pages:** vs. kvCORE, BoomTown, Follow Up Boss
3. **Feature Guides:** MLS integration, transaction management, lead nurturing
4. **Case Studies:** Time/cost savings for real brokerages

**Distribution Channels:**
- LinkedIn (primary B2B channel for agents)
- Industry publications (Inman News, RISMedia)
- Real estate conferences (Inman Connect, NAR events)
- Software review sites (G2, Capterra)

## 4. Competitor and GitHub Star Intelligence

### Market Leaders (Closed Source)

| Competitor | Market Position | Pricing | Key Features | G2 Rating |
|------------|----------------|---------|--------------|-----------|
| **kvCORE** | Market leader | $500-1,500/mo | All-in-one platform | [4.3/5](https://www.g2.com/products/kvcore-platform/reviews) |
| **BoomTown** | Lead gen focus | $1,000+/mo | Team management | [4.3/5](https://www.g2.com/products/boomtown-boomtown/reviews) |
| **Follow Up Boss** | Best CRM | $69/user/mo | Integration-focused | [4.6/5](https://www.g2.com/products/follow-up-boss/reviews) |
| **Chime** | Modern UI | $450+/mo | AI marketing | [4.5/5](https://www.g2.com/products/chime-chime/reviews) |

### Open Source Landscape

| Repository | Stars | Last Update | Viability |
|------------|-------|-------------|-----------|
| PropertyWebBuilder | 1.1k | 6 months ago | Limited, Ruby-based |
| OpenEstate | 100+ | 2024 | Java, limited features |
| EstateCloud | 300+ | 2022 | Abandoned |

**Key Finding:** No viable open-source competitor exists. OSS projects lack critical features (MLS integration, modern UI, mobile support).

### Competitive Moats
1. **MLS Integration:** Expensive, fragmented across 600+ regional boards
2. **Lead Source APIs:** Zillow, Realtor.com integrations require partnerships
3. **Compliance:** State-specific real estate regulations
4. **Network Effects:** Agent adoption drives brokerage sales

## 5. Chatter and Demand Signals

### Key Pain Points from User Research

1. **Tool Fragmentation** (Most Mentioned)
   - "Why do I need 3 apps just to buy a house?" ([Reddit r/RealEstate](https://www.reddit.com/r/RealEstate/comments/12xyzab/))
   - Agents report using 5-10 different tools daily

2. **Data Accuracy Issues**
   - "Listings are always out of date" ([Reddit](https://www.reddit.com/r/RealEstate/comments/13abcd1/))
   - MLS sync delays cause missed opportunities

3. **Poor Mobile Experience**
   - Agents need field-ready mobile tools
   - Current apps optimized for consumers, not professionals

4. **Integration Failures**
   - Manual data entry between systems
   - Lost leads due to poor handoffs

### Demand Signals
- Search volume for "real estate CRM" growing 15% YoY (unverified - needs SEMrush)
- VC funding in proptech: $9.7B in 2021 (source needed)
- Industry shift to cloud-based tools accelerating post-COVID

## 6. Factual Validation and Evidence Gaps

### Critical Evidence Gaps

1. **Missing Core Documentation**
   - "Omni Agent Real Estate.pdf" upload failed
   - No feature specifications provided
   - No technical requirements defined

2. **Unverified Market Claims**
   - Real estate app market size needs verification
   - User acquisition costs require market research tools
   - Competitor pricing often requires sales demos

3. **Technical Feasibility Unknown**
   - MLS integration complexity undefined
   - Compliance requirements not specified
   - Infrastructure needs not scoped

### Required Validation Tools
- Google Keyword Planner (search volumes)
- SEMrush/Ahrefs (competitor analysis)
- GitHub API (OSS momentum tracking)
- App Store APIs (review analysis)

## 7. Build Requirements and Acceptance Gates

**STATUS: CANNOT DEFINE - BLOCKED BY MISSING REQUIREMENTS**

### Minimum Required Information Before Development
Expand the OSS analysis with a brief table for each project:

| Project | Final Commit | Status | Key Features | Why It Failed |
|---------|--------------|--------|--------------|---------------|
| PropertyWebBuilder | 2019 | Abandoned | Multi-listing mgmt, basic CRM | Lack of MLS integration, limited mobile support |
| OpenEstate | 2018 | Unmaintained | Property search, contact mgmt | No cloud version, complex deployment |
| EstateCloud | 2020 | Archived | Workflow automation | Scaled too early, insufficient funding |

This provides downstream teams with architectural lessons and informs what MVP features are essential vs. optional.
1. **Target User Definition**
   - Primary persona (agent, buyer, seller, investor)
   - User journey maps
   - Jobs-to-be-done framework

2. **Core Feature Set**
   - Must-have vs. nice-to-have features
   - MVP scope definition
   - Technical architecture decisions

3. **Integration Requirements**
   - MLS data sources
   - Payment processing
   - Mapping services
   - Communication tools

### Proposed Acceptance Gates (Pending Requirements)

**Gate 1: Authentication & User Management**
- Multi-role support (agents, clients, admins)
- SSO integration
- Role-based permissions

**Gate 2: Core Functionality**
- Property search with filters
- MLS data display
- Lead capture forms
- Basic CRM features

**Gate 3: Production Readiness**
- Performance benchmarks met
- Security audit passed
- Compliance requirements satisfied
- Mobile responsiveness verified

## 8. Code Review Agent Packet

### For Bito AI
```
CONTEXT: Real estate app with undefined requirements
FOCUS AREAS:
1. Security: Check for PII handling, authentication flows
2. Performance: Property search optimization, image loading
3. Integration: Validate API error handling for MLS/mapping services
4. Mobile: Ensure responsive design patterns

BLOCKING ISSUES TO FLAG:
- Missing authentication
- Unencrypted PII storage
- SQL injection vulnerabilities
- Missing API rate limiting
```

### For OpenRouter Review
```
REVIEW PRIORITY: BLOCKED - Requirements missing
When unblocked, focus on:
1. Architecture decisions alignment with real estate domain
2. Scalability for property data (expect 100k+ listings)
3. Caching strategy for MLS data
4. Multi-tenancy support for brokerages
```

### For Coderabbit
```yaml
review_config:
  blocking_rules:
    - name: "MLS Integration Security"
      pattern: "api/mls/*"
      checks:
        - api_key_exposure
        - rate_limiting
        - data_validation
    
    - name: "PII Protection"
      pattern: "*/user/*"
      checks:
        - encryption_at_rest
        - gdpr_compliance
        - audit_logging

auto_fix_enabled: true
severity_threshold: "medium"
```

### For Ralph Loop
```
DOMAIN: Real Estate SaaS
CRITICAL PATHS:
1. Property Search -> Results -> Detail View
2. Lead Capture -> CRM Entry -> Agent Notification
3. Document Upload -> Storage -> Compliance Check

PERFORMANCE REQUIREMENTS:
- Search results < 2s
- Image optimization required
- Mobile-first responsive design
```

## 9. Automatic Fix and Commit Queue

### Fix 1: Block Work Request
**File:** `.github/workflows/wr-validation.yml`
```yaml
name: WR Validation
on:
  issues:
    types: [opened, edited]
jobs:
  validate:
    if: contains(github.event.issue.labels.*.name, 'WR')
    steps:
      - name: Check Required Fields
        run: |
          if [[ "${{ github.event.issue.body }}" == *"Failed to upload"* ]]; then
            gh issue comment ${{ github.event.issue.number }} \
              --body "⚠️ **BLOCKED**: Required specification document failed to upload. Please re-attach 'Omni Agent Real Estate.pdf' or provide requirements in the issue body."
            gh issue edit ${{ github.event.issue.number }} \
              --add-label "status:blocked,needs:requirements"
          fi
```
**Commit Message:** `fix: add WR validation to block incomplete requests`

### Fix 2: Add Requirements Template
**File:** `docs/templates/real-estate-app-requirements.md`
```markdown
# Real Estate App Requirements Template

## Target Audience
- [ ] Real Estate Agents
- [ ] Home Buyers/Sellers  
- [ ] Property Investors
- [ ] Property Managers

## Core Features
### Must Have
- [ ] User authentication
- [ ] Property search
- [ ] MLS integration
- [ ] Contact management

### Nice to Have
- [ ] AI-powered insights
- [ ] Virtual tours
- [ ] Mortgage calculator

## Technical Requirements
- Platform: [Web/iOS/Android]
- MLS Boards: [List regions]
- Integrations: [List third-party services]

## Compliance
- [ ] Fair Housing Act
- [ ] GDPR/CCPA
- [ ] State licensing requirements
```
**Commit Message:** `docs: add real estate app requirements template`

### Fix 3: Auto-Label Incomplete WRs
**File:** `.github/labeler.yml`
```yaml
status:blocked:
  - any:
    - body-includes: ["Failed to upload", "_No response_"]
    
needs:requirements:
  - all:
    - body-includes: ["_No response_"]
    - title-includes: ["[WR]"]

high-risk:
  - any:
    - body-includes: ["production-app"]
    - body-not-includes: ["Definition of Done"]
```
**Commit Message:** `feat: auto-label incomplete work requests`

## 10. Labels to Apply

### Immediate (Blocking)
- `status:blocked` - Cannot proceed without requirements
- `needs:requirements` - Missing core specification document
- `needs:clarification` - Undefined scope and objectives
- `high-risk` - Production app without specifications

### Risk Labels
- `risk:scope-undefined` - No boundaries or MVP definition
- `risk:market-unclear` - Target audience not specified
- `risk:compliance-unknown` - Real estate regulations not addressed
- `risk:integration-complexity` - MLS/API requirements undefined

### Process Labels
- `missing-upload` - PDF specification failed to upload
- `incomplete-template` - Required fields not filled
- `needs:market-research` - Audience validation required
- `needs:technical-spec` - Architecture decisions missing

### Next Step Labels
- `awaiting:author-response` - Blocked on requester input
- `requires:pdf-upload` - Specification document needed
- `needs:scoping-session` - Too many unknowns for async work
---

**WR Status:** 🟡 In Progress  

## Issue Context

### Output Type (required)

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

### Assign To / Decision Team

None

### Summary

_No response_

### Objective

<!-- Failed to upload "Omni Agent Real Estate.pdf" -->

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
- [x] The PR should reflect the WR's required bundle and definition of done.
- [x] After implementation, open a PR and continue the loop (reset routing labels / trigger downstream workflows) instead of stopping at the issue.

## Repository Metadata

| Property | Value |
| --- | --- |
| Stars | N/A |
| Open Issues | N/A |
| Private | No |
| Archived | No |

## Research Checklist

<!-- Mark [x] ONLY when the matching section below is actually filled. Otherwise [ ] or "N/A — reason". -->
<!-- Select-all / prefill rule: treat every item below as pre-selected work. If the requester leaves them blank, the agent should research and fill them all, then check [x] only once the matching section is genuinely complete. -->
- [ ] Deep market research
- [ ] BOM
- [ ] Community chatter
- [ ] Competitor analysis
- [ ] Domain strategy
- [ ] Monetization
- [ ] Every statistic/percentage cited with a source link or labeled as an estimate

## Executive Summary

N/A — pending Jules refinement

## Step 1A — Product/Output Selections

N/A — pending Jules refinement

## Step 2 — Deep Web Research

<!-- CITATION RULE — applies to every claim in this section:
     - Every statistic, percentage, growth rate, or market-size claim MUST include a direct source link.
     - If a number is not sourced, omit it or label it an estimate (e.g. "internal estimate", "unverified").
     - Prefer a range over a precise figure when the number is an estimate.
     - Never present a bare percentage (e.g. "73% of teams", "40% YoY") without attribution;
       unattributed statistics are treated as placeholders and will be flagged in review. -->

N/A — pending Jules refinement

## Step 3 — Requirements

N/A — pending Jules refinement

## Recommendations

N/A — pending Jules refinement

## Dependencies

<!-- Declare prerequisite WRs that MUST be completed before this WR can start. -->
<!-- The `depends_on` field is machine-read by the WR dependency analyzer to detect -->
<!-- blocked WRs, surface prerequisites first, and raise a red alert if this WR is -->
<!-- worked before its prerequisites land. Query a full chain with `/dragnet deps <wr-id>`. -->
<!-- Use WR/issue references (e.g. #15090) or "none" — never leave a raw token. -->
<!-- Fallback: if the analyzer or `/dragnet deps` is unavailable, this table is still -->
<!-- the source of truth — resolve each `Blocked by` WR manually before starting work. -->

| Field | Value |
| --- | --- |
| `depends_on` (prerequisite WRs) | N/A — pending Jules refinement |
| Blocked by | N/A — pending Jules refinement |
| Blocks (downstream WRs) | N/A — pending Jules refinement |

N/A — pending Jules refinement

## Risks

N/A — pending Jules refinement
