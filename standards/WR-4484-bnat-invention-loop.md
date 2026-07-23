# WR-4484 — Autonomous BNAT Invention Loop (human-gated)

**Register:** WR (Working Register)
**Band:** 44xx (Autonomous Invention / IP Pipeline)
**Revision:** 0
**Status:** DRAFT — HUMAN MERGE REQUIRED
**Depends on:** WR-4483 (Ensemble AHP + RICE decision framework)
**Labels:** `wr-register`, `band-44xx`, `rev-0`

---

## 0. Autonomy Directive Band

> **HUMAN MERGE REQUIRED.** This document defines an autonomous loop in which
> LLM-driven agents may **draft, screen, decide, and prototype**, but **must not**
> unilaterally launch, list, file, or publish. Every terminal action passes
> through the **GATE** stage (Section 6) and requires a signed human merge.

**Legal reality (non-negotiable):**
- *Thaler v. Vidal*, 43 F.4th 1207 (Fed. Cir. 2022): AI cannot be a named inventor on a US patent.
- USCO Guidance (March 2023, 88 FR 16190): human authorship required for copyright.
- Therefore: **agents draft; a human is the inventor / author of record**; agents never file with USPTO, USCO, or any registry.

---

## 1. Purpose

Provide a repeatable, auditable pipeline in which autonomous agents:

1. **Scan** for unmet-need gaps (Ulwick Opportunity Score ≥ 12).
2. **Invent** candidate solutions (TRIZ 40 principles + SCAMPER + morphological analysis).
3. **Screen** with DOE-5 kill discipline (≥ 60% kill rate target; 0% is a red flag).
4. **Decide** via WR-4483 ensemble AHP + RICE.
5. **Build** M1 (Milestone-1) skeletons — code, spec, or bench artifact.
6. **Draft** IP artifacts (provisional claims, prior-art map, FTO memo).
7. **GATE** — hard-stop for human merge before any external action.

The loop's north-star KPI is **calibration (Brier score < 0.20)**, not throughput and not approval rate.

---

## 2. Hard constraints (non-negotiable)

| # | Constraint | Enforcement |
|---|---|---|
| C1 | No agent may file with USPTO, USCO, EUIPO, or any registry. | CI check: block PRs touching `filings/` without `human-signed: true` frontmatter. |
| C2 | Human of record must appear in `inventors:` / `authors:` frontmatter before GATE closes. | GATE workflow requires non-empty field with verified GitHub identity. |
| C3 | No launch, listing (Polar.sh, Gumroad, Stripe, App Store, etc.), or public publication without merged GATE PR. | Deploy workflows gated on `bnat-approved` label, applied only by CODEOWNERS. |
| C4 | Kill rate over any rolling 20-candidate window must be **≥ 40%**. A 0% kill rate triggers loop pause. | Weekly cron in `.github/workflows/bnat-kill-audit.yml`. |
| C5 | Brier score on agent forecasts must stay **< 0.20** over rolling 50 forecasts. | Recalibration halts new inventions if breached. |
| C6 | WIP cap per Little's Law: `WIP ≤ throughput × cycle_time`. Default `WIP_MAX = 7`. | Loop scheduler refuses new SCAN when open candidates ≥ WIP_MAX. |
| C7 | Every stage cites its named math / method in the artifact. | Lint rule: `bnat-lint` rejects artifacts missing `method:` block. |

---

## 3. Stages

### 3.1 SCAN — gap discovery
- **Method:** Ulwick Opportunity Score = Importance + max(0, Importance − Satisfaction)
- **Trigger:** score ≥ 12 on a 1–10 scale.
- **Inputs:** GitHub issues, HN/Reddit scrapes, Polar.sh funding signals, OSINT feeds.
- **Output:** `candidates/<id>/scan.md` with `method: ulwick-opp-score`.

### 3.2 INVENT — solution generation
- **Method:** TRIZ 40 inventive principles + SCAMPER + morphological box.
- **Agent target:** ≥ 5 distinct concepts per gap; diversity check via cosine distance ≥ 0.35 between embeddings.
- **Output:** `candidates/<id>/inventions.md`.

### 3.3 SCREEN — DOE-5 kill discipline
- **Method:** Design-of-Experiments with 5 fatal-flaw probes:
 1. Physics/legality feasibility
 2. Market pull (paid signal ≥ 3 independent sources)
 3. Prior art / FTO (freedom-to-operate quick search)
 4. Unit economics (LTV/CAC ≥ 3 modelled)
 5. Time-to-M1 ≤ 14 days
- **Kill rule:** any probe = FAIL ⇒ candidate killed and logged.
- **KPI:** rolling kill rate ≥ 40% (C4). 0% kill rate = red flag; escalate.
- **Output:** `candidates/<id>/screen.md` with pass/fail per probe.

### 3.4 DECIDE — WR-4483 ensemble
- **Method:** Ensemble AHP (Saaty consistency ratio ≤ 0.10) × RICE (Reach·Impact·Confidence / Effort).
- **Cutoff:** composite score ≥ WR-4483 threshold (currently 0.62).
- **Output:** `candidates/<id>/decide.md` with AHP matrix, RICE table, composite.

### 3.5 BUILD-M1 — skeleton artifact
- **Definition of M1:** minimum artifact that a human can *see run* — code stub with passing test, bench sketch with parts list, or spec with acceptance criteria.
- **Budget:** ≤ 14 days wall-clock; ≤ $50 external cost (agent's proposed budget must be pre-approved via GATE-lite).
- **Output:** `candidates/<id>/m1/` directory.

### 3.6 IP-DRAFT — patent/copyright artifacts
- **Method:** Draft-only. Agents produce:
 - Prior-art map (≥ 10 references, at least 3 patents, at least 3 non-patent).
 - Provisional-claim skeleton (independent claim + 3 dependents, drafted for human review).
 - FTO memo citing candidate blocking claims.
- **Prohibited:** any submission to USPTO/USCO/EUIPO. Filing is a human act.
- **Output:** `candidates/<id>/ip/` (never in `filings/` until human-signed).

### 3.7 GATE — human merge (HARD STOP)
- **Required for merge:**
 - `inventors:` / `authors:` frontmatter populated with a human GitHub handle.
 - CODEOWNERS review approving the `bnat-approved` label.
 - All C1–C7 checks green.
 - Kill-rate and Brier-score dashboards green.
- **On merge:** candidate may proceed to launch, listing, or filing — *executed by a human*.

---

## 4. Metrics & calibration

| Metric | Target | Rationale |
|---|---|---|
| Brier score (agent forecasts) | < 0.20 | Calibration > approval rate |
| Kill rate (rolling 20) | ≥ 40% | DOE-5 discipline |
| WIP | ≤ 7 | Little's Law |
| Cycle time SCAN→GATE | ≤ 30 days | Throughput hygiene |
| Human-merge rate | not optimised | Optimising this incentivises unsafe drafts |

---

## 5. Revenue linkage ($10k → $10M)

BNAT feeds the $10M mission by:
- **Phase 1 ($10k/mo):** shipping small OSINT tools + Polar.sh-funded utilities generated by this loop.
- **Phase 2 ($30k/mo):** productising the highest-RICE M1 skeletons into paid tiers.
- **Phase 3 ($100k/mo):** IP moat — provisional filings (human-executed) around top-decile inventions.
- **Phase 4 ($10M):** licensing / acquisition optionality on the moated portfolio.

---

## 6. Change log

- **rev-0** — initial draft; encodes hard human-merge gate, DOE-5 kill discipline, Brier calibration target, and WR-4483 dependency.

---

## 7. Review focus for reviewers

1. **Section 0** — autonomy directive band. Confirm HUMAN MERGE REQUIRED language is acceptable.
2. **Section 2** — hard constraints C1–C7. Confirm CI enforcement plan is realistic.
3. **Section 3.7** — GATE stage. Confirm no agent action can bypass it.
4. **Section 3.6** — IP-DRAFT. Confirm no path exists for agents to file.

Closes #16669, #16670, #16671, #16672, #16673, #16675, #16677, #16679, #16680, #16682, #16684, #16686, #16688, #16690, #16693, #16696, #16699, #16701, #16703, #16705.
