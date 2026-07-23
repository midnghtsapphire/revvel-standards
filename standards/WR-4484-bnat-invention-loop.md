# WR-4484 — Autonomous BNAT Invention Loop (Human-Gated)

**Status:** rev-0  
**Band:** 44xx (Autonomy / Invention)  
**Labels:** `wr-register`, `band-44xx`, `rev-0`  
**Autonomy directive:** **HUMAN MERGE REQUIRED** — agents propose, humans dispose.

---

## 1. Purpose

Define an autonomous **B**lue-**N**ovel-**A**pplied-**T**echnology (BNAT) invention loop in which agents:

1. Scan for gaps,
2. Invent candidate solutions,
3. Screen them with **DOE-5 kill discipline**,
4. Decide with the **WR-4483 ensemble (AHP + RICE)**,
5. Build M1 skeletons,
6. Draft IP artifacts,

…and where **no launch, listing, or filing** happens without a human merge gate.

Prime directive alignment: this loop is the top-of-funnel for the $10k → $10M trajectory. Its job is to raise the *hit rate* of scarce human review time by killing bad ideas fast (DOE-5) and calibrating agent judgment (Brier).

---

## 2. Hard constraints (non-negotiable)

These constraints override any optimization objective the loop otherwise pursues.

1. **Human is inventor / author of record.** Per *Thaler v. Vidal* (Fed. Cir. 2022) and USCO 2023 registration guidance, only natural persons may be listed as inventors on U.S. patents or as authors on copyright registrations. Agents **draft**; humans **sign**.
2. **Agents never file.** No USPTO, PCT, trademark, copyright, SEC, or marketplace-listing submission may originate from an automated identity. All filings require a human signatory and a human merge on the corresponding PR.
3. **Human merge gate before any external action.** Launch, publish, list, price-change, or file → blocked behind a protected-branch merge by a human reviewer.
4. **Kill discipline is a KPI.** A **0% kill rate is a red flag**, not a success. Target: ≥ 60% of candidates killed at DOE-5.
5. **Calibration over approval.** The optimization target is **Brier score < 0.20** on the agent's stated probabilities, *not* the fraction of ideas that get approved.
6. **Named math or it didn't happen.** Every stage must cite the specific method it uses (see §4). Unnamed heuristics are rejected at review.
7. **WIP cap via Little's Law.** `WIP ≤ throughput × cycle_time`. The loop must self-throttle rather than flood the human queue.

---

## 3. Stages

```
  SCAN → INVENT → SCREEN(DOE-5) → DECIDE(WR-4483) → BUILD(M1) → DRAFT(IP) → [GATE: HUMAN MERGE] → RELEASE
```

### 3.1 SCAN — Gap discovery
- **Method:** Ulwick **Opportunity Score** = `Importance + max(0, Importance − Satisfaction)`.
- **Inputs:** issue backlog, market chatter, competitor changelogs, OSINT feeds, existing WR register.
- **Output:** ranked `opportunities.jsonl` with score ≥ 12 threshold.

### 3.2 INVENT — Candidate generation
- **Method:** **TRIZ** 40 inventive principles + structured analogy prompts.
- **Constraint:** each candidate cites ≥ 1 TRIZ principle by number and ≥ 1 targeted opportunity ID.
- **Output:** `candidates/<id>.md` with problem, principle, mechanism, expected user delta.

### 3.3 SCREEN — DOE-5 kill discipline
- **Method:** 5-question **Design-Of-Experiment kill gate**:
  1. Is the problem real and measurable?
  2. Is our mechanism differentiated vs. named prior art?
  3. Can we build an M1 skeleton in ≤ 5 days?
  4. Is there a plausible willingness-to-pay signal?
  5. Are the failure modes bounded (no regulatory / safety cliff)?
- **Rule:** any "no" → **KILL**, logged with reason.
- **KPI:** kill rate ≥ 60%. Kill-rate = 0 triggers an automatic review of the SCREEN agent's calibration.

### 3.4 DECIDE — WR-4483 ensemble
- **Method:** **AHP** pairwise weights over criteria × **RICE** (Reach · Impact · Confidence / Effort) scoring; ensemble across ≥ 3 agent samples; disagreement > σ threshold → escalate.
- **Confidence:** each agent emits a probability of "ships & earns ≥ $1k MRR within 90 days". These probabilities are scored later via **Brier**.
- **Output:** `decisions/<id>.json` with weights, scores, chosen action, dissent notes.

### 3.5 BUILD — M1 skeleton
- **Definition of M1:** smallest end-to-end artifact that a human can *touch* — a CLI, a landing page + waitlist, or a stub Polar.sh product page — never a full launch.
- **Constraint:** M1 must not be publicly listed. Draft/preview only.

### 3.6 DRAFT — IP artifacts
- Provisional-patent draft, trademark search memo, or copyright deposit draft as applicable.
- **All drafts marked `DRAFT — NOT FOR FILING` in the document header.**
- Inventor / author fields left **blank** for the human to complete.

### 3.7 GATE — Human merge
- Protected branch. CODEOWNERS enforced. Required review from a human maintainer.
- Merge = authorization to (a) publish M1, (b) list on Polar.sh, or (c) hand the IP draft to a human for filing.
- Auto-close of the PR by a bot is disallowed.

---

## 4. Named-math registry

| Stage   | Method                              | Citation / anchor |
|---------|-------------------------------------|-------------------|
| SCAN    | Ulwick Opportunity Score            | Ulwick, *What Customers Want* (2005) |
| INVENT  | TRIZ 40 Inventive Principles        | Altshuller, *The Innovation Algorithm* |
| SCREEN  | DOE-5 kill gate                     | Internal, WR-4484 §3.3 |
| DECIDE  | AHP + RICE ensemble                 | WR-4483 |
| CALIB   | Brier score                         | Brier (1950) |
| FLOW    | Little's Law WIP cap                | Little (1961) |
| LEGAL   | Human-inventor requirement          | *Thaler v. Vidal*, 43 F.4th 1207 (Fed. Cir. 2022); USCO Registration Guidance, 88 Fed. Reg. 16190 (Mar. 16, 2023) |

Any stage lacking a row here **must not run in production**.

---

## 5. KPIs

| KPI                     | Target       | Red flag                |
|-------------------------|--------------|-------------------------|
| DOE-5 kill rate         | ≥ 60%        | 0% or ≥ 95%             |
| Brier score (90-day)    | < 0.20       | ≥ 0.35                  |
| Human review latency    | ≤ 72 h       | > 7 d                   |
| WIP (open candidates)   | ≤ Little cap | > 2× cap                |
| Filings by agent id     | **0**        | any nonzero             |
| MRR from merged M1s     | trending ↑   | flat for 2 quarters     |

---

## 6. Review focus for this PR

Reviewers should scrutinize:

1. **§2 hard constraints** — are any loopholes exploitable by an agent optimizing for approval?
2. **§3.7 GATE** — is the human-merge requirement genuinely enforced (protected branch + CODEOWNERS + no bot self-approval)?
3. **§4 named-math registry** — every stage traceable to a citable method.

---

## 7. Change log

- **rev-0** — Initial specification. Closes issues #16669, #16670, #16671, #16672, #16673, #16675, #16677, #16679, #16680, #16682, #16684, #16686, #16688, #16690, #16693, #16696.
