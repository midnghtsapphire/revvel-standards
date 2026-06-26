---
name: source-tiering
description: Assign a source tier (1-5) and a provenance class to any source. Use when ingesting sources before scoring.
---

# Source Tiering

## Tiers
5 adjudicated record · 4 primary official · 3 direct reporting ·
2 opinion/secondary · 1 social/anonymous. (config/source_tiers.yaml is canonical.)

## Decide tier
- Is it a court/agency record or sworn filing? → 5 (adjudicated) or 4 (official).
- Named-byline outlet with corrections policy citing sources? → 3.
- Editorial / op-ed / analysis restating others? → 2.
- Social post / anonymous / screenshot? → 1.

## Then provenance (how it reached the public)
filing · on_record_statement · official_leak · unattributed_leak · anonymous_report.
A tier-3 outlet repeating an anonymous report is provenance=anonymous_report and
gets the 0.25 discount even at tier 3.

## Output
`{source_id, outlet, kind, tier, provenance}` appended to the case `sources[]`.
