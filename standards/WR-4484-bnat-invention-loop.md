# WR-4484 — Autonomous BNAT Invention Loop (human-gated)

**Status:** rev-0
**Band:** 44xx (Autonomy / Invention)
**Labels:** `wr-register`, `band-44xx`, `rev-0`
**Autonomy directive:** **HUMAN MERGE REQUIRED** before any launch, listing, or filing.

---

## 0. Prime directive alignment

This loop exists to compress *time-to-validated-product* on the path:

> $10k/mo → $30k/mo → $100k/mo → $10M total (36 months).

Agents propose. Humans dispose. No artifact produced by this loop reaches a customer, a marketplace, or a patent office without a human merge signature.

---

## 1. Scope

WR-4484 defines the **Autonomous BNAT (Big-New-And-Testable) Invention Loop**: how agents

1. **SCAN** for market gaps,
2. **INVENT** candidate solutions,
3. **SCREEN** with DOE-5 kill discipline,
4. **DECIDE** via the WR-4483 ensemble (AHP + RICE),
5. **BUILD** M1 (milestone-1) skeletons, and
6. **DRAFT** IP artifacts,

under a **hard human-merge gate** (§7 GATE).

---

## 2. Hard constraints (non-negotiable)

These constraints are enforced in CI and in the agent runtime. Violation = auto-revert + incident.

| # | Constraint | Enforcement |
|---|---|---|
| H1 | Agents **never file** patents, trademarks, or copyrights. | CI blocks `uspto.gov`, `wipo.int`, `eu-ipo` API calls from agent scopes. |
| H2 | Humans are the **inventor/author of record** on every filing. Cited law: *Thaler v. Vidal* (Fed. Cir. 2022); USCO 2023 AI-authorship guidance. | Filing checklist requires named human inventor(s); AI listed as tool only. |
| H3 | Agents **never launch, list, or publish** to a paid channel (Polar, Stripe, Gumroad, App Store, PyPI-as-product, etc.) without human merge. | Secrets scoped read-only to agents; write scopes require merge-signed workflow. |
| H4 | Every stage must **cite named math** (see §3). | PR template requires citation block; linter checks. |
| H5 | **Kill rate KPI:** loop-wide kill rate ≥ 60% per quarter. 0% kill rate = red flag → loop pauses. | Weekly report; auto-pause below floor. |
| H6 | **Calibration target:** Brier score < 0.20 on 90-day forecasts. Approval rate is *not* the metric. | Rolling calibration ledger. |
| H7 | **WIP cap** via Little's Law: active BNATs ≤ ⌊throughput × cycle-time⌋. | Board enforced; new invents blocked when over cap. |

---

## 3. Named math (cited at every stage)

| Stage | Math | Purpose |
|---|---|---|
| SCAN | **Ulwick Opportunity Score** = Importance + max(0, Importance − Satisfaction) | Rank unmet-need gaps. |
| INVENT | **TRIZ** (40 inventive principles, contradiction matrix) | Structured ideation, not brainstorming. |
| SCREEN | **DOE-5** (Design of Experiments, 5-kill-criteria) | Kill fast; ≤5 experiments to a go/no-go. |
| DECIDE | **AHP** (Saaty pairwise) + **RICE** (Reach·Impact·Confidence/Effort) — WR-4483 ensemble | Multi-criteria decision under uncertainty. |
| BUILD | **Little's Law** (L = λW) | WIP cap on M1 skeletons. |
| FORECAST | **Brier score** = mean((p − o)²) | Calibration of agent confidence. |
| GATE | — | Human merge; no math substitutes for judgment. |

---

## 4. The six stages

### 4.1 SCAN
- **Input:** market corpora (issues, forums, reviews, OSINT feeds, Polar.sh funded-issue lists).
- **Agent action:** compute Ulwick Opportunity Score per candidate unmet need.
- **Output:** ranked `gaps.jsonl` with score, evidence links, competing solutions.
- **Kill:** Opportunity Score < 12 → drop.

### 4.2 INVENT
- **Input:** top-N gaps from SCAN.
- **Agent action:** apply TRIZ contradiction matrix; generate ≥3 mechanistically distinct candidates per gap.
- **Output:** `bnat-<id>.md` skeleton per candidate: problem, contradiction, principle(s) applied, mechanism, riskiest assumption.

### 4.3 SCREEN (DOE-5)
- **Agent action:** define ≤5 experiments, each targeting one of the 5 canonical kill criteria:
 1. **Desirability** (does anyone want it?)
 2. **Feasibility** (can we build it?)
 3. **Viability** ($/unit economics)
 4. **Defensibility** (moat / IP surface)
 5. **Legality** (regulatory / license)
- **Rule:** any single kill → drop or pivot. No "three yellows = green."
- **Output:** `screen-<id>.md` with pass/fail per criterion + evidence.

### 4.4 DECIDE (WR-4483 ensemble)
- **Agent action:** score survivors via AHP pairwise (strategic weight) × RICE (tactical throughput). Ensemble rank = normalized product.
- **Output:** `decide-<id>.md` with matrices, sensitivity analysis, and a **confidence probability p ∈ [0,1]** logged to the Brier ledger.

### 4.5 BUILD (M1 skeleton)
- **Agent action:** produce M1 skeleton — repo scaffold, README, minimal runnable path, telemetry hooks, pricing hypothesis, kill-switch. **No public artifacts.**
- **Output:** branch `bnat/<id>/m1` opened as **draft PR**.

### 4.6 DRAFT IP
- **Agent action:** draft provisional-patent skeleton, trademark search summary, copyright notice list. All marked `DRAFT — NOT FILED`.
- **Output:** `ip/<id>/` folder; human inventor field left blank for human to fill (H2).

---

## 5. Kill discipline (KPI)

- Target kill rate: **60–85% per quarter**.
- 0% kill = agents rubber-stamping → loop pauses, retrospective required.
- 100% kill = SCAN/INVENT quality collapse → loop pauses, retrospective required.
- Weekly `kill-report.md` auto-generated; posted to review channel.

---

## 6. Calibration (KPI)

- Every DECIDE stage logs `p` (agent confidence that the BNAT will hit its 90-day milestone).
- Outcomes `o ∈ {0,1}` recorded at day 90.
- **Brier = mean((p − o)²)** computed rolling over last 20 decisions.
- Target: **Brier < 0.20**. Above 0.25 → agent weights re-tuned; above 0.35 → loop pauses.

---

## 7. GATE — human merge (the wall)

Before **any** of the following, a human must merge a PR with the `human-gate/approved` label applied by a repo maintainer (not an agent, not a bot):

- Public launch or announcement
- Marketplace listing (Polar, Stripe product, App Store, PyPI as paid product, etc.)
- Any IP filing (patent, trademark, copyright registration)
- Any outbound customer email at > 50 recipients
- Any paid ad spend

**Enforcement:**
- GitHub branch protection on `main` requires 1 human review + `human-gate/approved` label.
- Bot accounts (including agent identities) cannot apply the label — enforced by CODEOWNERS + org ruleset.
- Filing-related paths (`ip/**/FILED/**`) are protected; only humans on the `ip-filers` team can write.

---

## 8. Legal encoding

- **Inventorship:** Per *Thaler v. Vidal*, 43 F.4th 1207 (Fed. Cir. 2022), an AI cannot be an inventor under 35 U.S.C. §100(f). Every filing draft leaves the inventor field blank for a natural person.
- **Authorship:** Per USCO *Copyright Registration Guidance: Works Containing Material Generated by Artificial Intelligence*, 88 Fed. Reg. 16190 (Mar. 16, 2023), AI-generated portions are disclaimed; human authorship claimed only over human-contributed expression.
- **Trademark:** Agents may search USPTO TESS and WIPO Global Brand DB read-only; filing is human-only.

---

## 9. Interfaces

### 9.1 File layout

```
bnat/
  <id>/
    gap.md              # SCAN output
    invent.md           # INVENT output (TRIZ trace)
    screen.md           # DOE-5 result
    decide.md           # AHP+RICE, Brier p logged
    m1/                 # BUILD skeleton (draft PR only)
ip/
  <id>/
    provisional.md      # DRAFT — NOT FILED
    tm-search.md
    copyright-notice.md
    FILED/              # human-only write
reports/
  kill-report-<yyyy-ww>.md
  brier-ledger.jsonl
```

### 9.2 PR labels

- `bnat/scan`, `bnat/invent`, `bnat/screen`, `bnat/decide`, `bnat/build`, `bnat/ip-draft`
- `human-gate/required` (default on any launch-adjacent PR)
- `human-gate/approved` (human-only, protected)

---

## 10. Metrics dashboard

Tracked weekly:

| Metric | Target | Alert |
|---|---|---|
| Kill rate (rolling 90d) | 60–85% | outside band |
| Brier score (rolling 20) | < 0.20 | > 0.25 |
| WIP (active BNATs) | ≤ Little's-Law cap | over cap |
| Cycle time SCAN→DECIDE | ≤ 14 days | > 21 days |
| Human-gate reject rate | 10–40% | outside band |
| Revenue attributable to loop | tracks $10k→$100k/mo curve | behind curve |

---

## 11. Revision policy

- rev-0: initial specification.
- Any change to §2 (hard constraints) or §7 (GATE) requires two human reviewers and a 72-hour cool-down before merge.
- Math citations (§3) may not be removed without replacement; substitutions require rationale in PR body.

---

## 12. Cross-references

- **WR-4483** — Ensemble decision framework (AHP + RICE) used in DECIDE.
- **Prime directive** — $10k/mo → $10M in 36 months; this loop is the invention arm.
- **Polar.sh integration** — funded-issue signals feed SCAN; payouts remain human-gated.

---

*End WR-4484 rev-0.*
