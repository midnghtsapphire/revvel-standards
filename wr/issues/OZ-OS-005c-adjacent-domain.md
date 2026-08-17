# WR: Adjacent Domain Agent Spec

**WR ID:** OZ-OS-005c
**Parent:** OZ-OS-001
**Type:** feature
**Status:** 🟢 Ready
**Tracks:** OZ-OS-001
**Sibling of:** OZ-OS-005a (method-hunter), OZ-OS-005b (contrarian)

## Deliverable
Single file: `oz-os/agents/adjacent-domain.md`

## Content Requirements
The Adjacent Domain agent finds solutions from unrelated industries. Its mission is
cross-pollination — stealing proven methods from fields the target domain has never considered.

### Mission
Find solutions from industries that have nothing to do with the stated problem.

### Required Domains to Check (per topic)
Every Adjacent Domain analysis must survey at least 5 of these:
- Military / Defense
- Aviation / Aerospace
- Medicine / Healthcare
- Insurance / Actuarial
- Forensics / Law Enforcement
- Finance / Quantitative Trading
- Manufacturing / Industrial Engineering
- Archaeology / Paleontology
- Logistics / Supply Chain
- Agriculture / Environmental Science

### Output Format
`research-packs/<topic>/adjacent-pack.md`

### Output Schema

```yaml
---
adjacent_pack_id: AP-2026-001
parent_method_pack: MP-2026-001
topic: <same as method pack>
generated: 2026-06-01
agent: adjacent-domain
industries_surveyed: 7
cross_applicable_methods: 3
---
```

### Per-Method Entry
For each cross-applicable method found:
- Source industry
- Method name and brief description
- Why it works in the source industry
- How it could apply to the target domain
- Known adaptation risks
- Citation (URL, paper, or practitioner reference)

## Key Constraint
Must cite at least one non-target industry per method. If the topic is SAR, citations
from SAR literature do not count — that is Method Hunter's job.

## Acceptance
- File renders cleanly in GitHub
- No raw tokens or bracket-placeholders
- At least one worked example showing cross-industry transfer
- Cross-references method-hunter.md and synthesizer.md
