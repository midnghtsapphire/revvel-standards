# WR-4484 — Autonomous BNAT Invention Loop (human-gated)

**Register:** wr-register
**Band:** 44xx
**Revision:** 0
**Status:** Draft — HUMAN MERGE REQUIRED
**Autonomy directive:** Agents draft and screen; humans decide, file, and launch.

---

## 1. Purpose

Define the closed-loop protocol by which autonomous agents (a) scan for BNAT (Best-Neighboring-Adjacent-Technology) gaps, (b) invent candidate solutions, (c) screen them with DOE-5 kill discipline, (d) decide via the WR-4483 ensemble (AHP + RICE), (e) build M1 skeletons, and (f) draft IP artifacts — while a **hard human-merge gate** blocks any launch, listing, or filing.

This loop exists to compound $10k/mo → $10M/3yr by generating a defensible pipeline of inventions without diluting legal ownership or calibration hygiene.

---

## 2. Hard constraints (non-negotiable)

These constraints override any optimization objective. Any agent action violating them MUST halt and open a human-review issue.

1. **No autonomous filing.** Agents may draft provisional patent text, invention disclosures, copyright registrations, and trademark applications. Agents MUST NOT submit them. Filing is a human act.
2. **Human is inventor/author of record.** Per *Thaler v. Vidal* (Fed. Cir. 2022) and USCO 2023 guidance on AI-generated works, inventorship and authorship attach to a natural person. Agent contributions are documented as tool use in the invention record, never as inventor.
3. **No autonomous launch, listing, or publication** to Polar.sh, GitHub Marketplace, npm, PyPI, App Store, or any customer-facing channel. GATE (§7) blocks this.
4. **No autonomous outbound customer contact.** Cold email, DM, and paid ads require human approval per campaign.
5. **Kill discipline is a KPI.** A rolling 30-day kill rate of 0% on screened candidates is a red flag and auto-pauses the loop for calibration review.
6. **Calibration target is Brier < 0.20**, not approval rate. Optimizing approval rate is explicitly prohibited.
7. **WIP cap enforced** via Little's Law: `WIP ≤ throughput × cycle_time`. Default cap: 5 candidates in BUILD stage concurrently.

---

## 3. Stages

| # | Stage    | Owner  | Named math / method                                   | Exit criterion                              |
|---|----------|--------|-------------------------------------------------------|---------------------------------------------|
| 1 | SCAN     | Agent  | Ulwick Opportunity Score = Importance + max(0, Imp − Sat) | ≥ 3 gaps with OS ≥ 12                       |
| 2 | INVENT   | Agent  | TRIZ 40 inventive principles; SCAMPER                 | ≥ 5 candidates per gap                      |
| 3 | SCREEN   | Agent  | DOE-5 (Design-Of-Experiments, 5-factor kill screen)   | ≥ 60% kill rate; survivors documented       |
| 4 | DECIDE   | Agent+ | WR-4483 ensemble: AHP weights × RICE score            | Top-K selected; Brier-calibrated confidence |
| 5 | BUILD    | Agent  | M1 skeleton (minimal viable artifact)                 | Runs locally; tests green                   |
| 6 | DRAFT-IP | Agent  | Invention disclosure + provisional draft (unsigned)   | Draft attached to issue                     |
| 7 | **GATE** | **Human** | **Merge review**                                   | **Human approval recorded in PR**           |
| 8 | LAUNCH   | Human  | Polar.sh listing / release                            | Post-launch telemetry configured            |

---

## 4. SCAN — Ulwick Opportunity Score

Agents survey issue trackers, changelogs, review corpora, and search trends for outcome statements. For each outcome `o`:

```
OS(o) = Importance(o) + max(0, Importance(o) − Satisfaction(o))
```

Both `Importance` and `Satisfaction` are on a 1–10 scale, sourced from at least two independent signals (e.g., issue count + review sentiment). Gaps with `OS ≥ 12` advance.

---

## 5. INVENT — TRIZ / SCAMPER

For each surviving gap, generate ≥ 5 candidate mechanisms using TRIZ 40 principles (segmentation, asymmetry, dynamics, prior counter-action, …) and SCAMPER prompts. Each candidate is a one-paragraph mechanism claim + a novelty note vs. named prior art.

---

## 6. SCREEN — DOE-5 kill discipline

Each candidate is scored on five orthogonal kill factors. Any factor below threshold kills the candidate.

| Factor            | Threshold | Kill if                                    |
|-------------------|-----------|--------------------------------------------|
| Legal clearance   | ≥ 0.7     | Blocking prior art or license conflict     |
| Build feasibility | ≥ 0.6     | > 30 days to M1 for one engineer           |
| Wedge             | ≥ 0.6     | No defensible moat within 6 months         |
| Distribution      | ≥ 0.6     | No plausible channel to first 10 customers |
| Unit economics    | ≥ 0.6     | LTV/CAC < 3 at plausible price             |

**Target kill rate: 60–90%.** A rolling 30-day kill rate outside `[0.4, 0.95]` triggers calibration review (§9).

---

## 7. DECIDE — WR-4483 ensemble (AHP + RICE)

Survivors are ranked by the WR-4483 ensemble:

```
Score(c) = AHP_weight(criteria) · RICE(c)
RICE(c) = (Reach × Impact × Confidence) / Effort
```

Confidence is the agent's calibrated probability (see §9). Top-K (default K=3) advance to BUILD. Agents record predicted outcomes for later Brier scoring.

---

## 8. BUILD → DRAFT-IP → GATE

- **BUILD:** M1 skeleton committed to a feature branch. WIP cap: 5.
- **DRAFT-IP:** Agent drafts (a) invention disclosure with named human inventor, (b) provisional patent text (unsigned, unfiled), (c) trademark search notes, (d) copyright notice. All artifacts land in `ip/drafts/WR-XXXX/`.
- **GATE:** PR opened with `HUMAN MERGE REQUIRED` label. A human reviewer must:
  1. Verify inventor attribution.
  2. Verify no autonomous submission occurred.
  3. Approve or reject launch.

No CI job may auto-merge PRs carrying this label.

---

## 9. Calibration — Brier score

For every DECIDE-stage prediction with a binary outcome (shipped / killed post-build, or hit-target-revenue / missed), record `(predicted_p, actual)`. Rolling 90-day Brier:

```
Brier = (1/N) Σ (p_i − o_i)²
```

**Target: Brier < 0.20.** If Brier ≥ 0.25 for 30 consecutive days, the loop auto-pauses and opens a calibration issue. Optimizing approval rate instead of Brier is prohibited (§2.6).

---

## 10. WIP cap — Little's Law

```
WIP ≤ throughput × cycle_time
```

Default: 5 concurrent BUILD items. If cycle time exceeds 21 days, WIP cap drops to 3.

---

## 11. Legal reality (encoded)

- **Inventorship:** *Thaler v. Vidal*, 43 F.4th 1207 (Fed. Cir. 2022) — an AI cannot be listed as an inventor on a US patent. The human directing the invention is the inventor of record.
- **Authorship:** USCO, *Copyright Registration Guidance: Works Containing Material Generated by Artificial Intelligence*, 88 Fed. Reg. 16190 (Mar. 16, 2023) — AI-generated material is not copyrightable; human-authored selection, arrangement, and modification is.
- **Agent role:** documented as a tool in the invention record, analogous to a CAD program or a search engine.

---

## 12. KPIs

| KPI                              | Target        | Red flag                      |
|----------------------------------|---------------|-------------------------------|
| SCREEN kill rate (30-day)        | 60–90%        | 0% or > 95%                   |
| DECIDE Brier (90-day)            | < 0.20        | ≥ 0.25 for 30 days            |
| M1 cycle time                    | ≤ 14 days     | > 21 days                     |
| Human-gate rejection rate        | 10–40%        | 0% (rubber-stamp) or > 60%    |
| Inventions shipped / quarter     | ≥ 3           | 0                             |
| Revenue attributable to loop     | ↑ each Q      | flat or ↓ two Q in a row      |

---

## 13. Revision history

- **rev-0** — Initial draft. Human merge required.

---

## 14. References

- Ulwick, A. *What Customers Want* (2005) — Opportunity Score.
- Altshuller, G. TRIZ 40 inventive principles.
- Fisher, R. A. *The Design of Experiments* (1935).
- Brier, G. W. "Verification of forecasts expressed in terms of probability," *Monthly Weather Review* 78 (1950).
- Little, J. D. C. "A proof for the queuing formula L = λW," *Operations Research* 9 (1961).
- Saaty, T. L. Analytic Hierarchy Process (1980).
- Reforge / Intercom, RICE prioritization framework.
- *Thaler v. Vidal*, 43 F.4th 1207 (Fed. Cir. 2022).
- USCO, 88 Fed. Reg. 16190 (Mar. 16, 2023).
