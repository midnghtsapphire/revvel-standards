# Skill: Repo Prosecution Audit

**When to use:** Any "find gaps, broken wiring, errors, bugs" request against a repo. Prosecution-first: assume broken, prove working.

## Procedure (7 gates, in order)
1. **Survey** — file counts by extension; dirs; identify the repo's own health tooling (tests, doctors, linters).
2. **Validity** — parse every .json and workflow .yml. Template files ({{...}}) must carry template extensions, else rename (fix the naming, never mute the check).
3. **Wiring** — resolve every `run:` script path in workflows to a real file; resolve SSOT markdown links; diff `require()` specifiers against package.json.
4. **Run their own gates** — `npm test`, typecheck, doctor scripts. Diagnose every failure to a root cause; cluster by cause before filing (23 failures may be 1 bug).
5. **Prove the fix** — apply minimal change in a scratch state, rerun, capture before/after numbers. Never file a WR with an unproven fix when proof costs <5 min.
6. **Security** — pull_request_target inventory, @main/@master pins, secret-pattern grep, auto-merge chains.
7. **Hygiene** — duplicate registers, empty-but-valid state files, cron density vs budget, gitkeep-only skeletons older than one cycle.

## Output contract
- One WR per root cause (not per symptom), template-compliant, with **Agent learning note** explaining the failure class and its vaccine.
- Append audit summary to learnings.md; tool/method memory to wr/memory/.
- Fix + vaccine together: every corrective WR names the guard that prevents recurrence.

## Drift rule (added at first live push)
Re-verify every finding against live HEAD before applying — partial fixes may have landed since the audit snapshot. Merge into current state; never overwrite newer work with stale audit copies.
