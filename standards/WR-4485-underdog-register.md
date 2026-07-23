# WR-4485 — The Underdog Register

**Band:** 44xx (Meta / Immune System)
**Revision:** 0
**Status:** Draft
**Labels:** wr-register, band-44xx, rev-0
**Related:** WR-4484 (BNAT invention loop)

---

## Purpose

The Underdog Register is the catalog's **immune system**: a curated record of
(A) failed formulas we must never re-import, (B) asymmetric-conflict math that
actually works for underdogs, (C) folk laws formalized, and (D) explicit gaps
fed to the invention loop.

It exists because most quant catalogs optimize for elegance. Underdogs cannot
afford elegance — they need **negative knowledge**, **variance timing**, and
**convexity**.

---

## A. Failed Formulas (Negative Knowledge)

Each entry names the formula, the failure mode, the named source, and the
reason it must not be silently reintroduced.

| # | Formula | Domain | Failure mode | Named source |
|---|---------|--------|--------------|--------------|
| A1 | **Gaussian copula** (Li, 2000) | Credit correlation | Assumed correlations stationary; ignored tail dependence; blew up structured credit in 2007–2008 | Salmon, "Recipe for Disaster," *Wired* 2009; MacKenzie & Spears 2014 |
| A2 | **VaR under normality** | Market risk | Fat tails, non-stationarity, endogenous feedback; understates crisis loss | Taleb, *The Black Swan* (2007); Danielsson, *Financial Risk Forecasting* |
| A3 | **LTCM convergence trades** | Fixed income arb | Leverage × correlated-liquidity-shock = ruin; ignored funding risk | Lowenstein, *When Genius Failed* (2000) |
| A4 | **COCOMO / COCOMO II drift** | Software estimation | Calibrated on waterfall/defense projects; systematically wrong on modern SaaS; parameters drift | Boehm 1981; critiques in Kitchenham & Mendes 2009 |
| A5 | **Stack ranking ("rank and yank")** | Org performance | Destroys collaboration; Goodharts on visibility; correlated with Enron/MSFT lost-decade | Kohn 1993; Ovide (WSJ) 2013 on MSFT abandonment |
| A6 | **MBTI** | Personnel selection | Test-retest reliability ~0.5; no predictive validity for job performance | Pittenger 1993; Grant 2013 |
| A7 | **NPS as causal driver** | Growth | Correlational at best; "the one number you need to grow" claim not replicated | Keiningham et al. 2007 (*Journal of Marketing*) |
| A8 | **Last-click attribution** | Marketing | Ignores assist paths, brand, latency; systematically over-credits bottom-funnel | Google/Chan et al. attribution studies 2011+ |

**Rule:** any new WR that reintroduces a Section A formula must cite this
register and justify the reintroduction with a specific scope-limiter.

---

## B. Underdog Math (What Actually Works)

Real, cited results for asymmetric conflict, variance timing, and convexity.

### B1. Arreguin-Toft asymmetric-conflict win rates
Ivan Arreguin-Toft, *How the Weak Win Wars* (2005). Across 1800–2003 conflicts,
weak actors win **~28.5% overall**, rising to **~63.6%** when they adopt
indirect strategy against a direct strategy. Strategy interaction dominates raw
power ratio.

**Catalog use:** never model conflict as `P(win) = f(power_ratio)` alone.
Always condition on strategy match.

### B2. Pulled-goalie variance timing (Beaudoin & Swartz)
Beaudoin & Swartz, "Strategies for Pulling the Goalie in Hockey" (*The American
Statistician*, 2010). Optimal pull time is **substantially earlier** than
coaches historically play — variance-maximizing behavior is under-used when
trailing.

**Catalog use:** when behind, increase variance; don't minimize it. Applies to
business "trailing" states (runway, market share, negotiation).

### B3. Wald survivorship correction
Abraham Wald (1943, SRG memo) on bomber armor: armor the areas **without**
bullet holes on returning planes, because the missing data is the planes that
didn't return.

**Catalog use:** every success-only dataset gets a Wald flag. Report
`P(observed | survived)` distinct from `P(survived)`.

### B4. Taleb barbell / convexity
Taleb, *Antifragile* (2012). A barbell allocation (mostly safe, small tail bet)
dominates the "balanced" middle when payoffs are convex and tails are fat.
Jensen's inequality on convex payoffs: `E[f(X)] ≥ f(E[X])`.

**Catalog use:** for underdog capital allocation, prefer barbell over
mean-variance-optimal portfolios when tails are un-modeled.

### B5. UCB1 exploration bonus
Auer, Cesa-Bianchi, Fischer (2002). For k-armed bandits,
`UCB1_i = mean_i + sqrt(2 ln(n) / n_i)`. Regret is `O(sqrt(kn log n))`.

**Catalog use:** default explore/exploit rule for any "which channel/feature
next" decision. Beats greedy and beats fixed epsilon.

### B6. Dyson sequential-search math
Freeman Dyson, *Disturbing the Universe* (1979), on U-boat search: given
limited search resources and a moving target, expected time-to-find is
minimized by **concentrating** search in the highest-prior cell first, not
spreading uniformly.

**Catalog use:** early-stage customer discovery — concentrate on the highest
prior segment; do not spread thin.

### B7. Pivot as real option
McDonald & Siegel (1986); Dixit & Pindyck (1994). The value of a pivot option
under uncertainty is strictly positive and increases in volatility. A startup
that can pivot is worth more than the same startup that cannot, even before
the pivot fires.

**Catalog use:** price optionality explicitly in roadmap decisions. Don't
amortize it to zero because it hasn't been exercised.

---

## C. Chatterings Formalized (Folk Laws → Named Constraints)

| # | Law | Statement | Named source |
|---|-----|-----------|--------------|
| C1 | **Goodhart** | When a measure becomes a target, it ceases to be a good measure | Goodhart 1975; Strathern 1997 |
| C2 | **Lindy** | For non-perishable things, expected remaining life ∝ current age | Mandelbrot; Taleb *Antifragile* |
| C3 | **Brooks** | Adding people to a late project makes it later | Brooks, *The Mythical Man-Month* (1975) |
| C4 | **Parkinson** | Work expands to fill the time available | Parkinson 1955 (*The Economist*) |
| C5 | **Hofstadter** | It always takes longer than you expect, even when you take Hofstadter into account | Hofstadter, *GEB* (1979) |
| C6 | **Cunningham** | Fastest way to get a right answer online is to post a wrong one | Ward Cunningham, attrib. |
| C7 | **K-factor** | Viral coefficient: k = invites_per_user × conversion_rate; sustained growth requires k > 1 or paid loop | Epidemiology → growth (adapted) |

Each chattering is a **constraint checker**, not a predictor. The catalog uses
them to reject plans that violate them silently.

---

## D. Gaps — Missing Formulas (Invention Targets)

Explicitly labeled. These are the first work queue for the WR-4484 BNAT
invention loop.

| # | Name | What's missing | Status |
|---|------|----------------|--------|
| D1 | **Underdog Composite Index** | A single score combining strategy-match (B1), variance-state (B2), survivorship-corrected base rate (B3), and convexity budget (B4). No published formulation exists that composes all four. | **CONSTRUCTED** — must be backtested before use. Do not cite as evidence. |
| D2 | **Goodhart-decay half-life** | Given a metric adopted as target at t=0, how fast does its correlation with the underlying goal decay? No published closed-form. | GAP |
| D3 | **Pivot-option pricing under founder-attention constraint** | McDonald-Siegel assumes infinite management bandwidth. Real founders have ~1 pivot's worth of attention. Adjusted valuation formula missing. | GAP |
| D4 | **Variance-timing rule for revenue trailing-state** | B2's pulled-goalie math ported to business: when should a company deliberately increase revenue variance (bigger bets, longer sales cycles) as a function of runway months and burn multiple? | GAP |
| D5 | **Wald correction for OSS adoption metrics** | GitHub stars, npm downloads, HN upvotes are all survivor-biased channels. No published correction factor for the silent-abandonment rate. | GAP |

Each gap D1–D5 is wired to WR-4484 as an invention target. D1 is flagged
**CONSTRUCTED** — it exists in the catalog but must not be treated as
empirically validated until a backtest WR is published.

---

## Review focus

Section D. These five gaps are the invention loop's first work queue. Any
reviewer disagreeing with a gap being real (i.e., knowing a published formula
that closes it) should open a WR citing the source, and D<n> will be moved to
Section B with attribution.

---

## Changelog

- **rev-0** — Initial register. A: 8 failed formulas. B: 7 underdog results. C: 7 chatterings. D: 5 gaps (1 constructed, 4 open).
