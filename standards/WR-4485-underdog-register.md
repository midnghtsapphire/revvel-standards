# WR-4485 — The Underdog Register

**Band:** 44xx (Wisdom Registers)
**Rev:** 0
**Status:** Living document
**Closes:** #16674, #16676, #16678, #16681, #16683, #16685
**Related:** WR-4484 (BNAT invention loop)

---

## Purpose

The catalog's **immune system**. Where WR-44xx registers canonize what works, WR-4485 canonizes:

1. What **failed** (named, sourced, so we don't rebuild it)
2. What lets **underdogs win** (asymmetric-conflict math, real studies)
3. Folk wisdom **formalized** (chatterings → laws)
4. Explicit **gaps** (labeled missing formulas → invention-loop work queue)

**Prime directive alignment:** $10k → $10M requires avoiding the failure modes that kill 90% of scaling attempts (Section A) and exploiting the asymmetric-conflict advantages available to small operators (Section B).

---

## Section A — Failed Formulas (Negative Knowledge)

Each entry: **formula → why it failed → named source → replacement rule.**

### A1. Gaussian Copula (CDO correlation)
- **Formula:** Li (2000) — default correlations via Gaussian copula on CDS spreads.
- **Failure:** Assumed tail-independence; correlations went to 1 in 2008. Powered ~$60T in mispriced structured credit.
- **Source:** Salmon, *Wired* (2009), "Recipe for Disaster"; MacKenzie & Spears (2014).
- **Replacement:** Assume tail-dependence by default. Stress-test at ρ=1. Never use elliptical copulas for credit.

### A2. VaR under Normality
- **Formula:** 1-day 99% VaR assuming Gaussian returns.
- **Failure:** Underestimates tail risk by 10–100×. Silent during 1987, 1998, 2008, 2020.
- **Source:** Taleb, *The Black Swan* (2007); Danielsson, *The Myth of the Riskometer*.
- **Replacement:** Expected Shortfall (CVaR) with fat-tailed distributions (Student-t, ν≤4) or historical simulation.

### A3. LTCM Convergence Trades
- **Formula:** Relative-value arbitrage sized on historical volatility, leveraged ~25:1.
- **Failure:** 1998 Russia default → liquidity vanished → forced deleveraging at loss. $4.6B loss in 4 months.
- **Source:** Lowenstein, *When Genius Failed* (2000).
- **Replacement:** Size to liquidity-adjusted-VaR. Assume correlated forced-selling in stress. Cap leverage < 1/√(max historical drawdown).

### A4. COCOMO / Waterfall Estimation
- **Formula:** Effort = a·(KLOC)^b · EAF (Boehm 1981).
- **Failure:** Systematic 2–4× underestimation. Assumes requirements known upfront.
- **Source:** Standish CHAOS reports; DeMarco, *Controlling Software Projects*.
- **Replacement:** Reference-class forecasting (Kahneman/Flyvbjerg). Track velocity empirically. Timebox, don't estimate.

### A5. Stack Ranking (Vitality Curve)
- **Formula:** Force-rank employees, cut bottom 10% annually (GE, Welch).
- **Failure:** Destroys collaboration, gameable, correlates with fraud (Enron used it). Microsoft killed it 2013.
- **Source:** Kanter, *HBR* (2012); Ovide, *WSJ* on Microsoft reversal.
- **Replacement:** Absolute-standard performance review. Pair-programming / peer feedback. Fire for cause, not quota.

### A6. MBTI (Myers-Briggs) for Hiring
- **Formula:** 16-type personality classification predicts job fit.
- **Failure:** Test-retest reliability <50% at 5 weeks. No predictive validity for job performance.
- **Source:** Pittenger (1993), *Consulting Psychology Journal*; Grant, *Psychology Today* (2013).
- **Replacement:** Work-sample tests (best predictor, r≈0.54 per Schmidt & Hunter). Structured interviews.

### A7. NPS as Causal Metric
- **Formula:** NPS = %Promoters − %Detractors → drives growth (Reichheld 2003).
- **Failure:** Correlation with growth is weak-to-zero once controls added. Gameable. Loses information (11-point scale collapsed to 3 buckets).
- **Source:** Keiningham et al. (2007), *Journal of Marketing*.
- **Replacement:** Cohort retention curves. Revenue-weighted satisfaction. Actual repeat-purchase behavior.

### A8. Last-Click Attribution
- **Formula:** 100% of conversion credit to final touchpoint.
- **Failure:** Systematically over-credits branded search and retargeting; under-credits top-of-funnel. Kills brand investment.
- **Source:** Google's own multi-touch studies; Chaffey, *Digital Marketing Excellence*.
- **Replacement:** Incrementality testing (geo-holdouts, PSA tests). Media-mix modeling. Never attribute — measure lift.

---

## Section B — Underdog Math (Comeback Formulas)

Asymmetric-conflict advantages available to small operators. **Cited studies, not folklore.**

### B1. Arreguin-Toft Asymmetric-Conflict Win Rates
- **Study:** *How the Weak Win Wars* (2001, *International Security*).
- **Finding:** Weaker side wins 28.5% of asymmetric conflicts overall. When weak side uses **indirect strategy** vs strong side's direct strategy: **63.6% win rate.**
- **Rule:** Never fight the incumbent's game. Change the game (distribution, form-factor, business model).

### B2. Pulled-Goalie Variance Timing
- **Study:** Beaudoin & Swartz (2010), *J. Quantitative Analysis in Sports*.
- **Finding:** Optimal pull time is ~3× earlier than empirical NHL practice. Down 1 goal → pull at ~3:00 remaining, not ~1:00.
- **Rule:** When behind, **increase variance earlier than feels comfortable.** Loss is already priced in; upside is convex.

### B3. Wald Survivorship Correction
- **Study:** Wald (1943), Statistical Research Group, WWII bomber armor.
- **Finding:** Armor the parts of returning planes **without** bullet holes — those hits killed the missing planes.
- **Rule:** Study failures, not survivors. YC's public data is survivorship-biased. Interview the dead.

### B4. Taleb Barbell / Convexity
- **Study:** Taleb, *Antifragile* (2012); *Fooled by Randomness*.
- **Finding:** 85–90% ultra-safe + 10–15% maximum-convex bets dominates medium-risk allocation under fat tails.
- **Rule:** For $10k→$10M, run barbell: safe cashflow business (Polar.sh recurring) + convex bets (OSINT product launches, viral distribution).

### B5. UCB1 Exploration Bonus
- **Formula:** UCB1(arm i) = μᵢ + √(2 ln n / nᵢ) — Auer, Cesa-Bianchi, Fischer (2002).
- **Finding:** Logarithmic regret bound. Provably optimal explore/exploit tradeoff.
- **Rule:** Under-tested product ideas get an exploration bonus. Don't kill a channel with <30 samples.

### B6. Dyson Sequential-Search Math
- **Study:** Freeman Dyson (1943), RAF Bomber Command operational research.
- **Finding:** Optimal search sweep width depends on √(target-density × detection-probability). Small changes → large yield.
- **Rule:** Product-market-fit search: widen sweep (more channels, cheaper tests) before deepening any single channel.

### B7. Pivot as Real Option
- **Study:** Dixit & Pindyck, *Investment Under Uncertainty* (1994); McGrath, *Discovery-Driven Growth*.
- **Finding:** Value of pivot option ∝ σ·√t. Higher uncertainty → higher option value → **delay irreversible commitments.**
- **Rule:** Keep code modular, keep contracts short, keep the pivot cheap. The option is worth more than the plan.

### B8. Kelly Criterion (bounded)
- **Formula:** f\* = (bp − q)/b, capped at f\*/4 (fractional Kelly) for parameter uncertainty.
- **Finding:** Full Kelly maximizes log-growth; fractional Kelly survives estimation error.
- **Rule:** Bet fractional Kelly on high-conviction product bets. Never full Kelly — you don't know p.

---

## Section C — Chatterings Formalized (Folk Wisdom → Laws)

### C1. Goodhart's Law
> "When a measure becomes a target, it ceases to be a good measure." — Goodhart (1975), Strathern (1997).

**Formalization:** For metric M optimized as target T, corr(M, underlying_value) → 0 as optimization pressure → ∞.
**Application:** Never compensate on a proxy metric. NPS, MRR-only, GitHub stars all Goodhart under pressure.

### C2. Lindy Effect
> Life expectancy of non-perishable is proportional to current age.

**Formalization:** E[remaining_life | age=t] ≈ t for power-law-distributed lifetimes.
**Application:** Bet on 20-year-old formats (email, RSS, SQL, plain-text) over 2-year-old ones (frameworks du jour).

### C3. Brooks's Law
> "Adding manpower to a late software project makes it later."

**Formalization:** Communication overhead = n(n−1)/2. Ramp-up cost > marginal output for late additions.
**Application:** Solo/duo shipping beats team-of-8 for $10k→$100k MRR phase.

### C4. Parkinson's Law
> "Work expands to fill the time available."

**Formalization:** Given deadline D and minimum-viable-effort E, actual effort → D regardless of E.
**Application:** Aggressive timeboxing. 1-week product sprints. Ship ugly.

### C5. Hofstadter's Law
> "It always takes longer than you expect, even when you take into account Hofstadter's Law."

**Formalization:** E[T_actual] > E[T_estimated] even under recursive correction, due to unknown-unknowns.
**Application:** Multiply estimates by π (empirical software constant). Timebox, don't estimate.

### C6. Cunningham's Law
> "The best way to get the right answer on the internet is not to ask a question; it's to post the wrong answer."

**Formalization:** Correction-cost < answering-cost → higher response rate to wrong claims than to questions.
**Application:** Ship opinionated wrong-ish content. Iterate on corrections. Faster than surveys.

### C7. K-factor (Viral Coefficient)
- **Formula:** K = i · c, where i = invitations sent per user, c = conversion rate per invitation.
- **Rule:** K > 1 → viral growth. K ≈ 0.5 with 3-day cycle time still beats paid CAC at scale.
- **Underdog use:** Optimize cycle time, not just K. Cycle time is the exponent.

---

## Section D — Gaps (Explicit Missing Formulas → WR-4484 Invention Targets)

These are **known unknowns.** Each is a work item for the BNAT invention loop.

### D1. **Underdog Composite Index** — `[CONSTRUCTED, unbacktested]`
Proposed: `UCI = w₁·(1-market_share) + w₂·convexity + w₃·pivot_optionality + w₄·distribution_asymmetry`
**Gap:** No backtest. Weights unknown. **Invention target: backtest against YC/IndieHackers exit data.**

### D2. **Time-to-Ramen-Profitability Distribution**
**Gap:** No public dataset of time-to-$10k-MRR conditional on founder inputs (hours, prior exits, capital).
**Invention target:** Scrape IndieHackers + Twitter build-in-public → fit hazard model.

### D3. **Cycle-Time-Weighted K-factor**
**Gap:** K-factor treats viral cycles as instantaneous. Real formula must integrate over cycle-time distribution.
**Invention target:** Derive K_eff = ∫ K(t)·e^(-rt) dt for discount rate r.

### D4. **Anti-fragility Metric for Product Portfolios**
**Gap:** Taleb's antifragility is qualitative. No operational metric for "portfolio gains from volatility."
**Invention target:** Define AF = d²(portfolio_value)/d(volatility)² > 0 as testable convexity measure.

### D5. **Distribution-Channel Half-Life**
**Gap:** Channels decay (SEO→AI-search, Twitter→algorithm changes, cold-email→spam filters). No formal half-life estimator.
**Invention target:** Fit exponential decay to per-channel CAC over time; publish channel half-lives quarterly.

---

## Meta

- **Review cadence:** Quarterly. Section D items graduate to sections A/B/C when backtested.
- **Contribution rule:** No entry without a named source or explicit `[CONSTRUCTED]` label.
- **Prime-directive check:** Every entry must answer *"how does this help $10k → $10M?"* Section A prevents value destruction; Section B enables asymmetric wins; Section C hardens folk intuition; Section D queues R&D.

**Labels:** wr-register, band-44xx, rev-0
