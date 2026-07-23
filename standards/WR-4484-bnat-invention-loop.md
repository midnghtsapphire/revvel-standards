# WR-4484 — Autonomous BNAT Invention Loop (human-gated)

**Status:** rev-0  
**Band:** 44xx (Autonomy / Invention Systems)  
**Labels:** wr-register, band-44xx, rev-0  
**Autonomy directive:** HUMAN MERGE REQUIRED — agents propose, humans dispose.

---

## 1. Purpose

WR-4484 defines the **Autonomous BNAT (Better / Novel / Adjacent / Transformative) Invention Loop**: a repeatable pipeline in which agents scan for gaps, invent candidates, screen with kill discipline, decide via an ensemble scoring method, build M1 skeletons, and draft IP artifacts — **without ever crossing the human merge gate** on their own.

The loop's purpose is not "more ideas". It is **calibrated, killable, defensible ideas** that map cleanly to WR-4483 (portfolio decisioning) and to the $10k → $10M revenue ladder.

---

## 2. Hard constraints (non-negotiable)

These constraints are enforced by CI, by branch protection, and by human review. Any PR that violates them MUST be rejected regardless of score.

1. **HUMAN MERGE REQUIRED.** Agents may open PRs, draft specs, and draft IP artifacts. Agents MUST NOT:
   - merge to `main`
   - publish or list a product (Polar, Gumroad, Stripe, App Store, etc.)
   - file, submit, or transmit any IP artifact to any government office or registrar
   - send outbound communications to customers, counsel, or agencies
2. **Inventor / author of record is a human.** Per *Thaler v. Vidal* (Fed. Cir. 2022) and the U.S. Copyright Office 2023 guidance on works containing AI-generated material, only natural persons may be named inventor (patents) or claim authorship (copyright). Agents draft; a named human is the inventor/author of record and signs.
3. **Agents never file.** Drafting ≠ filing. All USPTO / USCO / trademark office / contract submissions are performed by a human after merge.
4. **Kill discipline is a KPI.** A 0% kill rate at DOE-5 is a **red flag**, not a success. Target kill rate is calibrated against Brier score, not vibes.
5. **Calibration beats approval.** The optimization target is **Brier score < 0.20** on agent forecasts (adoption, revenue, technical feasibility), not "percent of ideas approved".
6. **Little's Law WIP cap.** Concurrent invention WIP is capped so that `WIP ≤ throughput × target_cycle_time`. Default: WIP ≤ 5 active BNAT candidates per human reviewer.
7. **Provenance required.** Every artifact (idea, score, draft claim, draft spec) carries an agent signature, model + version, prompt hash, and citation trail. No provenance → auto-reject at GATE.

---

## 3. Pipeline stages

Each stage cites the named method it uses. Agents MUST log which method was applied and MUST NOT skip stages.

### Stage 1 — SCAN (gap detection)
**Method:** Ulwick **Opportunity Score** = Importance + max(Importance − Satisfaction, 0), computed over jobs-to-be-done pulled from public issue trackers, review corpora, and support logs.

**Output:** `scan/YYYY-MM-DD/opportunities.jsonl` — one row per (job, segment, opportunity_score, evidence_urls).

**Gate to next stage:** opportunity_score ≥ 12 (Ulwick's "underserved" threshold).

### Stage 2 — INVENT (BNAT generation)
**Method:** **TRIZ** 40 inventive principles applied to the top opportunities, plus BNAT tagging:
- **B**etter — same job, measurably improved (≥ 30% on a named metric)
- **N**ovel — new mechanism, same job
- **A**djacent — same mechanism, new job/segment
- **T**ransformative — new job class

**Output:** `invent/<opp_id>/candidates.md` — each candidate has: BNAT tag, TRIZ principle(s) cited, mechanism sketch, named metric + target.

### Stage 3 — SCREEN (DOE-5 kill discipline)
**Method:** **DOE-5** — Design of Experiments with 5 pre-registered kill criteria per candidate. Criteria are declared **before** the experiment, not after.

Default kill criteria:
1. **Demand kill** — landing page CTR < 1.5% at n ≥ 400 impressions.
2. **Willingness-to-pay kill** — < 5% of demand-qualified users click "pay".
3. **Technical kill** — M1 skeleton cannot hit named metric within 40h of scoped agent work.
4. **Legal kill** — freedom-to-operate flag from patent + trademark scan, or license contamination.
5. **Margin kill** — projected gross margin < 60% at target ACV.

**Output:** `screen/<candidate_id>/doe5.md` with pre-registered criteria + observed results.

**KPI:** kill rate at this stage. Historical target: 60–80%. **0% kill rate triggers a WR-4484 audit.**

### Stage 4 — DECIDE (WR-4483 ensemble)
**Method:** WR-4483 ensemble = **AHP** (Analytic Hierarchy Process) pairwise weights over strategy criteria × **RICE** (Reach × Impact × Confidence / Effort) scoring. Agents produce both scores; disagreement > 25% triggers a human tiebreak.

**Output:** `decide/<candidate_id>/wr4483.json` — AHP weights, RICE inputs, ensemble score, disagreement delta, forecast (adoption %, 90-day revenue $), Brier-tracked.

### Stage 5 — BUILD M1 (skeleton only)
**Method:** Minimum-1 (M1) skeleton — the smallest artifact that can be tested against the DOE-5 criteria. Not a launch. Not a listing. No customers.

**Output:** feature-branch PR with:
- `m1/<candidate_id>/` code skeleton
- test harness proving the named metric is measurable
- README linking back to scan / invent / screen / decide artifacts

### Stage 6 — DRAFT IP (artifacts only)
**Method:** Agents draft:
- provisional patent skeleton (background, brief summary, at least one independent claim, dependent claims)
- copyright registration draft
- trademark search notes + candidate marks
- trade-secret classification note (what stays unpublished)

**Output:** `ip/<candidate_id>/` with clearly labeled `DRAFT — NOT FOR FILING` on every page.

**Legal reality (repeated because it matters):** the human inventor/author of record reviews, edits, and signs. Agents do not sign, do not file, do not transmit.

### Stage 7 — GATE (human merge)
A human reviewer with commit rights to `main`:
1. Verifies provenance on every artifact.
2. Confirms hard-constraints section (§2) is not violated.
3. Confirms Brier calibration is being tracked for this candidate's forecasts.
4. Confirms WIP cap (§2.6) is respected.
5. Merges, or requests changes, or kills.

Only after merge may a human (not the agent) proceed to launch, list, or file.

---

## 4. Metrics (what we actually optimize)

| Metric | Target | Why |
|---|---|---|
| Brier score on agent forecasts | < 0.20 | Calibration, not optimism |
| DOE-5 kill rate | 60–80% | Kill discipline; 0% = broken loop |
| Cycle time SCAN → GATE | ≤ 14 days | Little's Law throughput |
| WIP (active candidates / reviewer) | ≤ 5 | Little's Law WIP cap |
| Human-merge rate of GATE-submitted PRs | tracked, not maximized | Approval rate is not the goal |
| Post-launch revenue attributable to loop | ladder to $10k → $30k → $100k/mo | Prime directive alignment |

---

## 5. Relationship to other WRs

- **WR-4483** — portfolio decisioning ensemble (AHP + RICE). WR-4484 consumes WR-4483 at Stage 4.
- **WR-44xx band** — autonomy / invention systems. WR-4484 is the invention pipeline; sibling WRs cover deployment, monitoring, and revenue attribution.

---

## 6. Review focus for this PR

Reviewers: please focus on
1. §2 hard constraints — is any wording weak enough to let an agent self-authorize a filing, launch, or merge? If yes, tighten.
2. §3 Stage 7 GATE — is the human-merge gate unambiguous?
3. §4 metrics — is Brier < 0.20 the right calibration target for our forecast volume, or do we need a per-category target?

---

## 7. Citations

- Ulwick, A. *What Customers Want* (Opportunity Score).
- Altshuller, G. TRIZ 40 Inventive Principles.
- Box, Hunter & Hunter, *Statistics for Experimenters* (DOE).
- Brier, G. W. (1950), "Verification of Forecasts Expressed in Terms of Probability".
- Little, J. D. C. (1961), "A Proof for the Queuing Formula L = λW".
- Saaty, T. L. Analytic Hierarchy Process.
- Reichheld / Intercom RICE prioritization.
- *Thaler v. Vidal*, 43 F.4th 1207 (Fed. Cir. 2022).
- U.S. Copyright Office, "Copyright Registration Guidance: Works Containing Material Generated by Artificial Intelligence" (March 2023).
