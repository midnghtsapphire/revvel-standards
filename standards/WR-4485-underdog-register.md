# WR-4485 — The Underdog Register

**Band:** 44xx (Standards / Immune System)
**Rev:** 0
**Status:** ACTIVE — catalog immune system
**Parent:** WR-4484 (BNAT invention loop)
**Closes:** #16674, #16676, #16678
**Cross-refs:** WR-4485 is the negative-knowledge index; every entry either (a) names a failure mode, (b) supplies underdog math, (c) formalizes folk wisdom, or (d) marks a gap for invention.

---

## Purpose

The Underdog Register is the catalog's **immune system**. Where the main register enumerates what works, WR-4485 enumerates:

- **What has demonstrably failed** (Section A) — with named sources so we cannot re-import broken formulas by accident.
- **What lets small actors beat large ones** (Section B) — real, peer-reviewed asymmetric math.
- **What the practitioner class already knows** but has not been formalized (Section C).
- **What is missing** (Section D) — explicit gaps wired as invention targets for the WR-4484 BNAT loop.

This register is how a $10k/month operation becomes a $10M operation without buying the losing side of every consensus trade.

---

## Section A — Failed Formulas (Negative Knowledge)

Each entry: **name → what it claimed → how it broke → named source**. Do not re-adopt without a rev bump and an explicit dominance argument over the failure mode.

| # | Formula | Claim | Failure Mode | Named Source |
|---|---------|-------|--------------|--------------|
| A1 | **Gaussian copula** (Li, 2000) | Correlated default risk is tractable via a single ρ | Tail dependence collapses to independence assumption; 2008 CDO wipeout | Salmon, *Wired* "Recipe for Disaster" (2009); MacKenzie & Spears (2014) |
| A2 | **VaR under normality** | 99% loss bounded by parametric sigma | Fat tails, non-stationarity; blew up repeatedly 1998, 2008, 2020 | Taleb, *The Black Swan* (2007); Danielsson (2002) |
| A3 | **LTCM convergence trades** | Arbitrage spreads mean-revert on a knowable schedule | Liquidity risk + leverage → forced liquidation before reversion | Lowenstein, *When Genius Failed* (2000) |
| A4 | **COCOMO / COCOMO II** | Software effort = a·KLOC^b with calibrated constants | Drift: real projects deviate 4x+ from estimate; assumptions violated in every modern stack | Boehm (1981); Kemerer (1987) empirical critique |
| A5 | **Stack ranking** (forced curve) | Ranking employees on a curve maximizes performance | Destroys collaboration, gamed to sabotage peers; abandoned by GE, Microsoft | Kwoh, *WSJ* (2012); Ovide, *WSJ* (2013) |
| A6 | **MBTI** | 16-type personality predicts job fit | Test-retest reliability ~50%; no predictive validity for job performance | Pittenger (1993); Grant (2013) |
| A7 | **NPS as causal driver** | "Would you recommend" score → revenue growth | Correlational at best; Reichheld's original study non-replicable | Keiningham et al. (2007); Schneider et al. (2008) |
| A8 | **Last-click attribution** | Credit the final touchpoint for conversion | Systematically undervalues discovery/consideration channels; distorts spend | Multiple; formalized in Berman (2018) counterfactual attribution |

**Rule:** if a proposal in the main register reduces to one of A1–A8 under substitution, it is auto-rejected pending explicit dominance argument.

---

## Section B — Underdog Math (Real Asymmetric Wins)

Each entry: **result → mechanism → source → applicability**. These are the tools that let the small side win when the big side has more resources.

### B1. Arreguin-Toft asymmetric-conflict win rates
- **Result:** In asymmetric conflicts 1800–1998, the weaker side wins ~28% overall — but ~63% when it adopts an *opposite strategy* to the stronger side.
- **Mechanism:** Strategic mismatch dominates resource mismatch.
- **Source:** Arreguin-Toft, *How the Weak Win Wars* (2001, *International Security*).
- **Applicability:** Product/GTM strategy — if a $10B incumbent plays direct, play indirect; if they play indirect, play direct.

### B2. Pulled-goalie variance timing
- **Result:** Optimal pulled-goalie time is ~6:10 remaining down one, not the traditional ~1:00 — because variance-injection value compounds with time left.
- **Mechanism:** When behind, increase variance early; the losing-more downside is bounded, the tying-upside is not.
- **Source:** Beaudoin & Swartz, *J. Quantitative Analysis in Sports* (2010).
- **Applicability:** When behind on any metric with a hard deadline, inject variance *early*, not late. Late-stage hail-marys are mathematically dominated.

### B3. Wald survivorship correction
- **Result:** Reinforce the planes that come back *without* holes where you see holes on returners — because non-returners were hit there.
- **Mechanism:** Conditioning on survival inverts the naive signal.
- **Source:** Wald, Statistical Research Group memos (1943); Mangel & Samaniego (1984).
- **Applicability:** Every "lessons from successful X" study is Wald-broken unless it samples failures too.

### B4. Taleb barbell / convexity
- **Result:** 90% in maximally-safe + 10% in maximally-convex dominates 100% in medium-risk, when payoffs are fat-tailed.
- **Mechanism:** Bounded downside + unbounded upside > symmetric bet.
- **Source:** Taleb, *Antifragile* (2012); formal in *Silent Risk* (2015).
- **Applicability:** Capital allocation for a $10k → $10M ramp: 90% into cash-flow certainty (Polar.sh recurring), 10% into asymmetric bets (new OSINT verticals).

### B5. UCB1 exploration bonus
- **Result:** Optimal bandit policy: pick arm maximizing μ̂ᵢ + √(2 ln n / nᵢ).
- **Mechanism:** Exploration bonus shrinks as evidence accumulates; guarantees O(log n) regret.
- **Source:** Auer, Cesa-Bianchi, Fischer (2002).
- **Applicability:** Product pipeline — do not fully exploit the current winner; reserve √(2 ln n / nᵢ) attention for the least-tested product line.

### B6. Dyson sequential-search math
- **Result:** Optimal search order over N options with cost cᵢ and success prob pᵢ is by pᵢ/cᵢ descending (Gittins-flavored).
- **Mechanism:** Ratio ordering dominates any fixed schedule under independence.
- **Source:** Freeman Dyson wartime bomber-search memo (RAF, 1943); generalized in Gittins (1979).
- **Applicability:** Customer-discovery interviews, GitHub sponsor prospecting — order by (conversion prob / contact cost).

### B7. Pivot-as-real-option
- **Result:** A pivotable venture is worth strictly more than its expected DCF by the value of the option to pivot; Black-Scholes-analogous pricing applies.
- **Mechanism:** Optionality has positive value under uncertainty; ignoring it under-prices resilient plans.
- **Source:** Dixit & Pindyck, *Investment Under Uncertainty* (1994); McGrath (1999) applied to strategy.
- **Applicability:** Budget the *cost of maintaining pivot capacity* (modularity, low burn, kill criteria) — it is not overhead, it is premium paid for the option.

---

## Section C — Chatterings Formalized (Folk Wisdom → Math)

Each entry: **name → informal statement → formal statement → operational rule**.

### C1. Goodhart's Law
- **Informal:** "When a measure becomes a target, it ceases to be a good measure."
- **Formal:** For any statistic S correlated with goal G via mechanism M, optimizing S under agent pressure induces divergence in M such that ∂G/∂S → 0 or flips sign.
- **Source:** Goodhart (1975); Strathern (1997) restatement.
- **Operational rule:** No single KPI drives compensation; always pair with a *counter-metric* that catches the gaming vector.

### C2. Lindy Effect
- **Informal:** "For non-perishable things, expected remaining life is proportional to current age."
- **Formal:** E[T_remaining | T_survived = t] ∝ t under Pareto-tailed lifetime distribution.
- **Source:** Mandelbrot (1982); Taleb (2012) formalization.
- **Operational rule:** Prefer 20-year-old tools/formats over 2-year-old ones for infrastructure decisions. Reverse for consumer-taste decisions.

### C3. Brooks's Law
- **Informal:** "Adding manpower to a late software project makes it later."
- **Formal:** Communication overhead grows as n(n−1)/2; onboarding cost is front-loaded; net productivity is negative until t > t_onboard.
- **Source:** Brooks, *The Mythical Man-Month* (1975).
- **Operational rule:** Never scale headcount to hit a deadline. Scale scope down or slip.

### C4. Parkinson's Law
- **Informal:** "Work expands to fill the time available."
- **Formal:** Given slack s and deadline d, delivered scope grows monotonically in d regardless of intrinsic scope.
- **Source:** Parkinson, *The Economist* (1955).
- **Operational rule:** Compress deadlines by 40% of first estimate; re-expand only on evidence.

### C5. Hofstadter's Law
- **Informal:** "It always takes longer than you expect, even when you take into account Hofstadter's Law."
- **Formal:** Estimate distribution is log-normal with systematic right-tail; recursion of correction converges slowly.
- **Source:** Hofstadter, *Gödel, Escher, Bach* (1979).
- **Operational rule:** Multiply estimates by π for user-facing commitments; by e for internal planning.

### C6. Cunningham's Law
- **Informal:** "The best way to get the right answer on the internet is not to ask a question but to post the wrong answer."
- **Formal:** Correction-motivation > help-motivation in most online populations; expected response quality is higher for provocative posts than for interrogative ones.
- **Source:** Attributed to Ward Cunningham; empirically visible in Stack Overflow answer-vs-question latency.
- **Operational rule:** For market research, publish a strong wrong claim, not a survey.

### C7. K-factor (viral)
- **Informal:** "Each user brings K new users."
- **Formal:** K = i · c, where i = invites/user, c = conversion rate; sustained growth requires K > 1 with cycle time τ shorter than churn half-life.
- **Source:** Skok, Draper, and epidemiological SIR literature.
- **Operational rule:** Report K and τ together; K alone is Goodhart-vulnerable (see C1).

---

## Section D — Gaps (Invention Targets for WR-4484 BNAT Loop)

These are the **five explicitly-missing formulas** that this register needs but does not yet have. Each is wired as a work item for the WR-4484 invention loop. Any adoption is marked **CONSTRUCTED** until backtested against out-of-sample data.

### D1. **The Underdog Composite** (CONSTRUCTED — not yet backtested)
- **Need:** A single scalar U ∈ [0,1] estimating an underdog's win probability given (resource ratio r, strategy-mismatch m, time-horizon τ, optionality Ω).
- **Provisional form:** U = σ(β₀ + β₁·log(1/r) + β₂·m + β₃·log(τ) + β₄·Ω) — logistic in log-resource-inverse, strategy mismatch (B1), time (B2), and optionality (B7).
- **Status:** CONSTRUCTED. No backtest yet. Do not use for capital allocation.
- **BNAT target:** Backtest against Arreguin-Toft dataset + startup-vs-incumbent outcomes 2000–2020.

### D2. **Failure-mode dominance test**
- **Need:** A formal predicate `dominates(new_formula, failure_A_i)` returning true only when the new formula does not reduce to A_i under substitution.
- **Provisional form:** Symbolic reduction + assumption-set diff; needs formal grammar for register entries.
- **BNAT target:** Grammar spec + automated checker as CI gate on register additions.

### D3. **Chattering-to-formal conversion rate**
- **Need:** Meta-metric on how many folk laws in Section C survive formalization vs. get falsified.
- **Provisional form:** C_survive / C_attempted, tracked per rev.
- **BNAT target:** Retrospective on rev-0 → rev-N of Section C to establish baseline.

### D4. **Anti-Wald sampling protocol**
- **Need:** Standard procedure for including failures in every case study we cite, quantifying survivorship bias correction.
- **Provisional form:** Require failure-set citation ratio ≥ 1:3 (failures:successes) for any generalization claim.
- **BNAT target:** Audit existing WR entries against this ratio; publish shortfall.

### D5. **Convexity budget for the $10k→$10M ramp**
- **Need:** Formula assigning % of monthly revenue to convex bets (per B4 barbell), varying with current MRR and runway.
- **Provisional form:** convex_frac = min(0.10 + 0.05·log₁₀(MRR/10k), 0.30) — grows from 10% at $10k MRR to 30% ceiling.
- **Status:** CONSTRUCTED. Coefficients are guesses.
- **BNAT target:** Calibrate against startup outcome data by MRR band.

---

## Review Focus

Per the issue: **Section D is the primary review target.** Those five gaps become the invention loop's first work queue. Reviewers should:

1. Confirm each D-item is genuinely missing (not already solved in another WR).
2. Challenge the provisional forms — every CONSTRUCTED label is an invitation to falsify.
3. Propose additional gaps. This list is explicitly non-exhaustive.

---

## Change Log

- **rev-0** — Initial register. Sections A (8 failures), B (7 underdog results), C (7 chatterings), D (5 gaps). All D-items marked CONSTRUCTED where provisional forms are given.
- **rev-0 patch** — Header normalized: Band set to Standards / Immune System (function in Band, flavor in Status); Closes line restored from agent-fallback/issue-16681.
