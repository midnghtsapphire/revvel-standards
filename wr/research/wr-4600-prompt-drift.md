# WR-4600 prompt-drift report

Canonical **WR-4200** prompt (Drive) vs the shipped dashboard's embedded
prompt.  Urgency: **low**.  The `.md` files remain source of truth; the
dashboard embed is a condensed presentation copy.

## Summary

| Section         | Canonical (WR-4200) | Shipped dashboard | Status  |
|-----------------|---------------------|-------------------|---------|
| IDENTITY        | present             | dropped           | drift   |
| MODEL ROUTING   | present             | dropped           | drift   |
| INVENTORY       | present             | dropped           | drift   |
| n8n / Gumloop principle | present     | dropped           | drift   |
| Gates (all)     | present             | present, faithful | ok      |
| WR-4200 no-fabrication rule | present  | present           | ok      |

## What was dropped in the embed

1. **`IDENTITY`** — the operator/role framing ("you are the WR-4600 bench
   operator, not a general assistant").  Consequence: a fresh session in the
   dashboard can be steered off-mission more easily.  Mitigation: the `.md`
   files are canonical and re-loaded per session.
2. **`MODEL ROUTING`** — the table mapping task class → preferred model.
   Consequence: the dashboard cannot self-route; a human picks the model.
   Acceptable in the short term.
3. **`INVENTORY`** — the enumerated list of tools/APIs available.
   Consequence: the embedded prompt cannot advertise capabilities it has.
   Low impact because the harvest pipeline is invoked by CI, not by the
   dashboard.
4. **n8n / Gumloop principle** — "prefer a durable workflow node over a
   one-shot script when the task will recur."  Consequence: none for the
   dashboard (it is a viewer); relevant for future automation work.

## What is faithful

- All **gates** (self-test, no-fabrication, adverse-first, degrade-not-pad,
  quiet-day-is-success, immutable snapshots) are present and worded
  consistently.
- The **WR-4200 rule** ("a fabricated citation is a P0 incident") is
  verbatim.

## Recommendation

Do not patch the dashboard embed in this PR.  Instead:

- Treat `wr/research/*.md` and `WR-4600.3-harvest-spec.yml` as source of
  truth.
- When we next touch the dashboard, restore `IDENTITY`, `MODEL ROUTING`,
  `INVENTORY`, and the n8n/Gumloop line from the canonical prompt.
