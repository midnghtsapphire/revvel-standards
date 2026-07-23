# WR-4484 — Autonomous BNAT Invention Loop (human-gated)

**Status:** rev-0
**Band:** 44xx (Autonomy / Invention)
**Related:** WR-4483 (Ensemble AHP + RICE decision math)
**Autonomy directive:** 🛑 **HUMAN MERGE REQUIRED** before any launch, listing, or filing.

---

## 1. Purpose

Define a repeatable, math-anchored, **human-gated** loop by which autonomous agents:

1. Scan for gaps in the BNAT (Best-Next-Available-Thing) landscape,
2. Invent candidate solutions,
3. Screen with kill-discipline (DOE-5),
4. Decide with WR-4483 ensemble (AHP + RICE),
5. Build M1 (milestone-1) skeletons,
6. Draft IP artifacts (patents, trademarks, copyright notices, disclosures),

and then **stop** at a hard human-merge gate. No agent-authored artifact ships, lists, or files without a named human reviewer of record.

The loop is optimized to convert scanning cycles into **calibrated, defensible invention throughput** — a direct input to the prime directive ($10k/mo → $10M in 3 years) via Polar.sh-fundable OSINT and automation products.

---

## 2. Hard constraints (non-negotiable)

These constraints are enforced in code (CI checks) and in policy (CODEOWNERS + branch protection):

| # | Constraint | Enforcement |
|---|---|---|
| H1 | An **AI agent is never listed as inventor or author of record.** See *Thaler v. Vidal* (Fed. Cir. 2022) and USCO 2023 AI-generated works guidance. | PR template checkbox; CODEOWNERS review |
| H2 | Agents **draft**; a named human **signs, files, and is legally accountable**. | Filing pipeline requires human GPG signature |
| H3 | **No autonomous filing** with USPTO, USCO, EUIPO, WIPO, or any registrar. Agents may only produce drafts in `/drafts/`. | Filesystem policy + CI |
| H4 | **No autonomous launch, listing, publication, or public release** of agent-generated products. | Deployment workflows gated on `human-approved` label |
| H5 | **Kill rate must remain a KPI.** A rolling 0% kill rate over ≥ 10 candidates is a red flag and triggers a review of screening rigor. | Weekly dashboard |
| H6 | **Calibration is the north-star metric**, not approval rate. Target: Brier score < 0.20 on agent forecasts of "will pass human gate." | Monthly calibration audit |
| H7 | WIP is capped per Little's Law: `WIP ≤ throughput × cycle_time`. Overflow candidates are queued, not force-decided. | Backlog automation |
| H8 | Every stage output **cites the named math** it used. Uncited outputs are auto-rejected at the gate. | CI lint on stage artifacts |

---

## 3. Named math (cited at every stage)

| Stage | Method | Citation |
|---|---|---|
| SCAN | **Ulwick Opportunity Score** = Importance + max(Importance − Satisfaction, 0) | Ulwick, *What Customers Want* (2005) |
| INVENT | **TRIZ** 40 inventive principles + contradiction matrix | Altshuller (1946–1985) |
| SCREEN | **DOE-5 kill discipline**: 5 orthogonal Design-of-Experiments factors; any factor failing pre-set threshold ⇒ kill | Fisher (1935); Montgomery (2017) |
| DECIDE | **WR-4483 ensemble**: AHP pairwise consistency (CR < 0.10) + RICE (Reach × Impact × Confidence / Effort) | Saaty (1980); Intercom RICE (2016) |
| BUILD-M1 | **Little's Law** WIP cap; minimum-viable skeleton only | Little (1961) |
| DRAFT-IP | **Graham factors** for non-obviousness (patents); **Abercrombie spectrum** for trademarks | *Graham v. John Deere* (1966); *Abercrombie v. Hunting World* (1976) |
| GATE | **Brier score** calibration on agent's own "will-pass" forecast | Brier (1950) |

---

## 4. Loop stages

### 4.1 SCAN
- **Input:** market signals, GitHub issues, Polar.sh funded-issue feed, OSINT trend scans.
- **Method:** compute Ulwick Opportunity Score for each detected job-to-be-done.
- **Output:** ranked gap list, each row citing `(Importance, Satisfaction, OppScore)`.
- **Kill rule:** OppScore < 10 ⇒ drop.

### 4.2 INVENT
- **Input:** top-N gaps from SCAN.
- **Method:** apply TRIZ principles; generate ≥ 3 divergent candidate concepts per gap.
- **Output:** candidate register with TRIZ principle IDs cited.

### 4.3 SCREEN (DOE-5)
Five orthogonal factors, each with a pre-registered kill threshold:

1. **Technical feasibility** (0–5, kill < 2)
2. **Legal clearance** (freedom-to-operate; kill on unresolved blocker)
3. **Market pull** (≥ 1 named prospective payer; kill if 0)
4. **Unit economics** (contribution margin ≥ 40%; kill otherwise)
5. **Time-to-M1** (≤ 14 days of agent-hours; kill otherwise)

**Kill discipline KPI:** target kill rate 40–70%. Outside band ⇒ review.

### 4.4 DECIDE (WR-4483)
- **AHP:** pairwise comparison of survivors on the 5 DOE factors. Reject if Consistency Ratio ≥ 0.10.
- **RICE:** score = (Reach × Impact × Confidence) / Effort.
- **Ensemble:** rank by AHP-weight-normalized RICE. Top-K forwarded to BUILD-M1.

### 4.5 BUILD-M1
- Agent produces the **minimum skeleton**: README, interface stubs, one runnable happy-path test, license header.
- **No production deploy.** Artifacts land in `/candidates/<id>/`.

### 4.6 DRAFT-IP
Agent may draft (never file):
- Provisional-patent-style **invention disclosure** (with Graham-factor analysis for non-obviousness),
- Trademark candidate list with **Abercrombie spectrum** classification (fanciful / arbitrary / suggestive / descriptive / generic),
- Copyright notices,
- Trade-secret / confidentiality checklist.

All IP drafts land in `/drafts/ip/<id>/` and are labeled `agent-drafted, human-review-required`.

### 4.7 GATE 🛑 (hard human merge)
- Named human reviewer (CODEOWNERS) inspects: stage citations, kill-rate KPI, AHP CR, RICE math, IP draft.
- Reviewer records **binary decision** and their **pre-decision forecast** for the Brier calibration ledger.
- Only on human merge does anything proceed to launch / listing / filing — and those steps are executed by the **human**, not the agent.

---

## 5. Metrics & dashboards

| Metric | Target | Cadence |
|---|---|---|
| Kill rate (SCREEN) | 40–70% | weekly |
| AHP Consistency Ratio | < 0.10 | per decision |
| Brier score (agent gate-forecast) | < 0.20 | monthly |
| WIP vs Little's-Law cap | ≤ 1.0 | daily |
| Human-merge latency | < 5 business days | weekly |
| Agent-drafted IP disclosures reviewed | 100% before any filing | per artifact |

**Approval rate is explicitly NOT a target.** Optimizing approval rate incentivizes sycophantic candidate selection. Calibration is the target.

---

## 6. Revenue linkage (prime directive)

This loop feeds the $10k → $10M ladder by:

- **Phase 1 ($10k/mo):** Polar.sh-funded OSINT micro-tools drafted by the loop, shipped by humans.
- **Phase 2 ($30k/mo):** productized invention pipeline sold as a service to other GitHub-native builders.
- **Phase 3 ($100k/mo):** licensable IP portfolio drafted by the loop, filed by human counsel.
- **Phase 4 ($10M total):** portfolio-level exits (licensing, acquisition, or category dominance in agent-drafted / human-filed IP).

---

## 7. Change control

- This document is **rev-0**. Changes require PR + WR-register label `wr-register`.
- Any relaxation of §2 hard constraints requires explicit human sign-off from repo owner and a linked risk memo.
- Any addition of a new stage must cite named math (§3 table) or it will be rejected at review.

---

## 8. References

- *Thaler v. Vidal*, 43 F.4th 1207 (Fed. Cir. 2022) — AI cannot be named inventor.
- U.S. Copyright Office, *Copyright Registration Guidance: Works Containing Material Generated by Artificial Intelligence* (March 2023).
- Ulwick, A. *What Customers Want* (2005).
- Altshuller, G. *TRIZ / 40 Inventive Principles*.
- Fisher, R. A. *The Design of Experiments* (1935); Montgomery, D. C. *DOE* (2017).
- Saaty, T. L. *The Analytic Hierarchy Process* (1980).
- Intercom, *RICE scoring* (2016).
- Little, J. D. C. *A Proof for the Queuing Formula L = λW* (1961).
- *Graham v. John Deere Co.*, 383 U.S. 1 (1966).
- *Abercrombie & Fitch Co. v. Hunting World, Inc.*, 537 F.2d 4 (2d Cir. 1976).
- Brier, G. W. *Verification of Forecasts Expressed in Terms of Probability* (1950).
