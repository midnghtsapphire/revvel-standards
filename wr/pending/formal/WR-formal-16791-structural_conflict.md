# [WR] Formal: structural_conflict on midnghtsapphire/revvel-standards#16791 — chore(deps): bump the npm_and_yarn group across 10 directories

> **RESOLVED 2026-08-08** — path A (`split-deps-per-directory`) landed.  
> Full write-up: [`wr/resolved/formal/WR-formal-16791-structural_conflict-RESOLVED.md`](../../resolved/formal/WR-formal-16791-structural_conflict-RESOLVED.md)  
> Formal re-run: [`artifacts/formal/formal-report-16791-rerun.json`](../../../artifacts/formal/formal-report-16791-rerun.json) → **pass**  
> Scorecard: [`wr/memory/agent-scorecard.jsonl`](../../memory/agent-scorecard.jsonl)  
> Closes issue #16950 (human merge gate still required).

## Description

Formal dual-path verification (`boolean_xor_dual_path`, window 78h) produced verdict **structural_conflict**.

### Formal summary
- Winner path: `a`
- Agreement: 8000 bps
- Risk score: 4800
- XOR bits: 576
- Path A score: 10000 · Path B score: 8800
- Rationale: method=boolean_xor_dual_path | A(split-deps-per-directory)=10000bps bits=0b1111111111 | B(dependabot-group-bump)=8800bps bits=0b0110111111 | xor=0b1001000000 agree=8000bps | winner=a chosen=ours verdict=structural_conflict

### Agent judgements
- dependabot[bot] (author) stance=pro_theirs correct=false
- openrouter (orchestrator) stance=block correct=true
- midnghtsapphire (approver) stance=approve correct=false

### Desired outcome
1. Re-open dual-path analysis with fresh predicates if `needs_reaudit`.
2. If `fail` / structural: land a fix PR that restores the formal winner side predicates.
3. Keep human review: do **not** merge without midnghtsapphire approval.

### Resolution (2026-08-08)
- Updated `.github/dependabot.yml` to one `directory:` per entry + unique scoped groups for the 10 directories from #16791.
- Added `scripts/check-dependabot-split-deps.js` + `tests/dependabot-split-deps.test.js` vaccine.
- Formal re-run verdict: **pass** (agreement 10000 bps, xor 0).
- Scorecard event logged. PR #16791 remains closed/unmerged.

### Labels
`wr`, `formal:auto-wr`, `formal:fail`, `human-review-required`, `priority:p1`

### Auto-filled by Research Engine
- **Phase Alignment:** _(auto)_
- **Revenue Impact:** process reliability / agent fleet quality
- **Priority:** priority:p1
- **Acceptance Criteria:** formal re-run shows pass OR documented human override with evidence
- **Technical Approach:** _(auto)_
- **Dependencies:** formal verifier pack, OpenRouter optional
- **Estimated Effort:** _(auto)_
- **Risk Assessment:** silent process drift if ignored
- **Success Metrics:** formal:pass on re-run; scorecard event logged

---
provenance:
  loop: formal-auto-wr
  source_report: formal-report.json
  generated_at: 2026-08-05T14:54:25.847Z
  resolved_at: 2026-08-08T03:59:00.000Z
  resolution_report: artifacts/formal/formal-report-16791-rerun.json
  human_gate: required
  allowlist_labels: wr, formal:auto-wr, formal:fail, human-review-required, priority:p1
  verdict_alias: structural_conflict → formal:fail
