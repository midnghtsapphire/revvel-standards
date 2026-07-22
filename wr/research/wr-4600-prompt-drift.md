# WR-4600 Prompt Drift Report

**Status:** Low urgency. Markdown source-of-truth files remain authoritative.

## Scope

Compare canonical WR-4200 spec (Drive) against the shipped Photon Bench dashboard embed.

## Findings

### Sections dropped in condensed dashboard embed

1. **IDENTITY** — Watchtower agent identity, provenance signature, and P0 fabrication rule ("a fabricated citation is a P0 incident") were omitted from the inline copy.
2. **MODEL ROUTING** — Router rules (which model handles adverse vs. discovery vs. summary shards) were collapsed into a single "harvest" block.
3. **INVENTORY** — Full shard inventory with per-shard degradation rules (`0 rows + procurement note`, never pad) was reduced to a shard-name list.

### Principle dropped

- **n8n / Gumloop composition principle** — "pipeline steps must be reorderable without loss of grounding" was not carried into the embed.

### Gates preserved

All grounding gates faithful:
- URLs must originate from API responses (never constructed).
- Adverse-events shard runs first.
- Quiet day = success; snapshot still written.
- Content-hash + immutable snapshots.
- DELTA reporting (not "breakthrough").

## Recommendation

Keep the `.md` files as source of truth. The dashboard embed is a rendered *view*, not the spec. If the embed is ever re-generated, pull from `WR-4600.3-harvest-spec.yml` and the canonical WR-4200 doc — do not round-trip through the condensed form.

## Severity

**Low.** No gate was weakened; only descriptive scaffolding was trimmed. No action required beyond this note.
