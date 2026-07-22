# WR-4600 Prompt Drift Report

**Status:** Low urgency. Markdown source of truth is authoritative.

## Scope

Compare canonical WR-4200 spec (from Drive) against the condensed prompt embedded in the shipped Photon Bench dashboard.

## Sections dropped in the shipped embed

1. **IDENTITY** — the operator identity block (persona, refusal posture, escalation contract) was truncated to a one-liner.
2. **MODEL ROUTING** — routing table (which model handles adverse vs. synthesis vs. citation-verify) omitted entirely.
3. **INVENTORY** — the tool/data-shard inventory (what shards exist, key-status, degrade behavior) collapsed to a bullet.

The **n8n / Gumloop pipeline principle** ("never construct a URL; every citation URL must come from an API response payload") was implicit in gates but dropped from the narrative preamble.

## Gates: faithful

All WR-4200 gates (P0 fabrication → incident, DELTA-not-breakthrough language, quiet-day-is-success, adverse-first ordering, content-hash immutable snapshots, keyless-shard-degrades-to-zero) are preserved in the shipped harvester and self-test.

## Recommendation

- Keep `.md` files as source of truth.
- On next dashboard rebuild, re-inline the three dropped sections verbatim (do not paraphrase).
- No P0/P1 impact; report closed as informational.

## Provenance

- Canonical prompt: Drive / WR-4200 folder.
- Shipped embed: `products/wr-4600-photon-bench/original.html` (inline `<script type="application/prompt">` block).
