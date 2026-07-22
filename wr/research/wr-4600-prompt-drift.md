# WR-4600 Prompt Drift Report

**Status:** Low urgency
**Scope:** Canonical WR-4200 spec (Drive) vs shipped Photon Bench dashboard embed

## Summary

The condensed dashboard embed dropped three sections from the canonical
WR-4200 prompt and one operating principle. All safety gates remain
faithful. Source-of-truth remains the `.md` files in this repo; the
embedded copy is a display artifact only.

## Dropped from embed

1. **`IDENTITY`** — role framing and non-negotiables preamble.
2. **`MODEL ROUTING`** — the routing table for task-type → model tier.
3. **`INVENTORY`** — the artifact/asset ledger reference.
4. **n8n / Gumloop principle** — "never let a no-code orchestrator hold a
   secret you can't rotate in <60s" (paraphrased from Drive notes).

## Preserved faithfully

- All WR-4200 P0 gates (no fabricated citations, no padded shards,
  adverse-first ordering).
- WR-4600.3 DELTA-reporting semantics (quiet day = success).
- Immutable content-hashed snapshots.
- Keyless-API-only harvest constraint.

## Recommendation

No immediate action. When the dashboard is next regenerated, re-embed
the three dropped sections from the canonical `.md` sources. Do **not**
rewrite the `.md` sources to match the embed — drift direction matters.

## Provenance

- Canonical: Drive → `WR-4200-canonical.md` (not vendored; referenced).
- Shipped: `products/wr-4600-photon-bench/original.html` embed block.
- Assessment date: this commit.
