# WR: Fleet Maintenance — midnghtsapphire/hvac-calc-service

**Issue:** #14622
**Repository:** midnghtsapphire/revvel-standards
**Research Date:** 2026-06-18
**WR Status:** ✅ Research Complete — Implementation Delivered

---

## Summary

The `midnghtsapphire/hvac-calc-service` target repository did not exist at research time (HTTP 404). This WR bootstraps the service as `products/hvac-calc-service/` in revvel-standards (the standard monorepo pattern), implementing a full standards-based HVAC load calculator.

## Implementation Delivered

- **`products/hvac-calc-service/`** — Next.js 16 app, port 3006
- **Core engine** (`app/data/calculator.ts`) — Manual J load calc, Manual S equipment sizing, Manual D duct sizing, SEER2/HSPF2 energy estimator
- **Constants** (`app/data/constants.ts`) — 12 ASHRAE climate zones, 4 insulation levels, refrigerant table (R-22 through R-454B/R-290)
- **REST API** — `POST /api/calculate` returns load, equipment, duct, energy, Markdown, CSV
- **UI** — Tailwind dark-mode, live-updating, tabbed results, export buttons
- **Tests** — `tests/calculator.test.ts` with 20+ assertions covering all calculation paths
- **Docs** — README, CHANGELOG, DEPLOYMENT_GUIDE, GO_TO_MARKET

## Research Findings

### Market

> ⚠️ **Unverified — pending citation.** The market sizes, install counts, keyword
> search volumes, CPCs, and competitor pricing below are agent estimates that have
> **not** yet been backed by primary sources. Per `docs/WEEKLY_RESEARCH_PROCESS.md`,
> each numeric claim must carry a source link before the WR is considered auditable.
> Treat these as directional only until citations are added (see related WR
> `wr/issues/issue-14024-add-source-citations-for-seo-keyword-volume-and-cp.md`).

- US residential HVAC market: $15B+, 5M+ installs/year _(source needed)_
- No free standards-based (ACCA Manual J) online calculator exists _(source needed)_
- Paid alternatives: Wrightsoft ($400–$2,000/yr), Elite RHVAC, Manual J Online ($99/yr) _(source needed)_
- SEO keywords: "HVAC load calculator" (14,800/mo), "Manual J online free" (2,400/mo), "BTU calculator house" (40,500/mo) — CPCs $3–12 _(source needed)_

### Technical Improvements Implemented

- ACCA Manual J 8th Ed. simplified load calc with full breakdown (wall/ceiling/floor/window transmission, solar gain, infiltration, internal/occupant gains)
- Manual S equipment sizing with over-size detection (>115% triggers warning per ACCA standards)
- Manual D main-trunk duct sizing (CFM, round diameter, rectangular equivalent)
- 2025 refrigerant phase-out data (AIM Act R-410A ban, R-454B as replacement)
- SEER2/HSPF2 per DOE 2023 test procedure (replaces legacy SEER/HSPF)

### Security

- All user inputs sanitized via `normalizeLoadInputs()` with `clamp()` guards
- API validates `floorArea` presence and returns 400 on invalid JSON
- No secrets, no external API calls, no user data stored

## Artifact Engine Map

| Artifact | Path |
| --- | --- |
| Calculation engine | `products/hvac-calc-service/app/data/calculator.ts` |
| Constants / data | `products/hvac-calc-service/app/data/constants.ts` |
| REST API route | `products/hvac-calc-service/app/api/calculate/route.ts` |
| UI | `products/hvac-calc-service/app/page.tsx` |
| Tests | `products/hvac-calc-service/tests/calculator.test.ts` |
| README | `products/hvac-calc-service/README.md` |

## Agent Self-Healing Journal

| Issue | Resolution |
| --- | --- |
| Target repo `hvac-calc-service` returned 404 | Bootstrapped as monorepo product per revvel-standards pattern |
| OpenRouter triage failed (HTTP 402 insufficient credits) | Agent proceeded with manual research and implementation |
| No existing codebase to maintain | New build — implemented full product from scratch |
