# R&D Research Fleet - Quality & Measurement Standards

*Included in Self-Exploding Fleet ($399)*

---

## Overview

The R&D Research Fleet follows enterprise-grade quality standards developed by MIDNGHTSAPPHIRE. Every research output is measured, tracked, and scored.

---

## MVI Contract (Minimum Viable Increment)

Every research task follows the MVI framework:

### 1. Context Check
- What was done previously?
- Current production state
- Known issues

### 2. Feature Definition
- One clear research objective
- Observable outcome defined

### 3. Dependency Map
- Required data sources
- API access needed
- Time constraints

### 4. Acceptance Gates
```text
[ ] Research completed
[ ] Sources cited
[ ] No hallucinations
[ ] Quality score > 80
[ ] Deliverable formatted
```

### 5. Out of Scope
- Explicitly what is NOT being researched

### 6. Files to Touch
- Research outputs
- Generated reports

### 7. Rollback Plan
- How to recover from bad research direction

---

## Agent Scorecard Metrics

Every research output is scored on 5 dimensions:

| Dimension | Weight | What It Measures |
|-----------|--------|------------------|
| **Hallucination** | 30% | Unverified claims, missing sources |
| **Bad Code** | 25% | Incorrect data, wrong formulas |
| **Directions** | 20% | Following the framework correctly |
| **Rash** | 15% | Skipping steps, incomplete analysis |
| **CI/Latency** | 10% | Speed and efficiency |

### Trust Grades

| Grade | Score | Status |
|-------|-------|--------|
| A | 90+ | Trusted |
| B | 80-89 | Reliable |
| C | 70-79 | Watch |
| D | 55-69 | Shaky |
| F | <55 | Quarantine |

---

## Measurement Dimensions

### 1. Research Quality Score (0-100)

```text
Research Quality = 
  (Source Reliability × 0.30) +
  (Methodology Adherence × 0.25) +
  (Completeness × 0.20) +
  (Actionability × 0.15) +
  (Presentation × 0.10)
```

### 2. Framework Adherence Score

How well did the agent follow the research framework?

- DOE 5-Point: Did it check all 5 points?
- TRIZ: Did it identify contradictions?
- BNAT: Did it find emerging tech?
- Lead Search: Did it define ICP?
- Merchandise: Did it calculate margins?

### 3. Hallucination Detection

**Reference Resolver:** Checks that all citations, data points, and statistics are verifiable.

**Claim vs Diff:** Flags when the research claims something not supported by sources.

### 4. Self-Healing Triggers

When research quality drops below threshold:

| Tier | Action | Trigger |
|------|--------|---------|
| 0 | Prompt Correction | Minor hallucinations |
| 1 | Agent Handoff | Framework not followed |
| 2 | Escalate to Claude | Critical failures |

---

## Quality Gates

Before delivering any research output:

- [ ] All sources cited with URLs
- [ ] No statistical claims without data
- [ ] Framework steps completed
- [ ] Counterarguments addressed
- [ ] Actionable recommendations included
- [ ] Limitations acknowledged
- [ ] Quality score calculated

---

## System State Tracking

Track research state across sessions:

```text
## Current Research State
Last session: [date]
Active projects: [list]
Completed: [list]
Blocked: [list]

## Quality Metrics
Average score: [X]
Trend: [improving/stable/declining]
Common failures: [list]
```

---

## Ledger & Audit Trail

All research outputs are logged:

- Timestamp
- Agent used
- Framework applied
- Quality score
- Sources checked
- Issues found

Location: `~/.rnd-fleet/research-log.jsonl`

---

## Continuous Improvement

Each research session feeds into:

1. **Agent Trust Score** - Updates after each task
2. **Framework Effectiveness** - Which frameworks work best for what
3. **Quality Trends** - Are outputs getting better?
4. **Failure Patterns** - What keeps going wrong?

---

## Quick Reference Card

```text
SCORE QUALITY: node scripts/score.js [output-file]
CHECK SOURCES: node scripts/verify-sources.js [output-file]
TRACK METRICS: node scripts/metrics.js
SELF-HEAL: node scripts/self-heal.js [issue]
```

---

**Built with enterprise standards from MIDNGHTSAPPHIRE**
**© 2026 Freedom Angel Corp.**
