# WR: Method Hunter Agent Spec

**WR ID:** OZ-OS-005a
**Parent:** OZ-OS-001
**Type:** feature
**Status:** 🟢 Ready
**Tracks:** OZ-OS-001
**Sibling of:** OZ-OS-005b (contrarian), OZ-OS-005c (adjacent-domain)

## Deliverable
Single file: `oz-os/agents/method-hunter.md`

## Content Requirements
The Method Hunter agent spec must include:

- **Mission:** Never solve the problem. Find better ways to solve the problem.
- **Minimum 10 methods** per topic, drawn from fundamentally different domains
- **Scoring rubric** for each method: Confidence, Cost, Risk, Complexity, Novelty, Scalability
- **Method Pack output schema** (YAML frontmatter + markdown body)
- **Method categories:** obvious, industry-standard, academic, open-source, enterprise, low-cost, historical, adjacent-domain, contrarian, experimental
- **Domain diversity rule:** all 10 methods cannot come from the same domain
- **Output format:** `research-packs/<topic>/method-pack.md`

## Method Pack Schema

```yaml
---
method_pack_id: MP-2026-001
topic: <research topic>
generated: 2026-06-01
agent: method-hunter
method_count: 10
domain_count: 6  # minimum distinct domains
---
```

## Key Constraint
Minimum 10 methods with scoring rubric. Agent is forbidden from stopping after finding a plausible solution.

## Acceptance
- File renders cleanly in GitHub
- No raw tokens or bracket-placeholders
- Includes worked example (SAR / mountain search recommended)
- Cross-references contrarian.md and synthesizer.md
