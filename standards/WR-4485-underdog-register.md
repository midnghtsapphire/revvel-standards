# WR-4485 — The Underdog Register

**Status:** rev-0  
**Band:** 44xx (Standards / Immune System)  
**Related:** WR-4484 (BNAT invention targets)  
**Closes:** #16674, #16676, #16678

---

## Purpose

The Underdog Register is the catalog's **immune system**: a named, sourced ledger of

1. **Failed formulas** — models that shipped, propagated, and blew up. Negative knowledge.
2. **Underdog math** — real published results that quantify when the small side wins.
3. **Chatterings** — folk laws formalized enough to cite.
4. **Gaps** — formulas we *don't* have yet, promoted to the invention queue.

Everything the main catalog treats as a load-bearing formula must survive this register.

---

## A. Failed Formulas (Negative Knowledge)

| ID     | Formula / Model                     | Domain                | Failure Mode                                                                 | Named Source / Post-Mortem                                  |
|--------|-------------------------------------|-----------------------|------------------------------------------------------------------------------|-------------------------------------------------------------|
| F-01   | Gaussian copula (Li, 2000)          | Credit derivatives    | Assumed tail-independence; correlated defaults broke pricing in 2007–08.     | Salmon, *Wired* (2009); MacKenzie & Spears (2014).          |
| F-02   | VaR under normality                 | Market risk           | Underweights tails; regulators enshrined it pre-2008.                        | Taleb, *The Black Swan* (2007); Danielsson (2002).          |
| F-03   | LTCM convergence trades             | Fixed-income arb      | Levered mean-reversion; ignored liquidity + correlation blowup (1998).       | Lowenstein, *When Genius Failed* (2000).                    |
| F-04   | COCOMO / COCOMO II effort model     | Software estimation   | Calibration drift; assumes waterfall; underpredicts by 2–4× on modern stacks.| Boehm (1981); Menzies et al. (2017) recalibration studies.  |
| F-05   | Stack ranking (forced distribution) | Org performance       | Destroys collaboration; Microsoft killed it 2013; GE walked back 2015.       | Kwoh, *WSJ* (2012); Ovide, *WSJ* (2013).                    |
| F-06   | MBTI                                | Personnel selection   | Test-retest ~50% category flip; no predictive validity for job outcome.      | Pittenger (1993, 2005); Grant (2013).                       |
| F-07   | NPS as causal driver                | Growth / CX           | Correlational at best; "ultimate question" claim unreplicated.               | Keiningham et al. (2007), *J. Marketing*.                   |
| F-08   | Last-click attribution              | Marketing analytics   | Systematically under-credits upper-funnel; biases spend to bottom-funnel.    | Google/Nielsen MMM studies (2017–2020).                     |

**Rule:** If the catalog cites a formula on this list without a mitigation clause, that's a bug.

---

## B. Underdog Math (Positive, Sourced)

| ID    | Result                                                                 | Formula / Claim                                                                          | Source                                                       |
|-------|------------------------------------------------------------------------|------------------------------------------------------------------------------------------|--------------------------------------------------------------|
| U-01  | Asymmetric conflict win rate for weak side                             | Weak side wins **28.5%** overall (1800–2003); **63.6%** when using indirect strategy.    | Arreguín-Toft, *How the Weak Win Wars* (2005).               |
| U-02  | Pulled-goalie timing (variance injection when behind)                  | Optimal pull ~**2:42 remaining** down 1; ~**5:40** down 2. Increases variance → equity.  | Beaudoin & Swartz, *J. Quant. Anal. Sports* (2010).          |
| U-03  | Wald survivorship correction (armor the un-hit places)                 | Sample of *returners* is censored; missing data locates the true weakness.               | Wald, SRG memo (1943); Mangel & Samaniego (1984).            |
| U-04  | Taleb barbell / convexity                                              | Cap downside at −x, keep unbounded upside → positive convexity to disorder.              | Taleb, *Antifragile* (2012); *Silent Risk* (2015 draft).     |
| U-05  | UCB1 exploration bonus (bandit)                                        | Choose arm maximizing `x̄_i + √(2 ln n / n_i)` — provably log-regret exploration.        | Auer, Cesa-Bianchi, Fischer, *Machine Learning* (2002).      |
| U-06  | Dyson sequential search (bomber-vs-U-boat)                             | Optimal search allocates effort ∝ √(prior × payoff); small teams beat brute force.       | Dyson, *Disturbing the Universe* (1979), ch. on Coastal Cmd. |
| U-07  | Pivot as real option                                                   | Value = max(continue, switch − cost); volatility *raises* option value.                  | Dixit & Pindyck, *Investment Under Uncertainty* (1994).      |
| U-08  | Kelly fraction under edge                                              | f* = (bp − q)/b; underdogs with true edge should size *up*, not down.                    | Kelly (1956); Thorp (1969, 2006).                            |

**Rule:** Any "scrappy beats big" claim in a pitch deck must map to one of U-01 … U-08 or be labeled *anecdote*.

---

## C. Chatterings Formalized (Folk Laws with Teeth)

| ID    | Law                | Statement                                                                            | Use in catalog                                        |
|-------|--------------------|--------------------------------------------------------------------------------------|-------------------------------------------------------|
| C-01  | Goodhart's Law     | When a measure becomes a target, it ceases to be a good measure. (Strathern, 1997.)  | Guards KPI design.                                    |
| C-02  | Lindy Effect       | Expected remaining life of non-perishable ideas ∝ current age. (Mandelbrot; Taleb.)  | Prior on which formulas to trust.                     |
| C-03  | Brooks's Law       | Adding people to a late software project makes it later. (Brooks, 1975.)             | Guards staffing decisions.                            |
| C-04  | Parkinson's Law    | Work expands to fill the time available. (Parkinson, 1955.)                          | Guards deadline / scope design.                       |
| C-05  | Hofstadter's Law   | It always takes longer than you expect, even when you account for Hofstadter's Law.  | Prior on estimation.                                  |
| C-06  | Cunningham's Law   | Best way to get the right answer online is to post the wrong one.                    | Underdog PR / launch tactic.                          |
| C-07  | K-factor (viral)   | K = i · c ; K > 1 → organic growth. (Bass diffusion lineage.)                        | Growth-loop sanity check.                             |

---

## D. Gaps — Explicitly Missing Formulas (→ WR-4484 Invention Queue)

These are the first five work items for the BNAT invention loop. Each is labeled
`CONSTRUCTED` until backtested against ≥3 independent datasets.

| Gap ID  | Working Name              | What we need                                                                                     | Backtest gate                                                              |
|---------|---------------------------|--------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------|
| G-01    | **Underdog Composite**    | Single scalar combining U-01…U-08 into a per-decision "underdog score."                          | Must beat naive equal-weight on ≥3 historical asymmetric-conflict datasets.|
| G-02    | **Attention-Debt Metric** | Quantify accumulated cost of unresolved TODOs / half-shipped features on future throughput.      | Predict velocity drop on ≥3 OSS repos across 6-month windows.              |
| G-03    | **Pivot Half-Life**       | Expected time until a strategy's edge decays below cost-of-execution.                            | Fit to ≥3 startup cohorts (YC, Techstars, indie).                          |
| G-04    | **Convexity-of-Ship**     | Barbell metric for release cadence: small frequent + rare-large vs. medium-steady.               | Compare 3 shipping regimes on same product class.                          |
| G-05    | **Immune-Response Lag**   | Time from formula-failure signal (post-mortem) to catalog update. Own dogfood metric.            | Measured on this repo; target < 30 days rev-0 → rev-1.                     |

---

## Review Focus

Section **D** is the priority. These five gaps constitute the invention loop's
first work queue and feed directly into WR-4484.

## Change Log

- **rev-0** — initial register. Sections A/B/C sourced; Section D promoted to invention queue.
