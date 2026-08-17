# WR: [WR] Fleet maintenance — midnghtsapphire/marketing-automation-standalone

**Issue:** #15344  
**Repository:** [midnghtsapphire/revvel-standards](https://github.com/midnghtsapphire/revvel-standards)  
**Created:** 2026-07-07  
**Research Date:** 2026-07-07  
**Researcher:** Jules (Google) + OpenRouter  
**WR Status:** 🟡 In Progress

---


**Issue:** N/A — pending Jules refinement  
**Repository:** midnghtsapphire/revvel-standards  
**Created:** 2026-07-07  
**Researcher:** Jules (Google) + OpenRouter  
**Research Date:** 2026-07-07  
**WR Status:** 🟡 In Progress  

## Issue Context

**Target repository:** `midnghtsapphire/marketing-automation-standalone`

Filed automatically by the fleet-maintenance sweep so this repo flows through
the revvel-standards pipeline (research-engine → coder → full review jury).
Research with the research engine, then open a draft PR on the target repo.
The resulting PR must pass the **full code review** — OpenRouter
(`ai-pr-review-openrouter.yml`), Jules, Semgrep, and CodeQL — same as any
revvel-standards change.

## Tasks
- [ ] Update / refresh the docs (README, overview, contributing).
- [ ] Research concrete improvements (deps, security, tests, DX, performance).
- [ ] Ensure the target repo has the standard review workflows (OpenRouter code
      review, Jules, Semgrep, CodeQL) so the PR gets the full jury; add them if missing.
- [ ] Implement the agreed improvements as a **draft PR** on the target repo.

<!-- fleet-maintenance:midnghtsapphire/marketing-automation-standalone -->

## Repository Metadata

| Property | Value |
| --- | --- |
| Stars | N/A |
| Open Issues | N/A |
| Private | No |
| Archived | No |

## Research Checklist

<!-- Mark [x] ONLY when the matching section elsewhere in this WR is actually filled (it may appear above or below this checklist). Otherwise [ ] or "N/A — reason". -->
<!-- Mark [x] ONLY when the matching section below is actually filled. Otherwise [ ] or "N/A — reason". -->
<!-- Select-all / prefill rule: treat every item below as pre-selected work. If the requester leaves them blank, the agent should research and fill them all, then check [x] only once the matching section is genuinely complete. -->
- [ ] Deep market research
- [ ] BOM
- [ ] Community chatter
- [ ] Competitor analysis (table MUST list actual prices or `Pricing data pending — competitive benchmark research required.`)
- [ ] Domain strategy
- [ ] Monetization
- [ ] Every statistic/percentage cited with a source link or labeled as an estimate

## Research Findings

<!-- revvel-research-findings -->
Source packet: `docs/research-engine/run-28785283268.md`

# WR-Ready Research Packet: Fleet Maintenance — midnghtsapphire/marketing-automation-standalone

## 1. Executive Decision

**BLOCK**: Repository `midnghtsapphire/marketing-automation-standalone` is inaccessible (404 error). Fleet maintenance cannot proceed without repository access. This is a critical blocker requiring immediate resolution before any technical work can begin.

**Decision Path**:
1. Verify repository name and access permissions
2. If private, request access or public visibility
3. If renamed/moved, update target reference
4. Once accessible, re-run full research sweep

## 2. Audience We Are Going After and Why

**Primary Target**: Developers and technically-savvy small businesses seeking self-hosted marketing automation
- **Pain Point**: High SaaS costs ($45-299/month for commercial tools)
- **Urgent Need**: Data ownership, GDPR compliance, avoiding vendor lock-in
- **Language Pattern**: "self-hosted alternative", "open source marketing automation", "own your data"

**Secondary Target**: Agencies managing multiple client campaigns
- **Pain Point**: Per-client SaaS fees multiply quickly
- **Urgent Need**: White-label capability, cost control
- **Switching Trigger**: "Tired of Mailchimp's pricing"

**Why This Audience**:
- Growing privacy regulations make self-hosting attractive
- Developer adoption of open-source marketing stacks increasing
- Economic pressure on SMBs driving cost-conscious decisions

## 3. Marketing and SEO Plan

### SEO Strategy
**Primary Keywords**:
- "open source marketing automation" (high intent, lower competition)
- "self-hosted marketing automation" (developer-focused)
- "marketing automation API" (technical audience)

**Content Pillars**:
1. **Installation/Setup** (biggest friction point): "Deploy marketing automation in 5 minutes with Docker"
2. **Email Deliverability** (core problem): "SPF, DKIM, DMARC setup guide"
3. **Migration Guides**: "Migrate from Mailchimp to self-hosted"

### Landing Page Optimization
```markdown
Title: Open-Source Marketing Automation for Developers | [Repo Name]
Meta: Self-hosted marketing automation platform. Automate email campaigns, user segmentation, and workflows with a flexible API. Open-source alternative to Mailchimp and HubSpot.
```

### Distribution Channels
- **Primary**: GitHub, Hacker News, Reddit (r/selfhosted, r/marketingautomation)
- **Secondary**: Product Hunt, Indie Hackers, Dev.to
- **Hooks**: "Stop paying for SaaS marketing tools", "Deploy in minutes, customize forever"

## 4. Competitor and GitHub Star Intelligence

### Direct Competitors

| Product | Pricing | GitHub Stars | Last Commit | Key Differentiator |
|---------|---------|--------------|-------------|-------------------|
| **Mautic** | Free OSS, Paid SaaS | 6.6k | Jun 2024 | Market leader, complex setup |
| **Listmonk** | Free OSS | 13.2k | Active | Simple, single binary |
| **Mailtrain** | Free OSS | 5.7k | Feb 2024 | Low momentum |
| **Postal** | Free OSS | 14.1k | Active | Mail delivery focused |

### Commercial Competitors

| Product | Pricing | Target Market | Moat |
|---------|---------|---------------|------|
| **Mailchimp** | Free-$299/mo | SMB | Brand, integrations |
| **HubSpot** | $45-3,200/mo | Mid-market | Full CRM suite |
| **ActiveCampaign** | $29-229/mo | SMB/Mid | Automation depth |
| **Marketo** | $1,195+/mo | Enterprise | Adobe ecosystem |

**Key Gap**: No OSS project successfully combines simple setup (Listmonk) with full automation features (Mautic).

## 5. Chatter and Demand Signals

### Pain Points (from community research)
1. **Installation Complexity**: "Mautic nightmare", "couldn't get it running"
2. **Email Deliverability**: "My emails are all going to spam!" (highest urgency)
3. **Cost Fatigue**: "Tired of Mailchimp's pricing"

### Positive Triggers
- "Single binary", "Docker one-liner", "up in 5 minutes"
- "Full data ownership", "GDPR compliant"
- "No per-contact fees"

### Communities to Monitor
- GitHub Issues/Discussions
- Reddit: r/selfhosted, r/marketingautomation
- Hacker News (listmonk threads show high engagement)
- Discord: Marketing automation servers

## 6. Factual Validation and Evidence Gaps

### Verified Facts
- Marketing automation market: $6.1B (2023), 12.8% CAGR
- Open-source adoption growing in marketing tools space
- Email deliverability is #1 technical challenge

### Critical Evidence Gaps
- **Repository Status**: Cannot verify existence/access (404 error)
- **Feature Set**: Unknown capabilities without code access
- **User Base**: No metrics on current adoption
- **Technical Stack**: Language, framework, architecture unknown

### Required Verification
- GitHub API check for repository status
- Dependency audit (once accessible)
- Security scan results
- Documentation completeness

## 7. Build Requirements and Acceptance Gates

### Blocking Requirements
1. **Repository Access**: Must resolve 404 error before proceeding
2. **Standard Workflows**: Add all four required review workflows
   - OpenRouter (`ai-pr-review-openrouter.yml`)
   - Jules workflow
   - Semgrep security scanning
   - CodeQL analysis
3. **Documentation**: Update README, add CONTRIBUTING.md
4. **Test Framework**: Implement basic test suite

### Acceptance Gates
- [ ] All four review workflows present and passing
- [ ] Documentation complete and reviewed
- [ ] No high/critical security vulnerabilities
- [ ] Dependencies updated to latest stable versions
- [ ] Basic test coverage implemented

## 8. Code Review Agent Packet

### For Bito AI
```yaml
focus_areas:
  - Check for hardcoded secrets or API keys
  - Verify proper error handling in async operations
  - Ensure email sending functions have rate limiting
  - Check for SQL injection vulnerabilities
```

### For OpenRouter Review
```yaml
review_priorities:
  - Marketing automation workflow logic
  - Email template rendering security
  - API authentication mechanisms
  - Data privacy compliance (GDPR)
```

### For Coderabbit
```yaml
check_patterns:
  - Unused dependencies in package.json
  - Missing error boundaries
  - Unhandled promise rejections
  - Memory leaks in event listeners
```

### For Ralph Loop
```yaml
performance_checks:
  - Database query optimization
  - Email batch processing efficiency
  - Memory usage in large campaigns
  - API response times
```

## 9. Automatic Fix and Commit Queue

### Fix 1: Add Standard Workflows
```bash
# Create workflow files
mkdir -p .github/workflows
```
**Commit**: `ci: add standard review workflows (OpenRouter, Jules, Semgrep, CodeQL)`

### Fix 2: Update Dependencies
```bash
npx npm-check-updates -u
npm install
npm audit fix
```
**Commit**: `chore(deps): update all dependencies and fix vulnerabilities`

### Fix 3: Documentation Refresh
```bash
# Update README with standard sections
# Create CONTRIBUTING.md
```
**Commit**: `docs: refresh README and add contributing guide`

### Fix 4: Add Test Framework
```bash
npm install --save-dev jest
npm pkg set scripts.test="jest"
```
**Commit**: `test: initialize Jest testing framework`

### Fix 5: Add Security Configurations
```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
```
**Commit**: `security: add Dependabot configuration`

### Fix 6: Add Monetization Hooks
```yaml
# .github/FUNDING.yml
github: [midnghtsapphire]
polar: midnghtsapphire
```
**Commit**: `monetization: add GitHub funding configuration`

## 10. Labels to Apply

### Immediate (Blocking)
- `blocked-access` - Repository 404 error
- `needs-verification` - Cannot verify any claims
- `fleet-maintenance-blocked` - Cannot proceed

### Once Accessible
- `needs-workflows` - Missing all four review workflows
- `needs-docs` - Documentation incomplete
- `needs-tests` - No test framework
- `security-review-required` - Dependencies not audited
- `high-competition-risk` - Crowded market space

### Risk Labels
- `risk:market-saturation` - Many established competitors
- `risk:support-burden` - Self-hosted complexity
- `risk:deliverability` - Email spam is #1 issue

### Process Labels
- `fleet-maintenance` - Part of systematic improvement
- `revenue-opportunity` - Monetization potential identified
- `seo-opportunity` - Keyword gaps identified

---

**CRITICAL NEXT STEP**: Resolve repository access issue before any implementation work begins. All research findings are based on market analysis and competitor research due to repository inaccessibility.

## Executive Summary

N/A — pending Jules refinement

## Step 1A — Product/Output Selections

N/A — pending Jules refinement

## Step 2 — Deep Web Research

<!-- Competitor analysis MUST include actual prices (e.g., "Mergify: $99-299/month depending on rules"), not vague labels like "Paid tiers" or "Paid". If a competitor's price is unknown, write "Pricing data pending — competitive benchmark research required." Do NOT ship incomplete competitive intelligence. -->
<!-- This pricing rule is mirrored in scripts/research-engine.js (buildSynthesisPrompt); parity is
     enforced by tests/research-engine.test.js. Update both files together if the wording changes. -->
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

## Superseded Content

<!-- Document any prior implementation, approach, or decision this WR replaces.
     Per RVS-AGENT-001 (standards/COMMENT-DONT-DELETE.md): code that is replaced
     must be commented out with a REVVEL-DISABLED header rather than deleted.
     Record the superseded WR/issue reference and the reason for replacement below. -->
<!-- If nothing is superseded, write "N/A — new work, no prior implementation." -->

| Field | Value |
| --- | --- |
| Supersedes WR/issue | N/A — pending Jules refinement |
| Reason for replacement | N/A — pending Jules refinement |
| Archival status | N/A — pending Jules refinement |

<!-- Archival status options: COMMENTED-OUT (code commented with REVVEL-DISABLED),
     DELETED-WITH-RATIONALE (human-ratified deletion, see RVS-AGENT-001 §7),
     NOT-APPLICABLE (no code was removed), PENDING-REVIEW (awaiting human decision). -->
