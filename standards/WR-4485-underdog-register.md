# WR-4485 — The Underdog Register

**Band:** 44xx (Registers)
**Revision:** 0
**Labels:** wr-register, band-44xx, rev-0
**Status:** ACTIVE
**Related:** WR-4484 (BNAT invention targets)

---

## Purpose

The catalog's immune system. Negative knowledge (what has failed), asymmetric-conflict math (how underdogs actually win), formalized folk wisdom, and explicit gap labels that feed the invention loop.

This register exists because most catalogs only record what worked. The Underdog Register records **what broke, why it broke, and where we still don't know**.

---

## Section A — Failed Formulas (Negative Knowledge)

Each entry: formula, failure mode, named source, replacement pointer.

### A.1 Gaussian Copula (Li, 2000)
- **Claim:** Default correlation across CDO tranches modeled via single Gaussian copula parameter.
- **Failure:** Assumed correlation constant; tail dependence collapsed to zero. 2008 crisis.
- **Source:** Salmon, F. (2009). "Recipe for Disaster: The Formula That Killed Wall Street," *Wired*.
- **Replacement:** Empirical tail-dependence measures; stress scenarios over parametric fit.

### A.2 VaR under Normality
- **Claim:** Value-at-Risk with Gaussian returns bounds worst-case loss.
- **Failure:** Return distributions have fat tails (Mandelbrot, Taleb). Normality understates tail risk by orders of magnitude.
- **Source:** Taleb, N. N. (2007). *The Black Swan*. Mandelbrot, B. (1963). "The Variation of Certain Speculative Prices."
- **Replacement:** Expected Shortfall (CVaR), extreme value theory, barbell allocation.

### A.3 LTCM Convergence Trades
- **Claim:** Historical spread relationships mean-revert; leverage amplifies safe arbitrage.
- **Failure:** Liquidity crisis (1998 Russian default) broke correlation assumptions; 25:1 leverage detonated.
- **Source:** Lowenstein, R. (2000). *When Genius Failed*.
- **Replacement:** Leverage caps tied to liquidity horizon, not historical volatility.

### A.4 COCOMO Drift
- **Claim:** Software effort estimable from KLOC via calibrated cost drivers.
- **Failure:** Requirements churn dominates; estimates drift 2–4x. Doesn't survive contact with real projects.
- **Source:** Boehm, B. (1981). *Software Engineering Economics*. Critique: DeMarco & Lister; Brooks.
- **Replacement:** Reference-class forecasting (Flyvbjerg), evidence-based scheduling (Spolsky), #NoEstimates.

### A.5 Stack Ranking (GE/Microsoft)
- **Claim:** Forced-distribution performance ranking improves org quality.
- **Failure:** Kills collaboration, gamed via team selection, correlation with actual performance ~0.
- **Source:** Kwoh, L. (2012). *WSJ* — Microsoft's lost decade. Deming's writings on ranking.
- **Replacement:** Continuous feedback; team-level metrics; Deming's 14 points.

### A.6 MBTI
- **Claim:** 16 personality types predict job fit and team dynamics.
- **Failure:** Test-retest reliability <50% within weeks. No predictive validity. Not accepted in peer-reviewed personality psych.
- **Source:** Pittenger, D. J. (1993). "The Utility of the Myers-Briggs Type Indicator," *Review of Educational Research*.
- **Replacement:** Big Five (OCEAN) — actual peer-reviewed construct validity.

### A.7 NPS as Causal Metric
- **Claim:** Net Promoter Score causally predicts revenue growth (Reichheld, 2003).
- **Failure:** Correlation weak; "ultimate question" claim not replicated. Confuses proxy with cause.
- **Source:** Keiningham, T. et al. (2007). "A Longitudinal Examination of Net Promoter and Firm Revenue Growth," *Journal of Marketing*.
- **Replacement:** Cohort retention curves, actual revenue attribution.

### A.8 Last-Click Attribution
- **Claim:** Marketing conversion credit belongs to the last touchpoint.
- **Failure:** Systematically over-credits bottom-of-funnel; kills brand and top-of-funnel investment.
- **Source:** Chaffey, D.; Google Analytics documentation acknowledges the bias.
- **Replacement:** Multi-touch attribution, incrementality testing, geo holdouts.

---

## Section B — Underdog Math (Real Studies)

### B.1 Arreguin-Toft Asymmetric-Conflict Win Rates
- **Finding:** In asymmetric conflicts (1800–2003), weaker side wins ~28.5% overall, rising to ~63.6% when using indirect strategy against direct.
- **Source:** Arreguin-Toft, I. (2001). "How the Weak Win Wars," *International Security* 26(1).
- **Application:** Strategy-mismatch dominates resource asymmetry.

### B.2 Pulled-Goalie Variance Timing
- **Finding:** Optimal pull time is ~5:40 remaining when trailing by one — far earlier than practice (~1:30). Variance-injection timing.
- **Source:** Beaudoin, D. & Swartz, T. B. (2010). "Strategies for Pulling the Goalie in Hockey," *The American Statistician*.
- **Application:** When behind, inject variance earlier than intuition suggests.

### B.3 Wald Survivorship Correction
- **Finding:** Reinforce planes where returning aircraft show *no* bullet holes — those are the fatal hit locations (missing from the sample).
- **Source:** Wald, A. (1943). *A Method of Estimating Plane Vulnerability Based on Damage of Survivors*, SRG memo.
- **Application:** Study the missing sample. Failed cases are censored data.

### B.4 Taleb Barbell / Convexity
- **Finding:** Combine extreme safety (80–90%) with extreme risk (10–20%); avoid the fragile middle. Payoff is convex.
- **Source:** Taleb, N. N. (2012). *Antifragile*.
- **Application:** Portfolio, career, R&D allocation.

### B.5 UCB1 Exploration Bonus
- **Formula:** `select arm i maximizing x̄_i + √(2 ln n / n_i)`
- **Finding:** Optimism-under-uncertainty achieves logarithmic regret in multi-armed bandits.
- **Source:** Auer, P., Cesa-Bianchi, N., Fischer, P. (2002). "Finite-time Analysis of the Multiarmed Bandit Problem," *Machine Learning*.
- **Application:** Underdogs get exploration bonus proportional to √(ln n / n_i).

### B.6 Dyson Sequential-Search Math
- **Finding:** For rare targets in large search spaces, sequential search with early-abandon dominates parallel breadth.
- **Source:** Dyson, F. (1943). RAF Bomber Command OR reports; formalized in later OR literature.
- **Application:** Small teams beat large ones in high-variance discovery when they can abandon fast.

### B.7 Pivot as Real Option
- **Finding:** Startup pivots priced as real options: value = max(continue, switch − cost). Optionality increases with volatility.
- **Source:** Dixit, A. & Pindyck, R. (1994). *Investment Under Uncertainty*. Applied to startups: McGrath (1999), *Academy of Management Review*.
- **Application:** Underdog optionality has explicit dollar value; kill-switches preserve it.

---

## Section C — Chatterings Formalized (Folk Wisdom → Named Laws)

| Law | Statement | Source |
|---|---|---|
| **Goodhart** | When a measure becomes a target, it ceases to be a good measure. | Goodhart (1975), monetary policy critique. |
| **Lindy** | Non-perishable things' future life expectancy ∝ current age. | Mandelbrot; Taleb (*Antifragile*). |
| **Brooks** | Adding people to a late project makes it later. | Brooks (1975), *The Mythical Man-Month*. |
| **Parkinson** | Work expands to fill the time available. | Parkinson (1955), *The Economist*. |
| **Hofstadter** | It always takes longer than you expect, even accounting for Hofstadter's Law. | Hofstadter (1979), *GEB*. |
| **Cunningham** | Best way to get the right answer is to post the wrong one. | Ward Cunningham, attributed. |
| **K-factor** | Viral growth coefficient: K = i × c (invites × conversion). Sustained growth requires K > 1. | Skok, D. — for Entrepreneurs; standard SaaS metric. |

---

## Section D — Gaps (Missing Formulas → WR-4484 Invention Targets)

Explicitly labeled. These become the invention loop's first work queue.

### D.1 The Underdog Composite (CONSTRUCTED — not yet backtested)
- **Target:** Single scalar combining strategy-mismatch (B.1), variance-injection timing (B.2), survivorship correction (B.3), barbell allocation (B.4), and exploration bonus (B.5).
- **Status:** CONSTRUCTED. No empirical backtest. Do not deploy on capital.
- **BNAT target:** WR-4484.

### D.2 Kill-Switch Threshold
- **Target:** Formula for when to abandon a pivot attempt — real-option strike price under compound uncertainty.
- **Status:** MISSING. Real-options literature gives static case; sequential-decision version underdeveloped for founder context.
- **BNAT target:** WR-4484.

### D.3 Team-Size Variance Curve
- **Target:** Optimal team size as function of problem variance and abandonment cost. Extends Brooks (C) and Dyson (B.6).
- **Status:** MISSING. Brooks gives ceiling; no lower-bound formula tied to variance.
- **BNAT target:** WR-4484.

### D.4 Goodhart Half-Life
- **Target:** Expected time until a metric-turned-target is gamed to uselessness. Function of visibility, incentive gradient, measurement latency.
- **Status:** MISSING. Goodhart stated qualitatively; no quantitative decay model.
- **BNAT target:** WR-4484.

### D.5 Chatter-to-Signal Ratio
- **Target:** Quantify when folk-wisdom (Section C) should override formal models (Section A). Currently intuitive.
- **Status:** MISSING.
- **BNAT target:** WR-4484.

---

## Cross-References
- **WR-4484** — BNAT invention targets (consumes Section D gap list as work queue).
- **Section A** — do not use as authority; use as tombstones.
- **Section B** — cite by primary source; do not paraphrase without checking.
- **Section C** — folk wisdom promoted to named laws; still heuristic, not theorem.
- **Section D** — CONSTRUCTED items are not empirical; label preserved until backtested.

---

## Change Log
- **rev-0** — Initial register. Sections A (8 entries), B (7 entries), C (7 laws), D (5 gaps).
