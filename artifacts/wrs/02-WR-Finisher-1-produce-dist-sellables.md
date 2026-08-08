# [WR] Finisher-1: Produce dist sellables

## Problem
PDF/zip generators exist but `products/dist/*` vault and pack artifacts are often missing (gitignored or never built).

## Outcome
Running builders produces inventory of vault PDF + themed $29 packs ready for Gumroad upload.

## REVENUE_GATE
- Buyer: indie hackers / agent operators
- Channel: Gumroad (next lane)
- Price: $99 vault / $29 packs
- First-$ signal: Days

## Acceptance Criteria
- [ ] `python products/build_skills_vault.py` succeeds
- [ ] `python products/build_packs.py` succeeds
- [ ] Dist inventory documented (paths + sizes) even if gitignored
- [ ] No free full leak of paid pack contents on public raw GitHub

## Dependencies
Finisher-0 seed complete.

## Effort
Medium

## Next WR
03-WR-Finisher-2-gumroad-storefront.md
