# WR-4484 — Autonomous BNAT Invention Loop (Human-Gated)

- **Band:** 44xx (autonomy directive — HUMAN MERGE REQUIRED, no auto-merge, per 4470-band policy)
- **Status:** DRAFT rev 0
- **Depends:** WR-4200, WR-4380, WR-4470, WR-4480, WR-4481, WR-4482 (Evidence-First), WR-4483 (Ensemble AHP), MATH_FRAMEWORK_CATALOG, CORE RULES (SCAN/TEARDOWN/DISCOVER/QUICK)

## Purpose
Agents autonomously discover gaps, invent, build, and PREPARE new products (BNAT-class) end-to-end — authoring drafts, IP artifacts, and launch packages — but NOTHING launches, publishes, files, or merges without human approval. The human gate is the product's final validation stage, not an afterthought.

## The Loop (each stage emits a ledger entry; each formula cites the catalog)
```
1. SCAN     -> demand signals per CORE RULES (SEO, VOC, competitive/BAT, frontier)
2. GAP      -> JTBD framing; Ulwick Opportunity Score: Opp = Imp + max(Imp - Sat, 0)
              threshold: pursue only Opp >= 12 (survey-derived) OR operator-data signal
3. INVENT   -> TRIZ contradiction -> inventive principle; reasoning topology per selector
              (CoT/ToT/GoT matched to branching factor — v2 prompt section 0)
4. SCREEN   -> DOE 5-point (feasibility, practicability, utility, safety, proprietary):
              any FAIL = kill, log, next candidate. BAT compare: build only if candidate
              dominates BAT on >= 2 DOE axes. BNAT check: if lab/patent-phase tech
              dominates the candidate, pivot or park.
5. DECIDE   -> WR-4483 ensemble AHP if multi-criteria; RICE for queue position
              (Confidence printed; Brier-scored on resolution, target BS < 0.20)
6. BUILD    -> M1 skeleton only (one upward rev per change); FAILURE-LEDGER JSONL;
              lane routing WR-4480/4481; append-only files
7. IP-PREP  -> agents DRAFT: provisional-patent-style disclosure (problem, prior art
              search log, claims sketch), copyright headers, license file, attribution.
              LEGAL CONSTRAINT: agents are tools, not inventors/authors of record.
              US law requires a natural-person inventor (Thaler v. Vidal, Fed. Cir. 2022)
              and human authorship for copyright (USCO guidance 2023). Inventor/author
              of record = Audrey Evans; agent contribution logged in ledger for
              disclosure. Agents NEVER file anything.
8. GATE     -> WR-4470 validation gate + human review PR. Launch checklist attached.
              HUMAN MERGE = the approval. No merge, no launch, no listing, no filing.
9. LEARN    -> Brier update on stage-5 confidences; EWMA trust update per agent lane;
              killed-candidate postmortems appended to FAILURE-LEDGER.
```

## Measurement (loop KPIs — all from proven metrics, no invented ratios)
- Throughput: candidates entering SCREEN per week (count)
- Kill discipline: DOE-5 kill rate (healthy loop kills most candidates; a 0% kill rate is a red flag, not a success)
- Calibration: Brier score of stage-5 confidences, target < 0.20
- Cost per gated candidate: full lane spend / candidates reaching GATE
- Human gate outcomes: approve / revise / kill counts (approval rate is NOT the target metric — calibration is)
- Cycle time: SCAN->GATE, tracked as distribution not average (Little's Law applies: WIP = throughput x cycle time; cap loop WIP)

## Hard constraints
- Human merge required at GATE — no exception, no auto-merge, no self-approval
- No external publishing, listing, filing, outreach, or spend commitments by agents
- IP drafts are internal artifacts until human-approved
- Append-only; kills are logged, never deleted
- Evidence hierarchy (WR-4482) governs every stage: operator data > named methods > comps > analogies > sentiment

## Acceptance checklist
- [ ] Loop runs end-to-end on one seeded candidate and produces a gated PR with launch checklist + IP draft
- [ ] DOE-5 kill correctly fires on a seeded infeasible candidate (test fixture)
- [ ] Ledger shows stage entries, agent lanes, costs, and Brier-scorable confidence records
- [ ] No external side effects occur pre-merge (verified by audit)
- [ ] Inventor/author-of-record fields populated with human name; agent contribution disclosed
