# WR-4485 — The Underdog Register

**Band:** 44xx (Anti-patterns, Negative Knowledge, Asymmetric Advantage)
**Revision:** 0
**Status:** ACTIVE
**Labels:** wr-register, band-44xx, rev-0
**Closes:** #16674, #16676, #16678, #16681

---

## Purpose

WR-4485 is the catalog's **immune system**: a register of failed formulas, underdog math, formalized folklore, and explicitly-labeled gaps. It exists because the fastest path from $10k/month → $10M is *avoiding the graveyard shortcuts* everyone else takes.

> **Prime Directive alignment:** Every entry here either (a) prevents a capital-destroying error, or (b) provides an asymmetric edge for the underdog operator.

---

## A. Failed Formulas (Negative Knowledge)

Each entry: *what it claimed → how it failed → named source → operator lesson.*

| # | Formula | Claim | Failure Mode | Named Source | Operator Lesson |
|---|---------|-------|--------------|--------------|-----------------|
| A1 | **Gaussian Copula** (Li, 2000) | Correlate default risk across CDO tranches via a single ρ | Tail dependence collapsed under regime shift; ρ went to 1 in 2008 | Salmon, *Wired* (2009), "Recipe for Disaster" | Never model tails with thin-tailed kernels |
| A2 | **VaR under normality** | 99% worst-case loss ≈ 2.33σ | Ignores fat tails; underestimates ruin by 10–100× | Taleb, *The Black Swan* (2007) | Use CVaR / stress scenarios, not σ-multiples |
| A3 | **LTCM convergence trade** | Spreads mean-revert; leverage is free | Liquidity vanishes precisely when you need it | Lowenstein, *When Genius Failed* (2000) | Leverage × illiquidity = ruin |
| A4 | **COCOMO / COCOMO II** | Effort = a·(KLOC)^b, tunable constants | Drift: real projects overrun 2–4×; parameters unfalsifiable | Boehm (1981); critiqued by Kitchenham (1997) | Estimate by reference class, not parametric fit |
| A5 | **Stack ranking** (GE/MSFT vitality curve) | Force-rank bottom 10% → fire → performance ↑ | Destroys collaboration, gamed by managers, correlates with decline | Kwoh, *WSJ* (2012); MSFT abandoned 2013 | Rank systems, not people |
| A6 | **MBTI** | 16 stable personality types predict job fit | Test-retest r ≈ 0.5; no predictive validity | Pittenger, *Consulting Psychology Journal* (1993) | Use trait measures (Big Five) if you must measure at all |
| A7 | **NPS as causal driver** | "Would you recommend?" → growth | Correlational at best; Reichheld's original claim unreplicated | Keiningham et al., *Journal of Marketing* (2007) | NPS is a thermometer, not a lever |
| A8 | **Last-click attribution** | Credit the final touchpoint | Systematically overvalues bottom-funnel; kills brand investment | Google Analytics deprecation notice (2023) | Use data-driven or incrementality testing |

**Meta-lesson:** All eight failed by treating a **map as the territory** under regime change. The register's job is to keep the maps labeled.

---

## B. Underdog Math (Real Studies, Real Edges)

| # | Tool | Formula / Result | Source | When to Deploy |
|---|------|------------------|--------|----------------|
| B1 | **Arreguin-Toft asymmetric conflict** | Weak actors win 28.5% of conflicts overall; **63.6%** when using indirect strategy vs. strong actor's direct strategy | Arreguin-Toft, *International Security* (2001) | Never fight on the incumbent's chosen axis |
| B2 | **Pulled-goalie variance timing** | Optimal pull time ≈ 3:00 remaining when down 1; earlier than NHL convention | Beaudoin & Swartz, *J. Quant. Analysis in Sports* (2010) | When behind, increase variance *earlier* than intuition suggests |
| B3 | **Wald survivorship correction** | Armor the planes where returning bombers were *not* hit | Wald, SRG memo (1943); Mangel & Samaniego (1984) | Study the failures, not the survivors |
| B4 | **Taleb barbell / convexity** | 90% ultra-safe + 10% ultra-convex dominates 100% medium-risk under fat tails | Taleb, *Antifragile* (2012) | Cash + moonshots > diversified mediocrity |
| B5 | **UCB1 exploration bonus** | Choose arm maximizing x̄ᵢ + √(2 ln n / nᵢ) | Auer, Cesa-Bianchi, Fischer (2002) | Systematic exploration budget when running multiple product bets |
| B6 | **Dyson sequential search** | Optimal stopping under exponential-cost search: stop when marginal cost > expected marginal value | Dyson, *Disturbing the Universe* (1979); formalized in secretary-problem lit | Kill projects on math, not sentiment |
| B7 | **Pivot as real option** | Option value = max(0, E[V_new] − switching_cost); Black-Scholes-adjacent | Dixit & Pindyck, *Investment Under Uncertainty* (1994); McGrath (1997) | Every product decision is an option — price it |

**Underdog Composite (CONSTRUCTED — see D5):** Provisional index combining B1, B4, B5 for allocation decisions. **Not yet backtested.**

---

## C. Chatterings Formalized (Folklore → Named Laws)

| # | Law | Statement | Named Source |
|---|-----|-----------|--------------|
| C1 | **Goodhart's Law** | When a measure becomes a target, it ceases to be a good measure | Goodhart (1975); Strathern (1997) |
| C2 | **Lindy Effect** | Expected remaining life of non-perishable ∝ current age | Mandelbrot (1982); Taleb (2012) |
| C3 | **Brooks's Law** | Adding manpower to a late software project makes it later | Brooks, *Mythical Man-Month* (1975) |
| C4 | **Parkinson's Law** | Work expands to fill the time available for its completion | Parkinson, *The Economist* (1955) |
| C5 | **Hofstadter's Law** | It always takes longer than you expect, even when you account for Hofstadter's Law | Hofstadter, *GEB* (1979) |
| C6 | **Cunningham's Law** | Best way to get the right answer is to post the wrong one | Attr. Ward Cunningham |
| C7 | **K-factor** | Viral coefficient K = i·c (invites × conversion); growth iff K > 1 | Skok, *For Entrepreneurs* (2009), formalizing epidemiology's R₀ |

---

## D. Gaps (Explicitly Missing Formulas → WR-4484 BNAT Invention Queue)

These are labeled openly as **holes in the catalog**. They become the first work queue for the invention loop.

| # | Gap | Why it matters | Invention Target |
|---|-----|----------------|------------------|
| D1 | **Regime-shift detector for solo operators** | Existing methods (CUSUM, Bayesian online change-point) assume data volume a solo op doesn't have | Low-n regime-shift heuristic w/ calibrated false-positive rate |
| D2 | **Convexity score for indie products** | Taleb's barbell is qualitative for portfolios <10 bets | Quantitative convexity index for n ≤ 5 product portfolio |
| D3 | **Attention-cost adjusted UCB** | UCB1 assumes cost-symmetric arm pulls; founder attention is not | UCB variant with per-arm attention weight |
| D4 | **Anti-Goodhart metric wrapper** | No formal method to detect when a KPI has been gamed *by yourself* | Self-gaming detector; drift signature on operator-set metrics |
| D5 | **The Underdog Composite itself** | Currently CONSTRUCTED (B section); needs backtest against Polar.sh / OSINT product cohort | Backtest protocol + falsification criteria |

Each D-item is filed as a **WR-4484 BNAT (Best-Not-Achieved-Threshold) invention target**. Progress tracked in the invention loop's work queue.

---

## Wiring

- **Upstream:** WR-4484 (BNAT invention loop consumes Section D)
- **Downstream:** Every product decision in the $10k→$10M plan is checked against Section A (avoid) and Section B (deploy)
- **Review cadence:** Quarterly; each Section A entry re-verified against new failures; Section D shrinks as inventions land

## Review Focus (from issue)

> Section D gap list — these become the invention loop's first work queue.

Confirmed: D1–D5 are the initial queue. D5 (Underdog Composite backtest) is highest priority because it validates or falsifies our own Section B synthesis.

---

*Rev-0. Negative knowledge is knowledge. Label the gaps.*
