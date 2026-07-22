# WR-4600 Prompt Drift Report

**Status:** Low urgency. `.md` files remain source of truth.

## Scope

Canonical **WR-4200** (Drive) vs the shipped `products/wr-4600-photon-bench/index.html` dashboard embed.

## Sections dropped in the condensed embed

1. **IDENTITY** — the operator-facing framing ("you are Watchtower, a grounding-first analyst"). Dropped for token budget; consequence: downstream agents inherit no persona, defaults leak.
2. **MODEL ROUTING** — the tiering (cheap→smart→verifier). Dropped; consequence: no cost/latency discipline in embed-driven runs.
3. **INVENTORY** — the enumerated tool/shard list. Dropped; consequence: agents may invent shards.

## Principle dropped

- **n8n/Gumloop principle** — "orchestration lives outside the model; the model is a pure function." Absent from embed. Consequence: embed encourages in-context orchestration, which drifts.

## Gates — faithful

- WR-4200 fabrication gate: **preserved**
- WR-4600.3 DELTA-not-breakthrough: **preserved**
- Quiet-day success semantics: **preserved**
- Snapshot immutability + content-hash: **preserved**

## Recommendation

Keep the condensed embed for dashboard render. Route **agent** invocations through the full `.md` prompts, not the embed. Add a CI check that the embed is a strict subset (no additions) of the canonical prompt.

## BLANK

(Reserved for future drift observations.)
