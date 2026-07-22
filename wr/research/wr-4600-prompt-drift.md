# WR-4600 Prompt Drift Report

**Status:** Low urgency. `.md` files remain source of truth.

## Scope

Compares canonical WR-4200 prompt (from Drive) vs the shipped dashboard
embed. Three sections and one operating principle were dropped in the
condensed embed. All safety/grounding gates remained faithful.

## Dropped in condensed embed

### 1. `IDENTITY`

Canonical prompt opens with an operator identity block establishing:

- who is speaking (WR, not the model)
- refusal posture on fabricated citations (P0 incident)
- the "quiet day is a success" stance

The dashboard embed condensed this to a single line. The refusal
posture survived via WR-4200 gates; the identity framing did not.

### 2. `MODEL ROUTING`

Canonical prompt specifies routing rules:

- deterministic tools (harvest, self-test) run stdlib-only, no model
- narrative synthesis routes to a reasoning model
- adverse-signal triage routes with a lower temperature

The embed collapsed this to a single-model assumption. No harm today
because the harvester is stdlib and does not call a model.

### 3. `INVENTORY`

Canonical prompt enumerates the shard inventory (adverse, trials,
literature, registry) with the ordering rule **`adverse` runs first**.
The embed kept the ordering rule but dropped the enumeration, which
made the ordering rule look arbitrary.

### 4. n8n / Gumloop principle

Canonical prompt states: **automation platforms are orchestration, not
authority**. A workflow node cannot invent a citation; if the upstream
API returned no URL, the row is 0, not padded. This principle was
dropped from the embed, though the harvester code enforces it.

## Preserved faithfully

- WR-4200 fabricated-citation P0 rule
- content-hash + immutable snapshots
- "report DELTA, not breakthrough"
- key-gated shards degrade to 0 rows with procurement note
- quiet-day snapshots still commit

## Recommendation

Re-expand the embed at next dashboard revision, or link the dashboard
header to the canonical `.md` so operators see the full prompt. No
code change required now; harvester behavior is correct.
