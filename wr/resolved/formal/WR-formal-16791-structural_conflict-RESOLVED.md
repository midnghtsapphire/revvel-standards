# [WR RESOLVED] Formal: structural_conflict on #16791 → pass (path A)

**Status:** RESOLVED (pending human merge gate)  
**Issue:** #16950  
**Conflict PR:** #16791 (closed, not merged)  
**Fix branch:** `copilot/fix-structural-conflict-verification`  
**Resolved at:** 2026-08-08T03:59:00Z

## What failed

Formal dual-path verification (`boolean_xor_dual_path`) scored:

| Path | Strategy | Score |
| --- | --- | ---: |
| A (winner) | `split-deps-per-directory` | 10000 bps |
| B (loser) | `dependabot-group-bump` (`npm_and_yarn` across 10 dirs) | 8800 bps |

Verdict was `structural_conflict` because path B was the PR on the table while path A was the architectural winner (agreement 8000 bps, risk 4800, xor 576).

## What we shipped (path A)

1. **`.github/dependabot.yml`**
   - One `directory:` per `updates[]` entry (no `directories:` plural).
   - Unique directory-scoped group names (`root-tooling-patch-minor`, `affiliate-hub-patch-minor`, …).
   - Explicit ban on `npm_and_yarn` multi-directory grouping.
   - Per-directory npm blocks for the 10 directories from #16791 so future bumps open as **one PR per directory**.
   - Majors still ignored (human review).

2. **Vaccine:** `scripts/check-dependabot-split-deps.js`  
   Exit non-zero if multi-dir groups / forbidden names return.

3. **Regression tests:** `tests/dependabot-split-deps.test.js`

4. **Formal re-run:** `artifacts/formal/formal-report-16791-rerun.json` → **verdict=`pass`**

5. **Scorecard event:** `wr/memory/agent-scorecard.jsonl` (`type=formal_resolution`)

6. **Standard update:** monorepo section in `docs/Master_Inventory/DEPENDABOT_STANDARD.md`

## Acceptance criteria

| Criterion | Status |
| --- | --- |
| Formal re-run shows `pass` OR documented human override | **pass** (rerun artifact) |
| Scorecard event logged | **yes** (`formal-16791-resolution.jsonl`) |
| Human review before merge | **required** — midnghtsapphire approval |

## Human checklist (plain English)

1. Open this PR on GitHub.
2. Skim `.github/dependabot.yml` — confirm each product has its **own** block and no shared `npm_and_yarn` group.
3. Confirm checks are green (especially `tests/dependabot-split-deps.test.js`).
4. Click **Approve** / merge when satisfied.
5. Do **not** reopen or merge #16791.

## Provenance

```yaml
loop: formal-auto-wr-resolution
source_issue: 16950
source_pr: 16791
prior_verdict: structural_conflict
new_verdict: pass
winner_path: split-deps-per-directory
agent: Copilot
human_gate: required
```
