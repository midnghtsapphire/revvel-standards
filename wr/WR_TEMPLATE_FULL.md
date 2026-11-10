# WR: {TITLE}

> **WR Class:** product | research | infrastructure  
> **Priority:** P0 | P1 | P2 | P3  
> **Output Type:** {OUTPUT_TYPE}  
> **WR ID:** WR-NNNNN  
> **Opened:** YYYY-MM-DD  
> **Agent:** @{agent}  
> **Checkpoint-Gated:** Yes / No  

---

## Issue Context

{ISSUE_CONTEXT}

<!-- What triggered this WR? Strategic goal, user request, competitive pressure, or opportunity. -->

## Background & Motivation

<!-- Why is this work needed? What's the underlying problem or opportunity? -->
<!-- Include market context, user pain points, and business value. -->

## Scope

### In Scope
<!-- Detailed list. What's being built, changed, or researched. -->
- 

### Out of Scope
<!-- What is NOT included. Prevents scope creep. Links to future WRs. -->
- 

### Boundaries
<!-- Where this WR ends and another begins. -->
- 

## Research Findings

<!-- Deep research first. Every claim tiered and cited. -->

### A1 — Proven (>95%)
- 

### A2 — Established (80-95%)
- 

### B2 — Emerging (60-80%)
- 

### B3 — Speculative (<60%)
- 

## Approach

### Proposed Design
<!-- Architecture, data flow, key decisions. -->

### Alternatives Considered
<!-- What else was considered and why rejected. -->

| Alternative | Pros | Cons | Decision |
|-------------|------|------|----------|
| | | | Rejected / Selected |

## Artifact Requirements

<!-- What artifacts must this WR produce? Check all that apply. -->

- [ ] Code — implementation
- [ ] Tests — unit + integration + property-based
- [ ] Docs — README, API reference, inline comments, knowledge notes
- [ ] Monitoring — metrics, alerts, logs, dashboards
- [ ] Ops — deployment notes, rollback plan, runbook
- [ ] Skills — SKILL.md for agent reuse
- [ ] MCP manifest — agent-facing tools
- [ ] OpenAPI spec — API documentation
- [ ] PDF / booklet — user-facing documentation
- [ ] Extension — browser/IDE/plugin
- [ ] Docker — containerization
- [ ] GitHub Action — reusable workflow
- [ ] Other: ___

## Acceptance Criteria

<!-- Measurable, verifiable criteria for "done." -->

- [ ] Feature works end-to-end in production-like environment
- [ ] All new code has >80% test coverage
- [ ] Integration tests pass for all critical paths
- [ ] Performance meets budget (if applicable)
- [ ] Security scan clean (no high/critical findings)
- [ ] Docs complete and accurate
- [ ] Monitoring operational (alerts firing correctly)
- [ ] No regressions in existing functionality
- [ ] No scaffolding (no deferred work markers, no raw placeholders)
- [ ] wr-lint.mjs passes

## Risks & Mitigations

<!-- Known risks, fragile files, rollback plan. -->

| Risk | Likelihood | Impact | Mitigation | Owner |
|------|-----------|--------|------------|-------|
| | | | | |

## Competitor & Pricing Intelligence

<!-- Required for sellable-pdf and product-class WRs. Actual prices, not vague labels. -->

| Competitor | Price | Key Features | Gap | Our Advantage |
|------------|-------|-------------|-----|---------------|
| | | | | |

*If price is unknown: "Pricing data pending — competitive benchmark research required."*

## SEM / SEO Analysis

<!-- Required for product-class WRs. Discoverability analysis. -->

### Primary Keywords
- 

### Long-Tail Queries
- 

### Content Gaps
- 

### Technical SEO Requirements
- 

## Blocks (if checkpoint-gated)

<!-- Per D011. Ordered list of atomic, complete PRs. -->

### Block 1: {Title}
- Scope:
- Deliverables:
- Acceptance criteria:
- Estimated effort:

### Block 2: {Title}
- Scope:
- Deliverables:
- Acceptance criteria:
- Estimated effort:
- Depends on: Block 1

### Block 3: {Title}
- Scope:
- Deliverables:
- Acceptance criteria:
- Estimated effort:
- Depends on: Block 2

## Dependencies

<!-- What must be true before this WR can start? -->

- [ ] None — this WR is self-contained
- [ ] Depends on:
  - WR-NNNNN: {description} (status: {open/merged})
  - External: {third-party dependency}

## Estimated Effort

<!-- Rough estimate. The system will refine. -->

- **Duration:** {e.g., 3-5 days}
- **PRs:** {e.g., 2-3}
- **Blocks:** {e.g., 1-3}

## Method Divergence (Optional)

<!-- If method hunter / contrarian / adjacent domain research was run. -->

### Methods Found
- 

### Contrarian Findings
- 

### Adjacent Domain Transfers
- 

### Synthesis
- 

## Validation Plan

<!-- How will we validate this WR? -->

### Test Plan
- [ ] Unit tests: {coverage target}%
- [ ] Integration tests: {critical paths}
- [ ] Manual QA: {scenarios}
- [ ] Performance test: {budget}
- [ ] Security scan: {tools}

### Rollback Plan
<!-- How to revert if something goes wrong in production. -->
1. 
2. 
3. 

## Learnings — What & Why

{LEARNINGS}

<!--
Guidance: agents completing this WR should fill this in once done — capture what
was learned and *why* it matters, not just what changed.
For follow-up-generated WRs this section is populated automatically by the
Follow-up Checkbox Router with the original follow-up text, a link to the
source PR/issue, and (if applicable) a note that this is a chained follow-up.
-->

---

> **Agent Instructions:**
> 1. Read UPREV_METHOD.md before starting.
> 2. Read WR_RESEARCH_MANDATE.md — research first, build second.
> 3. Read AGENT_BUILD_PROMPT.md for execution standards.
> 4. Read ARTIFACT_GENERATOR.md for artifact requirements.
> 5. All changes through draft PR. Never merge your own PR.
> 6. Update LEDGER.md, CHANGELOG.md, Library/ in same commit.
> 7. Append self-healing log to learnings.md with TM-NNNN format.
