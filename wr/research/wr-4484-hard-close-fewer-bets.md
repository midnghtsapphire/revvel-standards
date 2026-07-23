# WR-4484: Hard Close Bias — Fewer Bets, Faster Kills

**Status:** Canonical (lint cleanup 2/4, MD025 fix)
**Prime Directive:** $10k/month → $10M in 3 years
**Supersedes:** Prior triple-concatenated variants (see git history)

---

## 1. Problem

The portfolio accumulates too many concurrent bets and holds losers too long. Optionality decays into distraction. Prior versions of this document contained three conflicting constraint sets, making the directive unenforceable.

This document collapses to ONE canonical set of governing values, taking the STRICTEST from each prior variant.

## 2. Canonical Governing Values

These values are binding. Deviation requires a written exception filed against this issue.

| Metric | Value | Window |
|---|---|---|
| Kill rate | 60–85% | Rolling 20 bets |
| WIP_MAX (concurrent active bets) | 3 | Instantaneous |
| Cycle time (open → decision) | ≤ 10 days | Per bet |
| Opportunity Score trigger (open new bet) | ≥ 12 | Per candidate |
| Brier score (forecast calibration) | < 0.20 | Rolling 20 forecasts |

### 2.1 Why strictest

An autonomy directive with soft bounds gets negotiated away. Hard bounds force the kill decision at the point of doubt, not at the point of exhaustion. Every relaxed bound in the prior variants was a rationalization surface.

## 3. Kill Protocol

A bet is killed when ANY of the following are true:

1. Cycle time exceeds 10 days without a shipped decision artifact.
2. Opportunity Score drops below 8 on re-scoring.
3. A higher-scoring candidate (≥ 12) is blocked by WIP_MAX.
4. Forecast on the bet's success probability drops > 25 percentage points from entry.

Killed bets are logged with: entry score, exit score, days held, reason code, lesson.

## 4. Opportunity Score (entry gate)

Score = (Revenue_potential_monthly_usd / 1000) + (Strategic_multiplier × 3) − (Weeks_to_first_dollar × 2)

Entry requires Score ≥ 12. Re-score weekly.

Strategic multiplier ∈ {0, 1, 2, 3} where:

- 0 = one-off
- 1 = reusable component
- 2 = compounds with existing revenue stream
- 3 = platform primitive (POLAR.SH pipeline, OSINT core, automated product pipeline)

## 5. Focus Alignment ($10M / 3yr)

All bets MUST map to at least one of:

1. **POLAR.SH** — GitHub funding platform integration and revenue.
2. **OSINT tools** — productized intelligence workflows.
3. **Automated product pipeline** — issue → PR → release → revenue with minimal human intervention.

Bets outside these three lanes require Score ≥ 18 and explicit exception.

## 6. Phase Gates

| Phase | Target | Window | WIP_MAX |
|---|---|---|---|
| 1 | $10k/mo | Month 1–6 | 3 |
| 2 | $30k/mo | Month 6–18 | 3 |
| 3 | $100k/mo | Month 18–30 | 3 |
| 4 | $10M total | Month 30–36 | 3 |

WIP_MAX does not scale with revenue. More money buys more leverage per bet, not more bets.

## 7. Reporting

Weekly (append-only to `wr/research/wr-4484-log.md` when created):

- Active bets (must be ≤ 3)
- Kill rate over last 20 (must be 60–85%)
- Median cycle time (must be ≤ 10 days)
- Brier score last 20 (must be < 0.20)
- Any exceptions filed

## 8. Change Control

This document is append-only in effect: prior variants remain in git history. To change a governing value, open an issue referencing WR-4484, cite ≥ 20 data points justifying the change, and update in a single commit that supersedes this file.

Mass issue-closure lines do not belong in standards text. Closure references belong in PR bodies.

---

**End canonical WR-4484.**
