# WR-4484 — Autonomous BNAT Invention Loop (human-gated)

**Status:** rev-0  
**Band:** 44xx (Autonomy / Agentic Systems)  
**Register:** wr-register  
**Closes:** #16669  
**Autonomy Directive:** **HUMAN MERGE REQUIRED** — agents draft; humans decide, sign, and file.

---

## 1. Summary

WR-4484 defines the **Autonomous BNAT (Blank-space / Novelty / Adjacency / Transfer) Invention Loop**. Agents continuously:

1. **Scan** for opportunity gaps in the product/IP landscape.
2. **Invent** candidate concepts using structured ideation.
3. **Screen** them with DOE-5 kill discipline.
4. **Decide** via WR-4483 ensemble (AHP + RICE).
5. **Build** M1 skeleton prototypes.
6. **Draft** IP artifacts (disclosures, claims, prior-art maps).

At every launch, listing, or filing boundary, a **hard human-merge gate** blocks autonomous action. Agents are drafters, not inventors of record.

---

## 2. Hard Constraints (READ FIRST)

These are non-negotiable. Any PR that weakens them must be rejected.

| # | Constraint | Rationale |
|---|------------|-----------|
| H1 | **Agents never file.** No USPTO, USCO, EUIPO, WIPO, or registrar submission may be initiated by an agent. | *Thaler v. Vidal* (Fed. Cir. 2022): AI cannot be an inventor. USCO 2023 guidance: human authorship required. |
| H2 | **Humans are inventor/author of record.** Every disclosure names a natural person who materially contributed to conception. | Legal validity of any resulting IP. |
| H3 | **Hard human-merge gate before launch, listing, or filing.** No autonomous merge to `main` for anything that ships, lists on a marketplace, or is submitted to a legal body. | Prevents runaway agents. |
| H4 | **Kill discipline is a KPI.** A 0% kill rate is a **red flag**, not a success. Target: 60–80% of screened concepts killed at DOE-5. | Prevents ideation inflation. |
| H5 | **Calibration, not approval rate, is the north-star metric.** Brier score < 0.20 on agent forecasts. | Approval rate rewards rubber-stamping; Brier rewards honesty. |
| H6 | **Every stage cites named math.** No hand-wavy scoring. See §4. | Auditability. |
| H7 | **WIP cap enforced via Little's Law.** `WIP ≤ throughput × cycle_time`. Overflow → queue, not parallelism. | Prevents thrash. |

---

## 3. Pipeline Stages

```
  SCAN ──► INVENT ──► SCREEN ──► DECIDE ──► BUILD-M1 ──► DRAFT-IP ──► [GATE] ──► human
   │         │          │          │           │            │            │
   Ulwick   TRIZ      DOE-5      WR-4483     M1 skel    disclosure    HUMAN
   Opp.    matrix    kill       AHP+RICE    (48h cap)   + claims      MERGE
   Score            discipline                          + prior-art   REQUIRED
```

### 3.1 SCAN
- **Input:** market signals, competitor filings, GitHub issues, Polar.sh funding requests, OSINT feeds.
- **Math:** **Ulwick Opportunity Score** = `Importance + max(0, Importance − Satisfaction)`.
- **Output:** ranked list of gaps with score ≥ 12 (Ulwick threshold).
- **Autonomy:** full agent.

### 3.2 INVENT
- **Input:** top-N gaps from SCAN.
- **Method:** **TRIZ** 40 inventive principles matrix + BNAT expansion (Blank-space, Novelty, Adjacency, Transfer).
- **Output:** ≥ 5 concepts per gap (forces diversity; solves anchoring bias).
- **Autonomy:** full agent.

### 3.3 SCREEN — DOE-5 Kill Discipline
- **Method:** **Design-of-Experiments, 5-factor screening** (feasibility, market, moat, unit-econ, legal).
- **Rule:** any factor scoring in bottom quintile → **KILL**. No appeals at this stage.
- **KPI:** kill rate ∈ [60%, 80%]. Outside band → recalibrate.
- **Autonomy:** full agent; kills are logged, not reviewed.

### 3.4 DECIDE — WR-4483 Ensemble
- **Method:** **AHP** (Analytic Hierarchy Process) for weighting + **RICE** (Reach × Impact × Confidence / Effort) for scoring.
- **Ensemble:** N=5 agent votes; median rank wins; disagreement > σ → escalate to human.
- **Confidence:** each agent emits a probability; **Brier score** tracked per agent over time.
- **Autonomy:** full agent; human escalation on disagreement only.

### 3.5 BUILD-M1
- **Cap:** 48 hours wall-clock per M1 skeleton.
- **Definition of Done:** minimal reproducible artifact (repo scaffold, one working path, README, LICENSE).
- **Autonomy:** full agent; auto-PR to a feature branch, **never `main`**.

### 3.6 DRAFT-IP
- **Artifacts:**
  - Invention Disclosure Form (IDF) — human inventor field **left blank for human to fill**.
  - Draft independent + dependent claims.
  - Prior-art map (with citations).
  - Freedom-to-Operate preliminary scan.
- **Autonomy:** full agent drafting; **zero autonomous filing** (H1).

### 3.7 GATE — Human Merge Required
- **Trigger:** any of {launch, marketplace listing, legal filing, `main` merge for shipping code}.
- **Required signatures:**
  1. Named human inventor/author (H2).
  2. Reviewer with `wr-register` write access.
  3. Legal reviewer for IP artifacts.
- **Timeout:** 14 days no-decision → auto-archive, not auto-approve.

---

## 4. Named Math — Citation Table

| Stage | Method | Citation |
|-------|--------|----------|
| SCAN | Ulwick Opportunity Score | Ulwick, *What Customers Want* (2005) |
| INVENT | TRIZ 40 Principles | Altshuller, *The Innovation Algorithm* (1999) |
| SCREEN | DOE-5 factor screening | Montgomery, *Design and Analysis of Experiments* (2017) |
| DECIDE | AHP | Saaty, *The Analytic Hierarchy Process* (1980) |
| DECIDE | RICE | Intercom product framework (2016) |
| DECIDE | Brier calibration | Brier (1950), *Monthly Weather Review* |
| FLOW | Little's Law WIP cap | Little (1961), *Operations Research* |

---

## 5. Legal Reality

- **Thaler v. Vidal**, 43 F.4th 1207 (Fed. Cir. 2022): under 35 U.S.C. § 100(f), an inventor must be a natural person. AI systems cannot be listed.
- **USCO Guidance (March 2023)**, *Copyright Registration Guidance: Works Containing Material Generated by Artificial Intelligence*: human authorship required; AI-generated portions must be disclaimed.
- **Operational consequence:** every IDF, patent draft, and copyright registration produced by this loop **must** be reviewed and adopted by a named human before submission. The human is the inventor/author of record; the agent is a tool.

---

## 6. KPIs & Anti-Metrics

### Primary KPIs
- **Brier score** across all agent forecasts: **target < 0.20**.
- **Kill rate** at DOE-5: **target 60–80%**.
- **Cycle time** SCAN → GATE: **target ≤ 14 days**.
- **Human-gate rejection rate:** monitored but not optimized (avoid Goodhart).

### Anti-Metrics (do NOT optimize)
- ❌ Approval rate (rewards rubber-stamping).
- ❌ Filings per month (H1 violation risk).
- ❌ Concepts generated per week (ideation inflation).

### Red Flags
- 0% kill rate → agents are not calibrated; halt loop.
- Brier > 0.25 for 2 consecutive weeks → retrain / re-prompt.
- Any autonomous filing attempt → **incident, kill switch, post-mortem**.

---

## 7. Kill Switch

A single environment variable `WR_4484_LOOP_ENABLED=false` halts the entire pipeline within one polling cycle. The switch is honored at every stage boundary.

---

## 8. Revenue Alignment (Prime Directive)

This loop directly feeds the **$10k/month → $10M in 3 years** trajectory:

- **Phase 1 ($10k/mo):** loop targets Polar.sh-fundable OSINT tools and dev-tool gaps.
- **Phase 2 ($30k/mo):** loop targets adjacent-market transfers from Phase-1 wins.
- **Phase 3 ($100k/mo):** loop targets IP-defensible moats; DRAFT-IP output ramps.
- **Phase 4 ($10M total):** IP portfolio + productized tooling compound.

Revenue attribution: every M1 skeleton carries a `revenue_hypothesis.md` estimating 12-month contribution; post-hoc actuals feed the Brier calibrator.

---

## 9. Review Focus for This PR

Reviewers must specifically confirm:

1. **§2 Hard Constraints** are intact and not softened.
2. **§3.7 GATE** requires human merge for launch/listing/filing.
3. **§5 Legal Reality** correctly cites Thaler and USCO 2023.
4. **§6** treats kill rate and Brier as primary; approval rate as anti-metric.

---

## 10. Revision History

| Rev | Date | Change | Author |
|-----|------|--------|--------|
| 0 | initial | Initial draft per issue #16669 | agent-drafted, human-of-record TBD at merge |
