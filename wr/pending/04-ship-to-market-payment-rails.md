# [WR] Ship-to-market payment rails — Stripe/Paddle checkout per shipped product

## Output Type

internal-script-automation

## Objective

Extend `ship-to-market.yml` so `commercial_mode: digital-product|saas-app`
WRs get a payment rail, not just an artifact: (1) a `payments` step that
creates a Stripe Payment Link (or Paddle product) via API using secrets
`STRIPE_API_KEY` / `PADDLE_API_KEY`, (2) the checkout URL written back into
the product page and the WR issue, (3) price pulled from the WR's research
(competitor pricing table) with a human-review gate before the link goes
live, and (4) `docs/TOOL_COST_INDEX.md` + revenue tracking updated. Start
with Stripe Payment Links (no webhook infrastructure needed for v1).

## Definition of Done

- A test digital-product WR produces a working (test-mode) checkout link
- Human approval step before any live-mode link publishes
- Secrets documented; docs-freshness pairings satisfied
