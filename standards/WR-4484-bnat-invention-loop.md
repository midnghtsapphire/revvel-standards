# WR-4484 — Autonomous BNAT Invention Loop (Human-Gated)

**Register:** wr-register  
**Band:** 44xx (Invention / IP / Autonomy)  
**Revision:** rev-0  
**Status:** DRAFT — HUMAN MERGE REQUIRED before any launch, listing, or filing.  
**Related:** WR-4483 (Decision Ensemble: AHP + RICE), WR-448x (Invention Register)

---

## 0. Prime Directive Alignment

This standard governs how autonomous agents in the BNAT stack propose, screen, and prepare inventions for the $10k → $10M revenue ladder. Every artifact this loop produces is a **draft**; a human maintainer is the inventor/author of record and the sole party who may merge, launch, list on Polar.sh, publish, or file IP.

**North-star KPI:** *Calibration* (Brier score < 0.20 on 90-day forward predictions), **not** approval rate or invention count.

---

## 1. Hard Constraints (NON-NEGOTIABLE)

Agents operating under WR-4484 **MUST NOT**:

1. **File any IP.** No provisional, non-provisional, PCT, design, trademark, or copyright registration. Drafts only. (*Thaler v. Vidal*, Fed. Cir. 2022 — an AI cannot be a named inventor. USCO March 2023 guidance — human authorship required for copyright.)
2. **List, launch, or publish** to Polar.sh, GitHub Releases, package registries, marketplaces, or social channels without an explicit human merge of a `LAUNCH:` PR.
3. **Contact third parties** (customers, counsel, investors, press) on behalf of the project.
4. **Bypass the GATE stage** (§4.6) under any "emergency," "obvious win," or "high-confidence" heuristic. High confidence *increases* review priority; it does not remove the gate.
5. **Self-modify this standard** or WR-4483. Amendments require a human-authored PR touching `standards/`.
6. **Exceed the WIP cap** defined by Little's Law budget in §5.
7. **Suppress kill signals.** A 0% kill rate over a rolling 20-invention window is a **red flag** and auto-pauses the loop pending human review.

Violation of any hard constraint is a P0 incident: loop halts, state is snapshotted, and a human is paged.

---

## 2. Roles

| Role | Type | Responsibilities |
|---|---|---|
| **Scout** | agent | Gap discovery, Ulwick Opportunity Score computation |
| **Inventor** | agent | TRIZ-guided concept generation, prior-art sweep (informational) |
| **Screener** | agent | DOE-5 kill discipline, feasibility screens |
| **Decider** | agent | Runs WR-4483 ensemble (AHP + RICE), produces ranked shortlist |
| **Builder** | agent | M1 skeleton scaffolding (code, docs, tests) |
| **Scribe** | agent | Drafts IP artifacts (spec sheets, claim skeletons, disclosure memos) |
| **Calibrator** | agent | Tracks Brier score, updates priors, reports drift |
| **Maintainer** | HUMAN | Sole authority to merge, launch, list, file, or publish |

---

## 3. Named-Math Contract

Every stage MUST cite the specific method used. Un-cited outputs are rejected at GATE.

| Stage | Method | Citation-form required |
|---|---|---|
| Gap scan | **Ulwick Opportunity Score** = Importance + max(0, Importance − Satisfaction) | `ulwick:{imp}/{sat}→{score}` |
| Ideation | **TRIZ** 40 inventive principles / contradiction matrix | `triz:{principle_id}` or `triz:contradiction:{improving}/{worsening}` |
| Screening | **DOE-5** (Design of Experiments, 5-factor kill screen) | `doe5:{factors_tested}/{killed_at}` |
| Decision | **WR-4483** ensemble (AHP eigenvector + RICE) | `wr4483:{ahp_cr}/{rice_score}` |
| Calibration | **Brier score** on 90-day forward predictions | `brier:{n}:{score}` |
| Throughput | **Little's Law** L = λW (WIP cap) | `little:{L_cap}/{λ}/{W}` |

AHP requires **Consistency Ratio CR < 0.10** (Saaty). RICE requires explicit *reach*, *impact* {0.25, 0.5, 1, 2, 3}, *confidence* {0.5, 0.8, 1.0}, and *effort* in person-weeks.

---

## 4. The Loop

### 4.1 SCAN (Scout)
- Ingest: issue trackers, changelogs, support logs, keyword feeds, competitor releases.
- Emit: `gap_candidates[]` each with Ulwick score, evidence links, timestamp.
- Kill rule: drop any gap with `ulwick < 12` (Ulwick's own threshold).

### 4.2 INVENT (Inventor)
- For each surviving gap, generate ≥3 concepts using TRIZ principles.
- Run a *non-legal* prior-art sweep (public search only). Findings are informational; **no freedom-to-operate opinion** is rendered by any agent.
- Emit: `concepts[]` with TRIZ citations and prior-art links.

### 4.3 SCREEN (Screener) — DOE-5 Kill Discipline
Five kill factors, each binary pass/fail:
1. **Technical feasibility** (can we build M1 in ≤ 2 weeks?)
2. **Legal cleanliness** (no obvious prior-art collision; no restricted domains)
3. **Distribution fit** (channel exists: Polar.sh, GH, package registry)
4. **Unit economics** (projected LTV/CAC ≥ 3 at plausible pricing)
5. **Strategic fit** (advances the $10k→$10M ladder in a named phase)

Any fail = kill. Log the kill with reason. **Target kill rate: 60–85%.**

### 4.4 DECIDE (Decider)
- Apply WR-4483 ensemble to survivors.
- Reject batch if AHP CR ≥ 0.10 (re-elicit weights).
- Emit ranked shortlist with RICE + AHP scores and dissent notes.

### 4.5 BUILD-M1 (Builder) + DRAFT-IP (Scribe)
- Builder scaffolds a **minimum-1** artifact: repo skeleton, README, one working path, one test.
- Scribe drafts, into `drafts/ip/`:
  - Invention disclosure memo (problem, solution, novelty, embodiments)
  - Claim skeleton (independent + 2–4 dependent, marked `DRAFT — NOT FOR FILING`)
  - Trademark candidates (marked `DRAFT — NOT FOR FILING`)
- All files carry the header:
  ```
  DRAFT — AI-ASSISTED. Human is inventor/author of record.
  Not for filing, listing, or publication without human merge.
  ```

### 4.6 GATE (HUMAN) — **HARD STOP**
A `LAUNCH:` or `FILE-PREP:` PR is opened and **blocks on human review**. Merge checklist:

- [ ] Named-math citations present at every stage (§3)
- [ ] DOE-5 kill log attached; kill rate in 60–85% band over trailing 20
- [ ] AHP CR < 0.10; RICE inputs auditable
- [ ] Prior-art sweep reviewed by human; FTO decision is human's alone
- [ ] Human confirms inventorship / authorship attribution
- [ ] No hard-constraint violations (§1)
- [ ] Brier trend not degrading (Calibrator report attached)

Only a human maintainer may merge. CI enforces branch protection: agent commits cannot self-approve.

### 4.7 CALIBRATE (Calibrator)
- For every shipped invention, log a forward prediction (revenue, adoption, kill-in-90-days) at ship time.
- At T+90, score with **Brier**. Update priors used by Decider.
- Report weekly. If Brier > 0.25 for two consecutive weeks, loop **auto-pauses**.

---

## 5. Throughput Budget (Little's Law)

`L = λ · W`

- **L (WIP cap):** 7 active inventions across all stages.
- **W (cycle time target):** ≤ 3 weeks from SCAN to GATE.
- **λ (arrival rate):** ≤ 2.3 new inventions/week entering SCREEN.

Exceeding L pauses SCAN until drain. This prevents the classic autonomous-agent failure mode of unbounded ideation.

---

## 6. Legal Reality (Encoded)

- **Inventorship (US patents):** *Thaler v. Vidal*, 43 F.4th 1207 (Fed. Cir. 2022) — inventor must be a natural person. Agents draft; humans invent of record.
- **Copyright:** USCO *Copyright Registration Guidance: Works Containing Material Generated by AI* (March 16, 2023) — human authorship required; AI-generated portions must be disclosed and disclaimed.
- **Trademarks:** Agents may propose marks; humans conduct clearance and file.
- **Contracts / opinions:** No agent renders legal opinions (FTO, patentability, infringement). All such artifacts are marked `INFORMATIONAL — NOT LEGAL ADVICE`.

---

## 7. Autonomy Directive Band

**Band:** HUMAN MERGE REQUIRED.

Agents may: read, analyze, draft, scaffold, open PRs, comment on their own PRs, run local tests.

Agents may **not**: merge, tag releases, publish packages, list on Polar.sh, push to `main`, contact third parties, file IP, spend money, or self-approve.

This band is inherited by any sub-agent spawned under WR-4484 and cannot be widened by agent action.

---

## 8. Failure Modes & Detectors

| Failure mode | Detector | Response |
|---|---|---|
| Rubber-stamp screening (kill rate < 15%) | Rolling 20-window | Auto-pause, page human |
| Over-killing (kill rate > 90%) | Rolling 20-window | Auto-pause; likely bad Ulwick threshold |
| AHP inconsistency (CR ≥ 0.10) | Per-batch | Reject batch, re-elicit |
| Calibration drift (Brier > 0.25 × 2wk) | Weekly | Auto-pause loop |
| Hard-constraint violation | Per-action policy check | P0 halt, snapshot, page |
| WIP overrun (L > 7) | Continuous | Freeze SCAN |

---

## 9. Artifacts & Paths

```
drafts/
  inventions/
    WR-4484-<slug>/
      00-scan.md            # Ulwick evidence
      01-invent.md          # TRIZ concepts
      02-screen.md          # DOE-5 kill log
      03-decide.md          # WR-4483 output
      04-m1/                # Builder scaffold
      05-ip/                # Scribe drafts (all marked DRAFT)
      06-gate.md            # Human review checklist
      07-calibration.md     # Forward predictions + T+90 Brier
```

---

## 10. Revenue Ladder Hooks

- **Phase 1 ($10k/mo):** Loop targets Polar.sh-listable OSINT tools and dev-utility inventions with ≤ 2-week M1.
- **Phase 2 ($30k/mo):** Loop widens to paid-tier features and small B2B tools; IP drafts begin accumulating for defensive posture.
- **Phase 3 ($100k/mo):** Loop feeds a curated IP portfolio; human counsel engaged for select filings.
- **Phase 4 ($10M total):** Portfolio + product-line invention cadence, still human-gated.

---

## 11. Review Focus for This PR

Reviewers: please scrutinize **§1 Hard Constraints** and **§4.6 GATE** most heavily. These are the load-bearing safety surfaces. Everything else is tunable; those two are not.

---

*End WR-4484 rev-0.*
