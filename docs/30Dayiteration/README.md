# Archived: 30-Day Iteration Launch Methodology

> **Archived 2026-06-13.** Superseded by the **one-iteration** ship-to-market
> standard (`docs/DEFINITION_OF_DONE.md` §6, `docs/AGENTS.md`, EXRUP in
> `README.md §1`) and tracked by WR
> `wr/issues/issue-13873-incorrect-product-timeline-30-days-needs-to-be-rem.md`.

These documents describe the obsolete **"30-Day Autonomous Product Launch"**
framework — building/shipping a product over a 30-day timeline. That timeline
contradicts the current standard: with the agent fleet running 24/7, products
ship to market in a **single iteration WR/PR cycle**, not over 30 days.

Nothing here is deleted — it is preserved verbatim in case any part of the
framework is wanted again. Do **not** treat these as active guidance.

## Contents
- `30_DAY_AUTONOMOUS_PRODUCT_BLUEPRINT.md` — the full 30-day framework
- `30_DAY_INTEGRATION_GUIDE.md` — how it integrated with the pipeline
- `IMPLEMENTATION_SUMMARY_30DAY_LAUNCH.md` — implementation summary
- `QUICKSTART_30DAY_LAUNCH.md` — quick-start guide

## What replaced it
- **Build scope:** one iteration, done in full (`docs/DEFINITION_OF_DONE.md`).
- **Delivery:** one WR/spec → fan-out PRs per surface (app / cli / api / pdf).
- **Marketing rollout** (waitlist → launch → scale) still happens over time and
  is unaffected — only the *build-in-30-days* framing is retired.
