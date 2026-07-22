# WR-4600 Prompt Drift Report

**Status:** Low urgency. Markdown files remain source of truth.

## Summary

Canonical WR-4200 spec (Drive) vs. the shipped Photon Bench dashboard embed.
Three sections and one principle were dropped in the condensed embed; all
safety/quality gates remain faithful.

## Dropped in condensed embed

### 1. `IDENTITY`
The canonical spec opens with an identity block declaring the operator, the
WR-4200 covenant ("a fabricated citation is a P0 incident"), and the review
cadence. The embed skips straight to task framing.

### 2. `MODEL ROUTING`
Canonical routing table (fast / deep / vision / offline-self-test) was
collapsed to a single implicit "whatever's cheapest" in the embed. This is
fine operationally but hides the offline-self-test lane, which is the one
that matters for grounding gates.

### 3. `INVENTORY`
Canonical spec enumerates the tools available (harvest.py, dose-engine,
watchtower workflow, snapshot store). Embed assumes the reader already knows.

### 4. n8n / Gumloop principle
Canonical: "prefer stdlib + cron over hosted automation platforms; every
hosted dependency is a future outage." Dropped entirely in the embed.
This is load-bearing philosophy, not decoration — it's why `harvest.py` is
stdlib-only and why `watchtower.yml` is a plain cron.

## Faithful to canonical

- All WR-4200 gates (no fabricated URLs, DELTA over "breakthrough", quiet
  days are success, adverse-first ordering, procurement notes over padding).
- Content-hash immutability on snapshots.
- Self-test determinism (17 offline checks).
- Triage-issue policy (HARM/FLICKER/OCULAR only).

## Recommendation

No code change required. When the embed is next regenerated, re-include the
four dropped items verbatim from the canonical `.md`. Until then, treat the
`.md` files under `wr/` as the source of truth and the dashboard embed as a
viewer-friendly projection.
