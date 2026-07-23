# WR-4485 — The Underdog Register

**Band:** 44xx (Meta / Immune System)
**Rev:** 0
**Status:** Living document
**Related:** WR-4484 (BNAT invention loop)

> The catalog's immune system: named failed formulas, real underdog math, formalized folklore, and explicit gaps.

---

## A. Failed Formulas (Negative Knowledge)

Formulas that shipped, scaled, and broke. Kept here so we stop reinventing them.

| # | Formula | Domain | Source of failure | Named lesson |
|---|---------|--------|-------------------|--------------|
| A1 | **Gaussian copula** (Li, 2000) | Credit derivatives | 2008 GFC; correlation → 1 in tails | Tail dependence ≠ linear correlation |
| A2 | **VaR under normality** | Risk management | LTCM 1998; repeated blowups | Fat tails eat Gaussian risk budgets |
| A3 | **LTCM convergence trades** | Hedge funds | 1998 collapse | Leverage × illiquidity = ruin, regardless of edge |
| A4 | **COCOMO / function-point estimation** | Software PM | Consistent 2–4× drift | Estimation is not measurement; Hofstadter applies |
| A5 | **Stack ranking (rank-and-yank)** | HR / org design | Microsoft lost decade, GE reversal | Optimizes intra-team competition, kills collaboration |
| A6 | **MBTI** | Hiring / teaming | Test-retest r ≈ 0.5; no predictive validity | Typology ≠ trait; forced dichotomies destroy signal |
| A7 | **NPS as causal driver** | Growth / CX | Correlational at best; often noise | "Would you recommend" ≠ growth mechanism |
| A8 | **Last-click attribution** | Marketing | Systematically over-credits bottom-funnel | Path dependence ≠ causation |

**Rule:** Before proposing a metric or model, check whether it's on this list or a variant of it.

---

## B. Underdog Math (Positive Knowledge)

Real, cited results that give structural advantage to the smaller / later / weaker player.

### B1. Arreguin-Toft asymmetric conflict
- **Source:** Arreguin-Toft, *How the Weak Win Wars* (2001, 2005).
- **Result:** When weaker side uses indirect strategy vs. stronger side's direct strategy, weak-side win rate ≈ 63%. When both play direct, weak wins ~24%.
- **Application:** Never fight the incumbent's game. Change the game.

### B2. Pulled-goalie variance timing
- **Source:** Beaudoin & Swartz (2010), *Journal of Quantitative Analysis in Sports*.
- **Result:** Optimal pull time is far earlier than intuition — because trailing team must *increase variance*, not expected value.
- **Application:** When behind, seek high-variance moves; when ahead, damp variance. This is not "risk-taking" — it's variance management conditional on position.

### B3. Wald survivorship correction
- **Source:** Abraham Wald, WWII, returning-bomber armor study.
- **Result:** Armor the places with *no* bullet holes on returning planes — those are where the downed planes were hit.
- **Application:** Study failures, not just successes. Success surveys are systematically biased.

### B4. Taleb barbell / convexity
- **Source:** Taleb, *Antifragile* (2012).
- **Result:** Portfolio of ~85–90% ultra-safe + ~10–15% high-convexity bets dominates the medium-risk middle under fat tails.
- **Application:** Underdogs cannot afford middle-risk. Barbell explicitly.

### B5. UCB1 exploration bonus
- **Source:** Auer, Cesa-Bianchi, Fischer (2002).
- **Formula:** choose arm i maximizing x̄_i + √(2 ln n / n_i).
- **Application:** Under-explored options get an explicit bonus. Underdogs *are* the under-explored arm; incumbents systematically under-weight them.

### B6. Dyson sequential-search
- **Source:** Freeman Dyson, sequential-analysis work; also Wald sequential probability ratio test.
- **Result:** Optimal stopping rules beat fixed-sample designs when cost of continuation is nontrivial.
- **Application:** Kill projects on evidence, not on calendar.

### B7. Pivot-as-real-option
- **Source:** Dixit & Pindyck, *Investment Under Uncertainty* (1994); McGrath, real-options reasoning.
- **Result:** Value of a project = intrinsic value + option value of pivoting. Under high uncertainty, option value dominates.
- **Application:** Underdogs have *more* pivot optionality than incumbents (less legacy). Price it in.

---

## C. Chatterings Formalized

Folk wisdom, made precise.

| # | Name | Formal statement |
|---|------|------------------|
| C1 | **Goodhart's Law** | When a measure becomes a target, it ceases to be a good measure. (Strathern, 1997 restatement.) |
| C2 | **Lindy Effect** | For non-perishable items, expected remaining life ∝ current age. |
| C3 | **Brooks's Law** | Adding manpower to a late software project makes it later. (Communication overhead: n(n−1)/2.) |
| C4 | **Parkinson's Law** | Work expands to fill the time available. |
| C5 | **Hofstadter's Law** | It always takes longer than you expect, even when you take into account Hofstadter's Law. |
| C6 | **Cunningham's Law** | The fastest way to get the right answer online is to post the wrong one. |
| C7 | **K-factor (viral)** | K = i · c, where i = invites per user, c = conversion rate. K > 1 ⇒ viral growth; K < 1 ⇒ decay. |

---

## D. Gaps — Explicitly Missing Formulas

These are open. Each is wired as a **WR-4484 BNAT invention target**.

### D1. The Underdog Composite (CONSTRUCTED — not yet backtested)

```
Underdog_Score = w1 · IndirectStrategyFit
              + w2 · ConvexityRatio
              + w3 · UnderExplorationBonus (UCB1-style)
              + w4 · PivotOptionality
              − w5 · RuinProbability
```

- **Status:** CONSTRUCTED. Weights unfit. No backtest.
- **Invention target:** fit weights against a labeled set of historical underdog wins/losses; validate out-of-sample.

### D2. Variance-timing rule for non-sports domains
- Beaudoin & Swartz gives us hockey. **Gap:** a general "when-behind, increase variance by how much" rule for startups, careers, campaigns.
- **Invention target:** derive from position-conditional expected-value/variance frontier.

### D3. Anti-Goodhart metric design
- **Gap:** a constructive procedure to design metrics that *resist* being gamed, not just a warning.
- **Invention target:** possibly multi-metric adversarial design, or metric rotation (Lindy-weighted).

### D4. Chatterings-to-formulas pipeline
- **Gap:** systematic way to take a folk saying → falsifiable formal claim → test.
- **Invention target:** template + at least 3 worked examples beyond section C.

### D5. Failed-formula early-warning
- **Gap:** how do we detect an A-list failure *before* it ships and blows up?
- **Invention target:** checklist of structural warning signs (tail assumption, single-point-of-failure, incentive inversion, measurement collapse under target).

---

## Review focus

Section D. These five gaps are the invention loop's first work queue. Every gap closed here retires a risk in the $10k→$10M path.

---

*Labels: wr-register, band-44xx, rev-0*
