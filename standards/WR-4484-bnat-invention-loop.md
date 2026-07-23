# WR-4484 — Autonomous BNAT Invention Loop (human-gated)

**Register:** wr-register
**Band:** 44xx
**Revision:** rev-0
**Status:** DRAFT — HUMAN MERGE REQUIRED
**Autonomy directive:** Agents draft and propose; humans decide, sign, file, and launch.

---

## 1. Purpose

Define the **Autonomous BNAT (Blank-Not-Addressed-Today) Invention Loop**: a repeatable, human-gated pipeline in which AI agents scan for market/technical gaps, invent candidate solutions, screen them with DOE-5 kill discipline, decide with the WR-4483 ensemble (AHP + RICE), build M1 skeletons, and draft IP artifacts.

A **hard human-merge gate** precedes any launch, public listing, or IP filing.

This standard is aligned with the PRIME DIRECTIVE ($10k/month → $10M in 3 years) by:
- Feeding validated BNAT candidates into the automated product pipeline
- Producing OSINT-derived gap evidence that shortens time-to-first-revenue
- Enforcing kill discipline so cash and attention concentrate on winners

---

## 2. Scope

Applies to any agent, workflow, or human operator producing:
- Invention disclosures
- Provisional / non-provisional patent drafts
- Trademark or copyright filings
- New product SKUs on Polar.sh, GitHub Sponsors, Gumroad, or equivalent
- Public launch content tied to a BNAT candidate

Out of scope: internal experiments that never leave the repo and never touch a customer, payment rail, or filing system.

---

## 3. Hard constraints (READ BEFORE MERGE)

These constraints are non-negotiable. A PR that violates any of them MUST NOT be merged.

1. **Human inventor/author of record.** Per *Thaler v. Vidal* (Fed. Cir. 2022) and USCO 2023 guidance, an AI system cannot be a named inventor (patents) or author (copyright). Agents may draft; a human must be the named inventor/author on every filing.
2. **Agents never file.** No agent may submit to USPTO, EPO, WIPO, USCO, a domain registrar, a payment processor, or a marketplace. Filing is a human action.
3. **Agents never launch.** No agent may flip a product to `public`, publish a Polar.sh listing, tweet a launch, or send a launch email without a human merge of the launch PR.
4. **Kill discipline is a KPI.** A 0% kill rate over a rolling 20-candidate window is a **red flag**, not a success. See §7.
5. **Calibration over approval.** The measured success metric is **Brier score < 0.20** on agent forecasts, not "percent of ideas approved."
6. **Named math only.** Every stage output must cite the specific method used (see §5). "Vibes" outputs are auto-rejected in review.
7. **No customer PII in prompts.** OSINT inputs must be public-source; PII scrubbed before agent ingestion.
8. **WIP cap.** Little's Law WIP cap enforced (§6). Agents pause intake when cap is hit.

---

## 4. Pipeline stages

```
 SCAN → INVENT → SCREEN → DECIDE → BUILD-M1 → DRAFT-IP → GATE → (human) LAUNCH/FILE
```

Each stage has: **inputs, named method, outputs, kill criteria.**

### 4.1 SCAN — gap detection
- **Inputs:** OSINT feeds (GitHub trending, HN, Reddit, Polar.sh discovery, patent classifications, SEC filings).
- **Method:** **Ulwick Opportunity Score** = Importance + max(Importance − Satisfaction, 0), computed on job-to-be-done statements extracted from public discussion.
- **Output:** Ranked list of BNAT candidates with Opportunity Score ≥ 12 (Ulwick threshold).
- **Kill:** Score < 10 → drop. No human review needed.

### 4.2 INVENT — candidate generation
- **Inputs:** Top-N BNAT candidates from SCAN.
- **Method:** **TRIZ** 40 inventive principles applied against the contradiction matrix derived from the opportunity statement.
- **Output:** ≥ 3 distinct solution concepts per candidate, each tagged with the TRIZ principle(s) used.
- **Kill:** Fewer than 3 principled concepts → the gap is likely not a real contradiction; drop.

### 4.3 SCREEN — DOE-5 kill discipline
- **Inputs:** Concepts from INVENT.
- **Method:** **DOE-5** — a five-factor screening design of experiments. Factors (default):
  1. Technical feasibility (bench evidence or working prototype path)
  2. Freedom-to-operate signal (prior-art density)
  3. Distribution reachability (do we already have the channel?)
  4. Unit economics headroom (target gross margin ≥ 60%)
  5. Regulatory / legal blast radius
- **Output:** Screening matrix; concepts with ≥ 2 red factors are killed.
- **Kill:** ≥ 2 red factors OR any single "catastrophic" factor (e.g. clearly infringing prior art) → drop with logged reason.

### 4.4 DECIDE — ensemble ranking (WR-4483)
- **Inputs:** Concepts surviving SCREEN.
- **Method:** **WR-4483 ensemble** = **AHP** (Analytic Hierarchy Process, pairwise-weighted criteria) combined with **RICE** (Reach × Impact × Confidence / Effort). Ensemble score = z-normalized AHP + z-normalized RICE, tie-broken by Confidence.
- **Output:** Ranked shortlist, top 1–3 promoted to BUILD-M1.
- **Kill:** Ensemble score below the rolling median of the last 20 promoted candidates.

### 4.5 BUILD-M1 — minimum-viable skeleton
- **Inputs:** Promoted candidate(s).
- **Method:** M1 = smallest artifact that can be shown to a paying customer or a patent examiner. For software: a runnable repo skeleton, README, and a Polar.sh draft product (kept `private`). For hardware/process: a written procedure + one bench result.
- **Output:** PR opened against this repo containing the M1 skeleton, labeled `bnat-m1`.
- **Kill:** M1 cannot be produced in ≤ 5 working days → back to DECIDE with revised Effort.

### 4.6 DRAFT-IP — IP artifacts
- **Inputs:** M1 skeleton + inventor notes from a **named human**.
- **Method:** Agent drafts:
  - Invention disclosure (problem, solution, novelty vs. cited prior art, best mode)
  - Provisional patent draft (if patentable subject matter)
  - Trademark candidates (with USPTO TESS-style knockout search notes)
  - Copyright notice block for code/content
- **Output:** `ip/` folder in the PR with the drafts. **Named human inventor/author is required in the front-matter of every draft.**
- **Kill:** No human inventor named → agent must halt and request assignment; PR cannot proceed.

### 4.7 GATE — human merge (HARD STOP)
- **Inputs:** The PR from BUILD-M1 + DRAFT-IP.
- **Method:** Human reviewer checks:
  - [ ] Named human inventor/author present on all IP drafts
  - [ ] DOE-5 screening matrix present and honest (no factors silently dropped)
  - [ ] Ensemble (AHP + RICE) numbers reproducible from inputs in the PR
  - [ ] Kill-rate KPI still healthy (see §7)
  - [ ] No agent action in the PR touches a filing system, payment rail, or public launch surface
  - [ ] Brier calibration log updated for the forecasts made in SCREEN/DECIDE
- **Output:** Merge → the human then separately performs LAUNCH and/or FILE actions **outside** the agent loop.
- **Kill:** Any unchecked box → request changes; do not merge.

---

## 5. Named math (citation table)

| Stage | Method | Source |
|-------|--------|--------|
| SCAN | Ulwick Opportunity Score | Ulwick, *What Customers Want* (2005) |
| INVENT | TRIZ 40 principles | Altshuller, *The Innovation Algorithm* |
| SCREEN | DOE-5 screening | Box, Hunter & Hunter, *Statistics for Experimenters* |
| DECIDE | AHP | Saaty, *The Analytic Hierarchy Process* (1980) |
| DECIDE | RICE | Intercom product-prioritization framework |
| DECIDE (ensemble) | WR-4483 | this register |
| KPI | Brier score | Brier (1950), *Monthly Weather Review* |
| Flow control | Little's Law | Little (1961) |

Outputs that fail to cite the applicable row are auto-rejected in review.

---

## 6. Flow control (Little's Law WIP cap)

- **L = λ · W.** With target throughput λ = 2 promoted candidates / week and target cycle time W = 2 weeks, WIP cap **L = 4**.
- Agents MUST refuse to open new BUILD-M1 PRs when 4 are already open and unmerged.
- Refusal is logged; it is not a failure. It is the system working.

---

## 7. KPIs

| KPI | Target | Red flag |
|-----|--------|----------|
| Brier score on SCREEN/DECIDE forecasts | < 0.20 | > 0.25 |
| Kill rate at SCREEN (rolling 20) | 40–80% | 0% or 100% |
| Human-gate rejection rate | 10–30% | 0% (rubber-stamping) or > 50% (agents drifting) |
| Cycle time SCAN → GATE | ≤ 10 working days | > 20 |
| Revenue-attributable BNATs / quarter | ≥ 1 | 0 for 2 consecutive quarters |

A **0% kill rate** means the agents are not actually screening — they are laundering ideas. Treat it as a Sev-2 incident and audit the SCREEN stage.

---

## 8. Legal reality (encoded)

- **Patents:** *Thaler v. Vidal*, 43 F.4th 1207 (Fed. Cir. 2022) — an AI cannot be a named inventor under 35 U.S.C. §100(f). A human inventor of record is mandatory.
- **Copyright:** U.S. Copyright Office, *Copyright Registration Guidance: Works Containing Material Generated by Artificial Intelligence*, 88 Fed. Reg. 16190 (Mar. 16, 2023) — purely AI-generated output is not copyrightable; human authorship of selection/arrangement/modification must be disclosed.
- **Trademarks:** Human applicant/owner required; agents may draft specimens and identifications only.
- **Filings:** Every filing action (USPTO, USCO, WIPO, EPO, domain, marketplace) is performed by a named human, not an agent.

Agent prompts and system messages MUST include this section verbatim.

---

## 9. Alignment with PRIME DIRECTIVE ($10k → $10M)

- **Phase 1 ($10k/mo):** Loop feeds Polar.sh listings and OSINT tool SKUs; expect 1–2 revenue-attributable BNATs.
- **Phase 2 ($30k/mo):** Ensemble tuned on Phase 1 Brier data; kill rate should stabilize in the 40–80% band.
- **Phase 3 ($100k/mo):** IP portfolio (provisionals + trademarks) begins compounding as a moat.
- **Phase 4 ($10M total):** Loop is the primary product-discovery engine; human gate remains non-negotiable.

---

## 10. Review checklist (paste into PR)

```
- [ ] Named human inventor/author present on all IP drafts
- [ ] Ulwick, TRIZ, DOE-5, AHP, RICE, Brier, Little's Law cited where used
- [ ] DOE-5 matrix included and no factors silently dropped
- [ ] AHP + RICE numbers reproducible from PR inputs
- [ ] Kill-rate KPI (rolling 20) in the 40–80% band
- [ ] Brier calibration log updated
- [ ] No agent action touches USPTO/USCO/WIPO/EPO/registrar/payment/marketplace
- [ ] No agent action flips a product to public or sends a launch message
- [ ] WIP cap (L=4) respected
```

---

*Closes #16669, #16670, #16671, #16672, #16673, #16675, #16677.*
