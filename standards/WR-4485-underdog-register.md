# WR-4485 — The Underdog Register

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

Per issue: **Section D** is the load-bearing section. A, B, C are curated; D is generative. Reviewers should ask, for each gap:

1. Is the gap **real** (no existing formula closes it) or **known** (we just haven't cited it)?
2. Is the gap **tractable** in ≤ 1 team-quarter?
3. Does closing the gap **compound** — does it unlock further inventions?

---

## Provenance

- Closes: #16674, #16676, #16678, #16681, #16683, #16685, #16687, #16689, #16691, #16694, #16698, #16700, #16702, #16704
- Related: WR-4484 (BNAT invention loop)
- Revision history: rev-0 initial register
