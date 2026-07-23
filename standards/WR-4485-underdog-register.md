# WR-4485 — The Underdog Register

**Band:** 44xx (Anti-patterns / Negative knowledge / Comeback math)
**Revision:** rev-0
**Status:** ACTIVE — Section D gaps feed WR-4484 BNAT invention loop
**Related:** WR-4484 (BNAT invention targets), WR-44xx register family

---

## Purpose

The Underdog Register is the catalog's **immune system**. It records:

1. Formulas that **failed in the wild** (with named sources and body counts)
2. **Asymmetric-conflict math** — how the smaller side actually wins
3. **Folk wisdom formalized** — chatterings promoted to named laws
4. **Explicit gaps** — missing formulas, labeled as invention targets

Negative knowledge is knowledge. Knowing what doesn't work is worth more than another
list of what might work. This register is the counterweight to the optimism bias baked
into every other standards document.

---

## Section A — Failed Formulas (Named and Shamed)

Each entry: **formula → domain → failure mode → named source → year**.

### A.1 Gaussian Copula (Li, 2000)
- **Use:** CDO tranche correlation pricing
- **Failure:** Assumed Gaussian tail dependence; real defaults are fat-tailed and correlated in crisis
- **Body count:** 2008 GFC, ~$10T global wealth destruction
- **Source:** Salmon, F. (2009). "Recipe for Disaster: The Formula That Killed Wall Street." *Wired.*
- **Lesson:** Copulas hide tail correlation. Any model whose parameters are calibrated in calm and applied in crisis is a **regime-change bomb**.

### A.2 VaR under Normality (RiskMetrics, 1994)
- **Use:** Bank capital adequacy, trading desk risk limits
- **Failure:** 3-sigma events happen roughly monthly, not once per century
- **Body count:** LTCM 1998, Bear Stearns 2008, Archegos 2021
- **Source:** Taleb, N. (2007). *The Black Swan.* Also: Danielsson, J. (2002). "The Emperor Has No Clothes."
- **Lesson:** VaR is a **confidence generator**, not a risk measure. Expected Shortfall (CVaR) is marginally better but still assumes stationarity.

### A.3 LTCM Convergence Trades (Merton/Scholes, 1994–1998)
- **Use:** Fixed-income arbitrage on spread mean-reversion
- **Failure:** Leverage × correlated positions × liquidity crunch = ruin
- **Body count:** $4.6B loss, systemic Fed-brokered bailout
- **Source:** Lowenstein, R. (2000). *When Genius Failed.*
- **Lesson:** Two Nobel laureates ≠ immunity from **path dependence and liquidity risk**. Kelly criterion violated by ~10x.

### A.4 COCOMO Software Estimation Drift (Boehm, 1981)
- **Use:** Project timelines, staffing plans
- **Failure:** Systematic underestimation by 40–200%; no correction for scope drift, requirements churn
- **Source:** Jørgensen, M. & Shepperd, M. (2007). "A Systematic Review of Software Development Cost Estimation Studies." *IEEE TSE.*
- **Lesson:** All software estimates should be labeled **"lower bound only"**. See also: Brooks's Law (Section C).

### A.5 Stack Ranking (GE/Welch, ~1980–2013)
- **Use:** Forced-curve employee performance ranking
- **Failure:** Destroys collaboration, encourages sandbagging, correlates weakly with actual output
- **Body count:** Microsoft's lost decade (2000–2013), Enron culture
- **Source:** Kolbjørnsrud, V. et al. (2013). "The End of Forced Ranking." *HBR.* Microsoft abandoned it 2013.
- **Lesson:** Ordinal ranking of continuous, noisy, correlated performance signals **manufactures conflict without information**.

### A.6 MBTI (Myers & Briggs, 1943)
- **Use:** Hiring, team composition, career advice
- **Failure:** Test-retest reliability ~50%; no predictive validity for job performance
- **Source:** Pittenger, D. J. (1993). "Measuring the MBTI... And Coming Up Short." *Journal of Career Planning.*
- **Lesson:** A personality test that gives you a different type half the time is a **random-number generator with branding**.

### A.7 NPS as Causal Metric (Reichheld, 2003)
- **Use:** "The one number you need to grow"
- **Failure:** Correlational at best; not predictive of revenue growth in replication studies
- **Source:** Keiningham, T. et al. (2007). "A Longitudinal Examination of NPS and Firm Revenue Growth." *Journal of Marketing.*
- **Lesson:** NPS measures **willingness to answer a survey**, not loyalty. Goodhart's law (Section C.1) applies immediately upon adoption.

### A.8 Last-Click Attribution (Google Analytics default, ~2005–)
- **Use:** Marketing spend allocation
- **Failure:** Systematically overpays bottom-funnel; starves brand/discovery channels
- **Source:** Berman, R. (2018). "Beyond the Last Touch: Attribution in Online Advertising." *Marketing Science.*
- **Lesson:** Attribution windows are **modeling choices, not measurements**. Last-click is the null hypothesis of attribution, not the answer.

---

## Section B — Underdog Math (Real Studies)

How smaller, weaker, later, poorer sides actually win. Each entry: **mechanism → formula/finding → source**.

### B.1 Arreguin-Toft Asymmetric Conflict
- **Finding:** In wars 1800–2003, the weaker side won 28.5% of the time; when the weaker side used **guerrilla/indirect strategy** against a direct-strategy opponent, win rate rose to **63.6%**.
- **Source:** Arreguín-Toft, I. (2001). "How the Weak Win Wars: A Theory of Asymmetric Conflict." *International Security* 26(1).
- **Mechanism:** Strategic interaction dominates raw resources. **Same-strategy contests favor the strong; cross-strategy contests favor the clever.**
- **Application:** Don't fight incumbents on their axis. Change the axis.

### B.2 Pulled-Goalie Variance Timing
- **Finding:** Optimal pull time in NHL hockey is ~3:00 remaining when down 1 goal (not 1:00 as conventionally practiced). Coaches systematically pull too late.
- **Source:** Beaudoin, D. & Swartz, T. (2010). "Strategies for Pulling the Goalie in Hockey." *The American Statistician* 64(3).
- **Formula:** Expected goal differential maximization under negative binomial scoring rates.
- **Application:** When behind, **inject variance earlier than feels safe**. Conservative play compounds losses.

### B.3 Wald Survivorship Correction
- **Finding:** Armor the planes where returning aircraft show **no bullet holes** — those hit there didn't return.
- **Source:** Wald, A. (1943). "A Method of Estimating Plane Vulnerability Based on Damage of Survivors." *Statistical Research Group Memorandum.*
- **Formula:** Reweight observed damage distribution by inverse survival probability.
- **Application:** Study **failed startups, not just YC unicorns**. Study churned customers, not just NPS promoters.

### B.4 Taleb Barbell / Convexity
- **Finding:** Portfolio of 85–90% ultra-safe + 10–15% ultra-risky **dominates** the medium-risk middle under fat-tailed returns.
- **Source:** Taleb, N. (2012). *Antifragile.* Also: Taleb & Douady (2013). "Mathematical Definition, Mapping, and Detection of (Anti)Fragility."
- **Formula:** Convex payoff f(x) with f''(x) > 0 benefits from volatility.
- **Application:** Bootstrap 90% safe (recurring revenue), 10% moonshot (Polar.sh viral products). Never the middle.

### B.5 UCB1 Exploration Bonus
- **Finding:** Optimal bandit strategy adds bonus √(2 ln n / n_i) to each arm's mean estimate — **less-tried arms get systematic boost**.
- **Source:** Auer, P., Cesa-Bianchi, N., & Fischer, P. (2002). "Finite-time Analysis of the Multiarmed Bandit Problem." *Machine Learning* 47.
- **Formula:** `arm_i_score = mean_i + sqrt(2 * ln(total_pulls) / pulls_i)`
- **Application:** New product lines deserve **more attention than their current revenue justifies** — the exploration bonus is real math, not optimism.

### B.6 Dyson Sequential Search
- **Finding:** For a target of unknown location on a line, geometric-expanding search intervals (1, 2, 4, 8, ...) minimize worst-case competitive ratio.
- **Source:** Beck, A. & Newman, D. J. (1970). "Yet More on the Linear Search Problem." *Israel Journal of Mathematics* 8. (Attributed via Dyson's WWII bomber search work.)
- **Application:** When exploring product-market fit, **double the swing each iteration** rather than incrementing. Fixed step size loses to geometric.

### B.7 Pivot as Real Option
- **Finding:** A startup's option to pivot has Black-Scholes-style value increasing in **volatility of the market opportunity set**.
- **Source:** McGrath, R. G. (1997). "A Real Options Logic for Initiating Technology Positioning Investments." *Academy of Management Review* 22(4).
- **Formula:** Option value ∝ σ√T; higher uncertainty = higher pivot-option value.
- **Application:** In volatile markets (AI, crypto, creator economy), **the pivot option itself is worth more than the current plan**. Don't commit too early.

---

## Section C — Chatterings Formalized

Folk wisdom that turned out to be correct and worth naming.

### C.1 Goodhart's Law
- **Statement:** "When a measure becomes a target, it ceases to be a good measure."
- **Source:** Goodhart, C. (1975). Bank of England monetary policy paper. Formalized by Strathern (1997).
- **Corollary (Campbell's Law):** Quantitative social indicators corrupt under pressure.
- **Application:** Every KPI has a half-life. NPS (A.7) is the canonical case.

### C.2 Lindy Effect
- **Statement:** For non-perishable things, expected remaining life ∝ current age.
- **Source:** Mandelbrot (1982), formalized by Taleb (2012).
- **Formula:** E[remaining | age = t] ≈ t for power-law-distributed lifespans.
- **Application:** Prefer 20-year-old tools over 2-year-old tools. Postgres over the framework of the week.

### C.3 Brooks's Law
- **Statement:** "Adding manpower to a late software project makes it later."
- **Source:** Brooks, F. (1975). *The Mythical Man-Month.*
- **Mechanism:** Onboarding cost + communication overhead O(n²) exceeds marginal productivity.
- **Application:** Solo/duo teams have a structural advantage in early-stage velocity.

### C.4 Parkinson's Law
- **Statement:** "Work expands to fill the time available for its completion."
- **Source:** Parkinson, C. N. (1955). *The Economist.*
- **Application:** Aggressive deadlines aren't cruelty; they're compression that reveals the actual work.

### C.5 Hofstadter's Law
- **Statement:** "It always takes longer than you expect, even when you take into account Hofstadter's Law."
- **Source:** Hofstadter, D. (1979). *Gödel, Escher, Bach.*
- **Application:** Recursive self-awareness doesn't fix estimation bias. See A.4 (COCOMO).

### C.6 Cunningham's Law
- **Statement:** "The best way to get the right answer on the internet is not to ask a question, but to post the wrong answer."
- **Source:** Attributed to Ward Cunningham (wiki inventor).
- **Application:** Ship a v0.1 to attract correction. Silent perfection attracts nothing.

### C.7 K-Factor (Viral Coefficient)
- **Statement:** k = (invites per user) × (conversion rate per invite). k > 1 → viral growth.
- **Source:** Skok, D. (2009). "Lessons Learned — Viral Marketing." Formalized from epidemiology R₀.
- **Application:** For Polar.sh / OSINT tools: every product ships with an inherent share loop or it doesn't ship.

---

## Section D — Explicit Gaps (Invention Targets)

These are **known unknowns**. Each is wired to WR-4484 as a BNAT invention target. Any formula built here is labeled `CONSTRUCTED` until backtested against out-of-sample data.

### D.1 GAP — Underdog Composite Score
- **Need:** A single scalar combining B.1 (strategy asymmetry), B.4 (barbell position), B.5 (exploration bonus), B.7 (pivot-option value) into an actionable score per opportunity.
- **Sketch:** `UC = w₁·strategy_asymmetry + w₂·convexity + w₃·exploration_bonus + w₄·pivot_option_value`
- **Status:** `CONSTRUCTED` — needs backtesting against 100+ historical underdog wins/losses.
- **Owner:** WR-4484 invention loop, work-item #1.

### D.2 GAP — Regime-Change Detector for Model Retirement
- **Need:** Formal test for when a calibrated model (e.g., A.1, A.2) has entered a regime where its assumptions no longer hold — **before** the blow-up.
- **Candidate:** CUSUM on residuals + tail-dependence estimator (empirical copula).
- **Status:** MISSING. No production-grade version.
- **Owner:** WR-4484 work-item #2.

### D.3 GAP — Anti-Goodhart Metric Rotation Schedule
- **Need:** Formalize how often to rotate a KPI before it decays under Goodhart pressure (C.1).
- **Sketch:** Half-life estimator based on gaming-signal detection (variance collapse, distribution truncation at threshold).
- **Status:** MISSING.
- **Owner:** WR-4484 work-item #3.

### D.4 GAP — Solo-Founder Convexity Bound
- **Need:** Upper bound on revenue reachable by a single operator given Brooks (C.3) and Parkinson (C.4) constraints and modern AI leverage.
- **Sketch:** `R_max ≈ f(hours_available, ai_leverage_multiplier, product_surface_area)` — needs empirical calibration from Indie Hackers / Stripe Atlas data.
- **Status:** MISSING. Directly relevant to $10k→$10M mission trajectory.
- **Owner:** WR-4484 work-item #4.

### D.5 GAP — Failure-Mode Prior for New Formula Adoption
- **Need:** Before adopting any new formula/metric/framework, what's the prior probability it will end up in Section A within 10 years?
- **Sketch:** Base rate ~30–50% based on this register's fill rate. Adjustments for: peer review depth, out-of-sample validation, adoption speed (fast adoption → higher failure prior, per A.1, A.7).
- **Status:** MISSING.
- **Owner:** WR-4484 work-item #5.

---

## Register Meta

- **Fill rate target:** +2 Section A entries per quarter, +1 Section B, +1 Section D closure.
- **Immune-system role:** Every new WR-standard proposed elsewhere in the catalog must be checked against Section A analogs and Section D gaps before merge.
- **Anti-optimism:** If a quarter produces no Section A additions, the register is being under-used, not the world improving.

## References (consolidated)

- Arreguín-Toft, I. (2001). *International Security* 26(1).
- Auer, Cesa-Bianchi, Fischer (2002). *Machine Learning* 47.
- Beaudoin & Swartz (2010). *The American Statistician* 64(3).
- Beck & Newman (1970). *Israel J. Math* 8.
- Berman, R. (2018). *Marketing Science.*
- Boehm, B. (1981). *Software Engineering Economics.*
- Brooks, F. (1975). *The Mythical Man-Month.*
- Danielsson, J. (2002). *Journal of Banking & Finance.*
- Goodhart, C. (1975). Bank of England.
- Hofstadter, D. (1979). *Gödel, Escher, Bach.*
- Jørgensen & Shepperd (2007). *IEEE TSE.*
- Keiningham et al. (2007). *Journal of Marketing.*
- Lowenstein, R. (2000). *When Genius Failed.*
- McGrath, R. G. (1997). *AMR* 22(4).
- Parkinson, C. N. (1955). *The Economist.*
- Pittenger, D. J. (1993). *J. Career Planning.*
- Salmon, F. (2009). *Wired.*
- Skok, D. (2009). "Lessons Learned — Viral Marketing."
- Taleb, N. (2007). *The Black Swan.* (2012) *Antifragile.*
- Wald, A. (1943). Statistical Research Group Memorandum.
