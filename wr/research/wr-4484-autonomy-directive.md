# WR-4484: Autonomy Directive (Canonical)

> **Status:** Canonical. Prior triple-merged variants retained in git history (append-only policy).
> **Lint:** MD025 repaired — single H1 enforced.

## 1. Purpose

This directive governs autonomous execution against the PRIME DIRECTIVE:
**$10k/month → $10M total in 3 years** via POLAR.SH funding, OSINT tooling, and an automated product pipeline.

It collapses three conflicting prior drafts into a single enforceable ruleset by taking the **strictest** value from each variant. Ambiguity is not autonomy — it is paralysis.

## 2. Governing Values (Strictest Canonical Set)

| Metric | Canonical Value | Rationale |
|---|---|---|
| Kill rate (rolling 20 experiments) | **60–85%** | Strictest floor (60%) and ceiling (85%) across variants; enforces ruthless pruning without over-killing. |
| WIP_MAX (concurrent bets) | **3** | Strictest concurrency cap; forces sequencing and finish-rate discipline. |
| Cycle time (idea → ship or kill) | **≤ 10 days** | Strictest cadence; anything slower is a research project, not a bet. |
| Opportunity Score trigger | **≥ 12** | Minimum score to open a new WIP slot. |
| Brier score (forecast calibration) | **< 0.20** | Strictest calibration bar; forecasts above this are noise. |

All five conditions are **conjunctive**. Violation of any one halts new bet intake until remediated.

## 3. Phase Gates

- **Phase 1 — $10k/month (Month 1–6):** POLAR.SH funding live, ≥1 OSINT tool shipped, kill rate in band.
- **Phase 2 — $30k/month (Month 6–18):** Pipeline automation online, WIP discipline held at 3.
- **Phase 3 — $100k/month (Month 18–30):** Compounding channels; Brier < 0.20 sustained.
- **Phase 4 — $10M total (Month 30–36):** Portfolio realization.

## 4. Focus Areas (Locked)

1. **POLAR.SH** — GitHub funding platform integration and monetization.
2. **OSINT tools** — Shipped as products, not internal utilities.
3. **Automated product pipeline** — Idea → validated → shipped ≤ 10 days.

## 5. Enforcement

- Weekly review of the five governing values.
- Any metric out-of-band → new bet intake frozen; remediation bet only.
- Cycle-time breach → kill or ship the offending WIP within 24h.
- Kill rate < 60% → pruning bar too soft; raise kill threshold.
- Kill rate > 85% → intake filter too loose; raise Opportunity Score bar above 12.

## 6. Notes on Prior Merge

Main previously contained three concatenated document variants with conflicting values (kill 40–70% / 60–85% / ≥40%; WIP 3 / 5 / 7; cycle ≤10d / ≤30d) and an erroneous mass `Closes #16669-#16705` line embedded in the body. Issue closure belongs in PR descriptions, not standards text. This canonical file resolves both defects.

---

*Lint cleanup 2/4. Related: `wr/research/spectrum-blueprint-read.md`, `wr/research/wr-4600-prompt-drift.md` (same MD025 disease, addressed in subsequent PRs).*
