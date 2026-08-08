# [WR] revvel-fixer: Fleet sweep

## Problem
404s, dead workflows, TODO stubs, and shipped-vs-live drift burn trust and block sales.

## Outcome
Script-first sweep with fail-closed exit codes; atomic PRs only for localized fixes.

## REVENUE_GATE
- Buyer: internal reliability
- Channel: green main
- Price: indirect (protects paid SKUs)
- First-$ signal: Indirect

## Acceptance Criteria
- [ ] `artifacts/revvel-finishers/scripts/audit-404s.sh` runs in CI or on demand
- [ ] Dead workflow paths listed and fixed or intentionally removed
- [ ] No silent `exit 0` when postcondition fails

## Dependencies
Can parallel after Finisher-1.

## Effort
Medium

## Next WR
06-WR-Finisher-4-landing-ctas.md
