# WR-4485 — The Underdog Register

**Band:** 44xx (Meta / Register)
**Rev:** 0
**Status:** ACTIVE
**Labels:** wr-register, band-44xx, rev-0
**Related:** WR-4484 (BNAT invention loop)

> The catalog's immune system. Named failures, comeback math, and explicit gaps.
> Negative knowledge is knowledge. Sourced skepticism beats unsourced optimism.

---

## A. Failed Formulas (Negative Knowledge Register)

Models that were once canonical, deployed at scale, and demonstrably broke.
Listed with named sources so future proposals cannot re-import them silently.

| # | Formula / Model | Domain | Failure Mode | Named Source(s) |
|---|---|---|---|---|
| A1 | **Gaussian copula** (Li, 2000) | Structured credit / CDOs | Assumed tail-independence; correlations → 1 in stress; core of 2008 CDO mispricing | Salmon, *Wired* "Recipe for Disaster" (2009); MacKenzie & Spears (2014) |
| A2 | **VaR under normality** | Bank risk capital | Underestimates tail risk; encourages leverage at the cliff edge | Taleb, *The Black Swan* (2007); Danielsson (2002) |
| A3 | **LTCM convergence model** | Fixed-income arbitrage | Levered mean-reversion assuming liquid unwinds; Russia 1998 broke correlations | Lowenstein, *When Genius Failed* (2000) |
| A4 | **COCOMO / COCOMO II** (raw) | Software estimation | Effort estimates drift 2–4× on non-analogous projects; assumes stationary productivity | Jorgensen & Shepperd (2007), *TSE* systematic review |
| A5 | **Stack ranking / forced curves** | Performance mgmt (GE, MSFT) | Destroys collaboration; optimizes for visible individual output; abandoned by originators | Kwoh, *WSJ* (2012); Ovide, *WSJ* on MSFT (2013) |
| A6 | **MBTI as selection tool** | Hiring / team design | Test-retest reliability ~50%; no predictive validity for job performance | Pittenger (1993, 2005); Grant (2013) |
| A7 | **NPS as causal driver** | Growth strategy | Correlational at best; "one number" claim not replicated | Keiningham et al. (2007), *J. Marketing* |
| A8 | **Last-click attribution** | Marketing spend | Systematically over-credits bottom-funnel; kills discovery channels | Google Analytics attribution docs; Berman (2018) |

**Rule:** Any WR proposal citing A1–A8 as a primary mechanism must cite the failure literature and state the mitigation.

---

## B. Underdog Math (Comeback Formulas with Real Studies)

Empirically-grounded asymmetric strategies. Each has a named study, a mechanism, and a use-case flag.

### B1. Arreguin-Toft asymmetric-conflict win rates
- **Source:** Arreguin-Toft (2001), *International Security* 26(1); expanded in *How the Weak Win Wars* (2005).
- **Finding:** In conflicts 1800–1998, the materially weaker side won ~30% overall; when the weak side used an *indirect strategy* against a strong side using a *direct strategy*, win rate rose to ~63%.
- **Mechanism:** Strategic interaction dominates resource ratio.
- **Use case:** Market entry against incumbents — avoid the incumbent's chosen game.

### B2. Pulled-goalie variance timing
- **Source:** Beaudoin & Swartz (2010), *The Best-Laid Plans: Optimal Goalie-Pulling Strategies*, JQAS 6(1). Also Asplund (2020) NHL data update.
- **Finding:** Optimal pull time is *far earlier* than empirical practice — often 3+ minutes when down one, 6+ when down two.
- **Mechanism:** When behind, injecting variance has positive EV; the expected-goals-against cost is dominated by expected-goals-for gain.
- **Use case:** When a plan is losing, escalate variance early, not late.

### B3. Wald survivorship correction
- **Source:** Abraham Wald, SRG memoranda (1943), *A Method of Estimating Plane Vulnerability*.
- **Finding:** Armor the parts of returning planes *without* bullet holes — the holes show where planes survive being hit.
- **Mechanism:** Selection bias inverts naive inference.
- **Use case:** Studying winners without studying the graveyard produces inverted advice.

### B4. Taleb barbell / convexity
- **Source:** Taleb, *Antifragile* (2012); Taleb & Douady (2013), *Mathematical definition of fragility*.
- **Finding:** Portfolio of ~90% ultra-safe + ~10% high-convex-optionality dominates the "balanced medium-risk" middle when payoffs are fat-tailed.
- **Mechanism:** Bounded downside + unbounded upside.
- **Use case:** Product portfolio: mostly boring cashflow, a few asymmetric bets. Never the middle.

### B5. UCB1 exploration bonus
- **Source:** Auer, Cesa-Bianchi, Fischer (2002), *Machine Learning* 47.
- **Formula:** `select arm i maximizing x̄_i + sqrt(2 ln(n) / n_i)`
- **Mechanism:** Logarithmic regret bound; explicit exploration bonus for under-sampled arms.
- **Use case:** Channel allocation, feature testing — the underdog channel gets a mathematically-earned second look.

### B6. Dyson sequential-search math
- **Source:** Freeman Dyson, *A Meeting with Enrico Fermi*, Nature 427 (2004) — recounting Fermi's four-parameter-elephant critique; and Dyson's own bomber-command survivorship work (1943–45, RAF).
- **Finding:** Sequential search under attrition: expected survival time under strategy S is not average of trial outcomes; it's the product of per-trial survival probabilities. Small per-trial edges compound multiplicatively.
- **Use case:** Runway-limited startups — per-week survival probability, not average outcome, is the objective.

### B7. Pivot-as-real-option
- **Source:** Dixit & Pindyck, *Investment Under Uncertainty* (1994); McGrath (1999), *Falling forward: real options reasoning*, AMR 24(1).
- **Finding:** Under uncertainty, the option to abandon/switch has positive value; NPV that ignores it under-values exploration.
- **Mechanism:** `V_project = NPV + OptionValue(pivot) + OptionValue(abandon)`
- **Use case:** Every product bet is a call option, not a commitment. Price it that way.
**Band:** 44xx (Standards / Meta-knowledge)
**Revision:** 0
**Status:** Active
**Labels:** wr-register, band-44xx, rev-0
**Purpose:** The catalog's immune system — a curated register of failed formulas, underdog math, formalized folk wisdom, and explicit gaps.

---

## Preamble

Most knowledge bases are hagiographies: they collect what works. WR-4485 collects what *broke*, what *outperformed under asymmetry*, and — most importantly — what we **do not yet have a formula for**. The gaps in Section D are the invention loop's first work queue (see WR-4484 BNAT).

Every entry carries a **named source**. Unsourced claims are rejected. Constructed composites are labeled `CONSTRUCTED` until backtested on out-of-sample data.

---

## A. Failed Formulas (Negative Knowledge)

| ID | Formula / Model | Domain | Failure Mode | Named Source |
|----|-----------------|--------|--------------|--------------|
| A1 | **Gaussian copula** (Li, 2000) | Credit derivatives | Assumed elliptical tail dependence; underpriced joint defaults in 2008 | Salmon, *Wired* (2009); MacKenzie & Spears (2014) |
| A2 | **VaR under normality** | Risk management | Fat tails, non-stationarity; blew up in every crisis 1998–2020 | Taleb, *The Black Swan* (2007); Danielsson (2002) |
| A3 | **LTCM convergence trades** | Fixed-income arb | Leveraged mean-reversion under liquidity shock; correlation → 1 | Lowenstein, *When Genius Failed* (2000) |
| A4 | **COCOMO / COCOMO II** | Software estimation | Effort ∝ KLOC^α ignores requirements volatility, team churn, tech debt drift | Boehm (1981); critique: Kitchenham & Mendes (2009) |
| A5 | **Stack ranking** (forced distribution) | HR / performance | Assumed normal talent distribution; destroyed collaboration; killed at MSFT 2013, GE 2015 | Kwoh, *WSJ* (2012); Cappelli & Tavis, *HBR* (2016) |
| A6 | **MBTI** | Personality / hiring | Test-retest reliability ~50%; no predictive validity for job performance | Pittenger (1993); Stein & Swan (2019) |
| A7 | **NPS as causal driver** | Marketing / CX | Correlation with growth was spurious; single-item scale, no counterfactual | Keiningham et al. (2007); *Harvard Business Review* rebuttals (2019) |
| A8 | **Last-click attribution** | Digital marketing | Ignores assist paths; overweights bottom-funnel; kills brand spend ROI | Google Analytics deprecation notes (2023); Chandler-Pepelnjak (2010) |

**Rule:** No model in this table may be used as a load-bearing input to a live decision without an explicit, signed override citing an updated source.

---

## B. Underdog Math (Asymmetric Advantage)

| ID | Result | Formula / Mechanism | Named Source |
|----|--------|---------------------|--------------|
| B1 | **Asymmetric conflict win rates** | Weak actors win ~28.5% of asymmetric conflicts (1800–2003); rises to ~55% when using indirect strategy vs. direct | Arreguín-Toft, *How the Weak Win Wars* (2005) |
| B2 | **Pulled-goalie timing** | Optimal pull time is ~3:00–6:00 remaining when down one, far earlier than league practice; variance-maximization under losing state | Beaudoin & Swartz, *J. Quant. Analysis in Sports* (2010) |
| B3 | **Wald survivorship correction** | Reinforce armor where returning bombers were *not* hit (unobserved failures = signal) | Wald, *Statistical Research Group memo* (1943); Mangel & Samaniego (1984) |
| B4 | **Barbell / convexity** | Combine ~85–90% extreme-safe + ~10–15% extreme-risk; capped downside, uncapped upside; dominates middle-risk portfolio under fat tails | Taleb, *Antifragile* (2012); *Dynamic Hedging* (1997) |
| B5 | **UCB1 exploration bonus** | Choose arm maximizing x̄ᵢ + √(2 ln n / nᵢ); logarithmic regret; formal underdog-arm revisit rule | Auer, Cesa-Bianchi, Fischer (2002) |
| B6 | **Dyson sequential search** | Optimal stopping / search order under cost-per-trial and prior beliefs; small teams beat big teams by ordering cheap-informative tests first | Dyson, *Disturbing the Universe* (1979), ch. on Orion; formalized in sequential analysis, Wald (1947) |
| B7 | **Pivot as real option** | Value of pivot right = max(0, V_new − V_current − switching_cost); Black-Scholes-analog on strategic optionality | Dixit & Pindyck, *Investment Under Uncertainty* (1994); McGrath (1999) |

## C. Chatterings Formalized (Folk Laws with Teeth)

Aphorisms that survived because they encode real dynamics. Named so they can be cited.

| # | Law | Statement | Named Source |
|---|---|---|---|
| C1 | **Goodhart's Law** | When a measure becomes a target, it ceases to be a good measure. | Goodhart (1975); Strathern (1997) sharpening |
| C2 | **Lindy Effect** | For non-perishables, expected remaining life ∝ current age. | Mandelbrot (1982); Taleb (2012) formalization |
| C3 | **Brooks's Law** | Adding manpower to a late software project makes it later. | Brooks, *The Mythical Man-Month* (1975) |
| C4 | **Parkinson's Law** | Work expands to fill the time available for its completion. | Parkinson, *The Economist* (1955) |
| C5 | **Hofstadter's Law** | It always takes longer than you expect, even when you take into account Hofstadter's Law. | Hofstadter, *GEB* (1979) |
| C6 | **Cunningham's Law** | Best way to get the right answer online is to post the wrong answer. | Attributed to Ward Cunningham (Steven McGeady, 2010) |
| C7 | **K-factor** | Viral coefficient K = (invites per user) × (conversion rate); K>1 → exponential growth. | Skok, *Lessons from Viral Marketing* (2009); epidemiological origin: Kermack-McKendrick (1927) |

---

## D. Gaps (Explicit Missing Formulas → WR-4484 Work Queue)

These are known-unknowns. Each becomes a BNAT invention target in WR-4484.
Until backtested with real data, each candidate is labeled **CONSTRUCTED** and must not be cited as evidence in other WRs.

### D1. GAP — The Underdog Composite Index
- **Need:** Single scalar combining (indirect-strategy fit) × (convexity) × (survival-runway) × (exploration-bonus).
- **Naive draft (CONSTRUCTED, not backtested):**
  `UC = w1·AsymmetryFit + w2·log(1 + Convexity) + w3·SurvivalProb^t + w4·UCBBonus`
- **Backtest requirement:** ≥ 30 documented underdog wins/losses across ≥ 3 domains before publication.
- **Owner:** WR-4484 slot #1.

### D2. GAP — Failure-mode half-life
- **Need:** How long after a formula is discredited (A1–A8) does it stay in active use? Empirical decay curve.
- **Data needed:** Citation counts + deployment surveys pre/post debunking event.
- **Owner:** WR-4484 slot #2.

### D3. GAP — Pivot timing under runway constraint
- **Need:** Closed-form or numerical rule for optimal pivot time given remaining cash R, burn b, and belief-update rate λ.
- **Adjacent work:** Bandit stopping problems; Gittins index does not directly apply (non-stationary).
- **Owner:** WR-4484 slot #3.

### D4. GAP — Chattering-to-law promotion criterion
- **Need:** Threshold for moving a folk aphorism (Section C candidates) into a citable law. Currently ad-hoc.
- **Draft criterion (CONSTRUCTED):** ≥ 2 independent empirical replications + named originator + falsifiable statement.
- **Owner:** WR-4484 slot #4.

### D5. GAP — Anti-Goodhart metric design
- **Need:** A construction procedure for KPIs that resist becoming targets.
- **Candidate mechanisms:** rotating metrics; committee-of-metrics with veto; hidden holdout metric.
- **Owner:** WR-4484 slot #5.
**Rule:** Underdog math applies when (i) resources are asymmetric, (ii) the environment has fat tails or option-like payoffs, or (iii) the dominant strategy is common knowledge and thus arbitraged away.

---

## C. Chatterings Formalized (Folk Wisdom → Named Laws)

| ID | Law | Statement | Named Source |
|----|-----|-----------|--------------|
| C1 | **Goodhart's Law** | "When a measure becomes a target, it ceases to be a good measure." | Goodhart (1975); Strathern (1997) restatement |
| C2 | **Lindy Effect** | Expected remaining life of a non-perishable idea is proportional to its current age | Mandelbrot (1982); Taleb, *Antifragile* (2012) |
| C3 | **Brooks's Law** | "Adding manpower to a late software project makes it later." | Brooks, *The Mythical Man-Month* (1975) |
| C4 | **Parkinson's Law** | "Work expands to fill the time available for its completion." | Parkinson, *The Economist* (1955) |
| C5 | **Hofstadter's Law** | "It always takes longer than you expect, even when you take into account Hofstadter's Law." | Hofstadter, *GEB* (1979) |
| C6 | **Cunningham's Law** | "The best way to get the right answer on the internet is not to ask a question; it's to post the wrong answer." | attributed Ward Cunningham; Naggum lists (2010) |
| C7 | **K-factor** (viral coefficient) | K = i · c, where i = invites per user, c = conversion rate; K>1 ⇒ exponential growth | Skok, *For Entrepreneurs* (2009); epidemiology origin: Kermack-McKendrick (1927) |

**Rule:** A chattering becomes a citable law only when (a) it has a named originator, (b) it survives at least one adversarial restatement, and (c) it has a formal or semi-formal expression.

---

## D. Explicit Gaps (Invention Targets → WR-4484 BNAT)

These are formulas we **do not have** and want. Each is a work item for the invention loop.

| Gap ID | Missing Formula | Why It Matters | Status |
|--------|-----------------|----------------|--------|
| D1 | **Underdog Composite Score** | Single scalar combining Arreguín-Toft (B1), barbell convexity (B4), UCB1 bonus (B5), and pivot option value (B7) into a resource-adjusted expected edge | `CONSTRUCTED` — draft only, not backtested |
| D2 | **Chattering-to-Law promotion metric** | Quantitative threshold for when folk wisdom (C) has enough adversarial survival to be citable; currently qualitative | `GAP` |
| D3 | **Failed-formula half-life** | How long does a discredited model (A1–A8) remain in active production use after refutation? Needed for adoption-lag modeling | `GAP` |
| D4 | **Gap-to-invention conversion rate** | P(gap in WR-4485 § D → validated formula in WR band) as a function of team-months invested; drives R&D budgeting | `GAP` |
| D5 | **Anti-Goodhart proxy stability index** | Formal test for whether a KPI has begun to detach from its underlying construct (Goodhart drift); currently detected only ex post | `GAP` |

**Rule:** Gaps D1–D5 are the invention loop's initial queue. Any WR-band author proposing a new formula must check whether it closes one of these gaps; if so, tag the PR with `closes-gap:D#`.

---

## Review Focus

Section **D** (gaps) is the priority review area — these five slots seed the WR-4484 BNAT invention loop's first work queue. Reviewers should challenge whether any D-item is already solved in literature (in which case, promote to A/B/C with a source) or whether any D-item is malformed (in which case, reject and replace).
Per issue: **Section D** is the load-bearing section. A, B, C are curated; D is generative. Reviewers should ask, for each gap:

1. Is the gap **real** (no existing formula closes it) or **known** (we just haven't cited it)?
2. Is the gap **tractable** in ≤ 1 team-quarter?
3. Does closing the gap **compound** — does it unlock further inventions?

---

## Provenance

- **Rev 0:** Initial register. Sections A (8 failed formulas), B (7 underdog studies), C (7 formalized chatterings), D (5 gaps).
- Closes: #16674, #16676, #16678, #16681, #16683, #16685, #16687, #16689, #16691, #16694, #16698, #16700, #16702, #16704
- Related: WR-4484 (BNAT invention loop)
- Revision history: rev-0 initial register
