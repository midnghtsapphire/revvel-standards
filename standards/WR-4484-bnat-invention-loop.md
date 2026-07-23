# WR-4484 — Autonomous BNAT Invention Loop (Human-Gated)

**Status:** rev-0
**Band:** 44xx (Autonomy — Human Merge Required)
**Related:** WR-4483 (Ensemble AHP + RICE decision engine)
**Closes:** #16669, #16670

---

## 0. Prime Directive Alignment

This loop exists to compound invention throughput toward the **$10k → $10M in 3 years** trajectory:

| Phase | Target | BNAT Loop Contribution |
|-------|--------|------------------------|
| P1 | $10k/mo (M1–M6) | 1–2 shipped M1 skeletons/mo via Polar.sh + OSINT wedges |
| P2 | $30k/mo (M6–M18) | Portfolio of 5–10 calibrated bets; kill 60%+ pre-build |
| P3 | $100k/mo (M18–M30) | Loop feeds automated product pipeline; humans gate only launches/filings |
| P4 | $10M cum (M30–M36) | Compounding IP + product moat from disciplined kill/keep decisions |

---

## 1. Scope

Agents may **autonomously**:
- Scan for gaps (jobs-to-be-done, patent white space, OSINT signals)
- Invent candidate solutions (TRIZ, SCAMPER, morphological analysis)
- Screen candidates (DOE-5 kill discipline)
- Decide via WR-4483 ensemble (AHP weights × RICE scoring)
- Build **M1 skeletons** (minimal-viable-1: repo, README, stub API, test harness)
- Draft IP artifacts (provisional patent drafts, prior-art memos, trademark searches)

Agents may **NOT** autonomously:
- Launch a product publicly
- List on a marketplace (Polar.sh, GitHub Sponsors, App Store, etc.)
- File anything with USPTO/USCO/EPO/any registry
- Sign contracts, take payment, or represent the org externally
- Merge to `main` on any branch touching launch/listing/filing surfaces

**Every such action requires a human merge on a PR reviewed by a named human of record.**

---

## 2. Hard Constraints (Legal Reality)

| Constraint | Source | Encoding |
|------------|--------|----------|
| Only humans can be inventors on US patents | *Thaler v. Vidal*, 43 F.4th 1207 (Fed. Cir. 2022) | Every draft names a human inventor; agent listed as "drafting tool" only |
| Only humans can be authors of copyrightable works | USCO Guidance, 88 Fed. Reg. 16190 (Mar. 16, 2023) | Human of record signs every deposit; agent contribution disclosed |
| No agent-executed filings | Org policy | GATE stage blocks any `filing/*`, `launch/*`, `listing/*` path without human approval |
| Human of record must materially contribute | USCO 2023 | Human review must produce non-trivial edits, logged in PR |

---

## 3. Named-Math Citations (Required per Stage)

Every stage output MUST cite the math it used. Unnamed heuristics are rejected in review.

| Stage | Named Math | Purpose |
|-------|------------|---------|
| SCAN | **Ulwick Opportunity Score** = Importance + max(Importance − Satisfaction, 0) | Rank unmet-need gaps |
| INVENT | **TRIZ** 40 inventive principles; **SCAMPER**; **morphological box** | Structured ideation, not vibes |
| SCREEN | **DOE-5 kill discipline**: 5 designed experiments, ≥1 must be a kill test | Falsify fast, cheap |
| DECIDE | **WR-4483 ensemble**: AHP pairwise weights × RICE (Reach·Impact·Confidence/Effort) | Multi-criteria, calibrated |
| CALIBRATE | **Brier score** = mean((forecast − outcome)²); target < 0.20 | Are our confidences honest? |
| WIP CAP | **Little's Law**: L = λW → cap concurrent inventions | Prevent thrash |
| GATE | Human merge | Legal + strategic sanity |

---

## 4. The Loop

```
  ┌─────────┐   ┌──────────┐   ┌──────────┐   ┌─────────┐   ┌────────┐   ┌──────┐
  │  SCAN   │──▶│  INVENT  │──▶│  SCREEN  │──▶│ DECIDE  │──▶│ BUILD  │──▶│ GATE │──▶ human
  └─────────┘   └──────────┘   └──────────┘   └─────────┘   │  M1    │   │(HARD)│      merge
       ▲                            │              │        └────────┘   └──────┘
       │                            ▼              ▼             │           │
       │                         [KILL]         [DEFER]     draft IP        │
       │                                                    artifacts       │
       └────────────────────── CALIBRATE ◀─────────────────────────────────┘
                            (Brier, kill-rate)
```

### 4.1 SCAN
- Inputs: OSINT feeds, GitHub issues, Polar.sh funded-issue signals, patent DBs, JTBD interviews.
- Output: `scan/<date>-<topic>.md` with Ulwick Opportunity Scores ≥ 12 flagged.
- Autonomy: **full** (read-only externally).

### 4.2 INVENT
- Apply TRIZ / SCAMPER / morphological analysis to top-N gaps.
- Minimum 3 distinct candidate solutions per gap (avoid single-shot bias).
- Output: `invent/<gap-id>/candidates.md`.
- Autonomy: **full**.

### 4.3 SCREEN (DOE-5 Kill Discipline)
- Design **exactly 5 experiments** per candidate, of which **≥1 is explicitly a kill test** ("what result would make us drop this?").
- Cheap-first ordering; stop on first kill.
- Output: `screen/<candidate-id>/doe5.md` + results.
- **KPI: kill rate ≥ 40%.** A 0% kill rate is a **red flag** — it means we're not designing real kill tests.
- Autonomy: **full** (experiments must not touch prod or external listings).

### 4.4 DECIDE (WR-4483 Ensemble)
- Survivors of SCREEN run through WR-4483: AHP-weighted criteria × RICE score.
- Output: ranked table with confidence bands.
- Three outcomes: **BUILD** (top-quartile), **DEFER** (mid), **KILL** (bottom).
- Autonomy: **full**.

### 4.5 BUILD (M1 Skeleton)
- M1 = repo scaffold + README + stub interface + test harness + `LICENSE` + `NOTICE` disclosing agent contribution.
- Little's Law WIP cap: **max 5 concurrent M1s** in flight org-wide.
- Draft IP artifacts in parallel: provisional patent draft, prior-art memo, trademark availability check.
- Autonomy: **full for code and drafts**; NO push to public registries.

### 4.6 GATE (Human Merge Required) 🛑

This stage is the **hard autonomy boundary**. Any PR touching:

- `launch/**`
- `listing/**` (Polar.sh product listings, marketplace metadata)
- `filing/**` (USPTO/USCO/EPO artifacts)
- `contracts/**`
- Payment configuration
- Public-facing marketing copy

…MUST:

1. Be reviewed by a **named human of record** (inventor/author).
2. Show **material human edits** in the PR diff (not just approval-click).
3. Include a signed `HUMAN_OF_RECORD.md` in the PR.
4. Cite the WR-4483 decision that authorized the build.
5. Pass calibration check (rolling Brier < 0.20).

CI enforces the path guard. Agents cannot bypass. Force-push to protected branches is disabled.

### 4.7 CALIBRATE
- Every 30 days: score all past DECIDE forecasts against outcomes with **Brier score**.
- Target: **Brier < 0.20**.
- Track **kill rate** (target ≥ 40%) and **approval rate** (NOT a target — high approval rate with low Brier means we're miscalibrated-optimistic).
- Output: `calibrate/<month>.md` — feeds back into AHP weight updates in WR-4483.

---

## 5. KPIs (What We Actually Measure)

| KPI | Target | Why |
|-----|--------|-----|
| Rolling Brier score | < 0.20 | Honest confidences |
| Kill rate at SCREEN | ≥ 40% | Real kill tests, not theater |
| M1 skeletons shipped / mo | 1–2 (P1), 3–5 (P2) | Throughput toward $10M |
| Human-gate rejection rate | 10–30% | Too low = rubber-stamping; too high = agents miscalibrated |
| Time from SCAN to GATE | < 14 days | Loop velocity |
| Concurrent WIP (Little's Law) | ≤ 5 | Prevent thrash |

**Anti-KPIs (do NOT optimize):**
- Approval rate at GATE (Goodhart's law → rubber-stamp)
- Raw idea count at INVENT (volume without kill discipline is noise)
- Filings/mo (only humans file; velocity here means humans are overloaded)

---

## 6. Focus-Area Bindings

### 6.1 Polar.sh (GitHub funding)
- SCAN watches funded issues + bounty velocity.
- BUILD produces Polar-ready M1 repos (LICENSE, funding.yml scaffold).
- GATE required before Polar listing goes live.

### 6.2 OSINT tools
- SCAN ingests public feeds only; no scraping ToS violations (encoded as SCREEN kill test #1 for any OSINT candidate).
- BUILD ships CLI + API stub.
- GATE required before public release.

### 6.3 Automated product pipeline
- The loop itself IS the pipeline.
- Compounding effect: each calibrated cycle tightens AHP weights (WR-4483) → better DECIDE → higher-EV builds → faster revenue ramp.

---

## 7. Failure Modes & Mitigations

| Failure | Signal | Mitigation |
|---------|--------|------------|
| Agent invents plausible-but-infringing IP | Prior-art memo weak | SCREEN kill test #1 for any patent-adjacent candidate = FTO check |
| Rubber-stamp gating | Gate rejection rate < 5% | Rotate human of record; require diff evidence |
| Overconfident forecasts | Brier climbing | Auto-widen AHP confidence penalty in WR-4483 |
| WIP explosion | > 5 concurrent M1s | CI blocks new BUILD PRs until WIP drops |
| Legal drift | Agent-authored filing attempted | Path guard in CI + branch protection |

---

## 8. Revision Log

- **rev-0** — Initial. Defines loop, hard constraints, named math, KPIs, focus bindings.

---

## 9. Review Focus (for #16670)

Reviewers: please scrutinize **§2 Hard Constraints** and **§4.6 GATE**. Everything else is process; those two sections are the load-bearing legal/autonomy boundary.
