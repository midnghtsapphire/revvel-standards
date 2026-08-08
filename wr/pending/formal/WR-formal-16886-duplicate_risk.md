# [WR] Formal: duplicate_risk on midnghtsapphire/revvel-standards#16886 — Fleet Maintenance: ocean2-v2-research

## Description

Formal dual-path verification (`boolean_xor_dual_path`, window 78h) produced verdict **duplicate_risk**.

### Formal summary
- Winner path: `tie`
- Agreement: 10000 bps
- Risk score: 400
- XOR bits: 0
- Path A score: 9600 · Path B score: 9600
- Rationale: method=boolean_xor_dual_path | A(close-as-duplicate-only)=9600bps bits=0b0111111111 | B(ocean2-maintenance)=9600bps bits=0b0111111111 | xor=0b0000000000 agree=10000bps | winner=tie chosen=hybrid verdict=duplicate_risk

### Agent judgements
- midnghtsapphire (author) stance=pro_theirs correct=true
- Copilot (reviewer) stance=neutral correct=null

### Desired outcome
1. Confirm whether #16886 is a true duplicate of an existing ocean2 maintenance WR/PR; link or close as duplicate if so.
2. If not duplicate: keep hybrid path and document why both close-as-duplicate and maintenance predicates score equally.
3. Keep human review: do **not** merge without midnghtsapphire approval.

### Labels
`wr`, `formal:auto-wr`, `formal:fail`, `human-review-required`, `priority:p2`

### Auto-filled by Research Engine
- **Phase Alignment:** _(auto)_
- **Revenue Impact:** process reliability / agent fleet quality
- **Priority:** priority:p2
- **Acceptance Criteria:** formal re-run shows pass OR documented human override with evidence
- **Technical Approach:** _(auto)_
- **Dependencies:** formal verifier pack, OpenRouter optional
- **Estimated Effort:** _(auto)_
- **Risk Assessment:** silent process drift if ignored
- **Success Metrics:** formal:pass on re-run; scorecard event logged

## [WR] Formal duplicate_risk resolution — PR #16886 (Fleet Maintenance: ocean2-v2-research)

## Output Type

project-management-doc

## Status

**Resolved — documented human override (hybrid path retained).** Closes issue #16951.

## What happened (plain English)

The automated formal checker (`boolean_xor_dual_path`, 78-hour window) compared
two possible futures for PR
[midnghtsapphire/revvel-standards#16886](https://github.com/midnghtsapphire/revvel-standards/pull/16886):

- **Path A — close-as-duplicate-only**: treat the PR as a pure duplicate of the
  open fleet-maintenance WR
  [#16884](https://github.com/midnghtsapphire/revvel-standards/issues/16884)
  (`[WR] Fleet maintenance — midnghtsapphire/ocean2-v2-research`) and close it
  without landing content. Score: 9600 bps, bits `0b0111111111`.
- **Path B — ocean2-maintenance**: treat the PR as legitimate fleet maintenance
  for `midnghtsapphire/ocean2-v2-research` and keep the maintenance-shaped
  changes. Score: 9600 bps, bits `0b0111111111`.

Path quality scores were equal (9600 bps each). Separately, the dual-path
**agreement** metric was 10000 bps because the predicate bitmasks were identical
(XOR `0b0000000000`, 0 XOR bits, risk score 400). Equal path scores + perfect
bit agreement produced a **tie**, so the checker returned **duplicate_risk**
(hybrid) instead of auto-pass and required a human decision before treating
the case as closed.

## Duplicate confirmation (desired outcome 1)

**Process-level duplicate of open WR #16884 — yes. Content-identical no-op — no.**

Evidence:

1. **Canonical open WR still exists:** issue
   [#16884](https://github.com/midnghtsapphire/revvel-standards/issues/16884)
   remains **open** and is the filed fleet-maintenance sweep item for target
   repo `midnghtsapphire/ocean2-v2-research` (created 2026-08-03T10:18:04Z,
   before PR #16886).
2. **Automation repeatedly linked them:** PR #16886 received multiple
   "Potential Duplicate Detected" comments pointing at #16884, and the PR was
   labeled `duplicate` on the GitHub object.
3. **Jules task metadata** on #16886 states the original prompt was the same WR
   text as #16884 and the target repository was
   `midnghtsapphire/ocean2-v2-research`.
4. **Content is not a pure no-op:** the landed diff only touched two
   revvel-standards test files
   (`tests/openrouter-coder-workflow.test.js`,
   `tests/wr-control-plane.test.js`). The body claimed the real ocean2 patch
   lived at `/tmp/0001-fleet-maintenance-ocean2-v2.patch` and was **not**
   committed into this repo. So #16886 did not complete the #16884 target-repo
   maintenance work; #16884 remains the canonical tracker for that remaining
   work.

**Canonical link:** keep [#16884](https://github.com/midnghtsapphire/revvel-standards/issues/16884)
as the open ocean2-v2-research fleet-maintenance WR. PR #16886 is the
process-duplicate Jules shell that also landed incidental test hardening in
revvel-standards.

## Why both predicates scored equally (desired outcome 2 — hybrid path)

Both paths scoring 9600 bps with XOR 0 is expected, not a verifier bug:

| Predicate bit family | Path A (close-as-duplicate-only) | Path B (ocean2-maintenance) | Why equal |
| --- | --- | --- | --- |
| Theme / target match | Matches open WR #16884 title + target | Same ocean2 fleet-maintenance theme | Same subject |
| Structural integrity | Closing as dup is safe | Landing small test-only diff is safe | Both structurally clean |
| Secrets / CI / standards | No secret risk either way | Diff is test-only in this repo | Same bits |
| Completeness of ocean2 work | Closing leaves #16884 open (correct) | "Maintenance" PR also leaves target-repo work unfinished | Neither path fully ships ocean2 |

The hybrid verdict is therefore correct: **acknowledge the process duplicate
of #16884 while retaining the maintenance-shaped framing for the incidental
test fixes that midnghtsapphire chose to merge.**

Do **not** rewrite the historical formal verdict to pure `pass` without this
evidence pack — the tie is the signal that both futures were valid.

## Human override — evidence (desired outcome 3)

A fresh dual-path re-run is no longer meaningful because the PR's state
changed: the human gate was satisfied directly.

1. **PR #16886 was reviewed and merged by @midnghtsapphire** (the required
   human approver named in the desired outcome) on **2026-08-05T13:17:00Z**,
   merge head `7345e1d3b514547b9552ee6de1500a6054550162`. Merging is the
   explicit human approval the gate asked for — "do not merge without
   midnghtsapphire approval" was honored, because midnghtsapphire performed
   the merge themself.
2. **Author judgement already favored the maintenance side** and was marked
   correct: midnghtsapphire (author, stance=pro_theirs, correct=true). Copilot
   reviewer stance was neutral (`correct=null`), so there is no opposing
   formal agent judgement to re-litigate.
3. **GitHub labels on the merged PR include `duplicate`**, which records the
   path-A process-duplicate finding alongside the merge (path B / hybrid
   content keep). Confidence: high (source: formal summary in issue #16951,
   PR #16886 merge metadata, open issue #16884, duplicate-detector comments).

Verdict after override: **pass (human override — hybrid path; merged by
required approver; process-duplicate of #16884 documented)**.

## Acceptance criteria mapping

- [x] Documented human override with evidence (this file, sections above)
- [x] Duplicate confirmation with canonical link to #16884
- [x] Hybrid path retained and equal-score rationale documented
- [x] Scorecard event logged: see `wr/memory/agent-scorecard.jsonl` entry with
  `pr: 16886` / `note` containing `formal duplicate_risk resolved by human override`
- [x] Human gate: midnghtsapphire merged #16886; this follow-up PR must also
  wait for midnghtsapphire approval before merge (no autonomous merge)

## How to verify (click-by-click)

1. Open <https://github.com/midnghtsapphire/revvel-standards/pull/16886> —
   the header shows a purple **Merged** badge with
   "midnghtsapphire merged … into main", and labels include `duplicate`.
2. Open <https://github.com/midnghtsapphire/revvel-standards/issues/16884> —
   the issue is still **Open** and is the canonical ocean2 fleet-maintenance WR.
3. Open `wr/memory/agent-scorecard.jsonl` in this repo and search for
   `16886` — you will find one JSON line recording this resolution.
4. Open this file and confirm the **Status** line says
   `Resolved — documented human override`.
5. Success looks like: issue #16951 closed by the PR that lands this file +
   the scorecard line.

---
provenance:
  loop: formal-auto-wr
  source_report: formal-report.json
  generated_at: 2026-08-05T14:54:25.304Z
  filed_at: 2026-08-05T18:30:00Z
  human_gate: required
  allowlist_labels: wr, formal:auto-wr, formal:fail, human-review-required, priority:p2
  verdict_alias: duplicate_risk → formal:fail
  agent: grok-build
  source_issue: midnghtsapphire/revvel-standards#16951
  related_pr: midnghtsapphire/revvel-standards#16886
  canonical_open_wr: midnghtsapphire/revvel-standards#16884
  resolution: human_override
  resolution_path: hybrid
  duplicate_of_process: midnghtsapphire/revvel-standards#16884
  resolved_at: 2026-08-08T03:20:00Z
  human_gate_status: satisfied (midnghtsapphire merged #16886 on 2026-08-05T13:17:00Z)
