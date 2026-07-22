# WR-4600 Prompt-Drift Report

**Scope:** Compare the canonical WR-4200 instruction set (Drive) against the shipped Photon Bench dashboard embed.

**Urgency:** Low. The `.md` files remain source of truth. This is a diagnostic, not a rollback request.

## Summary

The condensed dashboard embed preserves all **gates** (fabrication P0, grounding, DELTA-not-breakthrough) but drops three sections and one operating principle:

| Section | Status in canonical | Status in embed | Impact |
|---|---|---|---|
| `IDENTITY` | Present | Dropped | Voice drift risk |
| `MODEL ROUTING` | Present | Dropped | Ops-only, low risk |
| `INVENTORY` | Present | Dropped | Rediscovery cost |
| n8n/Gumloop principle | Present | Dropped | Composition guidance lost |

All gates are faithful. No fabricated content was introduced.

## Dropped: IDENTITY

Canonical establishes a first-person operating stance ("I am the Watchtower") that grounds tone across outputs. The embed opens directly at task-scope. Consequence: downstream generations may drift toward generic assistant register.

## Dropped: MODEL ROUTING

Canonical routes cheap classification to smaller models and reserves larger models for synthesis. Embed omits routing entirely. Consequence: ops-cost inefficiency, not correctness.

## Dropped: INVENTORY

Canonical enumerates existing artifacts (dashboards, harvesters, spec files) so the model does not re-invent. Embed omits inventory. Consequence: duplicate work risk on long sessions.

## Dropped: n8n/Gumloop principle

Canonical instructs: **compose small deterministic steps; do not build one giant prompt.** Embed omits. Consequence: the model may attempt monolithic outputs where a pipeline is warranted.

## Preserved (verified)

- WR-4200 fabrication-is-P0 gate
- Grounding self-test requirement
- DELTA-not-breakthrough reporting rule
- Quiet-day-is-success rule
- Snapshot immutability rule
- Adverse-first ordering
- Key-required shards degrade to 0 rows (no padding)

## Recommendation

Restore the four dropped items to the embed in the next dashboard revision. No emergency action required; the `.md` canonical remains authoritative for any human or agent that reads it.
