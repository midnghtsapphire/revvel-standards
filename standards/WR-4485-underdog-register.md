# WR-4485 — The Underdog Register

**Band:** 44xx (Register / Catalog)
**Revision:** 0
**Status:** Living document
**Labels:** wr-register, band-44xx, rev-0
**Sibling:** WR-4484 (BNAT invention loop — consumes Section D as work queue)

> The catalog's immune system. Negative knowledge, comeback math, formalized folk
> wisdom, and explicit gaps. If it's in here it's either (a) a formula that got
> people killed, (b) a formula that let a smaller party win anyway, (c) a saying
> we finally pinned down, or (d) a hole we admit we haven't filled yet.

---

## A. Failed Formulas — Negative Knowledge

Models that shipped, scaled, and detonated. Cited so nobody re-derives them
thinking they're novel.

| # | Formula / Practice | Domain | Failure Mode | Named Source / Post-mortem |
|---|---|---|---|---|
| A1 | **Gaussian copula** (Li, 2000) — `C(u,v) = Φ₂(Φ⁻¹(u), Φ⁻¹(v); ρ)` | Credit derivatives (CDOs) | Assumes joint-normal tails; correlations → 1 in crisis; mispriced default clustering | Salmon, *Wired* 2009 "Recipe for Disaster"; MacKenzie & Spears 2014 |
| A2 | **VaR under normality** — `VaR_α = μ + σΦ⁻¹(α)` | Bank risk mgmt | Thin-tail assumption; ignores regime shifts and endogenous liquidity | Taleb, *The Black Swan* (2007); Basel III post-2008 revisions |
| A3 | **LTCM convergence trades** (Merton/Scholes dynamic hedging at 25:1 leverage) | Fixed-income arb | Correlation breakdown + liquidity spiral on Russia default (Aug 1998) | Lowenstein, *When Genius Failed* (2000) |
| A4 | **COCOMO / COCOMO II effort estimation** — `E = a·KLOC^b · Π EM_i` | Software estimation | Systematic under-estimation drift; parameters non-stationary across tech generations | Molokken & Jorgensen 2003 meta-review; Standish CHAOS reports |
| A5 | **Forced / stack ranking** ("rank-and-yank", GE/Microsoft) | People ops | Destroys collaboration; optimizes for visibility not output; Goodhart's Law in HR | Kwoh, *WSJ* 2012; Microsoft abandoned 2013; Cappelli & Tavis, *HBR* 2016 |
| A6 | **MBTI** as hiring/team-composition signal | Org design | Test-retest reliability ~0.5; no predictive validity on job performance | Pittenger 1993, *Consulting Psych J*; Grant, *Psychology Today* 2013 |
| A7 | **NPS as causal KPI** — `NPS = %promoters − %detractors` | Product / growth | Measures a summary, not a driver; goodharts into survey-gaming; no dose-response to revenue | Keiningham et al. 2007, *J. Marketing*; Fisher & Kordupleski 2019 |
| A8 | **Last-click attribution** | Marketing analytics | Ignores assist channels; systematically overpays lower-funnel; kills brand & discovery spend | Google Analytics' own multi-touch docs; Berman 2018 *Mgmt Sci* on attribution bias |

**Rule of use:** if a proposed WR cites one of the above as its core mechanic
without also citing its post-mortem, it fails intake.

---

## B. Underdog Math — Comeback Formulas (Peer-Reviewed)

Real studies where the smaller/weaker party's win rate is quantifiable.

### B1. Arreguin-Toft asymmetric conflict
- **Claim:** In interstate wars 1800–2003, the materially weaker side won ~28.5%
  overall, and won **~63%** when it adopted an *opposite-strategy* approach
  (guerrilla vs. conventional, or vice-versa) against the stronger side.
- **Source:** Arreguín-Toft, *How the Weak Win Wars* (Cambridge, 2005);
  *International Security* 26(1), 2001.
- **Catalog use:** pick the axis the incumbent can't rotate on.

### B2. Pulled-goalie timing (variance injection)
- **Claim:** Optimal pull time in NHL is far earlier than convention — often
  ~3:00–6:00 remaining when down one, earlier when down two. Trades expected
  goals-against for a higher-variance state that dominates the trailing team's
  utility function.
- **Source:** Beaudoin & Swartz, *J. Quantitative Analysis in Sports* 6(1), 2010;
  Asness & Brown 2018 replication.
- **Catalog use:** when behind, deliberately increase outcome variance.
  `E[V | behind] > E[V | behind, low-variance play]` even when `E[goals]` worsens.

### B3. Wald survivorship correction
- **Claim:** Observed damage on returning bombers marks *non-lethal* hit zones;
  armor belongs where returning planes were *not* hit (engines, cockpit).
- **Source:** Wald, Statistical Research Group memo (1943); Mangel & Samaniego
  1984, *JASA*.
- **Catalog use:** invert every "best practices from winners" dataset before
  citing it.

### B4. Taleb barbell / convexity
- **Claim:** Portfolio of `w` in maximally safe + `(1−w)` in maximally convex
  bets dominates the "prudent middle" under fat tails. Payoff `f(x)` with
  `f''(x) > 0` benefits from volatility (Jensen's inequality).
- **Source:** Taleb, *Antifragile* (2012); Taleb & Douady 2013 on convexity.
- **Catalog use:** underdog capital allocation — no medium-risk positions.

### B5. UCB1 exploration bonus
- **Claim:** Pick arm `i` maximizing `x̄_i + √(2 ln n / n_i)`. Regret bound
  `O(log n)`. The `√(ln n / n_i)` term is the mathematical justification for
  exploring under-sampled options — literally an underdog bonus.
- **Source:** Auer, Cesa-Bianchi, Fischer 2002, *Machine Learning* 47.
- **Catalog use:** rank experiments; the least-tried live option gets a bonus
  proportional to `√(ln n / n_i)`.

### B6. Dyson sequential search / secretary-style
- **Claim:** For an unknown-length sequence with a stopping cost, optimal policy
  is threshold-based; the classic `1/e ≈ 36.8%` observation-then-commit rule
  applies to hiring, deal-picking, and pivot-timing.
- **Source:** Gilbert & Mosteller 1966, *JASA*; Ferguson 1989 review.
- **Catalog use:** don't commit before `n/e`; don't wait past the last credible
  candidate.

### B7. Pivot as real option
- **Claim:** A startup pivot is a call option on a new payoff distribution with
  strike = switching cost. Black-Scholes-style: option value rises with
  volatility of the new domain. Underdogs *should* pivot into higher-variance
  markets.
- **Source:** Dixit & Pindyck, *Investment Under Uncertainty* (1994); McGrath
  1999 *AMR* on real options in entrepreneurship.
- **Catalog use:** value a pivot at `max(0, E[V_new] − V_current − c_switch)`
  with volatility premium.

---

## C. Chatterings Formalized

Folk wisdom with a defensible mechanism. Included so we stop apologizing when
we cite them.

| # | Name | Statement | Mechanism |
|---|---|---|---|
| C1 | **Goodhart's Law** | "When a measure becomes a target, it ceases to be a good measure." | Optimization pressure collapses proxy-target correlation (Manheim & Garrabrant 2018 taxonomy: regressional, extremal, causal, adversarial). |
| C2 | **Lindy Effect** | Expected remaining life of a non-perishable ∝ current age. | Survivorship-implied hazard: `h(t) ∝ 1/t` ⇒ `E[T−t \| T>t] ≈ t`. |
| C3 | **Brooks's Law** | "Adding manpower to a late software project makes it later." | Onboarding cost + communication edges grow `O(n²)` vs. linear labor gain. |
| C4 | **Parkinson's Law** | "Work expands to fill the time available." | Absence of a binding constraint ⇒ scope inflation to fill slack. |
| C5 | **Hofstadter's Law** | "It always takes longer than you expect, even accounting for Hofstadter's Law." | Planning-fallacy fixed point; recursive underestimation of unknown-unknowns. |
| C6 | **Cunningham's Law** | "Best way to get the right answer is to post the wrong one." | Correction is lower-effort than generation; asymmetric response cost. |
| C7 | **K-factor** (virality) | `K = i · c` where `i` = invites/user, `c` = conversion rate. Growth iff `K > 1`. | Branching process; `K` = basic reproduction number `R₀` from epidemiology. |

---

## D. Gaps — Explicit Missing Formulas (→ WR-4484 work queue)

We do not have these yet. They are wired as invention targets for the BNAT loop.

### D1. **Underdog Composite Index** — `U = f(asymmetry, convexity, time_horizon, variance_budget)`
- **Status:** CONSTRUCTED (not yet backtested).
- **Sketch:** `U = w₁·A + w₂·C + w₃·log(T) + w₄·V` where `A` = Arreguin-Toft-
  style strategy-axis mismatch score, `C` = convexity of payoff, `T` = horizon,
  `V` = tolerated variance. Weights unknown.
- **Blocker:** need a labeled dataset of underdog wins/losses to fit weights.
- **Owner (WR-4484 ticket):** `BNAT-D1`.

### D2. **Optimal variance-injection schedule under a scoreboard deficit**
- **Status:** MISSING.
- **Analog:** Beaudoin & Swartz solved it for hockey. We lack a general form for
  business (deficit in revenue, users, runway).
- **Blocker:** define the utility function whose second derivative flips sign
  at the deficit threshold.
- **Owner:** `BNAT-D2`.

### D3. **Anti-Goodhart metric family** — metrics provably resistant to gaming
- **Status:** MISSING (Manheim & Garrabrant give a taxonomy of failures, not a
  constructive alternative).
- **Sketch direction:** ensemble of orthogonal proxies + adversarial audit;
  measure = infimum over gaming strategies.
- **Owner:** `BNAT-D3`.

### D4. **Pivot-timing rule with learning** — extension of B6 when observations
  update the payoff distribution (Bayesian secretary)
- **Status:** MISSING in closed form for the parameter regimes we care about.
- **Related:** Bruss 2000 odds-algorithm; but assumes known success prob.
- **Owner:** `BNAT-D4`.

### D5. **Convexity budget under a fixed runway** — barbell (B4) constrained by
  a hard cash-out date
- **Status:** MISSING. Taleb's barbell assumes indefinite horizon; startups have
  a runway cliff that truncates the tail.
- **Sketch:** dynamic-programming reformulation of barbell with terminal-wealth
  constraint at `T = runway`.
- **Owner:** `BNAT-D5`.

---

## Intake rule (how this register is used)

1. Any new WR citing a Section A formula without its post-mortem → **reject**.
2. Any new WR claiming an underdog strategy → must map to a B-row or a D-row.
3. Any new WR quoting a chattering ("just Lindy it") → must cite the C-row
   mechanism, not the slogan.
4. Section D is the standing agenda for WR-4484. Closing a D-item requires:
   named formula, derivation, ≥1 backtest, and a post-mortem stub for when it
   fails (it will).

---

## Revision log

- **rev-0** — initial register: 8 failed formulas, 7 underdog results, 7
  chatterings, 5 gaps. Underdog Composite (D1) explicitly labeled CONSTRUCTED
  until backtested.
