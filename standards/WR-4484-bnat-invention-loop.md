# WR-4484 — Autonomous BNAT Invention Loop (human-gated)

**Status:** rev-0  
**Band:** 44xx (Autonomy / Invention)  
**Labels:** `wr-register`, `band-44xx`, `rev-0`  
**Autonomy directive:** 🚨 **HUMAN MERGE REQUIRED** — agents draft, humans decide.

---

## 1. Purpose

Define an **Autonomous BNAT (Big-Naming-Ain't-Taken) Invention Loop** in which coordinated agents:

1. Scan for market/technical gaps
2. Invent candidate solutions
3. Screen ruthlessly (DOE-5 kill discipline)
4. Decide with WR-4483 ensemble (AHP + RICE + confidence-weighted vote)
5. Build M1 (minimum-1) skeleton artifacts
6. Draft IP artifacts (provisional claims, prior-art maps, disclosure memos)

…all **behind a hard human-merge gate** before any launch, listing, filing, or public commitment.

This directly serves the PRIME DIRECTIVE ($10k/mo → $10M in 3 years) by industrializing top-of-funnel invention while keeping legal, reputational, and quality risk bounded.

---

## 2. Hard constraints (non-negotiable)

1. **No autonomous filings.** Agents MUST NOT file patents, trademarks, copyrights, DMCA notices, SEC forms, or any government/registrar submission. *Reference: Thaler v. Vidal (Fed. Cir. 2022); USCO AI Registration Guidance (March 2023).* A natural person is the inventor/author of record.
2. **No autonomous launches.** Agents MUST NOT publish product listings (Polar.sh, Gumroad, Stripe, App stores, marketplaces), press, or paid ads without a human-merged PR.
3. **No autonomous outbound to identified humans.** Cold email, DMs, and named-target scraping require human approval.
4. **Merge gate is the enforcement point.** Any artifact that would be externally visible must land via a PR reviewed and merged by a human maintainer.
5. **Kill discipline is mandatory.** A run with a **0% kill rate is a red flag** and MUST be re-reviewed — it indicates screening collapse, not exceptional ideas.
6. **Calibration over throughput.** Target metric is **Brier score < 0.20** on agent confidence, not number of ideas shipped or approval rate.
7. **Provenance.** Every artifact must record model, prompt hash, inputs, and a citation trail for every factual claim.

---

## 3. Named math (cite in every stage output)

| Stage | Named method | Purpose |
|-------|--------------|---------|
| SCAN | **Ulwick Opportunity Score** = Importance + max(Importance − Satisfaction, 0) | Rank unmet jobs-to-be-done |
| INVENT | **TRIZ** 40 inventive principles + **SCAMPER** | Structured ideation, avoid local maxima |
| SCREEN | **DOE-5** (Design-of-Experiments, ≥5 kill criteria per candidate) | Force falsifiability before build |
| DECIDE | **WR-4483 ensemble** = AHP (pairwise) × RICE (Reach·Impact·Confidence/Effort) × confidence-weighted vote | Multi-lens decision |
| BUILD | **Little's Law** WIP cap: `WIP ≤ throughput × cycle_time` | Prevent invention-inventory bloat |
| CALIBRATE | **Brier score** = mean((p − outcome)²) | Keep agent confidence honest |
| GATE | **Human merge** | Legal/ethical/strategic backstop |

---

## 4. Loop stages

### Stage 0 — CHARTER
Human defines a **problem band** (e.g. "OSINT tooling for solo SecOps", "GitHub funding automation on Polar.sh"). No agent action without a charter issue.

### Stage 1 — SCAN
- Inputs: charter, prior-art corpus, market signals (GitHub trending, Polar.sh top projects, HN, arXiv, USPTO/EPO).
- Output: `scan/YYYY-MM-DD-<band>.md` with ≥20 candidate gaps, each with an **Ulwick Opportunity Score**.
- Kill: drop any gap with Opportunity Score < 12.

### Stage 2 — INVENT
- For top-N gaps, generate ≥3 candidate solutions each, tagging TRIZ/SCAMPER principle used.
- Output: `invent/<gap-id>.md` per candidate.
- Require a **BNAT check** — the naming/positioning must not collide with an existing registered mark or dominant open-source project (search USPTO TESS, npm, PyPI, GitHub, crates.io, DockerHub). Collisions → auto-kill.

### Stage 3 — SCREEN (DOE-5)
Each candidate must survive **five explicit kill criteria**:
1. **Legal**: no obvious IP/regulatory blocker
2. **Technical**: buildable by ≤2 people in ≤30 days to M1
3. **Distribution**: identified free/organic channel (no paid-ads dependency)
4. **Willingness-to-pay**: ≥1 comparable priced offer exists
5. **Fit**: aligns with PRIME DIRECTIVE revenue phase

**Expected kill rate: 60–85%.** Runs outside this band are flagged.

### Stage 4 — DECIDE (WR-4483 ensemble)
- Compute AHP pairwise matrix on survivors.
- Compute RICE score.
- Confidence-weighted vote across ≥3 agent models (diversity requirement).
- Output: `decide/<run-id>.md` with ranked shortlist and disagreement metric.

### Stage 5 — BUILD (M1 skeleton)
- Agents may create: repo scaffold, README, spec doc, unit-test skeleton, prior-art map, provisional claim draft.
- Agents MUST NOT: publish packages, register domains, create paid accounts, publish listings.
- WIP cap enforced by Little's Law: no new BUILD until throughput permits.

### Stage 6 — IP DRAFT
- Draft (never file): provisional claim set, inventor-disclosure memo, freedom-to-operate note, trademark candidate list.
- Every draft carries the header:
  > **DRAFT — NOT FILED. Human inventor/author of record required (Thaler v. Vidal 2022; USCO 2023). Agent is a tool, not an inventor.**

### Stage 7 — GATE (🚨 HUMAN MERGE REQUIRED)
- All artifacts land in a PR.
- Reviewer checklist:
  - [ ] Hard-constraints section respected
  - [ ] Kill rate within 60–85% band (or explicit exception)
  - [ ] Named-math citations present in each stage output
  - [ ] IP drafts carry the DRAFT header and no filing occurred
  - [ ] BNAT collision search evidence attached
  - [ ] Provenance block present (model, prompt hash, inputs)
  - [ ] Brier score updated for closed predictions
- Merge = go. No merge = no external action.

### Stage 8 — CALIBRATE
- After outcomes are known, update Brier score per model.
- Models with Brier ≥ 0.20 over trailing 20 predictions are demoted from DECIDE quorum until recalibrated.

---

## 5. KPIs

| KPI | Target | Red flag |
|-----|--------|----------|
| Kill rate (SCREEN) | 60–85% | 0% or >95% |
| Brier score (DECIDE) | < 0.20 | ≥ 0.25 |
| Cycle time CHARTER→GATE | ≤ 14 days | > 30 days |
| Human-merge rate | 20–50% | > 80% (rubber-stamping) or < 5% (waste) |
| Filings by agent | **0** | **any non-zero value is an incident** |

---

## 6. Revenue linkage (PRIME DIRECTIVE)

- Phase 1 ($10k/mo): loop targets **Polar.sh funding pages + OSINT micro-tools** — fastest path to first dollars.
- Phase 2 ($30k/mo): loop targets **automated product pipeline** (recurring SKUs).
- Phase 3 ($100k/mo): loop targets **licensable IP** drafted here, filed by humans.
- Phase 4 ($10M total): loop feeds an acquirable portfolio; IP drafts become due-diligence assets.

---

## 7. Change control

- This WR is `rev-0`. Amendments require a PR labeled `wr-register`, `band-44xx`, and a rev bump.
- Removing or weakening any item in §2 (Hard constraints) requires **two** human maintainer approvals and a written risk memo.

---

## 8. References

- Thaler v. Vidal, 43 F.4th 1207 (Fed. Cir. 2022) — AI cannot be a patent inventor.
- U.S. Copyright Office, *Copyright Registration Guidance: Works Containing Material Generated by Artificial Intelligence*, 88 Fed. Reg. 16190 (March 16, 2023).
- Ulwick, A. *What Customers Want* (Outcome-Driven Innovation).
- Altshuller, G. *TRIZ: The Theory of Inventive Problem Solving*.
- Little, J.D.C. "A Proof for the Queuing Formula L = λW" (1961).
- Brier, G.W. "Verification of Forecasts Expressed in Terms of Probability" (1950).
- WR-4483 — Ensemble decision protocol (AHP × RICE × confidence-weighted vote).
