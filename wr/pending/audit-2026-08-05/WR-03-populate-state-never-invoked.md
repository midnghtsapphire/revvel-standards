# [WR] P1 — populate-state.js was built with a CI-ready --check mode but no workflow ever called it

**Priority:** P1
**Gate:** 2 (State & SSOT Freshness)
**Status:** proven — fixed on this branch

## Evidence

- `scripts/populate-state.js:1-9` docstring: "Usage: `node
  scripts/populate-state.js` writes state.json ... `--check` exit 1 if
  state.json is stale" — written specifically to be run in CI.
- `tests/populate-state.test.js` exists and passes — the code itself is
  correct and tested in isolation.
- `grep -rl "populate-state" .github/workflows/` returned zero matches
  before this fix — no workflow ever invoked it, in `--check` or write mode.
- `git log -1 -- scripts/populate-state.js` → added 2026-07-25 in `feat:
  activation sprint 1 — demand-driven coder, live state.json, revenue gate
  (#16806)` — the PR title explicitly promises "live state.json," but the
  wiring to make it live was never added.
- Running `node scripts/populate-state.js --check` against the (stale)
  committed `state.json` prints `state.json is current.` and exits `0` —
  this is **not a bug in the checker**: `state.json` is a byte-for-byte
  faithful derivation of `dashboard-data.json`, so it correctly matches what
  `populate-state.js` would generate right now from stale upstream data. The
  actual staleness lives one layer up, in `dashboard-data.json` — see
  [WR-02](./WR-02-dashboard-push-blocked-by-ruleset.md).

## Root Cause

`populate-state.js` is a small, correct, tested pure-function tool that
derives `state.json` from `dashboard-data.json` — but nothing in the
automation graph ever calls it. Even after WR-02's fix makes
`dashboard-data.json` refresh again every 4 hours, `state.json` would
*still* never update unless something also runs `populate-state.js` in that
same loop. Two independent wiring gaps were compounding on the same
symptom (stale `state.json`).

## Fix

Applied on this branch: added a "Refresh state.json from dashboard-data.json"
step to `.github/workflows/update-project-dashboard.yml`, running `node
scripts/populate-state.js` immediately after `node
scripts/aggregate-project-dashboard.js` and before the changed-files check —
so `state.json` regenerates in the same 4-hour loop as its source data, and
is included in the same commit/PR-fallback path from WR-02.

Verified locally (scratch run, reverted before committing so the branch
doesn't carry a manually-generated snapshot):
```
$ node scripts/aggregate-project-dashboard.js
✅ Dashboard generation complete!
$ node scripts/populate-state.js
state.json written (802 bytes)
$ grep lastUpdated state.json
"lastUpdated": "2026-08-05T15:18:09.140Z"
```

## Agent Learning Note

**Pattern:** a tool built with an explicit `--check` mode "for CI" is a
strong signal someone intended to wire it into a workflow and then didn't —
`--check`/`--strict`/`--dry-run` flags with no corresponding `grep` hit in
`.github/workflows/` are a cheap, high-signal way to find this class of gap.
**Vaccine:** extend Gate 1/3 tooling to specifically grep `scripts/*.js` and
`scripts/*.py` for `--check`, `--strict`, or `--ci` flag definitions, then
verify each has at least one workflow reference. Not implemented in this PR
— proposed as a follow-up for `scripts/automation-doctor.js`.
