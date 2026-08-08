# [WR] Finisher-6: Public API (defer)

## Problem
Public `/api/*` product surface is attractive but premature before commerce loop closes.

## Outcome
Explicit deferral with reopen criteria — not a silent drop.

## REVENUE_GATE
- Buyer: API customers (future)
- Channel: metered API
- Price: TBD usage billing
- First-$ signal: Defer

## Acceptance Criteria
- [x] Documented as deferred in ORDERED_WRS and organizer pipeline
- [ ] Reopen only after Finisher-2 sale + Finisher-5 gate
- [ ] No half-wired public API stubs on main

## Dependencies
Finisher-2 + Finisher-5.

## Effort
Low (documentation) / High (when reopened)
