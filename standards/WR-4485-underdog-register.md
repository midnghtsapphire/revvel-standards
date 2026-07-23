# WR-4485 — The Underdog Register: Failed Formulas, Contrarian Wins, Comeback Math

- **Band:** 44xx (knowledge register; companion to MATH_FRAMEWORK_CATALOG)
- **Status:** DRAFT rev 0
- **Depends:** WR-4482, WR-4484; catalog format: NAME (Author, Year) + FORMULA + USE-WHEN + FAILURE-MODE

## Purpose
The catalog says what works. This register says: (A) formulas that FAILED and why, (B) real math for underdogs/comebacks — where consensus predicted failure and was wrong, (C) practitioner chatterings (folk laws) with their formal versions, (D) known gaps where no validated formula exists yet (BNAT targets).

## A. FORMULAS THAT FAILED (negative knowledge = highest-value training data)
- **Gaussian copula for CDO pricing (Li, 2000):** rho assumed stable; correlations → 1 in crises. Contributed to 2008. Lesson: correlation is regime-dependent; never price tail risk with a single rho.
- **VaR under normality (RiskMetrics, 1994):** fat tails violate Gaussian assumption; 25-sigma days occurred. Use expected shortfall + fat-tailed distributions (Taleb 2007 critique; Basel moved to ES).
- **Black-Scholes-Merton at LTCM (1998):** model right, assumptions (continuous liquidity, stable vol) wrong at scale. Lesson: leverage x model-assumption fragility = ruin; Kelly overbetting analog.
- **COCOMO on modern stacks (Boehm, 1981):** Effort = a*KSLOC^b calibrated on 1970s waterfall; coefficients invalid for modern tooling. Use only with recalibration; label LOW confidence.
- **Forced-ranking / stack ranking (GE, Microsoft):** assumed normal performance distribution; performance is power-law (O'Boyle & Aguinis, 2012). Destroyed collaboration; both firms abandoned it.
- **MBTI for hiring:** test-retest reliability poor; no criterion validity for job performance (Pittenger, 1993). Big Five conscientiousness is the validated alternative.
- **NPS as growth predictor (Reichheld, 2003):** the single-metric growth claim failed replication (Keiningham et al., 2007). Keep NPS as trend signal only; never as causal model.
- **Last-click attribution:** assigns 100% credit to final touch; provably biased vs incrementality testing (geo-lift / holdouts are the fix).

## B. UNDERDOG MATH (real studies, real numbers)
- **Asymmetric-conflict result (Arreguin-Toft, 2001, "How the Weak Win Wars"):** weak actors win ~63.6% with UNCONVENTIONAL strategy vs ~28.5% conventional (200 yrs of conflicts). Formula-as-rule: `P(underdog win | mimic strong) << P(underdog win | change the game)`. Never fight the incumbent's game.
- **Variance is the trailing player's friend (pulled-goalie math, Beaudoin & Swartz, 2010):** when behind, EV-maximizing play RAISES outcome variance earlier than convention says (optimal goalie pull ~3 min out vs traditional ~1). General rule: `if E[current path] < target: maximize sigma, not mu`.
- **Survivorship correction (Wald, 1943, WWII bomber armor):** armor where returning planes have NO holes — condition on the unobserved failures. Rule: any "everyone who tried X failed" claim must be checked for who never got observed.
- **Barbell / convexity (Taleb, 2012):** allocation = 85-90% robust + 10-15% high-convexity moonshots; payoff `f(x)` convex means volatility helps: `E[f(X)] > f(E[X])` (Jensen). The hail-mary is rational as a SIZED option, never as the whole book.
- **Long-shot as out-of-the-money option:** value driven by sigma and time, not current price — `Hail-Mary EV = p*V - C`, undervalued by consensus precisely when p is misestimated from survivorship-biased base rates (see Wald).
- **Explore/exploit for unknown arms (UCB1, Auer 2002):** optimism under uncertainty formalizes "give the underdog idea its trial": `argmax [ xbar_i + sqrt(2 ln N / n_i) ]` — the rarely-tried arm gets a structural bonus.
- **Dyson iteration (5,126 prototypes):** sequential search with cheap trials: `P(>=1 success in n trials) = 1-(1-p)^n` — persistence is math when trial cost is low and p per trial is nonzero. The consensus "it can't work" often prices trials as expensive when they've become cheap (the real disruption).
- **Comeback/pivot as real option:** kill-and-redeploy value = `max(V_pivot - C_switch, V_stay)`; sunk costs excluded by definition. Most "failed" ventures hold unexercised pivot options.

## C. CHATTERINGS — practitioner folk laws, formalized
- **Goodhart's Law (1975):** "when a measure becomes a target it ceases to be a good measure" — formal: optimizing proxy P diverges from goal G as pressure rises; guard with counter-metrics.
- **Lindy effect (Mandelbrot/Taleb):** for non-perishables, `E[remaining life | age t] proportional to t`. Use for tech-stack and protocol bets (why boring tech wins).
- **Brooks's Law (1975):** `channels = n(n-1)/2` — adding people to late projects adds quadratic comms.
- **Parkinson's Law (1955):** work expands to fill time — counter with timeboxing (the math-free law that WSJF and takt time exist to fight).
- **Hofstadter's Law:** it always takes longer, even accounting for Hofstadter's Law — formal fix: reference-class forecasting (Kahneman & Tversky outside view; Flyvbjerg uplift factors).
- **Cunningham's Law:** fastest way to a right answer is posting the wrong one — operationalized in WR-4483's critic gate.
- **Viral K-factor (growth folk-math made real):** `K = i × c` (invites/user × conversion/invite); sustained `K > 1` = viral growth; most "went viral" stories are K briefly > 1, then decay — model the decay.

## D. GAPS — no validated formula exists (BNAT invention targets for WR-4484 loop)
- **Delight quantification:** Kano SI/DI is ordinal survey math; no validated delight->willingness-to-pay transfer function. GAP: fit `WTP = f(SI)` on operator sales data (reviewer-overstock dataset is a candidate corpus).
- **Marketplace-fit coefficients:** session scorecard `(T×M×Conv)/(Fees+Comp+Effort)` is dimensionally inconsistent until fitted; GAP: estimate as log-linear regression on cross-marketplace listing outcomes.
- **Trend-origination prediction:** diffusion models fit AFTER takeoff; no validated pre-takeoff detector. GAP: small-dense-community signal features + Bass prior = candidate model.
- **Agent-commerce pricing:** no established price-discovery mechanism for machine-payable APIs. GAP: BNAT watchlist (x402-class rails).
- **Underdog composite:** the pieces above (Arreguin-Toft strategy switch, variance timing, barbell sizing, UCB trial allocation, survivorship correction) have never been composed into one validated venture-selection model. GAP: that composition IS the invention — label any composite CONSTRUCTED until backtested.

## Usage rule
Register entries are prompts' immune system: before any recommendation, agents scan section A (is my method on the failed list under these conditions?), section B (does the underdog position change the optimal strategy?), section C (which folk law is operating?), section D (am I pretending a gap formula is validated?). Constructed composites are always labeled CONSTRUCTED.

## Acceptance checklist
- [ ] Referenced by WR-4484 SCREEN and DECIDE stages
- [ ] Every entry carries author/year or CONSTRUCTED label
- [ ] Section A consulted in agent self-audit before quantitative recommendations
