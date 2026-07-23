# WR-4485 — The Underdog Register

**Band:** 44xx (Anti-Patterns / Negative Knowledge / Asymmetric Advantage)
**Revision:** 0
**Status:** Active
**Related:** WR-4484 (BNAT invention loop)
**Labels:** wr-register, band-44xx, rev-0

> The catalog's immune system. Failed formulas we won't repeat, underdog math
> that actually works, formalized folk wisdom, and explicit gaps that become
> the invention loop's work queue.

---

## A. Failed Formulas (Negative Knowledge)

Named sources, named failure modes. These are **do-not-use** absent explicit
justification and a documented mitigation.

| # | Formula / Practice | Domain | Failure Mode | Named Source / Post-mortem |
|---|---|---|---|---|
| A1 | **Gaussian copula** (Li, 2000) | Credit correlation | Assumed elliptical tail dependence; underpriced joint defaults | Salmon, *Wired* (2009) "Recipe for Disaster"; MacKenzie & Spears (2014) |
| A2 | **VaR under normality** | Market risk | Fat tails, tail dependence, endogenous liquidity spirals | Taleb, *The Black Swan* (2007); Danielsson (2002) |
| A3 | **LTCM convergence trades** | Fixed-income arb | Leverage × correlated tail × funding illiquidity | Lowenstein, *When Genius Failed* (2000) |
| A4 | **COCOMO / COCOMO-II point estimates** | Software estimation | Ignores requirement volatility; drifts 2-4× on novel work | Boehm's own retrospectives; Molokken-Ostvold survey (2003) |
| A5 | **Stack ranking (rank-and-yank)** | People ops | Destroys cooperation, gameable, kills variance the org needs | GE post-Welch reversal (2015); Microsoft abandonment (2013) |
| A6 | **MBTI as predictive** | Hiring / teaming | Test-retest ~50%, no criterion validity | Pittenger (1993); Grant, *Psychology Today* (2013) |
| A7 | **NPS as causal driver** | Growth | Correlational, not causal; single-number tyranny | Keiningham et al. (2007) *J. Marketing* |
| A8 | **Last-click attribution** | Marketing | Systematically overweights bottom-funnel; kills exploration | Google/Nielsen MTA studies (2013+) |
| A9 | **Beta as risk (CAPM operational)** | Portfolio construction | Empirically flat SML; ignores tail & funding risk | Fama & French (2004) retrospective |
| A10 | **Sharpe ratio for fat-tailed strategies** | Hedge fund selection | Rewards short-vol / negative-skew pretenders | Lo (2002); Madoff-era post-mortems |

**Register rule:** citing any A-item as justification requires either (a) an
explicit mitigation memo or (b) reclassification as A-with-caveats.

---

## B. Underdog Math (Asymmetric Advantage, With Sources)

Real studies, real formulas. These are the **use-when-outmatched** toolkit.

### B1. Arreguin-Toft asymmetric conflict
- **Claim:** Weak actors win ~28% of asymmetric conflicts overall; win rate
  rises to ~63% when the weak side uses an *indirect* strategy against a
  *direct* strong-side strategy.
- **Source:** Arreguin-Toft (2001) *International Security*, "How the Weak Win Wars."
- **Register use:** strategy-selection prior when resource ratio > 5:1 against.

### B2. Pulled-goalie variance timing
- **Claim:** Optimal pull time is materially earlier than convention — trailing
  by 1 goal, pull with ~2:30–3:00 left; by 2 goals, ~5:30+.
- **Source:** Beaudoin & Swartz (2010) *J. Quantitative Analysis in Sports*.
- **Register use:** template for **variance-injection when behind** — inject
  variance before expected-value math says you're dead, not after.

### B3. Wald survivorship correction
- **Claim:** Reinforce the parts of returning bombers that were *not* hit;
  hits on the returned planes are the survivable ones.
- **Source:** Wald, SRG memos (1943), reconstructed Mangel & Samaniego (1984).
- **Register use:** any "lessons from winners" study — invert to ask what
  killed the non-returners.

### B4. Taleb barbell / convexity
- **Claim:** Portfolio of extreme-safe + extreme-risky dominates the middle
  when payoffs are convex and tails are unknown.
- **Source:** Taleb, *Antifragile* (2012); *Silent Risk* (2015).
- **Register use:** capital allocation, R&D portfolio, career bets.

### B5. UCB1 exploration bonus
- **Formula:** choose arm maximizing $\bar{x}_i + \sqrt{2 \ln n / n_i}$.
- **Source:** Auer, Cesa-Bianchi, Fischer (2002) *Machine Learning*.
- **Register use:** underdog gets more exploration budget than incumbent —
  the bonus term dominates when $n_i$ is small.

### B6. Dyson sequential-search / secretary
- **Claim:** For $n$ sequential candidates with no recall, sample $n/e \approx 37\%$,
  then take next-best-so-far. Success ≈ $1/e$.
- **Source:** Dynkin (1963); Freeman (1983) survey.
- **Register use:** deal-flow, hiring, pivot-timing under one-shot constraints.

### B7. Pivot as real option
- **Claim:** Value of a pivot right = $\max(0, V_\text{new} - V_\text{current} - c_\text{switch})$
  discounted by option-lifetime volatility; Black-Scholes-Merton adapted.
- **Source:** Dixit & Pindyck, *Investment Under Uncertainty* (1994); McGrath
  (1999) *AMR* on real options in entrepreneurship.
- **Register use:** every failing bet has an embedded option; underdogs
  exercise earlier because $c_\text{switch}$ is lower.

### B8. Kelly with uncertainty haircut
- **Formula:** $f^* = (bp - q)/b$, then bet $\alpha f^*$ with $\alpha \in [0.25, 0.5]$
  when edge is estimated, not known.
- **Source:** Kelly (1956); Thorp (1969, 2006); MacLean, Thorp, Ziemba (2010).
- **Register use:** sizing bets when the underdog can't afford ruin.

---

## C. Chatterings Formalized (Folk Wisdom → Named Laws)

| # | Law | Statement | Register Use |
|---|---|---|---|
| C1 | **Goodhart** | When a measure becomes a target, it ceases to be a good measure. | Any KPI regime; NPS, OKRs, stack rank. |
| C2 | **Lindy** | Expected remaining life of a non-perishable ≈ its current age. | Tech-stack bets; "boring tech" prior. |
| C3 | **Brooks** | Adding people to a late project makes it later. | Staffing crunched projects. |
| C4 | **Parkinson** | Work expands to fill available time. | Deadlines shorter than "needed." |
| C5 | **Hofstadter** | It always takes longer than you expect, even accounting for Hofstadter's Law. | Estimation prior; multiply by e. |
| C6 | **Cunningham** | Fastest way to get the right answer is to post the wrong one. | Invention loop seeding. |
| C7 | **K-factor** | Viral coefficient; $K = i \cdot c$ (invites × conversion). | Growth diagnosis before spend. |
| C8 | **Conway** | Systems mirror the communication structure of the org that built them. | Architecture ↔ org design. |
| C9 | **Gall** | A complex system that works evolved from a simple system that worked. | Do not launch big-bang. |
| C10 | **Chesterton's Fence** | Do not remove a fence until you know why it was put up. | Legacy code / process reform. |

---

## D. Gaps — WR-4484 Invention Targets

Explicitly-labeled missing formulas. These are the invention loop's first
work queue. Each is filed as a BNAT (Best-Named-Available-Today) target.

### D1. **Underdog Composite Index** — CONSTRUCTED, unvalidated
- **Intent:** single scalar combining resource ratio, strategy-indirectness
  (per B1), option-density (per B7), and exploration budget (per B5).
- **Status:** CONSTRUCTED — no backtest. Must not be cited operationally
  until WR-4484 loop produces out-of-sample validation.
- **First backtest target:** Arreguin-Toft dataset + startup-pivot corpus.

### D2. **Convexity-adjusted Kelly for path-dependent ruin**
- **Gap:** Kelly assumes reinvestment; underdogs face path-dependent
  destruction (reputation, license, morale) not captured by log-utility.
- **Target:** closed-form or simulation-tabulated haircut $\alpha(\rho)$
  where $\rho$ = ruin-recoverability parameter.

### D3. **Variance-injection timing under bounded downside**
- **Gap:** Beaudoin-Swartz (B2) is sport-specific. General form: when should
  a bounded-loss actor inject variance given remaining time $T$ and
  expected-value gap $\Delta$?
- **Target:** $t^*(T, \Delta, \sigma_\text{available})$.

### D4. **Real-option value of a public failure**
- **Gap:** Cunningham (C6) and Wald (B3) both imply failure has informational
  value, but no pricing formula exists for *publishing* a failure vs. burying
  it.
- **Target:** $V_\text{publish} - V_\text{bury}$ as function of audience size,
  reputation stock, and correction-cost asymmetry.

### D5. **Anti-Goodhart metric-rotation schedule**
- **Gap:** Goodhart (C1) is diagnostic, not prescriptive. When should a
  measure be rotated out before it corrupts?
- **Target:** rotation cadence as function of gaming-elasticity and
  measurement-cost.

---

## Review Focus

Section D. These five gaps are the invention loop's opening work queue.
D1 is the register's own composite and is explicitly labeled CONSTRUCTED —
it is a candidate, not a claim, until backtested.

---

## Changelog

- **rev-0** — Initial register. A (10 failed formulas), B (8 underdog
  formulas with sources), C (10 formalized laws), D (5 explicit gaps wired
  to WR-4484).
