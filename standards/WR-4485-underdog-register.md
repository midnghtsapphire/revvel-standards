# WR-4485 — The Underdog Register

**Band:** 44xx (Catalog Immune System)
**Rev:** 0
**Status:** Living document
**Closes:** #16674, #16676, #16678, #16681, #16683, #16685, #16687, #16689

> The catalog's immune system: failed formulas (negative knowledge), comeback math (asymmetric-conflict wins), formalized folk wisdom, and explicit gaps wired as invention targets.

---

## A. Failed Formulas (Negative Knowledge)

Named sources, named failures. What NOT to use, and why.

| # | Formula / Model | Domain | Failure Mode | Named Source |
|---|-----------------|--------|--------------|--------------|
| A1 | **Gaussian copula** (Li, 2000) | Credit derivatives | Assumed correlations stable & Gaussian; underpriced tail co-movement | Salmon, "Recipe for Disaster," *Wired* 2009 |
| A2 | **VaR under normality** | Bank risk | Fat tails / regime shift ignored; underestimated 2008 losses by orders of magnitude | Taleb, *The Black Swan*; Danielsson 2002 |
| A3 | **LTCM convergence trades** | Hedge fund arbitrage | Leverage × correlation-goes-to-1 in crisis; blew up 1998 | Lowenstein, *When Genius Failed* |
| A4 | **COCOMO / COCOMO II** | Software estimation | Assumed effort-scales-with-KLOC; ignored requirement volatility, drifted 200%+ | Molokken & Jorgensen 2003 meta-review |
| A5 | **Stack ranking (rank-and-yank)** | Perf management | Destroyed collaboration, incentivized sabotage; abandoned by GE (2015), Microsoft (2013) | Kwoh, *WSJ* 2012; Ovide, *WSJ* 2013 |
| A6 | **MBTI** | Personnel selection | Test-retest reliability < 0.5 on binary axes; no predictive validity for job performance | Pittenger 1993; Hunsley et al. 2003 |
| A7 | **NPS as causal driver** | Growth strategy | Correlation ≠ cause; single-question survey doesn't predict revenue growth once controls added | Keiningham et al. 2007, *J. Marketing* |
| A8 | **Last-click attribution** | Marketing spend | Systematically over-credits bottom-funnel; kills brand investment that seeds demand | Google/Nielsen multi-touch studies 2013+ |

**Rule:** Any WR that reaches for one of these must cite this register and justify.

---

## B. Underdog Math (Comeback Formulas)

Real studies, real formulas. How the smaller side wins.

### B1. Arreguin-Toft asymmetric-conflict base rates
**Source:** Arreguin-Toft, *How the Weak Win Wars* (2005), Cambridge.
**Finding:** Across 202 asymmetric conflicts (1800–2003), the weaker side wins **28.5%** overall — but **63.6%** when using indirect/unconventional strategy vs. the strong side's direct strategy.
**Formula (empirical):** `P(weak wins | strategy mismatch) ≈ 0.636`
**Application:** Don't fight incumbents on their axis.

### B2. Pulled-goalie variance timing
**Source:** Beaudoin & Swartz, "Strategies for pulling the goalie in hockey," *American Statistician* 64(3), 2010.
**Finding:** Optimal pull time is ~**3:00** left when down 1 (not the traditional 1:00). Earlier pull = more variance = better expected outcome when behind.
**Principle:** When behind, **inject variance**. When ahead, **suppress variance**.

### B3. Wald survivorship correction
**Source:** Abraham Wald, Statistical Research Group memo (1943) on bomber armor.
**Insight:** Reinforce where returning planes are NOT hit — those are the fatal zones. The dataset is truncated by non-survivors.
**Formula skeleton:** `True_hit_distribution = Observed + Missing_from_selection_bias`

### B4. Taleb barbell / convexity
**Source:** Taleb, *Antifragile* (2012), Ch. 19–20.
**Formula:** Allocate `1-α` to maximally safe, `α` to maximally convex (lottery-tickets with capped downside, uncapped upside). Avoid the middle.
**Payoff:** `E[X] = (1-α)·r_f + α·E[X|convex]` with `Var` dominated by the safe leg.

### B5. UCB1 exploration bonus
**Source:** Auer, Cesa-Bianchi, Fischer, *Machine Learning* 47, 2002.
**Formula:** `UCB1(i) = x̄_i + √(2 ln n / n_i)`
**Meaning:** Underdogs (low `n_i`) get an exploration bonus. Regret is `O(log n)`.
**Application:** Portfolio allocation to new bets should include this bonus, not just historical mean.

### B6. Dyson sequential search
**Source:** Freeman Dyson, *Disturbing the Universe* (1979), on WWII bomber-command operations research.
**Insight:** When searching for a hidden target, optimal effort spent per cell = `f(prior · detection_prob)`, and you must **revisit** cells as prior updates.

### B7. Pivot-as-real-option
**Source:** Dixit & Pindyck, *Investment Under Uncertainty* (1994).
**Formula:** `V_pivot = max(V_continue, V_switch − C_switch)`, where the option to switch has positive value when `σ` (uncertainty) is high.
**Corollary:** High-uncertainty environments make optionality (small pivots) more valuable than commitment.

---

## C. Chatterings Formalized (Folk Wisdom → Math)

| # | Law | Statement | Formal Version |
|---|-----|-----------|----------------|
| C1 | **Goodhart's Law** | "When a measure becomes a target, it ceases to be a good measure." | `Corr(metric, goal)` decays as optimization pressure on metric increases. |
| C2 | **Lindy Effect** | Life expectancy ∝ current age (for non-perishables). | `E[remaining | survived_t] ≈ t` for power-law survival. |
| C3 | **Brooks's Law** | "Adding people to a late project makes it later." | Communication overhead = `O(n²)` vs. throughput = `O(n)`. |
| C4 | **Parkinson's Law** | "Work expands to fill available time." | Task duration = `f(deadline)`, not `f(intrinsic complexity)`. |
| C5 | **Hofstadter's Law** | "It always takes longer than you expect, even accounting for Hofstadter's Law." | Estimate distribution is right-skewed; median < mean by large factor. |
| C6 | **Cunningham's Law** | "Best way to get right answer online is post wrong answer." | Correction cost < question cost when audience density is high. |
| C7 | **K-factor** | Viral coefficient. | `K = i · c` (invites × conversion). `K > 1` → exponential; `K < 1` → decaying series. |

---

## D. Gaps (Invention Targets — wired to WR-4484 BNAT)

Explicitly missing. Each becomes a work item in the invention loop.

### D1. **Underdog Composite Index** — *CONSTRUCTED, not backtested*
Proposal: weighted score of {asymmetry advantage, convexity, exploration bonus, pivot optionality, variance-injection capacity}.
`UC = w₁·A + w₂·C + w₃·U + w₄·P + w₅·V`
**Status:** No empirical calibration yet. Do not use for decisions until backtested against 100+ historical underdog wins/losses.

### D2. **Regime-switch detector for VaR replacement**
Gap: No accepted formula for detecting the shift from Gaussian-regime to fat-tail-regime *before* the tail event.
**Target:** Early-warning statistic with acceptable false-positive rate.

### D3. **Anti-Goodhart metric design**
Gap: How to construct metrics that remain informative under optimization pressure.
**Target:** Formal criterion for "Goodhart-resistant" measures (candidates: multi-metric composites with adversarial weights, moving targets, held-out validation streams).

### D4. **Attribution model that survives Simpson's paradox**
Gap: Last-click fails (A8); multi-touch models fail on subgroup reversal.
**Target:** Causal attribution with explicit confounders and stability guarantees under population mix shifts.

### D5. **Software estimation that beats COCOMO**
Gap: 50 years post-COCOMO, no formula reliably beats "experienced dev's gut × 2.5."
**Target:** Estimator that explicitly models requirement volatility and integrates reference-class forecasting.

---

## Cross-references

- **WR-4484 BNAT** — invention targets pull from Section D above
- **Prime directive alignment:** Sections A (avoid failed bets) and B (asymmetric wins) directly serve the $10k → $10M scaling path. Underdog math is the only math that matters when starting under-resourced.

## Review focus

Section D — the gap list is the invention loop's initial work queue. Prioritize D1 (Underdog Composite backtest) and D3 (anti-Goodhart) as they gate the register's own credibility.
