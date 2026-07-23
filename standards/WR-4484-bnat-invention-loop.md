# WR-4484 — Autonomous BNAT Invention Loop (human-gated)

**Status:** rev-0  
**Band:** 44xx (Autonomy / Invention)  
**Labels:** `wr-register`, `band-44xx`, `rev-0`  
**Autonomy directive:** 🛑 **HUMAN MERGE REQUIRED** — agents draft; humans decide, sign, and file.

---

## 1. Purpose

Define the **Autonomous BNAT (Blank-space / Novel / Adjacent / Transformative) Invention Loop**: a human-gated pipeline in which agents continuously scan for opportunity gaps, invent candidate solutions, screen them with kill-discipline, decide via the WR-4483 ensemble (AHP + RICE), build M1 skeletons, and draft IP artifacts — **without ever autonomously launching, listing, or filing**.

The loop exists to feed the **$10k → $10M** trajectory (Phases 1–4) with a steady stream of screened, calibrated, IP-aware product bets, while keeping every legally-consequential act under human hands.

---

## 2. Hard constraints (non-negotiable)

These constraints are enforced at CI and PR-review level. Violation = automatic revert.

| # | Constraint | Rationale |
|---|---|---|
| H1 | **Agents never file.** No USPTO, USCO, EUIPO, domain, marketplace, App Store, Polar.sh product, or Stripe product creation may be executed by an agent. | *Thaler v. Vidal*, 43 F.4th 1207 (Fed. Cir. 2022): an AI cannot be an inventor. USCO 2023 guidance: human authorship required for © registration. |
| H2 | **Human is inventor/author of record.** Every IP artifact drafted by the loop must name a human inventor/author before submission. | Legal validity of the resulting right. |
| H3 | **Hard merge gate before launch.** No branch produced by the loop may be merged to `main` without a human approving reviewer on the PR. | Autonomy directive. |
| H4 | **Kill discipline is a KPI.** A 0% kill rate across a rolling 20-candidate window is a **red flag**, not a success. Target kill rate: **60–85%** at DOE-5. | Prevents rubber-stamping; enforces Ulwick/TRIZ rigor. |
| H5 | **Calibration, not approval, is the north-star metric.** Track **Brier score < 0.20** on agent go/no-go predictions vs. realized outcome at 90 days. | Approval rate is gameable; Brier is not. |
| H6 | **WIP cap enforced by Little's Law.** `WIP ≤ throughput × target_cycle_time`. Default: WIP ≤ 5 active candidates per agent lane. | Prevents thrash; keeps cycle time honest. |
| H7 | **Every stage cites named math.** No hand-wave scoring. | Auditability. |
| H8 | **No PII, no scraped copyrighted corpora, no trademarked marks** in drafted artifacts without human legal review. | Risk containment. |

---

## 3. Named-math contract

Every stage below must cite and compute at least one of:

- **Ulwick Opportunity Score** — `OS = importance + max(0, importance − satisfaction)` (Outcome-Driven Innovation, Ulwick 2005).
- **TRIZ contradiction matrix** — Altshuller's 40 inventive principles applied to the strongest tech/business contradiction in the gap.
- **DOE-5 kill screen** — a 5-factor design-of-experiments screen; a candidate must pass ≥ 4/5 factors to survive.
- **Brier score** — `BS = (1/N) Σ (p_i − o_i)²` on agent probability forecasts.
- **Little's Law** — `L = λ W` for WIP / throughput / cycle-time governance.
- **WR-4483 ensemble** — AHP (Saaty pairwise) × RICE (Reach × Impact × Confidence / Effort), normalized and combined per WR-4483.

If a stage output does not carry a named-math citation with computed values, CI fails.

---

## 4. Pipeline stages

```
  ┌────────┐  ┌─────────┐  ┌────────┐  ┌────────┐  ┌───────┐  ┌────────┐  ┌──────┐
  │  SCAN  │─▶│ INVENT  │─▶│ SCREEN │─▶│ DECIDE │─▶│ BUILD │─▶│  IP    │─▶│ GATE │
  │ (gaps) │  │ (BNAT)  │  │ (DOE-5)│  │(4483)  │  │ (M1)  │  │(draft) │  │(human│
  └────────┘  └─────────┘  └────────┘  └────────┘  └───────┘  └────────┘  │ merge│
                                                                          └──────┘
```

### 4.1 SCAN — opportunity discovery
- **Inputs:** GitHub trending, Polar.sh funded issues, OSINT feeds, our own telemetry, competitor changelogs.
- **Math:** Ulwick Opportunity Score per identified job-to-be-done.
- **Output:** ranked `gaps.jsonl` with `OS ≥ 12` shortlisted.
- **Agent role:** enumerate. **Human role:** none required.

### 4.2 INVENT — BNAT candidate generation
- **B**lank-space / **N**ovel / **A**djacent / **T**ransformative branches generated per gap.
- **Math:** TRIZ contradiction resolution; each candidate must name (a) the contradiction, (b) the applied inventive principle(s).
- **Output:** `candidates/{id}.md` with problem, contradiction, principle, sketch.

### 4.3 SCREEN — DOE-5 kill
Five factors (score 0–2 each; pass ≥ 4 of 5 non-zero):
1. **Demand signal** (evidence of paying willingness).
2. **Technical feasibility** (M1 buildable in ≤ 2 weeks).
3. **Freedom-to-operate** (no obvious blocking IP; human legal confirms later).
4. **Distribution channel** (we already own, or can cheaply rent, a channel).
5. **Unit economics** (LTV/CAC ≥ 3 modeled).

Candidates failing DOE-5 are **killed and logged** — kill logs are first-class artifacts (see H4).

### 4.4 DECIDE — WR-4483 ensemble (AHP + RICE)
- Apply WR-4483 pairwise AHP on strategic criteria; multiply by normalized RICE.
- Emit a probability `p` that the candidate hits its 90-day KPI. **This `p` is scored later by Brier.**
- Top-K (default K=3) advance to BUILD.

### 4.5 BUILD — M1 skeleton
- Agent scaffolds a minimal M1 in a feature branch: repo layout, README, pricing stub, Polar.sh product **draft** (unpublished), landing page copy.
- **No publishing. No listing. No payment link activation.** Everything is `draft: true` / `published: false`.

### 4.6 IP — draft artifacts
Agent drafts, in a `/ip-draft/` folder:
- Provisional patent skeleton (title, field, background, summary, drawings TODO, claims — human-inventor field **blank, to be filled by human**).
- © notice + authorship declaration template (human author **blank**).
- Trademark search checklist (human to execute the actual search).
- Trade-secret vs. patent recommendation memo.

**No submission. No filing. No fee payment.** (H1, H2.)

### 4.7 GATE — human merge
- PR opened against `main` with:
  - Full audit trail (SCAN → INVENT → SCREEN → DECIDE → BUILD → IP).
  - Named-math computations attached.
  - Kill-rate & Brier dashboards for the current window.
- **Required:** 1 human reviewer with `wr-4484-approver` role must approve.
- Only after human merge may downstream automations (which are separately human-triggered) publish, list, or file.

---

## 5. Metrics & KPIs

| Metric | Target | Alert |
|---|---|---|
| Kill rate at DOE-5 | 60–85% | <40% or >95% |
| Brier score (90-day realized) | < 0.20 | ≥ 0.25 |
| WIP per lane | ≤ 5 | > 5 (Little's Law breach) |
| Cycle time SCAN→GATE | ≤ 10 business days | > 15 |
| Human-gate override rate | ≥ 15% (humans do reject) | < 5% (rubber-stamping) |
| Legally-consequential agent actions | **0** | any > 0 → incident |

---

## 6. Roles

- **Agent (SCAN/INVENT/SCREEN/DECIDE/BUILD/IP-draft):** software; no legal capacity.
- **Human inventor/author of record:** named natural person; signs IP artifacts.
- **`wr-4484-approver`:** human reviewer authorized to merge loop PRs.
- **Legal reviewer:** required before any external filing (out of scope for this loop; loop stops at GATE).

---

## 7. Legal basis (cited, not exhaustive)

- *Thaler v. Vidal*, 43 F.4th 1207 (Fed. Cir. 2022) — AI cannot be a named inventor on a US patent.
- USCO, *Copyright Registration Guidance: Works Containing Material Generated by AI* (March 2023) — human authorship required for © registration; AI-generated portions must be disclaimed.
- USPTO, *Inventorship Guidance for AI-Assisted Inventions* (Feb 2024) — significant contribution by a natural person required.

The loop is designed so that a human's significant contribution — selection, review, and sign-off at GATE — is documented in the PR record.

---

## 8. Revenue linkage ($10k → $10M)

- **Phase 1 ($10k/mo):** loop feeds 2–3 Polar.sh-funded OSINT/dev-tool bets per month; human approves ~1.
- **Phase 2 ($30k/mo):** loop feeds 5–8/mo; portfolio effect kicks in as Brier calibrates.
- **Phase 3 ($100k/mo):** loop feeds adjacent-transformative bets; IP portfolio starts protecting the moat.
- **Phase 4 ($10M total):** compounding IP + product portfolio, all human-signed, all defensible.

---

## 9. Change log

- **rev-0:** initial specification. Human-gate is hard. Agents never file.
