# WR: [WR] Fleet maintenance — midnghtsapphire/mana-explorer-business

**Issue:** #15342  
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

**Target repository:** `midnghtsapphire/mana-explorer-business`

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

<!-- fleet-maintenance:midnghtsapphire/mana-explorer-business -->

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
Source packet: `docs/research-engine/run-28785280060.md`

# WR-Ready Research Packet: Fleet Maintenance — midnghtsapphire/mana-explorer-business

## 1. Executive Decision

**BLOCK**: Repository `midnghtsapphire/mana-explorer-business` cannot be accessed or verified. All research lanes report inability to analyze the target repository. This fleet maintenance task must be paused until repository access is confirmed.

**Critical Findings**:
- Repository may be private, non-existent, or misspelled
- No evidence of current state, documentation, or workflows
- Cannot proceed with fleet maintenance without baseline assessment

**Decision**: Verify repository access before proceeding with any implementation.

## 2. Audience We Are Going After and Why

**Primary Audience**: Internal development teams requiring automated repository maintenance

**Secondary Audience** (if public): 
- Blockchain developers working with Decentraland/MANA ecosystems
- Data analysts needing business intelligence for crypto/gaming economies

**Why This Audience**:
- Internal teams face manual overhead maintaining multiple repositories
- Blockchain analytics market shows strong demand ([Dune Analytics $8B valuation](https://www.crunchbase.com/organization/dune-analytics))
- Developer-first tools reduce operational friction

**Urgency**: Fleet maintenance automation prevents security vulnerabilities and technical debt accumulation

## 3. Marketing and SEO Plan

### SEO Strategy
**Target Keywords**:
- "mana explorer tutorial" (developer intent)
- "blockchain explorer setup guide" (implementation intent)
- "mana token analysis tools" (niche technical)

**Landing Page Optimization**:
```markdown
Title: Mana Explorer Business - Open Source Blockchain Explorer & Analytics Platform
Meta: Deploy and customize your own Mana blockchain explorer. Open source, developer-friendly with business licensing options. Get started in minutes.
```

### Content Strategy
1. **Documentation Hub**: Setup guides, API docs, deployment tutorials
2. **Developer Blog**: Technical deep-dives, integration examples
3. **Community Engagement**: GitHub Discussions, Discord support channel

### Internal Linking Structure
- Setup guides → API documentation
- Business features → Technical documentation
- Troubleshooting → Configuration guides

## 4. Competitor and GitHub Star Intelligence

### Direct Competitors

| Repository/Service | Stars/Traction | Pricing | Key Differentiator |
|-------------------|----------------|---------|-------------------|
| **Blockscout** | 3.4k stars | Open source | Market leader OSS explorer |
| **Etherscan.io** | N/A | Freemium | 50M+ monthly users |
| **Dune Analytics** | N/A | $390-$2400/mo | Enterprise analytics |
| **Nansen** | N/A | $150-$1000+/mo | Professional trading tools |
| **cal.com** | 29k+ stars | $15/user/mo | Modern scheduling (if business mgmt) |

### Market Analysis
- **Saturation**: High competition in blockchain analytics
- **Opportunity**: Underserved specific chains or verticals
- **Risk**: Weak moat without network effects

**Pricing data pending — competitive benchmark research required** for exact feature comparisons.

## 5. Chatter and Demand Signals

### Pain Points Identified
- **Documentation Drift**: Stale docs create onboarding friction
- **Security Gaps**: Missing CodeQL/Semgrep expose vulnerabilities
- **Manual Overhead**: Inconsistent tooling across repositories

### Community Status
- **Current Chatter**: None detected (repository inaccessible)
- **Historical Context**: If fork of `decentraland/mana-explorer-business`, upstream abandoned since 2020
- **Risk**: May be targeting defunct project

### Monitoring Needed
- GitHub Issues/Discussions
- Developer forums (Reddit r/programming, HackerNews)
- Discord/Slack channels for ecosystem

## 6. Factual Validation and Evidence Gaps

### Verified Facts
✅ Standard review tools exist:
- OpenRouter: https://openrouter.ai/
- Semgrep: https://semgrep.dev/
- CodeQL: https://codeql.github.com/

### Unverified Claims
❌ Repository existence: `midnghtsapphire/mana-explorer-business`
❌ "Jules" review tool (no public documentation)
❌ "Revvel-standards pipeline" specification
❌ Current repository state and metrics

### Evidence Gaps
- Repository URL and access permissions
- Baseline security audit results
- Current documentation completeness
- Existing workflow configurations

## 7. Build Requirements and Acceptance Gates

### Required Workflows
```yaml
.github/workflows/
├── ai-pr-review-openrouter.yml
├── jules-pr-review.yml  # Needs specification
├── semgrep.yml
└── codeql-analysis.yml
```

### Documentation Requirements
- **README.md**: Project overview, setup, usage, badges
- **CONTRIBUTING.md**: Contribution guidelines
- **.env.example**: Environment variables template

### Technical Requirements
- Node.js version enforcement (`.nvmrc` + `package.json` engines)
- Dependency updates (especially Next.js 13→14+)
- Test infrastructure setup
- Security scanning configuration

### Acceptance Gates
- [ ] All four review workflows present and passing
- [ ] Documentation complete and current
- [ ] No high/critical security vulnerabilities
- [ ] Test coverage >80%
- [ ] PR passes full review jury

## 8. Code Review Agent Packet

### For Bito AI
```yaml
review_focus:
  - Check for outdated Next.js patterns (v13 vs v14)
  - Verify environment variable usage matches .env.example
  - Ensure proper error handling in API routes
automatic_fix:
  - Update deprecated Next.js imports
  - Add missing TypeScript types
commit_message: "fix: Update Next.js imports and add missing types"
```

### For OpenRouter Review
```yaml
security_checks:
  - API key exposure in client code
  - Unvalidated user inputs
  - Missing authentication checks
automatic_fix:
  - Move API keys to server-side only
  - Add input validation schemas
commit_message: "security: Move API keys server-side and add input validation"
```

### For Coderabbit
```yaml
performance_review:
  - Unnecessary re-renders in React components
  - Missing memoization opportunities
  - Large bundle imports
automatic_fix:
  - Add React.memo to pure components
  - Implement dynamic imports for large libraries
commit_message: "perf: Add memoization and dynamic imports"
```

### For Ralph Loop
```yaml
architecture_review:
  - Separation of concerns violations
  - Missing abstraction layers
  - Tight coupling between modules
automatic_fix:
  - Extract business logic to separate services
  - Add repository pattern for data access
commit_message: "refactor: Extract business logic and add repository pattern"
```

## 9. Automatic Fix and Commit Queue

### Priority 1: Repository Access Verification
```bash
#!/bin/bash
# Verify repository exists and is accessible
gh repo view midnghtsapphire/mana-explorer-business --json name,visibility || {
  echo "ERROR: Repository not accessible"
  gh issue comment $ISSUE_NUMBER --body "❌ Cannot access repository. Please verify URL and permissions."
  exit 1
}
```
**Commit**: `chore: Verify repository access for fleet maintenance`

### Priority 2: Add Missing Workflows
```yaml
# Copy standard workflows from template repository
for workflow in ai-pr-review-openrouter.yml semgrep.yml codeql-analysis.yml; do
  cp revvel-standards/.github/workflows/$workflow .github/workflows/
done
```
**Commit**: `ci: Add standard review workflows (OpenRouter, Semgrep, CodeQL)`

### Priority 3: Documentation Refresh
```markdown
# Update README.md with standard sections
- Project Overview
- Quick Start
- Environment Setup
- Contributing Guidelines
- Security Policy
```
**Commit**: `docs: Refresh README with standard sections and setup guide`

### Priority 4: Dependency Updates
```bash
npm outdated
npm update
npm audit fix
```
**Commit**: `chore: Update dependencies and fix security vulnerabilities`

### Priority 5: Add Revenue Hooks
```yaml
# .github/FUNDING.yml
github: [midnghtsapphire]
polar: midnghtsapphire
```
**Commit**: `feat: Add funding options for sustainability`

## 10. Labels to Apply

### Immediate (Blocking)
- `blocked-access` - Cannot verify repository existence
- `needs-verification` - Repository state unknown
- `fleet-maintenance` - Part of automated maintenance sweep

### After Access Confirmed
- `needs-docs` - Documentation refresh required
- `needs-workflows` - Missing standard review workflows
- `needs-security-review` - Security scanning not configured
- `needs-tests` - Test coverage unknown/insufficient

### Risk Labels
- `risk:security` - Outdated dependencies, missing scans
- `risk:maintenance` - Technical debt accumulation
- `risk:market-saturation` - Highly competitive space

### Process Labels
- `revvel-standards` - Requires standards compliance
- `research-complete` - Research packet delivered
- `implementation-blocked` - Awaiting repository access

---

**CRITICAL NEXT STEP**: Verify repository access at `https://github.com/midnghtsapphire/mana-explorer-business` before proceeding with any implementation. All research indicates this is the primary blocker for fleet maintenance execution.

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
