# WR-4484 — Autonomous BNAT Invention Loop (Human-Gated)

**Status:** rev-0  
**Band:** 44xx (Autonomy / Invention)  
**Autonomy Directive:** 🔴 **HUMAN MERGE REQUIRED** — agents propose; humans dispose.  
**Prime Directive alignment:** Accelerate the $10k → $10M pipeline by industrializing invention while preserving legal/ethical guardrails.

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
