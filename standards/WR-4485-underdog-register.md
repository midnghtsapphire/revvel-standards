# WR-4485 — The Underdog Register

**Band:** 44xx (Failure-Mode & Asymmetric-Advantage Catalog)
**Revision:** 0
**Status:** Draft — living document
**Labels:** `wr-register`, `band-44xx`, `rev-0`
**Related:** WR-4484 (BNAT Invention Loop)

---

## Purpose

The Underdog Register is the catalog's **immune system**. It records:

- **Failed formulas** — models that shipped, dominated a field, then blew up. Negative knowledge, named sources.
- **Underdog math** — real, cited results about how the weaker side wins.
- **Chatterings formalized** — folk laws promoted to first-class citizens with predicates.
- **Gaps** — explicitly missing formulas, wired as work items for WR-4484 (BNAT invention loop).

Use it as a pre-flight checklist before adopting any model, metric, or ranking scheme in the mission stack (Phase 1 → Phase 4, $10k/mo → $10M).

---

## A. Failed Formulas (Negative Knowledge)

Each entry: **name → domain → failure mode → named source → replacement rule.**

### A.1 Gaussian Copula (Li, 2000)
- **Domain:** CDO default correlation pricing.
- **Failure mode:** Assumed correlations were stable, Gaussian, and estimable from short CDS histories. Tail dependence collapsed to zero. 2008 GFC.
- **Source:** Li, D.X. (2000) *On Default Correlation: A Copula Function Approach*. Salmon, F. (2009) *Recipe for Disaster*, Wired.
- **Rule:** No single-parameter dependence structure for tail-risk products. Require stressed correlation = 1 scenario.

### A.2 VaR under Normality
- **Domain:** Bank market-risk capital (Basel II).
- **Failure mode:** σ estimated from calm windows; 6σ events happened weekly. Ignored the *shape* of the tail.
- **Source:** Taleb, N. (2007) *The Black Swan*. Danielsson, J. et al. (2001) *An Academic Response to Basel II*.
- **Rule:** Report Expected Shortfall (CVaR) alongside VaR; stress-test with historical + synthetic tails.

### A.3 LTCM Convergence Trades
- **Domain:** Fixed-income relative value.
- **Failure mode:** Sharpe-optimized leverage under log-normal returns. Liquidity spirals + flight-to-quality broke every correlation assumption.
- **Source:** Lowenstein, R. (2000) *When Genius Failed*. MacKenzie, D. (2003) *An Equation and its Worlds*.
- **Rule:** Leverage × illiquidity is a killer regardless of edge. Cap gross exposure by *time-to-liquidate*, not σ.

### A.4 COCOMO / Function-Point Drift
- **Domain:** Software effort estimation.
- **Failure mode:** Calibration constants from 1970s waterfall projects applied to modern iterative work. Estimates off by 4×–10×.
- **Source:** Boehm, B. (1981) *Software Engineering Economics*; Jørgensen, M. & Shepperd, M. (2007) *A Systematic Review of Software Development Cost Estimation Studies*.
- **Rule:** Use reference-class forecasting (Flyvbjerg) + running-average velocity, not parametric formulas.

### A.5 Stack Ranking (Vitality Curves)
- **Domain:** Performance management (GE → Microsoft → …).
- **Failure mode:** Forced 20/70/10 distribution destroys collaboration, punishes strong teams, creates political survival games. Microsoft dropped it in 2013.
- **Source:** Eichenwald, K. (2012) *Microsoft's Lost Decade*, Vanity Fair. Pfeffer, J. (2010) *Power*.
- **Rule:** Never rank on a forced curve. Rank against a fixed bar, or don't rank.

### A.6 MBTI
- **Domain:** Hiring, team composition.
- **Failure mode:** Test–retest reliability ~50% across 5 weeks; no predictive validity for job performance. Sold as science; is not.
- **Source:** Pittenger, D. (1993) *Measuring the MBTI…And Coming Up Short*. Grant, A. (2013) *Goodbye to MBTI, the Fad that Won't Die*.
- **Rule:** Use validated instruments (Big Five/HEXACO) *only* where meta-analysis shows job-relevant predictive validity, and never as a gate.

### A.7 NPS as Causal Metric
- **Domain:** Product/growth.
- **Failure mode:** Reichheld's "one number" was correlational at best; the causal claim (NPS → growth) fails replication.
- **Source:** Keiningham, T. et al. (2007) *A Longitudinal Examination of Net Promoter and Firm Revenue Growth*, J. Marketing.
- **Rule:** Track NPS as a diagnostic, never as a KPI target (Goodhart, see C.1). Prefer revenue retention + cohort behavior.

### A.8 Last-Click Attribution
- **Domain:** Marketing spend allocation.
- **Failure mode:** Systematically over-credits bottom-funnel (branded search, retargeting) and starves top-funnel demand generation. Kills the goose.
- **Source:** Google/Nielsen MMM studies 2016–2020; Byron Sharp, *How Brands Grow* (2010).
- **Rule:** Use MMM + geo-lift experiments for allocation; last-click only for tactical optimization within a channel.

---

## B. Underdog Math (Real Results)

Each entry: **claim → formula/mechanism → source → when to use.**

### B.1 Arreguin-Toft — Asymmetric Conflict Win Rates
- **Claim:** Weak actors win ~29% of asymmetric conflicts overall, rising to ~63% when they adopt an *opposite-strategy* approach vs. the strong actor's approach.
- **Source:** Arreguín-Toft, I. (2001) *How the Weak Win Wars*, International Security 26(1).
- **Use:** Strategy selection at market entry. If incumbent plays direct/conventional, play indirect/guerrilla, and vice versa.

### B.2 Pulled-Goalie Variance Timing
- **Claim:** Optimal pull time is much earlier than NHL practice — variance-injection dominates expected-goals when trailing.
- **Formula sketch:** Pull when `P(tie | pull, t) > P(tie | no pull, t)`; empirically ≈ 3:00–6:00 remaining when down 1, not 1:00–1:30.
- **Source:** Beaudoin, D. & Swartz, T. (2010) *Strategies for Pulling the Goalie in Hockey*, The American Statistician.
- **Use:** When behind, inject variance early. Applies to pricing gambits, product bets, comeback launches.

### B.3 Wald — Survivorship Correction
- **Claim:** Reinforce where returning bombers show *no* damage (engines), not where damage clusters (fuselage) — the missing planes carry the signal.
- **Source:** Wald, A. (1943) *A Method of Estimating Plane Vulnerability Based on Damage of Survivors*, Statistical Research Group memo.
- **Use:** All post-mortems, churn analysis, funnel analysis: study the ones you *didn't* hear from.

### B.4 Taleb — Barbell / Convexity
- **Claim:** Portfolios with ~85–90% ultra-safe + ~10–15% max-convex bets beat median-risk allocations under fat tails.
- **Source:** Taleb, N. (2012) *Antifragile*; Taleb & Cirillo (2020) on tail risk.
- **Use:** Capital allocation across product bets. Cap downside per bet; uncap upside.

### B.5 UCB1 — Exploration Bonus
- **Formula:** `UCB1_i = x̄_i + √(2 ln n / n_i)`
- **Source:** Auer, P., Cesa-Bianchi, N., Fischer, P. (2002) *Finite-time Analysis of the Multiarmed Bandit Problem*, Machine Learning 47.
- **Use:** Channel/product/copy selection. Underexplored arms get a rising bonus — the formal underdog subsidy.

### B.6 Dyson — Sequential Search / Optimal Stopping
- **Claim:** Search N candidates; reject first N/e (~37%), then accept the next one better than all seen. Optimal under no-recall.
- **Source:** Ferguson, T. (1989) *Who Solved the Secretary Problem?*, Statistical Science.
- **Use:** Hiring, supplier selection, market-entry city selection.

### B.7 Pivot as Real Option
- **Claim:** A startup's ability to pivot has Black-Scholes-style option value: `C = f(σ, T, K)` — higher volatility and longer runway raise option value.
- **Source:** Dixit, A. & Pindyck, R. (1994) *Investment Under Uncertainty*; McGrath, R.G. (1999) *Falling Forward: Real Options Reasoning and Entrepreneurial Failure*.
- **Use:** Don't discount early-stage volatility — price it. Preserve optionality until the option is in the money.

---

## C. Chatterings Formalized

Folk laws promoted with a testable predicate.

### C.1 Goodhart's Law
- **Statement:** *When a measure becomes a target, it ceases to be a good measure.*
- **Predicate:** For metric M with policy π optimizing M, ∃ decoupling t* after which `corr(M, underlying_goal) → 0`.
- **Source:** Goodhart, C. (1975); Strathern, M. (1997) reformulation.
- **Trigger:** Any metric with a bonus attached. Instrument a shadow metric.

### C.2 Lindy Effect
- **Statement:** Expected remaining life of a non-perishable ≈ its current age.
- **Source:** Mandelbrot (1982); Taleb (2012) *Antifragile*.
- **Use:** When choosing tech/standards under uncertainty, prefer the older option unless you have a specific reason not to.

### C.3 Brooks's Law
- **Statement:** *Adding manpower to a late software project makes it later.*
- **Source:** Brooks, F. (1975) *The Mythical Man-Month*.
- **Predicate:** Communication cost ~ O(n²), onboarding cost ~ O(n·training_time).

### C.4 Parkinson's Law
- **Statement:** *Work expands to fill the time available.*
- **Source:** Parkinson, C.N. (1955), The Economist.
- **Use:** Set aggressive timeboxes; the estimate creates the reality.

### C.5 Hofstadter's Law
- **Statement:** *It always takes longer than you expect, even when you take into account Hofstadter's Law.*
- **Source:** Hofstadter, D. (1979) *Gödel, Escher, Bach*.
- **Use:** Apply reference-class multiplier ≥1.5× on any recursive/creative task.

### C.6 Cunningham's Law
- **Statement:** *The best way to get the right answer on the internet is not to ask a question; it's to post the wrong answer.*
- **Use:** Distribution hack — post a v0 claim, harvest corrections.

### C.7 K-factor (Viral Coefficient)
- **Formula:** `K = i · c` where `i` = invites/user, `c` = conversion.
- **Source:** Skok, D. (2009); adapted from epidemiology R₀.
- **Use:** Underdog distribution: if K ≥ 1, paid CAC is a floor, not a ceiling.

---

## D. Gaps — Missing Formulas (Wired to WR-4484 BNAT Loop)

Explicitly-labeled holes. Each is a work item for the invention loop. Status: **UNSOLVED**.

### D.1 The Underdog Composite
- **Need:** A single scalar `U ∈ [0,1]` combining Arreguin-Toft strategy-fit, Taleb convexity, UCB1 residual, Wald survivorship-signal-strength, and pivot option value.
- **Status:** **CONSTRUCTED — not backtested.** Do not use for capital allocation until D.5 completes.
- **BNAT target:** WR-4484 item #1.

### D.2 Comeback Half-Life
- **Need:** Given a KPI trajectory below trend, estimate `t_½` — time until 50% recovery probability — as a function of variance-injection budget.
- **Related work:** Beaudoin & Swartz (B.2), but generalized off-ice.
- **BNAT target:** WR-4484 item #2.

### D.3 Gap-Value Function
- **Need:** A pricing rule for *known unknowns*: how much is it worth to fill gap G_i given expected use frequency and downside if unfilled?
- **Related work:** Value of information (Howard, 1966); needs adaptation to founder-time budget.
- **BNAT target:** WR-4484 item #3.

### D.4 Failed-Formula Contagion
- **Need:** When failed formula F is deprecated, which downstream metrics/decisions inherit its rot? A dependency-graph score.
- **Related work:** Software dependency analysis; needs epistemic-dependency variant.
- **BNAT target:** WR-4484 item #4.

### D.5 Backtest Protocol for D.1
- **Need:** A cross-validated backtest of the Underdog Composite against a labeled dataset of asymmetric business outcomes (Phase 1–4 revenue trajectories).
- **Dependency:** Blocks promotion of D.1 from CONSTRUCTED → VALIDATED.
- **BNAT target:** WR-4484 item #5.

---

## Usage

- **Before adopting a model:** grep Section A for its name.
- **When behind on a phase target:** consult Section B (esp. B.1, B.2, B.4).
- **When a metric "just works":** consult Section C.1 (Goodhart) before doubling down.
- **When you find a new failure or a new asymmetric result:** append here, bump revision, open a WR-4484 ticket if a formula is missing.

## Review Focus (this revision)

Section D. These five gaps are the invention loop's first work queue. Prioritize D.5 (unblocks D.1).

---

*Rev-0 — living document. Closes #16674, #16676, #16678, #16681, #16683, #16685, #16687, #16689, #16691.*
