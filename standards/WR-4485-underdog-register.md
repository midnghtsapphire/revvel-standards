# WR-4485 — The Underdog Register

**Status:** rev-0
**Band:** 44xx (Wisdom Register / Immune System)
**Labels:** wr-register, band-44xx, rev-0
**Purpose:** Catalog failed formulas, underdog math, formalized folk wisdom, and explicit gaps. This is the catalog's immune system — negative knowledge with named sources.

---

## A. Failed Formulas (Negative Knowledge)

Formulas that shipped, scaled, and broke. Named so we don't re-adopt them.

| # | Formula | Domain | Failure Mode | Named Source / Postmortem |
|---|---------|--------|--------------|---------------------------|
| A1 | **Gaussian Copula** (Li, 2000) | Structured credit | Assumed constant correlation; correlations went to 1 in tail | Salmon, *Wired* (2009), "Recipe for Disaster" |
| A2 | **VaR under normality** | Bank risk | Fat tails, non-stationary vol, endogenous liquidity | Taleb, *The Black Swan* (2007); Basel III postmortems |
| A3 | **LTCM convergence trades** | Fixed-income arb | Leverage × correlated tail × liquidity spiral | Lowenstein, *When Genius Failed* (2000) |
| A4 | **COCOMO / COCOMO II effort model** | Software estimation | Drift — calibration decays as tech stack shifts; parameters over-fit legacy | Boehm's own later work; Kitchenham reviews |
| A5 | **Stack ranking / forced curve** | Performance management | Suppresses collaboration; Goodhart's Law on ratings | Microsoft's 2013 abandonment; Kohn, *Punished by Rewards* |
| A6 | **MBTI** | Personnel selection | Test-retest ~50%; no predictive validity | Pittenger (1993, 2005); Grant (2013) |
| A7 | **NPS as causal lever** | Growth strategy | Correlational at best; single-question survey mistaken for driver | Keiningham et al. (2007), *Journal of Marketing* |
| A8 | **Last-click attribution** | Marketing spend | Systematically under-credits top-of-funnel; incentivizes brand-bidding waste | Google's own multi-touch research (2013+) |

**Rule of use:** if a proposed model matches A1–A8 in structure (thin-tailed assumption on fat-tailed process, single-metric proxy for multi-causal outcome, drift-ignoring calibration), it enters review under WR-4484 BNAT scrutiny.

---

## B. Underdog Math (Real Studies, Real Formulas)

Why the small/weak/late player sometimes wins — with citations and mechanics.

### B1. Arreguin-Toft asymmetric conflict
**Source:** Arreguin-Toft, *How the Weak Win Wars* (2001, *International Security*).
**Finding:** Across 1800–2003 asymmetric conflicts, weak actors won ~29% overall; when the weak adopted an *indirect* strategy against a strong *direct* strategy, win rate rose to ~63%.
**Formula (empirical):**
```
P(weak wins | strategy mismatch) ≈ 0.63
P(weak wins | strategy match)    ≈ 0.24
```
**Application:** Do not fight the incumbent on their axis. Change the axis.

### B2. Pulled-goalie variance timing
**Source:** Beaudoin & Swartz (2010), *Journal of Quantitative Analysis in Sports*.
**Finding:** Optimal pull time is ~3× earlier than league practice. Trailing teams under-inject variance.
**Formula (sketch):**
```
Expected goal differential improves when pull_time is chosen to maximize
P(tie) - P(empty_net_against), which solves earlier than intuition suggests.
```
**Application:** When behind, inject variance sooner than feels comfortable.

### B3. Wald survivorship correction
**Source:** Abraham Wald, WWII Statistical Research Group; Mangel & Samaniego (1984) reconstruction.
**Finding:** Armor the planes where returning planes are *not* hit. The data you see is conditioned on survival.
**Formula:**
```
P(hit at location L | plane returned) ≠ P(hit at L)
Armor argmin_L P(hit at L | returned)  # the missing holes
```
**Application:** Every dataset of "what worked" is survivorship-biased. Study the dead.

### B4. Taleb barbell / convexity
**Source:** Taleb, *Antifragile* (2012); Taleb & Douady (2013), *Quantitative Finance*.
**Finding:** Combine extreme safety (majority) with extreme risk (minority); avoid the middle.
**Formula:**
```
Portfolio = (1-α) · safe + α · convex_bet,   α small
E[payoff] dominated by convex_bet's positive tail if f(x) is convex
```
**Application:** Cash floor + asymmetric bets beats "balanced" allocation for antifragile payoff.

### B5. UCB1 exploration bonus
**Source:** Auer, Cesa-Bianchi, Fischer (2002), *Machine Learning*.
**Formula:**
```
UCB1(arm i) = mean_i + sqrt(2 · ln(N) / n_i)
```
**Application:** The underdog arm gets a mathematically justified bonus proportional to its under-sampling. Regret is O(log N).

### B6. Dyson sequential search
**Source:** Freeman Dyson, *Disturbing the Universe* (1979); operations research on Bomber Command.
**Finding:** Sequential search with adaptive stopping beats fixed-plan search when target distribution is unknown.
**Application:** Ship, measure, adapt beats plan-then-execute when the prior is weak.

### B7. Pivot-as-real-option
**Source:** Dixit & Pindyck, *Investment Under Uncertainty* (1994); McGrath (1999), *Academy of Management Review*.
**Formula:**
```
Value(project) = NPV(current_plan) + OptionValue(pivot)
OptionValue rises with volatility σ
```
**Application:** High-uncertainty ventures are worth *more* than their NPV because the option to pivot has positive value. Underdogs live here.

---

## C. Chatterings Formalized

Folk laws that deserve first-class status.

| # | Law | Statement | Named Source |
|---|-----|-----------|--------------|
| C1 | **Goodhart's Law** | When a measure becomes a target, it ceases to be a good measure | Goodhart (1975); Strathern (1997) restatement |
| C2 | **Lindy Effect** | For non-perishable things, future life expectancy ∝ current age | Mandelbrot; Taleb (2012) |
| C3 | **Brooks's Law** | Adding manpower to a late software project makes it later | Brooks, *The Mythical Man-Month* (1975) |
| C4 | **Parkinson's Law** | Work expands to fill the time available | Parkinson (1955), *The Economist* |
| C5 | **Hofstadter's Law** | It always takes longer than you expect, even accounting for Hofstadter's Law | Hofstadter, *GEB* (1979) |
| C6 | **Cunningham's Law** | Best way to get the right answer is to post the wrong one | Attributed to Ward Cunningham |
| C7 | **K-factor** | Viral coefficient: k = invites_sent × conversion_rate; k>1 → viral | Epidemiology, adapted for growth (Skok, 2009+) |

---

## D. Gaps — Explicitly Missing Formulas

These are the invention loop's first work queue. Each is wired as a **WR-4484 BNAT invention target**.

### D1. **The Underdog Composite** — CONSTRUCTED, NOT YET BACKTESTED
**Sketch:**
```
UnderdogScore = w1 · AsymmetryIndex     (Arreguin-Toft strategy mismatch)
              + w2 · ConvexityExposure   (Taleb barbell tail)
              + w3 · ExplorationBonus    (UCB1 term)
              + w4 · OptionValue         (pivot real-option)
              - w5 · GoodhartRisk        (target-as-measure penalty)
```
**Status:** CONSTRUCTED. No backtest. Do not deploy for capital allocation until validated on ≥3 out-of-sample domains.
**Owner:** WR-4484 BNAT queue, slot 1.

### D2. **Variance-injection timing for non-sports domains**
Beaudoin & Swartz solved hockey. No published closed-form for: startup pivots, career changes, product relaunches. **Gap.**
**Owner:** WR-4484, slot 2.

### D3. **Survivorship correction for founder-advice corpora**
Every "how I built X" essay is Wald's returning-plane. No formula quantifies the missing-holes distribution in startup advice datasets. **Gap.**
**Owner:** WR-4484, slot 3.

### D4. **Drift-aware replacement for COCOMO**
A1–A4 kill COCOMO but nothing replaces it that handles stack-drift natively. **Gap.**
**Owner:** WR-4484, slot 4.

### D5. **Causal NPS / multi-touch attribution unified model**
A7 and A8 both fail; no accepted unifier that is causal, cheap, and shippable. **Gap.**
**Owner:** WR-4484, slot 5.

---

## Review Focus

Per issue: **Section D**. These five gaps are the invention loop's first work queue. Each must produce, in order: (i) a candidate formula, (ii) a backtest protocol, (iii) a named domain of first application, (iv) a kill-criterion that would retire it.

## Provenance

- Register band: 44xx (Wisdom / Immune System)
- Companion: WR-4484 (BNAT invention loop)
- Revision: rev-0
- Closes: #16674, #16676, #16678, #16681, #16683, #16685, #16687, #16689, #16691, #16694, #16698, #16700, #16702, #16704, #16706
