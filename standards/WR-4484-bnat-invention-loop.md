# WR-4484 — Autonomous BNAT Invention Loop (Human-Gated)

**Register:** wr-register
**Band:** 44xx
**Revision:** rev-0
**Status:** Draft — HUMAN MERGE REQUIRED
**Autonomy Directive:** Agents draft; humans decide, sign, and file.

---

## 1. Purpose

Establish a repeatable, auditable, human-gated loop in which autonomous agents scan for opportunity gaps, invent candidate solutions (BNAT = Best New Available Thing), screen them with kill-first discipline, decide via ensemble methods, build M1 skeletons, and draft intellectual-property artifacts — **without ever autonomously launching, listing, or filing**.

This standard exists to convert speculative agent output into **calibrated, defensible invention pipeline throughput** in service of the prime directive: **$10k/month → $10M in 3 years**.

---

## 2. Scope

Applies to any agent, workflow, or pipeline in this repository that:

- Proposes new products, features, listings, or IP filings
- Screens or ranks invention candidates
- Drafts patent, trademark, copyright, or provisional filings
- Publishes to Polar.sh, marketplaces, or app stores
- Generates OSINT-derived opportunity signals feeding invention

---

## 3. Hard Constraints (NON-NEGOTIABLE)

1. **Agents are not inventors or authors of record.** Per *Thaler v. Vidal* (Fed. Cir. 2022) and the USCO March 2023 guidance, only natural persons may be named. Agents draft; humans sign.
2. **No autonomous filing.** No agent may submit to USPTO, EUIPO, WIPO, USCO, or any registrar. All filings require a signed human merge of the artifact PR.
3. **No autonomous launch.** No agent may publish a paid product, storefront listing, or public offer without a human-approved release PR.
4. **Kill discipline is mandatory.** A 0% kill rate over any rolling 20-candidate window is a **red flag** and auto-pauses the loop pending human review.
5. **Calibration over approval.** The loop optimizes **Brier score < 0.20**, not raw approval count.
6. **WIP cap enforced via Little's Law.** `WIP ≤ throughput × cycle_time`. Default WIP = 5 concurrent candidates past screening.
7. **Every stage cites its math.** Un-cited scoring is rejected at gate.

---

## 4. Stage Pipeline

```
[SCAN] → [INVENT] → [SCREEN] → [DECIDE] → [BUILD-M1] → [DRAFT-IP] → [GATE] → (human merge) → LAUNCH/FILE
```

### 4.1 SCAN — Opportunity Detection
- **Math:** Ulwick Opportunity Score = `Importance + max(Importance − Satisfaction, 0)`
- **Inputs:** OSINT feeds, GitHub issue mining, Polar.sh funding signals, marketplace gaps
- **Output:** Ranked gap list with cited sources
- **Kill threshold:** Opportunity Score < 12 → drop

### 4.2 INVENT — Candidate Generation
- **Math:** TRIZ 40 inventive principles as generator seeds; contradiction matrix for conflict resolution
- **Output:** ≥3 candidate solutions per gap, each with a stated technical/business contradiction resolved
- **Constraint:** No candidate proceeds without an explicit prior-art delta statement

### 4.3 SCREEN — DOE-5 Kill Discipline
- **Math:** Design of Experiments with 5 orthogonal kill criteria:
  1. Legal blocker (existing IP, regulated market)
  2. Technical infeasibility at M1 budget
  3. Market size < $100k ARR ceiling
  4. Distribution channel absent
  5. Unit economics negative at plausible CAC
- **Rule:** ANY criterion fails → KILL. No overrides.
- **KPI:** Kill rate target 60–85% of screened candidates.

### 4.4 DECIDE — WR-4483 Ensemble (AHP + RICE)
- **Math:**
  - AHP (Saaty) pairwise consistency ratio CR < 0.10 required
  - RICE = `(Reach × Impact × Confidence) / Effort`
  - Ensemble rank = weighted mean of normalized AHP and RICE ranks
- **Confidence input:** Brier-calibrated agent forecasts only
- **Output:** Top-N ranked, N ≤ WIP cap

### 4.5 BUILD-M1 — Minimum Viable Skeleton
- Scaffolded repo/module, tests, README, pricing hypothesis, Polar.sh product draft (unpublished)
- **Budget cap:** M1 ≤ 8 agent-hours, ≤ $0 cash spend

### 4.6 DRAFT-IP — Artifact Preparation
- Provisional patent draft, trademark search + application draft, copyright notice, defensive publication draft
- **Named inventor field:** LEFT BLANK — human fills at merge
- **Filing packet:** stored in `ip/drafts/<candidate-id>/`, never auto-submitted

### 4.7 GATE — Human Merge Required
- Agent opens PR with:
  - Full stage trace (SCAN → DRAFT-IP)
  - Cited math at each stage
  - Kill-log for sibling candidates
  - Brier calibration snapshot
  - Explicit checklist: `[ ] Human inventor named  [ ] Filing reviewed  [ ] Launch approved`
- **No auto-merge.** No bot may approve. Human review + signature required.

---

## 5. Metrics

| Metric | Target | Red Flag |
|---|---|---|
| Brier score (rolling 30d) | < 0.20 | > 0.30 |
| Kill rate (rolling 20) | 60–85% | 0% or 100% |
| WIP | ≤ 5 | > 5 |
| Cycle time SCAN→GATE | < 72h | > 168h |
| Human-merge acceptance | > 40% | < 20% |
| Cost per candidate at GATE | < $5 | > $20 |

---

## 6. Legal Notes

- *Thaler v. Vidal*, 43 F.4th 1207 (Fed. Cir. 2022): AI cannot be listed as inventor on US patents.
- USCO, *Copyright Registration Guidance: Works Containing Material Generated by Artificial Intelligence*, 88 Fed. Reg. 16190 (Mar. 16, 2023): human authorship required.
- Agents in this loop are **tools**, not authors or inventors. All artifacts are drafts prepared for human adoption, review, editing, and signature.

---

## 7. Prime-Directive Alignment

- **Phase 1 ($10k/mo):** Loop produces 2–4 human-approved launches/month via Polar.sh + OSINT tooling.
- **Phase 2 ($30k/mo):** Loop drives 8–12 launches/month; IP drafts begin accreting defensive moat.
- **Phase 3 ($100k/mo):** Portfolio effect; ensemble ranking + Brier calibration compound signal quality.
- **Phase 4 ($10M total):** Compounded, defensible, human-signed portfolio.

---

## 8. Change Control

- This standard is `rev-0`. Amendments require WR-register PR with human review.
- Loosening of §3 Hard Constraints requires explicit reviewer sign-off referencing the specific constraint number.

---

*Closes #16669, #16670, #16671, #16672, #16673, #16675.*
