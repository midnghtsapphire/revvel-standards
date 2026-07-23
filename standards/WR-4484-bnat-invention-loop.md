# WR-4484 — Autonomous BNAT Invention Loop (human-gated)

**Status:** rev-0  
**Band:** 44xx (Autonomy / Invention)  
**Labels:** wr-register, band-44xx, rev-0  
**Autonomy directive:** 🟡 **HUMAN MERGE REQUIRED** — agents draft; humans decide, sign, file.

---

## 1. Purpose

Define the **Autonomous BNAT (Big-Not-Adjacent-Thinking) Invention Loop**: a repeatable, agent-driven pipeline that scans for opportunity gaps, invents candidate solutions, screens them under DOE-5 kill discipline, decides via the WR-4483 ensemble (AHP + RICE), builds M1 (minimum-testable) skeletons, and drafts IP artifacts — **with a hard human-merge gate** before any external launch, marketplace listing, or IP filing.

This standard exists to convert agent throughput into **defensible, calibrated invention velocity** aligned with the PRIME DIRECTIVE ($10k/mo → $10M in 3 years).

---

## 2. Scope

Applies to any automated pipeline (OpenRouter, OpenHands, in-house agents, cron-driven CI loops) that:

- Proposes new products, features, standards, or IP artifacts.
- Produces code, filings, listings, or public-facing content.
- Consumes budget (compute, API, human review time).

Out of scope: purely internal refactors, documentation-only edits, dependency bumps.

---

## 3. Hard constraints (non-negotiable)

H-1. **No autonomous filing.** Agents MUST NOT submit patent, trademark, copyright, or regulatory filings. Per *Thaler v. Vidal* (Fed. Cir. 2022) and USCO 2023 guidance, the **human is the inventor / author of record**. Agents draft; humans sign.

H-2. **No autonomous launch.** Agents MUST NOT publish to Polar.sh, Stripe, app stores, package registries, or any paid channel without an explicit human `merge` + `launch-approved` label on the PR.

H-3. **Kill discipline is a KPI.** A 0% kill rate over any 10-invention window is a **red flag**, not a success. Target kill rate ≥ 60% at DOE-5 screening.

H-4. **Calibration target.** Agent forecasts (P(success), revenue, time-to-M1) MUST be scored with **Brier score < 0.20** on a rolling 30-invention window. Approval rate is NOT the target metric.

H-5. **WIP cap (Little's Law).** Concurrent inventions in flight ≤ ⌊throughput × cycle_time⌋. Default cap: **5 inventions in flight per agent lane**.

H-6. **Named-math citations.** Every stage output MUST cite the specific method used (Ulwick Opportunity Score, TRIZ principle N, DOE-5, Brier, AHP eigenvector, RICE). Unattributed scoring is rejected at CI.

H-7. **Audit trail.** Every agent action logs: prompt hash, model, temperature, cost, timestamp, git SHA. Retained ≥ 7 years for IP provenance.

---

## 4. Pipeline stages

```
[SCAN] → [INVENT] → [SCREEN] → [DECIDE] → [BUILD-M1] → [DRAFT-IP] → [GATE] → [HUMAN MERGE]
```

### 4.1 SCAN — Opportunity discovery

**Input:** Market signals (GitHub trending, HN, Polar.sh top-funded, OSINT feeds, competitor telemetry).

**Method:** **Ulwick Opportunity Score** = Importance + max(Importance − Satisfaction, 0), scored on 1–10 scales from public signal aggregation.

**Output:** Ranked `opportunity-*.md` files. Threshold: Opportunity Score ≥ 12 advances.

**Kill rule:** Score < 12 → archived to `standards/graveyard/`.

### 4.2 INVENT — Candidate generation

**Input:** Top-N opportunities from SCAN.

**Method:** **TRIZ 40 inventive principles** applied combinatorially. Each candidate MUST cite the TRIZ principle(s) used (e.g., "TRIZ-1 Segmentation + TRIZ-15 Dynamics"). BNAT bias: candidates in the *adjacent* category are down-weighted; candidates crossing ≥ 2 domain boundaries are up-weighted.

**Output:** ≥ 5 candidates per opportunity (DOE-5 requires 5 to enable kill discipline).

### 4.3 SCREEN — DOE-5 kill discipline

**Input:** 5+ candidates per opportunity.

**Method:** **Design-of-Experiments with N=5 minimum**. Agents run cheap simulated / desk-research experiments (search-volume, competitor-density, cost-of-goods estimate, technical feasibility, IP whitespace). Each factor gets a pass/fail threshold declared *before* screening (pre-registered).

**Kill rule:** Any candidate failing ≥ 2 factors is killed. Target: **60%+ kill rate**. If kill rate < 40% over 10 windows → thresholds are too loose → auto-tighten by 10%.

### 4.4 DECIDE — WR-4483 ensemble

**Input:** Survivors from SCREEN.

**Method:** Ensemble of:
- **AHP** (Analytic Hierarchy Process) — pairwise criterion weighting via principal eigenvector; consistency ratio CR < 0.10 required.
- **RICE** = (Reach × Impact × Confidence) / Effort.
- Final score = geometric mean of normalized AHP and RICE.

**Output:** Top 1–3 candidates advance to BUILD-M1.

### 4.5 BUILD-M1 — Minimum-testable skeleton

**Input:** Decided candidates.

**Method:** Agent generates smallest artifact that could plausibly earn $1 or gather signal:
- Repo skeleton with README, LICENSE, minimal working code.
- Landing-page draft (not published).
- Polar.sh product draft (not listed).
- Pricing hypothesis with revenue forecast (contributes to Brier calibration).

**Constraint:** ≤ 4 hours agent-time per M1. Timebox is hard.

### 4.6 DRAFT-IP — Legal artifacts (agents draft only)

**Input:** M1 skeleton.

**Method:** Agent drafts:
- Provisional patent application draft (claims, spec, drawings-outline).
- Trademark search + candidate marks.
- Copyright notice + authorship attribution to **human owner**.
- License selection (MIT / Apache-2.0 / proprietary).

**Hard constraint H-1 applies:** No filing. Draft is committed to `ip-drafts/` and awaits human review.

### 4.7 GATE — Automated pre-flight checks

CI MUST verify before allowing merge:

- [ ] All named-math citations present (H-6).
- [ ] Audit trail complete (H-7).
- [ ] WIP cap not exceeded (H-5).
- [ ] Brier score on rolling window < 0.20 (H-4) — else block with `label: calibration-drift`.
- [ ] Kill rate on rolling window ≥ 40% (H-3) — else block with `label: kill-discipline-drift`.
- [ ] No filing / launch actions in diff (H-1, H-2) — grep for API keys to Stripe, USPTO EFS, Polar publish endpoints.
- [ ] Human reviewer assigned.

### 4.8 HUMAN MERGE — Final authority

A human MUST:

1. Review the PR end-to-end.
2. Confirm inventor/author-of-record attribution.
3. Apply `launch-approved` label (separate from `merge`) if external publication is intended.
4. Sign any IP filing themselves — the agent may only pre-fill forms.

---

## 5. Metrics & dashboards

| Metric | Target | Alarm |
|---|---|---|
| Kill rate (rolling 10) | ≥ 60% | < 40% |
| Brier score (rolling 30) | < 0.20 | ≥ 0.25 |
| WIP in flight | ≤ 5 / lane | > 5 |
| Time SCAN → M1 | ≤ 48h | > 96h |
| Human-gate cycle time | ≤ 24h | > 72h |
| Cost per M1 | ≤ $5 | > $15 |
| Revenue attributable to loop | tracks PRIME DIRECTIVE | < plan |

---

## 6. Failure modes & mitigations

| Failure | Signal | Mitigation |
|---|---|---|
| Slop inflation | Kill rate → 0% | Auto-tighten DOE-5 thresholds by 10% |
| Overconfident forecasts | Brier ↑ | Force calibration retraining; down-weight agent proposals |
| Legal exposure | Any autonomous filing attempt | Immediate pipeline halt; incident review |
| Adjacent drift | BNAT score ↓ | Increase domain-crossing weight in INVENT |
| Cost blowout | $/M1 > $15 | Cap tokens; switch to cheaper model tier |

---

## 7. Alignment with PRIME DIRECTIVE

This loop is the **invention engine** feeding the four phases:

- **Phase 1 ($10k/mo):** Loop produces 5–10 Polar.sh-fundable OSS repos + 2–3 OSINT micro-tools.
- **Phase 2 ($30k/mo):** Loop feeds 1–2 SaaS conversions from top-performing M1s.
- **Phase 3 ($100k/mo):** Loop produces IP-defensible products; provisional patents filed by humans on top-3 candidates/quarter.
- **Phase 4 ($10M total):** Loop portfolio of ≥ 30 shipped products; kill discipline has compounded selection quality.

---

## 8. References

- Ulwick, A. *What Customers Want* (Opportunity Score).
- Altshuller, G. *TRIZ 40 Inventive Principles*.
- Fisher, R.A. *The Design of Experiments* (DOE).
- Brier, G.W. (1950). *Verification of forecasts expressed in terms of probability*.
- Saaty, T.L. *The Analytic Hierarchy Process*.
- Intercom. *RICE scoring model*.
- Little, J.D.C. (1961). *A proof for the queuing formula L = λW*.
- *Thaler v. Vidal*, 43 F.4th 1207 (Fed. Cir. 2022).
- U.S. Copyright Office, *Copyright Registration Guidance: Works Containing Material Generated by Artificial Intelligence* (March 2023).
- WR-4483 — Ensemble Decision Standard (AHP + RICE).

---

## 9. Change log

- **rev-0** — Initial standard. Establishes 8-stage pipeline, 7 hard constraints, kill-discipline + Brier calibration as primary KPIs, human-merge gate.
