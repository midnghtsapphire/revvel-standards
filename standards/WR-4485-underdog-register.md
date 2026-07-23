# WR-4485 — The Underdog Register

**Band:** 44xx (Wisdom Registers)
**Revision:** 0
**Status:** ACTIVE
**Labels:** wr-register, band-44xx, rev-0

> The catalog's immune system. Negative knowledge, comeback math, and the gaps we haven't closed yet.

---

## A. Failed Formulas (Negative Knowledge)

Models that were canonized, deployed at scale, and broke. Named sources so we don't re-import the same failure under a new label.

| # | Formula / Model | Domain | Failure Mode | Named Source / Post-mortem |
|---|---|---|---|---|
| A1 | **Gaussian copula** (Li, 2000) | Credit derivatives | Assumed tail-independence of mortgage defaults; correlation → 1 under stress | Salmon, *Wired* 2009, "Recipe for Disaster"; MacKenzie & Spears 2014 |
| A2 | **VaR under normality** | Bank risk | Underestimated fat-tail losses; regulatory arbitrage via short-vol carry | Taleb, *The Black Swan* 2007; Basel III post-2008 revisions |
| A3 | **LTCM convergence trades** | Fixed-income arb | Levered mean-reversion without liquidity model; 1998 Russia default triggered forced unwind | Lowenstein, *When Genius Failed* 2000 |
| A4 | **COCOMO / function-point estimation** | Software PM | Systematic underestimate; drift 2–4×; ignores discovery/rework | Standish CHAOS reports; Boehm's own later revisions (COCOMO II caveats) |
| A5 | **Stack ranking (rank-and-yank)** | HR / perf mgmt | Destroyed collaboration; gamed via team-selection; GE, Microsoft abandoned | Kwoh, *WSJ* 2012; Ovide, *WSJ* 2013 (MSFT drop) |
| A6 | **MBTI** | Personnel selection | Test-retest reliability ~0.5; no predictive validity for job performance | Pittenger 1993, *J. Career Planning*; Grant, 2013 |
| A7 | **NPS as causal driver of growth** | Marketing/CX | Correlation ≠ causation; single-item scale; ceiling effects | Keiningham et al. 2007, *J. Marketing* |
| A8 | **Last-click attribution** | Ad spend | Systematically overpays retargeting; underpays top-of-funnel | Multi-touch attribution literature; Google incrementality studies 2019+ |

**Rule of use:** if a proposed model matches the *shape* of any A-row above, require an explicit tail/stress/gaming section before adoption.

---

## B. Underdog Math (Comeback Formulas with Real Provenance)

Asymmetric strategies with empirical backing. These are how small positions beat large ones.

| # | Formula | Mechanism | Source |
|---|---|---|---|
| B1 | **Arreguin-Toft asymmetric win rate** | Weak actors win ~28.5% of asymmetric conflicts 1800–2003; ~63% when using indirect strategy vs strong actor's direct strategy | Arreguin-Toft 2001, *Int'l Security* 26(1) |
| B2 | **Pulled-goalie timing** | Optimal pull is ~2–3 min earlier than NHL practice; variance-maximizing move when trailing | Beaudoin & Swartz 2010, *J. Quant. Anal. Sports* |
| B3 | **Wald survivorship correction** | Armor the planes that *didn't* return; count what's missing from the sample | Wald 1943 memo (Statistical Research Group, Columbia) |
| B4 | **Barbell / convexity** | 80–90% ultra-safe + 10–20% high-convex-payoff; caps downside, keeps upside optionality | Taleb, *Antifragile* 2012 |
| B5 | **UCB1 exploration bonus** | Pull arm maximizing μ̂ᵢ + √(2 ln n / nᵢ); provably log-regret in multi-armed bandit | Auer, Cesa-Bianchi, Fischer 2002, *Machine Learning* 47 |
| B6 | **Dyson sequential search** | For sequential-choice with unknown distribution, sample first n/e, then take first item beating the sample max | Secretary problem; Dyson 1960s exposition; Ferguson 1989 review |
| B7 | **Pivot as real option** | Value of pivot ≥ Black-Scholes call on future info; kill-criteria = strike price | McGrath 1999, *AMR*; Luehrman 1998, *HBR* |

**Composition rule:** B1 (indirect) + B4 (barbell) + B5 (UCB1) is the underdog's default stack. B3 (survivorship) is applied to *all* input data before B5 runs.

---

## C. Chatterings Formalized (Folk Laws → Register Entries)

Internet/engineering folk laws that survive because they encode real dynamics. Formalized here for citation.

| # | Law | Statement | Register Use |
|---|---|---|---|
| C1 | **Goodhart's Law** | When a measure becomes a target, it ceases to be a good measure | Every KPI needs a Goodhart-guard (secondary metric that breaks if primary is gamed) |
| C2 | **Lindy Effect** | Expected future life of a non-perishable ∝ current age | Prefer tools/ideas with long track record for load-bearing decisions |
| C3 | **Brooks's Law** | Adding people to a late project makes it later | Communication cost O(n²); staff-up ≠ speed-up past threshold |
| C4 | **Parkinson's Law** | Work expands to fill time available | Set aggressive timeboxes; deadline is a design constraint |
| C5 | **Hofstadter's Law** | It always takes longer than you expect, even accounting for Hofstadter's Law | Apply 1.5–3× multiplier to self-estimates; recursive |
| C6 | **Cunningham's Law** | Best way to get the right answer is to post the wrong one | Ship draft to elicit correction; faster than asking |
| C7 | **K-factor (viral)** | K = i · c ; sustained growth iff K > 1 | Growth loop must be measured, not assumed |

---

## D. Gaps (Missing Formulas — Wired to WR-4484 BNAT Invention Queue)

Explicitly-labeled holes. These are the first work queue for the invention loop.

| # | Gap | Why it matters | Status |
|---|---|---|---|
| D1 | **Underdog Composite Index** | No single scalar for "is this position exploitable-asymmetric?" Combines B1 indirect-fit, B4 convexity, B5 exploration budget, information asymmetry | **CONSTRUCTED — not yet backtested.** Draft: UC = w₁·(indirect_fit) + w₂·log(convexity_ratio) + w₃·(info_gap) − w₄·(crowding). Weights TBD. |
| D2 | **Anti-Goodhart score** | No formal test for whether a metric is gameable in bounded time | OPEN. Candidate: Kolmogorov-complexity gap between metric and true objective. |
| D3 | **Pivot-timing formula** | When to exercise the real-option (B7). Currently gut-feel. | OPEN. Candidate: exercise when marginal cost of continuation > option value decay rate. |
| D4 | **Founder-market-fit quantifier** | Repeatedly cited as decisive; no formula | OPEN. Candidate: composite of (domain years) · (network density in domain) · (obsession proxy). |
| D5 | **Small-sample credibility floor** | When N is tiny (typical for underdogs), Bayesian priors dominate but which prior? | OPEN. Candidate: Jeffreys prior + Wald (B3) correction for missing outcomes. |

**Routing:** each open gap becomes a WR-4484 BNAT invention target. D1 is highest priority because it is currently in use as CONSTRUCTED — must be backtested or retracted before load-bearing use.

---

## Cross-References

- **WR-4484** — BNAT invention loop (consumes Section D as work queue)
- **WR-44xx** — sibling Wisdom Registers
- Failed formulas (A) feed the review-gate checklist for any new WR entry

## Change Log

- **rev-0** — Initial register. Sections A (8 failed formulas), B (7 underdog formulas), C (7 chatterings), D (5 gaps). D1 flagged CONSTRUCTED pending backtest.
