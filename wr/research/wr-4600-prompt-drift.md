# WR-4600 Prompt Drift Report

**Status:** Low urgency — `.md` files remain source of truth.

## Scope

Compare the canonical WR-4200 prompt (from Drive) to the condensed embed shipped in the WR-4600 Photon Bench dashboard.

## Drift Summary

| Section | Canonical (WR-4200) | Shipped Embed | Status |
|---------|---------------------|---------------|--------|
| IDENTITY | Present, full | **Dropped** | Drift |
| MODEL ROUTING | Present, full | **Dropped** | Drift |
| INVENTORY | Present, full | **Dropped** | Drift |
| n8n / Gumloop principle | Present | **Dropped** | Drift |
| P0: fabricated citation | Present | Present | Faithful |
| Grounding gates | Present | Present | Faithful |
| DELTA-not-breakthrough | Present | Present | Faithful |
| Snapshot immutability | Present | Present | Faithful |
| Adverse-shard-first | Present | Present | Faithful |

## Assessment

All **gates** (the load-bearing safety rules) are faithful in the shipped embed. The three dropped sections and the n8n/Gumloop principle are structural/operational context — useful, but not gate-defining.

**Recommendation:** No emergency patch. The canonical `.md` files in `wr/` remain source of truth; the embed is a UI convenience. If we ship a v2 dashboard, restore the three sections verbatim.

## Non-goal

No citations fabricated. This report is a diff, not a literature review.
