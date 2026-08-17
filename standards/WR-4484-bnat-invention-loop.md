# WR-4484 — Autonomous BNAT Invention Loop (Human-Gated)

**Register:** wr-register
**Band:** 44xx (Autonomy / Invention)
**Revision:** 0 (dedup patch 1)
**Status:** ACTIVE — HUMAN MERGE REQUIRED at GATE
**Depends on:** WR-4482 (Evidence-First Directive), WR-4483 (Ensemble AHP + RICE), WR-4485 (Underdog Register)
**Labels:** `wr-register`, `band-44xx`
**Band:** 44xx
**Revision:** 0
**Status:** DRAFT — HUMAN MERGE REQUIRED
**Related:** WR-4483 (Ensemble AHP + RICE Decision Framework)

---

## 1. Purpose

Define the **BNAT (Best-Next-Available-Thing) Invention Loop**: an agent-driven cycle that scans for market/technical gaps, invents candidates, screens them with kill discipline, decides via a documented ensemble, builds M1 skeletons, and drafts IP artifacts — **always terminating at a hard human-merge gate** before any launch, listing, filing, or public commitment.

This standard operationalizes the OSINT + Polar.sh + automated-product-pipeline focus areas by making invention itself a repeatable, measurable, calibrated process.

---

## 2. Hard Constraints (Non-negotiable)

These constraints are enforced by CI, PR templates, and reviewer checklists. Violations block merge.

1. **No autonomous filing.** Agents MUST NOT file patents, trademarks, copyrights, DMCA notices, or regulatory submissions. Per *Thaler v. Vidal* (Fed. Cir. 2022) and the USCO 2023 AI-authorship guidance, only a natural person can be inventor/author of record. Agents draft; humans sign.
2. **No autonomous launch.** Agents MUST NOT publish to a marketplace, app store, Polar.sh listing, PyPI, npm, Docker Hub, or any customer-facing surface without a human-approved PR merge.
3. **No autonomous spend.** Agents MUST NOT commit funds (ads, cloud upgrades, contractors, filing fees) without an approved budget line and human sign-off.
4. **No autonomous customer contact.** Agents MUST NOT send outbound email, DMs, or support replies to real customers without human review of the exact payload.
5. **Provenance required.** Every artifact produced by the loop MUST carry a `PROVENANCE` block: agent model, prompt hash, retrieval sources, timestamp, git SHA of governing standards.
6. **Kill discipline is a KPI.** A 0% kill rate at DOE-5 is a **red flag**, not a success. Target kill rate: 40–70% at Screen stage.
7. **Calibration is the north star.** Optimize for **Brier score < 0.20** on agent forecasts, not approval rate. An agent that says "yes" to everything and gets approved is a failure mode.

---

## 3. Stages

The loop has seven stages. Each stage cites the named mathematical or methodological primitive it uses, so reviews can audit the reasoning, not just the output.

### 3.1 SCAN — Gap Detection
- **Inputs:** OSINT feeds (GitHub trending, HN, Polar.sh funding signals, arXiv, Reddit niche subs, Google Trends, patent-expiry docket).
- **Method:** **Ulwick Opportunity Score** = Importance + max(0, Importance − Satisfaction), computed per detected job-to-be-done.
- **Output:** Ranked `gaps.jsonl` with score, evidence links, and confidence interval.
- **Kill rule:** Opportunity Score < 10 → drop.

### 3.2 INVENT — Candidate Generation
- **Inputs:** Top-N gaps from SCAN.
- **Method:** **TRIZ** 40 inventive principles applied combinatorially; agent generates ≥ 5 candidate solutions per gap, each tagged with the TRIZ principle(s) used.
- **Output:** `candidates/{gap_id}/{cand_id}.md` with problem statement, solution sketch, primary TRIZ principle, and prior-art delta.
- **Kill rule:** Candidate that is a straight re-implementation of existing OSS with no delta → drop.

### 3.3 SCREEN — DOE-5 Kill Discipline
- **Inputs:** All candidates.
- **Method:** **DOE-5** — Design of Experiments with 5 orthogonal kill dimensions:
  1. **Legal** (freedom-to-operate, license contamination)
  2. **Technical** (feasibility with current stack in ≤ 2 weeks to M1)
  3. **Market** (≥ 100 identifiable buyers at ≥ $10 ACV, or ≥ 10 at ≥ $100)
  4. **Moat** (defensibility: data, distribution, or switching cost)
  5. **Ethics** (no dark-pattern, no privacy violation, no dual-use weaponization)
- **Any single dimension = FAIL → candidate is killed.** No overall averaging. This is the kill discipline.
- **Output:** `screen_results.csv` with per-dimension pass/fail and evidence.
- **KPI:** Kill rate 40–70%. Log and alert if outside band.

### 3.4 DECIDE — WR-4483 Ensemble (AHP + RICE)
- **Inputs:** Screen survivors.
- **Method:** Per WR-4483 ensemble decision protocol:
  - **AHP** (Analytic Hierarchy Process) weights across strategic criteria (fit-to-mission, time-to-revenue, portfolio diversification).
  - **RICE** (Reach × Impact × Confidence / Effort) as the quantitative scorer.
  - Ensemble = normalized AHP-weighted RICE. Ties broken by earliest revenue date.
- **Output:** Ranked shortlist, top 1–3 promoted to BUILD.
- **Forecast logged:** Each promoted candidate carries an agent forecast (P(revenue ≥ $X by day 90)) for later **Brier scoring**.

### 3.5 BUILD — M1 Skeleton
- **Inputs:** Promoted candidates.
- **Method:** Agent scaffolds M1 (Milestone 1 = minimum demonstrable artifact) as a **branch + draft PR**, never main. Includes:
  - `README.md` with problem, solution, TRIZ tag, target buyer
  - Runnable stub (CLI, notebook, or Polar.sh product draft)
  - `tests/` with at least one behavioral test
  - `PROVENANCE.md`
- **WIP cap:** Per **Little's Law** (WIP = Throughput × Cycle Time), cap concurrent BUILD items at ⌈target throughput × target cycle⌉. Default cap: **3**.

### 3.6 DRAFT-IP — Legal Artifacts (Draft Only)
- **Inputs:** M1 skeletons deemed novel.
- **Method:** Agent drafts (does NOT file):
  - Invention Disclosure Record (IDR)
  - Prior-art search summary
  - Claim sketches (for patent-track items)
  - Trademark availability memo (for brand-track items)
  - Copyright notice + license selection rationale
- **Legal reality (encoded):** Per *Thaler v. Vidal* (Fed. Cir. 2022, cert. denied 2023) and USCO *Copyright Registration Guidance: Works Containing Material Generated by Artificial Intelligence* (88 FR 16190, 2023), the **named human inventor/author** on any filing is the person who made the creative/inventive contribution. Agents produce drafts; a human reviews, contributes, and signs.
- **Output:** `ip/{cand_id}/` folder committed to the draft PR.

### 3.7 GATE — Human Merge Required 🔴
- **Inputs:** Draft PR containing SCAN evidence, INVENT rationale, SCREEN results, DECIDE score, BUILD skeleton, DRAFT-IP artifacts, PROVENANCE.
- **Method:** Human reviewer (with authority for the relevant band) performs:
  1. Hard-constraints checklist (§2) — any violation = auto-close.
  2. Kill-discipline audit — did SCREEN actually kill anything this cycle?
  3. Calibration check — recent Brier score of the originating agent.
  4. Strategic fit — does this advance the $10M/3yr trajectory?
  5. Legal sanity — is the human comfortable being named inventor/author?
- **Outcomes:** `merge` | `revise` | `kill` | `park`. All outcomes logged for calibration.
- **No merge, no launch. No exceptions.**

---

## 4. KPIs

| KPI | Target | Failure mode if missed |
|---|---|---|
| Kill rate at SCREEN | 40–70% | Loop is rubber-stamping or over-killing |
| Agent Brier score (90-day forecasts) | < 0.20 | Agent is miscalibrated; reduce autonomy weight |
| Cycle time SCAN→GATE | ≤ 10 days | Loop is stalling; check WIP cap |
| Concurrent BUILD WIP | ≤ 3 | Little's Law violation; throughput will collapse |
| Human GATE approval rate | 20–60% | Outside band = agent drift or reviewer rubber-stamp |
| Revenue-attributed items shipped / quarter | ≥ 1 | Loop is not contributing to Prime Directive |

---

## 5. Roles

- **Scanner Agent** — runs SCAN.
- **Inventor Agent** — runs INVENT.
- **Screener Agent** — runs SCREEN (must be a *different* model instance than Inventor to reduce collusion).
- **Decider Agent** — runs DECIDE per WR-4483.
- **Builder Agent** — runs BUILD.
- **IP-Drafter Agent** — runs DRAFT-IP.
- **Human Gatekeeper** — runs GATE. Named individual per PR. Signs as inventor/author on any downstream filing.

---

## 6. Provenance Block (required on every artifact)

```yaml
provenance:
  loop: WR-4484
  stage: SCAN|INVENT|SCREEN|DECIDE|BUILD|DRAFT-IP
  agent_model: <model id + version>
  prompt_hash: <sha256>
  retrieval_sources: [<url|doc>, ...]
  timestamp: <ISO-8601>
  governing_standards_sha: <git sha>
  forecast:  # for DECIDE stage only
    metric: <e.g., P(MRR>=100 by day 90)>
    value: <0..1>
```

---

## 7. Failure Modes & Circuit Breakers

- **Rubber-stamp mode:** kill rate < 20% for two cycles → auto-suspend Screener Agent, require human re-screen.
- **Over-kill mode:** kill rate > 85% for two cycles → audit SCREEN thresholds for drift.
- **Miscalibration:** Brier > 0.30 → demote agent to advisory-only until re-calibrated on backtest.
- **WIP blowout:** BUILD WIP > cap → freeze new SCAN until drained.
- **Legal drift:** any attempt by an agent to invoke a filing API, marketplace publish API, or outbound email API → hard fail + incident report.
Define an autonomous **BNAT** (Best-Next-Action-Target) invention loop in which AI agents:

1. **Scan** for opportunity gaps,
2. **Invent** candidate solutions,
3. **Screen** them with DOE-5 kill discipline,
4. **Decide** via WR-4483 ensemble AHP + RICE,
5. **Build** M1 skeletons (minimal viable artifacts),
6. **Draft** IP artifacts (disclosures, claims, prior-art maps),

…with a **hard human-merge gate** before any launch, listing, filing, or public release.

This standard advances the prime directive ($10k/mo → $10M in 3 years) by turning invention throughput into a measured, calibrated, kill-disciplined pipeline rather than a stochastic hype engine.

---

## 2. Hard Constraints (Non-Negotiable)

These constraints are **red-line**. Any PR violating them MUST be rejected.

1. **Human merge gate.** No agent may auto-merge to `main`, publish to a registry (npm, PyPI, crates, Docker Hub, App Store, Polar.sh listing), or push to a public product surface without an explicit human approval on the PR.
2. **No autonomous filing.** Agents **draft** patent disclosures, provisional specs, and claim scaffolds. A **human is the inventor/author of record** in all filings.
   - Legal basis: *Thaler v. Vidal*, 43 F.4th 1207 (Fed. Cir. 2022) — an AI cannot be a named inventor under 35 U.S.C. §§ 100(f), 115.
   - Copyright: U.S. Copyright Office, *Copyright Registration Guidance: Works Containing Material Generated by Artificial Intelligence*, 88 Fed. Reg. 16190 (Mar. 16, 2023) — human authorship required.
3. **Kill discipline is a KPI.** A **0% kill rate is a red flag**, not a success signal. Target: 60–85% of screened ideas killed at DOE-5 before reaching the decision stage.
4. **Calibration over approval.** The primary quality metric is **Brier score < 0.20** on forecasted outcomes, not the fraction of ideas approved.
5. **WIP cap.** Concurrent BNAT items in-flight ≤ ⌊throughput × cycle_time⌋ (Little's Law). Default cap: **5 active inventions** until Phase 2.
6. **Provenance.** Every artifact carries a signed manifest: agent model, prompt hash, human reviewer, timestamp, and citations.

---

## 3. Named Math (Cited at Each Stage)

| Stage | Method | Citation |
|-------|--------|----------|
| SCAN | Ulwick **Opportunity Score** = Importance + max(0, Importance − Satisfaction) | Ulwick, *What Customers Want* (2005); JTBD framework |
| INVENT | **TRIZ** 40 inventive principles + contradiction matrix | Altshuller, *The Innovation Algorithm* (1999) |
| SCREEN | **DOE-5** kill discipline (5 orthogonal fail-fast experiments) | Fisher, *The Design of Experiments* (1935); Taguchi orthogonal arrays |
| DECIDE | **AHP** pairwise + **RICE** (Reach × Impact × Confidence / Effort) | Saaty (1980); Intercom RICE framework — see WR-4483 |
| FORECAST | **Brier score** = mean((p − o)²) for calibration | Brier, *Monthly Weather Review* 78(1), 1950 |
| FLOW | **Little's Law** WIP = throughput × cycle-time | Little, *Ops. Res.* 9(3), 1961 |

---

## 4. Loop Stages

### 4.1 SCAN
- **Inputs:** issue backlog, market signals (Polar.sh trends, GitHub topic velocity, OSINT feeds), customer interviews.
- **Method:** Compute Ulwick Opportunity Score per outcome statement. Rank descending. Keep top decile.
- **Output:** `scan/YYYY-MM-DD-opportunities.json` with `{outcome, importance, satisfaction, score, sources[]}`.

### 4.2 INVENT
- **Inputs:** top opportunities from SCAN.
- **Method:** Agent generates ≥ 3 candidate solutions per opportunity using TRIZ contradiction matrix. Each candidate names the contradiction resolved and the principle invoked.
- **Output:** `invent/<opportunity-id>/candidates.md`.

### 4.3 SCREEN (DOE-5 Kill Discipline)
For each candidate, run **5 orthogonal kill-tests**:

1. **Legal/IP kill:** prior art hit within claim scope? (search USPTO, Google Patents, arXiv).
2. **Demand kill:** Ulwick score < threshold or no willingness-to-pay signal?
3. **Feasibility kill:** M1 skeleton estimated at > 2 engineer-weeks?
4. **Moat kill:** replicable by a competitor in < 30 days with public tooling?
5. **Ethics/policy kill:** violates platform ToS, export control, or WR autonomy constraints?

**Rule:** ANY kill = candidate is dropped and logged. Target overall kill rate 60–85%.

- **Output:** `screen/<opportunity-id>/<candidate-id>.doe5.json`.

### 4.4 DECIDE (WR-4483)
- Survivors are scored via WR-4483 ensemble AHP + RICE.
- Top-N (N ≤ WIP cap headroom) advance to BUILD.
- **Output:** `decide/<candidate-id>.decision.json`.

### 4.5 BUILD (M1 Skeleton)
- Agent builds the **minimum falsifiable artifact**: a runnable stub + README + one integration test that would fail if the core hypothesis is false.
- No public release. Branch only.
- **Output:** PR labeled `bnat:m1-skeleton`, `human-review-required`.

### 4.6 DRAFT IP
- Agent drafts: (a) invention disclosure, (b) claim scaffold (independent + 3 dependent), (c) prior-art map.
- Marked **DRAFT — HUMAN INVENTOR REQUIRED**. No filing.
- **Output:** `ip/<candidate-id>/disclosure.md`.

### 4.7 GATE (Hard Human Merge)
**No automated action past this line.** A human reviewer MUST:

- [ ] Confirm kill-discipline metrics for this cycle.
- [ ] Confirm calibration (Brier) is within band.
- [ ] Confirm inventor(s) of record are named humans.
- [ ] Confirm no ToS / export / policy violation.
- [ ] Approve merge.

Merge without all five boxes checked is a **process violation** and MUST be reverted.

---

## 5. KPIs

| KPI | Target | Red Flag |
|-----|--------|----------|
| DOE-5 kill rate | 60–85% | < 40% or > 95% |
| Brier score (90-day) | < 0.20 | > 0.30 |
| Cycle time (SCAN → GATE) | ≤ 10 days | > 21 days |
| WIP | ≤ 5 (Phase 1) | > cap for > 3 days |
| Human override rate at GATE | 5–25% | 0% or > 50% |
| Revenue attribution / invention | tracked | untracked > 30 days |

---

## 6. Revenue Linkage (Prime Directive)

This loop feeds the $10k → $10M ladder by:

- **Phase 1 ($10k/mo):** 1–2 BNAT inventions/month → Polar.sh listings + OSINT tool SKUs.
- **Phase 2 ($30k/mo):** 3–4/month, with ≥ 1 IP disclosure drafted per cycle.
- **Phase 3 ($100k/mo):** portfolio effects — cross-sell across shipped BNAT inventions.
- **Phase 4 ($10M cumulative):** licensable IP portfolio + productized OSINT tooling.

---

## 7. Change Control

- Rev-0: initial draft (this document).
- Amendments require WR council review and a linked calibration report.

---

## 8. References

- Ulwick, A. — *What Customers Want* (Opportunity Score).
- Altshuller, G. — TRIZ 40 Inventive Principles.
- Montgomery, D. — *Design and Analysis of Experiments* (DOE).
- Brier, G. W. (1950) — Verification of forecasts expressed in terms of probability.
- Little, J. D. C. (1961) — A proof for the queuing formula L = λW.
- Saaty, T. L. — Analytic Hierarchy Process.
- Intercom — RICE prioritization framework.
- *Thaler v. Vidal*, 43 F.4th 1207 (Fed. Cir. 2022), cert. denied 2023.
- U.S. Copyright Office, *Copyright Registration Guidance: Works Containing Material Generated by Artificial Intelligence*, 88 FR 16190 (Mar. 16, 2023).
- WR-4483 — Ensemble Decision Protocol (AHP + RICE).

---

## 9. Review Focus (for this PR)

Reviewers: please concentrate on
1. **§2 Hard Constraints** — is anything missing that could enable an autonomous filing, launch, or spend?
2. **§3.7 GATE** — is the human-merge language unambiguous and enforceable via branch protection?
3. **§4 KPIs** — is the kill-rate band (40–70%) defensible for our current portfolio, or should it be widened during ramp-up?
- *Thaler v. Vidal*, 43 F.4th 1207 (Fed. Cir. 2022).
- U.S. Copyright Office, 88 Fed. Reg. 16190 (Mar. 16, 2023).
- Ulwick, A. *What Customers Want* (McGraw-Hill, 2005).
- Altshuller, G. *The Innovation Algorithm* (Technical Innovation Center, 1999).
- Saaty, T. *The Analytic Hierarchy Process* (McGraw-Hill, 1980).
- Brier, G.W. "Verification of Forecasts Expressed in Terms of Probability," *Monthly Weather Review* 78(1), 1950.
- Little, J.D.C. "A Proof for the Queuing Formula: L = λW," *Operations Research* 9(3), 1961.
- Fisher, R.A. *The Design of Experiments* (Oliver & Boyd, 1935).
## WR-4484 — Autonomous BNAT Invention Loop (human-gated)

**Register:** WR (Working Register)
**Band:** 44xx (Autonomous Invention / IP Pipeline)
**Revision:** 0
**Status:** DRAFT — HUMAN MERGE REQUIRED
**Depends on:** WR-4483 (Ensemble AHP + RICE decision framework)
**Labels:** `wr-register`, `band-44xx`, `rev-0`

---

## 0. Autonomy Directive Band

> **HUMAN MERGE REQUIRED.** Agents may **draft, screen, decide, and prototype**, but **must not** unilaterally launch, list, file, or publish. Every terminal action passes through GATE (§3.7) and requires a signed human merge.

**Legal reality (non-negotiable):**
- *Thaler v. Vidal*, 43 F.4th 1207 (Fed. Cir. 2022), cert. denied 2023: AI cannot be a named inventor on a US patent (35 U.S.C. §§ 100(f), 115).
- USCO, *Copyright Registration Guidance: Works Containing Material Generated by Artificial Intelligence*, 88 FR 16190 (Mar. 16, 2023): human authorship required.
- Therefore: **agents draft; a human is the inventor/author of record**; agents never file with USPTO, USCO, EUIPO, or any registry.

---

## 1. Purpose

A repeatable, auditable pipeline in which autonomous agents **Scan → Invent → Screen → Decide → Build → Draft-IP → GATE**, turning invention throughput into a measured, calibrated, kill-disciplined process. North-star KPI is **calibration (Brier < 0.20)** — not throughput, not approval rate.

---

## 2. Hard Constraints (Non-Negotiable)

| # | Constraint | Enforcement |
|---|---|---|
| C1 | No agent files with USPTO, USCO, EUIPO, or any registry. | CI blocks PRs touching `filings/` without `human-signed: true` frontmatter. |
| C2 | Human of record in `inventors:` / `authors:` frontmatter before GATE closes. | GATE workflow requires non-empty field with verified GitHub identity. |
| C3 | No launch, listing (Polar.sh, Gumroad, Stripe, App Store, npm, PyPI, Docker Hub), or publication without merged GATE PR. | Deploy workflows gated on `bnat-approved` label, applied only by CODEOWNERS. |
| C4 | No autonomous spend or outbound customer contact without human sign-off of the exact payload. | Budget lines pre-approved; outbound APIs deny-listed for agent tokens. |
| C5 | Kill rate at SCREEN: **60–85%** target over any rolling 20-candidate window; 0% pauses the loop. | Weekly cron `bnat-kill-audit.yml`. |
| C6 | Brier score < **0.20** over rolling 50 forecasts; breach halts new inventions until recalibrated. | Calibration dashboard gate. |
| C7 | WIP cap per Little's Law (WIP = throughput × cycle time). **WIP_MAX = 3** until Phase 2. | Scheduler refuses new SCAN at cap. |
| C8 | Every stage artifact carries `method:` citation and a PROVENANCE block (agent model, prompt hash, sources, timestamp, standards SHA). | `bnat-lint` rejects artifacts missing either. |

---

## 3. Stages

### 3.1 SCAN — gap discovery
- **Method:** Ulwick Opportunity Score = Importance + max(0, Importance − Satisfaction) [Ulwick 2005].
- **Trigger:** score ≥ 12.
- **Inputs:** GitHub issues/trending, HN/Reddit, Polar.sh funding signals, OSINT feeds, patent-expiry docket.
- **Output:** `candidates/<id>/scan.md`.

### 3.2 INVENT — candidate generation
- **Method:** TRIZ 40 principles + SCAMPER + morphological box [Altshuller 1999]; ≥ 5 distinct concepts per gap; diversity check via embedding cosine distance ≥ 0.35; each names the contradiction resolved.
- **Kill rule:** straight re-implementation of existing OSS with no delta → drop.
- **Output:** `candidates/<id>/inventions.md`.

### 3.3 SCREEN — DOE-5 kill discipline
Five orthogonal fatal-flaw probes [Fisher 1935; Taguchi]:
1. Legal/IP — FTO quick search (USPTO, Google Patents, arXiv); license contamination.
2. Demand — willingness-to-pay signal from ≥ 3 independent sources; ≥ 100 buyers at ≥ $10 ACV or ≥ 10 at ≥ $100.
3. Feasibility — M1 ≤ 14 days with current stack.
4. Moat — not replicable in < 30 days with public tooling (data, distribution, or switching cost).
5. Ethics/policy — no dark patterns, privacy violations, dual-use weaponization, ToS or export breach.

**Rule:** ANY probe = FAIL ⇒ candidate killed and logged. No averaging. Target kill rate 60–85% (C5).
- **Output:** `candidates/<id>/screen.md` with per-probe pass/fail and evidence.

### 3.4 DECIDE — WR-4483 ensemble
- **Method:** Ensemble AHP (Saaty CR ≤ 0.10, inter-judge dispersion reported) × RICE [Saaty 1980; Intercom]. Composite cutoff ≥ 0.62. Ties broken by earliest revenue date.
- **Forecast logged** per promoted candidate — P(revenue ≥ $X by day 90) — for Brier scoring [Brier 1950].
- **Output:** `candidates/<id>/decide.md` with AHP matrix, RICE table, composite.

### 3.5 BUILD — M1 skeleton
- **Definition:** minimum falsifiable artifact a human can *see run* — runnable stub + README + one behavioral test that fails if the core hypothesis is false. Branch + draft PR only, never main.
- **Budget:** ≤ 14 days wall-clock; ≤ $50 external cost, pre-approved.
- **WIP cap:** 3 concurrent (C7, Little's Law [Little 1961]).
- **Output:** `candidates/<id>/m1/` + PR labeled `bnat:m1-skeleton`, `human-review-required`.

### 3.6 DRAFT-IP — legal artifacts (draft only)
- Agent drafts: Invention Disclosure Record; prior-art map (≥ 10 refs: ≥ 3 patents, ≥ 3 non-patent); provisional-claim skeleton (1 independent + 3 dependent); FTO memo; trademark availability memo; copyright notice + license rationale.
- **Prohibited:** any submission to any registry. Filing is a human act (§0).
- **Output:** `candidates/<id>/ip/` — never `filings/` until human-signed.

### 3.7 GATE — human merge (HARD STOP)
Human reviewer MUST confirm, in the PR:
- [ ] Hard-constraints C1–C8 green (any violation = auto-close).
- [ ] Kill-discipline audit — SCREEN actually killed within band this cycle.
- [ ] Calibration — originating agent's rolling Brier within band.
- [ ] Inventor(s)/author(s) of record are named humans.
- [ ] Strategic fit and legal sanity — human comfortable signing.

**Outcomes:** `merge` | `revise` | `kill` | `park` — all logged for calibration. Merge without all boxes checked is a process violation and MUST be reverted. **No merge, no launch. No exceptions.**
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

## 4. KPIs

| KPI | Target | Red flag |
|---|---|---|
| Kill rate at SCREEN (rolling 20) | 60–85% | < 40% or > 95% |
| Agent Brier score (90-day forecasts) | < 0.20 | > 0.30 → demote agent to advisory |
| Cycle time SCAN→GATE | ≤ 10 days | > 21 days |
| Concurrent BUILD WIP | ≤ 3 | > cap for > 3 days → freeze SCAN |
| Human GATE approval rate | 20–60% | 0% or > 60% (drift or rubber-stamp) |
| Revenue-attributed items / quarter | ≥ 1 | untracked > 30 days |

**Circuit breakers:** kill rate < 20% two cycles → suspend Screener, human re-screen. Kill rate > 85% two cycles → audit thresholds for drift. Any agent attempt to invoke a filing, publish, or outbound-email API → hard fail + incident report.

---

## 5. Roles

Scanner, Inventor, Screener (different model instance than Inventor — anti-collusion), Decider (per WR-4483), Builder, IP-Drafter, **Human Gatekeeper** (named individual per PR; signs as inventor/author on any downstream filing).

---

## 6. Provenance Block (required on every artifact)

```yaml
provenance:
  loop: WR-4484
  stage: SCAN|INVENT|SCREEN|DECIDE|BUILD|DRAFT-IP
  agent_model: <model id + version>
  prompt_hash: <sha256>
  retrieval_sources: [<url|doc>, ...]
  timestamp: <ISO-8601>
  governing_standards_sha: <git sha>
  forecast:  # DECIDE stage only
    metric: <e.g., P(MRR>=100 by day 90)>
    value: <0..1>
```

---

## 7. References

Ulwick (2005) · Altshuller (1999) · Fisher (1935) · Saaty (1980) · Intercom RICE · Brier (1950) · Little (1961) · *Thaler v. Vidal* 43 F.4th 1207 (Fed. Cir. 2022) · USCO 88 FR 16190 (2023) · WR-4483 · WR-4485.

---

## 8. Change Log

- **rev-0** — initial draft: hard human-merge gate, DOE-5 kill discipline, Brier calibration target, WR-4483 dependency.
- **rev-0 dedup patch 1** — a conflict merge concatenated three full document variants (duplicate H1s, MD025; conflicting constraint values). Collapsed to one canonical version using the **strictest value from each variant**: kill 60–85%, WIP_MAX 3, cycle ≤ 10 days, Opportunity Score ≥ 12, Brier < 0.20. Removed an erroneous mass-Closes line (issue closure belongs in PR bodies, not standards text). Prior variants remain in git history per append-only policy.
