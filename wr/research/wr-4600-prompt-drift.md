# WR-4600 Prompt Drift Report

**Status:** Low urgency. Markdown files remain source of truth.

## Scope
Canonical WR-4200 (Drive) vs. shipped dashboard embed.

## Sections dropped in condensed embed
1. **IDENTITY** — role/persona anchor.
2. **MODEL ROUTING** — which model handles which shard.
3. **INVENTORY** — enumerated shard list with owners.

Also dropped: the n8n/Gumloop orchestration principle note.

## Sections preserved
All gates (grounding, no-fabrication, adverse-first, quiet-day-is-success) are faithful to canon.

## Recommendation
Re-inject the three sections in the next dashboard rebuild. No behavior change required now — the harvester enforces the gates independently.

## References
- `WR-4600.3-harvest-spec.yml`
- `wr/research/spectrum-blueprint-read.md`
