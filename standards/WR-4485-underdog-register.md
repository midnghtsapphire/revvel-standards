# WR-4485 — The Underdog Register

**Band:** 44xx (Register / Meta-catalog)
**Rev:** 0
**Status:** DRAFT
**Parent:** WR-4484 (BNAT invention loop)
**Role:** Catalog immune system — negative knowledge, comeback math, and explicit gap-labeling.

---

## Purpose

Most registers catalog *what works*. WR-4485 catalogs:

1. **What has publicly, expensively failed** (Section A) — so we stop reinventing dead formulas.
2. **How underdogs actually win** (Section B) — the math of asymmetric advantage, variance timing, and survivorship-corrected inference.
3. **Folk laws formalized** (Section C) — chatterings promoted to first-class citizens with sources.
4. **Explicit gaps** (Section D) — five missing formulas, each wired as a BNAT invention target for WR-4484.

This is the **prime directive's guardrail**: $10k/mo → $10M in 3y depends on not repeating LTCM, not stack-ranking our own team, and knowing when to pull the goalie.

---

## Section A — Failed Formulas (Negative Knowledge)

Each entry: **Name → What it claimed → How it failed → Named source → Do-not-use scope.**

### A1. Gaussian copula (Li, 2000)
- **Claim:** Correlated default risk across CDO tranches reduces to a single ρ.
- **Failure:** 2008 GFC. Tail-dependence undercounted by orders of magnitude; ρ was calibrated on a benign regime.
- **Source:** Li, D. X. (2000). *On Default Correlation: A Copula Function Approach.* J. Fixed Income. See also Salmon, F. (2009), Wired, *Recipe for Disaster*.
- **Do-not-use:** Any multi-asset tail-risk model where inputs are calibrated on <1 full credit cycle.

### A2. VaR under normality (RiskMetrics, 1994)
- **Claim:** 95%/99% loss bounds via Gaussian returns.
- **Failure:** Ignores fat tails, autocorrelation, regime switches. Systematically underestimates crisis losses.
- **Source:** Taleb, N. N. (2007). *The Black Swan.* Also Danielsson, J. (2002). *The Emperor Has No Clothes.*
- **Do-not-use:** Position sizing under stress. Use expected shortfall + stress scenarios instead.

### A3. LTCM leverage model (1998)
- **Claim:** Convergence trades on historically stable spreads are near-riskless at high leverage.
- **Failure:** Russia default → correlated liquidity crunch → 25:1 leverage wiped $4.6B in weeks.
- **Source:** Lowenstein, R. (2000). *When Genius Failed.*
- **Do-not-use:** Leverage > 5x on any "stable" spread without liquidity-shock stress test.

### A4. COCOMO / effort-from-LOC drift
- **Claim:** Software effort predictable from lines-of-code estimate.
- **Failure:** LOC is an output, not an input. Estimates drift 2–4x. Encourages verbose code.
- **Source:** Boehm, B. (1981). *Software Engineering Economics.* Critique: DeMarco, T. (1982); Fowler, M. (2003) *Cannot Measure Productivity.*
- **Do-not-use:** Any fixed-bid quote. Use reference-class forecasting (Flyvbjerg) instead.

### A5. Stack ranking / forced distribution (Welch, GE ~1980s–2013)
- **Claim:** Firing bottom 10% annually raises team quality.
- **Failure:** Destroys collaboration, incentivizes sabotage, punishes teams that hire well. Microsoft abandoned 2013.
- **Source:** Kwoh, L. (2012), WSJ, *Rank and Yank Retains Vocal Fans.* Ogbonnaya et al. (2018), *Human Resource Management Journal.*
- **Do-not-use:** Any performance system on teams <50 where variance is dominated by role fit.

### A6. MBTI as selection instrument
- **Claim:** 16 personality types predict job fit.
- **Failure:** Test-retest reliability ~50% at 5 weeks. No predictive validity for performance. Not peer-reviewed by original authors.
- **Source:** Pittenger, D. J. (1993). *The Utility of the Myers-Briggs Type Indicator.* Review of Educational Research.
- **Do-not-use:** Hiring, team composition, role assignment. (Fine as icebreaker.)

### A7. NPS as causal metric
- **Claim:** Net Promoter Score predicts growth.
- **Failure:** Correlational at best; single-question instrument; heavily gameable; doesn't survive replication.
- **Source:** Keiningham, T. et al. (2007). *A Longitudinal Examination of Net Promoter and Firm Revenue Growth.* J. Marketing.
- **Do-not-use:** As a target metric or exec KPI. Use cohort retention + revenue-per-cohort.

### A8. Last-click attribution
- **Claim:** Marketing credit belongs to the final touchpoint.
- **Failure:** Systematically overweights branded search and retargeting; kills top-of-funnel investment.
- **Source:** Berman, R. (2018). *Beyond the Last Touch: Attribution in Online Advertising.* Marketing Science.
- **Do-not-use:** Budget allocation. Use incrementality tests (geo holdouts, PSA ghost ads).

---

## Section B — Underdog Math (Comeback Formulas With Sources)

### B1. Arreguin-Toft asymmetric-conflict win rates
- **Finding:** In asymmetric conflicts (1800–2003), when the weaker side adopts an *indirect* strategy against a *direct* strong-side strategy, weak-side win rate is ~63%. Same-strategy matchups favor the strong side ~76%.
- **Formula:** P(weak wins | strategy mismatch) ≈ 0.63.
- **Source:** Arreguin-Toft, I. (2001). *How the Weak Win Wars.* International Security 26(1).
- **Use:** Bootstrapped bootstrap. Never compete direct-vs-direct with incumbents. Change the axis.

### B2. Pulled-goalie variance timing (Beaudoin & Swartz)
- **Finding:** Optimal pull time is far earlier than intuition — often ~3+ minutes remaining when down one, and much earlier when down two.
- **Formula:** Pull when marginal Δ P(tie) from adding attacker > marginal Δ P(empty-net loss). In practice: 2:30–3:00 down-one; 5:00+ down-two.
- **Source:** Beaudoin, D. & Swartz, T. B. (2010). *Strategies for Pulling the Goalie in Hockey.* The American Statistician.
- **Use:** When behind, add variance *earlier* than feels safe. Runway-burn decisions, contested launches.

### B3. Wald survivorship correction
- **Finding:** Study the missing data, not the returning data. Bombers that returned had *no* damage on engines — because engine-hit bombers didn't return.
- **Formula:** Reinforce where survivors are *unharmed*, not where they're damaged.
- **Source:** Wald, A. (1943, declassified). *A Method of Estimating Plane Vulnerability Based on Damage of Survivors.* SRG Memo.
- **Use:** Churn analysis, competitor teardowns, YC-batch post-mortems. Always ask: *who's not in this dataset?*

### B4. Taleb barbell / convexity
- **Finding:** Portfolio of extreme-safe + extreme-risky dominates medium-risk under fat tails.
- **Formula:** 85–90% in cash/T-bills, 10–15% in convex bets (options, moonshots). Loss floored, upside unbounded.
- **Source:** Taleb, N. N. (2012). *Antifragile.* Also Taleb & Douady (2013). *Mathematical Definition of Fragility.*
- **Use:** Cash reserves + one asymmetric product bet at a time. Never middle-risk ("safe" B2B SaaS clones).

### B5. UCB1 exploration bonus
- **Formula:** Choose arm maximizing `x̄_i + sqrt(2 ln n / n_i)`. Under-tried arms get a bonus proportional to sqrt of neglect.
- **Source:** Auer, P., Cesa-Bianchi, N., Fischer, P. (2002). *Finite-time Analysis of the Multiarmed Bandit Problem.* Machine Learning 47.
- **Use:** Product/channel selection under uncertainty. Formalizes "try the weird one occasionally."

### B6. Dyson sequential-search math
- **Finding:** In sequential search with bounded observations, optimal stopping ≈ 37% (1/e). But under *asymmetric payoff* (huge upside, small downside per look), extend search dramatically.
- **Source:** Dyson, F. (1943). *A Method of Searching for Submarines.* RAF Coastal Command / Ops Research. Related: Ferguson, T. *Who Solved the Secretary Problem?*
- **Use:** Founder/hire/product-market search. Convex payoffs → keep looking past the 37% mark.

### B7. Pivot as real option
- **Formula:** Value of a startup = value-in-place + option-to-pivot. Real-option value = f(volatility, time-to-decision, sunk cost recoverable).
- **Source:** Dixit, A. K. & Pindyck, R. S. (1994). *Investment Under Uncertainty.* Princeton.
- **Use:** Don't kill projects with residual optionality. Distinguish *sunk* from *salvageable*.

---

## Section C — Chatterings Formalized (Folk Laws With Sources)

### C1. Goodhart's Law
- **Statement:** *When a measure becomes a target, it ceases to be a good measure.*
- **Source:** Goodhart, C. (1975). *Problems of Monetary Management.* Strathern (1997) sharpened wording.
- **Trigger:** Any KPI review. Check the metric hasn't been optimized against reality.

### C2. Lindy Effect
- **Statement:** For non-perishable ideas, expected remaining life ∝ current age.
- **Source:** Mandelbrot, B. (1982); Taleb, N. N. (2012) *Antifragile.*
- **Trigger:** Choosing tools/libraries/formats. Prefer 20-year-old over 2-year-old, ceteris paribus.

### C3. Brooks's Law
- **Statement:** *Adding manpower to a late software project makes it later.*
- **Source:** Brooks, F. P. (1975). *The Mythical Man-Month.*
- **Trigger:** Every hiring decision made under deadline pressure.

### C4. Parkinson's Law
- **Statement:** *Work expands to fill the time available.*
- **Source:** Parkinson, C. N. (1955). *The Economist.*
- **Trigger:** Sprint sizing. Compress timelines by 30% by default.

### C5. Hofstadter's Law
- **Statement:** *It always takes longer than you expect, even when you take Hofstadter's Law into account.*
- **Source:** Hofstadter, D. (1979). *Gödel, Escher, Bach.*
- **Trigger:** Reference-class forecast; double the estimate; then add buffer.

### C6. Cunningham's Law
- **Statement:** *The best way to get the right answer on the internet is not to ask a question; it's to post the wrong answer.*
- **Source:** Attr. Ward Cunningham; popularized on Wikipedia talk pages.
- **Trigger:** Cold-outreach and community-building. Post a strong-but-flawed claim; harvest corrections.

### C7. K-factor (viral coefficient)
- **Formula:** K = i × c, where i = invites per user, c = conversion per invite. Sustainable virality iff K > 1 with cycle time < churn time.
- **Source:** Skok, D. (2010s); origin in epidemiology (R₀).
- **Trigger:** Every growth model. Most "viral" products have K ≈ 0.3 and rely on paid.

---

## Section D — Explicit Gaps (BNAT Invention Targets)

These formulas **do not yet exist** in usable form. Each is queued into WR-4484's invention loop. Label = `CONSTRUCTED` until backtested on ≥3 independent datasets.

### D1. GAP — Underdog Composite Index
- **Need:** A single scalar U ∈ [0,1] combining B1–B7 signals to rank asymmetric opportunities.
- **Sketch:** `U = w₁·strategy_mismatch + w₂·convexity + w₃·variance_headroom + w₄·survivorship_adjust + w₅·option_value` — weights TBD.
- **Status:** `CONSTRUCTED — awaiting backtest`.
- **Backtest target:** YC W15–W20 cohorts; label survivors vs shutdowns; check U's AUC.
- **Owner:** WR-4484 loop, priority 1.

### D2. GAP — Regret-bounded pivot timing
- **Need:** Closed-form for *when* to exercise the pivot real-option (B7) given cash runway, learning rate, and market volatility.
- **Sketch:** Extend Dixit-Pindyck with explicit learning-rate term; solve for critical threshold on evidence-quality index.
- **Status:** MISSING.
- **Owner:** WR-4484 loop, priority 2.

### D3. GAP — Anti-Goodhart metric family
- **Need:** A construction that yields KPIs *provably* robust to gaming up to horizon T.
- **Sketch:** Adversarial-robust metric = metric − λ·(gameability_score). Gameability_score itself needs a definition.
- **Status:** MISSING. Related: Manheim & Garrabrant (2018) *Categorizing Variants of Goodhart's Law* is diagnostic, not constructive.
- **Owner:** WR-4484 loop, priority 3.

### D4. GAP — Founder-market fit prior
- **Need:** Bayesian prior for P(success | founder_history, market_conditions) that avoids A6-style pseudoscience.
- **Sketch:** Use only observable, replicable inputs (prior-startup outcomes, domain tenure, distribution access). Explicitly exclude personality tests.
- **Status:** MISSING.
- **Owner:** WR-4484 loop, priority 4.

### D5. GAP — Negative-knowledge decay function
- **Need:** How long does an A-list failure (Section A) remain binding? Gaussian copula: probably forever. NPS: maybe re-examinable in 20 years?
- **Sketch:** Half-life function of (regime-change frequency, dataset renewal, mechanism-vs-correlation).
- **Status:** MISSING.
- **Owner:** WR-4484 loop, priority 5.

---

## Wiring Into WR-4484 (BNAT Invention Loop)

Each D-gap enters the loop as:

```
BNAT-target:
  id: WR-4485-D{n}
  status: CONSTRUCTED | MISSING
  backtest_required: true
  min_independent_datasets: 3
  promotion_criteria: AUC > 0.65 OR calibration_error < 10%
  demotion_criteria: fails on any single held-out regime
```

A gap is only promoted from `CONSTRUCTED` to a numbered formula (e.g., B8) when it clears its backtest gate. Failed candidates get logged into Section A as new negative knowledge.

---

## Prime-Directive Linkage

- **Phase 1 ($10k/mo):** Use B1 (Arreguin-Toft) + B4 (barbell) — pick one indirect wedge (Polar.sh + OSINT niche), keep 90% cash.
- **Phase 2 ($30k/mo):** Use B5 (UCB1) — explicit exploration budget of 15% for weird channels.
- **Phase 3 ($100k/mo):** Use B2 (goalie pull) — if behind plan by month 24, add variance early, not late.
- **Phase 4 ($10M):** Use B7 (pivot as option) — preserve optionality; don't lock in a single product line.
- **Always:** Section A is a checklist before any model, KPI, or hiring decision ships.

---

## Review Focus

Section D. These five gaps are the invention loop's first work queue. Everything else in this register is citation-and-curation; Section D is where new formulas are supposed to be born.

---

**Labels:** wr-register, band-44xx, rev-0
**Closes:** #16674
