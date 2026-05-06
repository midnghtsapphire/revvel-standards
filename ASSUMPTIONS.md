# Assumptions Log

> Agent assumptions documented with risk levels.
> When agents work in parallel, one assumption constrains the next.
> Prevents contradictory work.

## Format

| Assumption | Risk | Reasoning | Validated |
|------------|------|-----------|-----------|
| **What we assume** | low/med/high | Why we assume this | yes/no/pending |

---

## Documented Assumptions

| ID | Assumption | Risk | Reasoning | Validated |
|-----|------------|------|-----------|-----------|
| A001 | OpenRouter API key will remain available | low | Enterprise tier, SLA | pending |
| A002 | GitHub Pages sufficient for static sites | low | No dynamic backend needed | yes |
| A003 | Weekly audit frequency is appropriate | med | Could be daily for critical paths | pending |
| A004 | Proposal prosecution catches 80% of flaws | med | Based on OpenHands research | pending |

---

## Update Rules

- Document BEFORE making significant changes
- Assign risk level: low (safe to proceed), med (document and monitor), high (need validation)
- Update `Validated` column as evidence accumulates
- Assumptions that are invalidated should trigger new decisions
