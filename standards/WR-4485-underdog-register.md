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

---

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

---

## Review Focus

Section **D** (gaps) is the priority review area — these five slots seed the WR-4484 BNAT invention loop's first work queue. Reviewers should challenge whether any D-item is already solved in literature (in which case, promote to A/B/C with a source) or whether any D-item is malformed (in which case, reject and replace).

## Change Log

- **Rev 0:** Initial register. Sections A (8 failed formulas), B (7 underdog studies), C (7 formalized chatterings), D (5 gaps).
