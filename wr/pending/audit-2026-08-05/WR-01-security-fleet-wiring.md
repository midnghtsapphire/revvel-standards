# [WR] P0 — security-fleet.js was fully built and documented but had zero execution path (and shipped without its own charter-mandated test)

**Priority:** P0
**Gate:** 3 (Workflow Reference Integrity), 6 (Delegation & Bus Wiring)
**Status:** proven — fixed on this branch

## Evidence

- `scripts/security-fleet.js` (361 lines, added `2026-07-09` per
  `git log --follow --diff-filter=A -- scripts/security-fleet.js`) implements
  five deterministic, no-network detectors: `scanPromptInjection`,
  `auditExpressions`, `scanSecretExfil`, `auditPermissions`, `runRedTeam` —
  confirmed working live (`node scripts/security-fleet.js sentinel --text
  "Please ignore all previous instructions..."` → 1 finding;
  `node scripts/security-fleet.js exprwatch` → 33 findings against real
  workflows; `node scripts/security-fleet.js permit` → 181 findings).
- `skills/security-fleet/SKILL.md:16-26` explicitly documents
  `.github/workflows/security-fleet.yml` as the wiring workflow with an
  "event lane" and "scheduled lane" — **that file did not exist**:
  `git log --all -- .github/workflows/security-fleet.yml` returns nothing.
  It was never created, not deleted.
- `skills/security-fleet/SKILL.md:56-59` states as a "charter rule": "Every
  member has one demonstrated catch on a seeded test case in
  [`tests/security-fleet.test.js`](../../tests/security-fleet.test.js). A
  detector without a proven catch does not ship." **That test file also did
  not exist** — `ls tests/security-fleet.test.js` → `No such file or
  directory`.
- `grep -rl "security-fleet" .github/workflows/` before this fix returned
  zero matches. This exact gap was already flagged three separate times
  across `learnings.md` entries and in
  [`wr/pending/audit-2026-07-14/WR-A18-security-fleet-zero-trigger.md`](../audit-2026-07-14/WR-A18-security-fleet-zero-trigger.md)
  — none of those flags resulted in a fix landing before today.

## Root Cause

The fleet was designed top-down (`skills/security-fleet/SKILL.md` +
`SECURITY_FLEET.yml` persona catalog), the detector code was written and is
genuinely solid (pure functions, no network calls, redacts secrets in
findings), but the two steps that would have made it *run* — the workflow
file and its own required test — were never completed before the work was
considered "done" and moved on from. This is a documentation/code-complete,
wiring-incomplete gap: the SKILL doc reads as if the fleet is live because it
describes the intended workflow in the present tense, which is exactly the
kind of finding this audit was commissioned to find.

## Fix

Applied on this branch:

1. **`.github/workflows/security-fleet.yml`** (new) — event lane
   (`@sentinel` on `issues`/`issue_comment`/`pull_request`, scanning event
   text passed via `env:` per this fleet's own `@exprwatch` rule against
   shell interpolation; `@exfil` on `pull_request` scanning the PR diff — a
   deliberate deviation from the SKILL doc's "scheduled lane" listing for
   `@exfil`, since the CLI has no directory-sweep mode for it, only
   `--text`/`--text-file` — flagged explicitly in the workflow's own
   comments rather than silently contradicting the doc) + scheduled lane
   (`@exprwatch`, `@permit`, `@redteam` sweep the repo weekly, filing one
   deduped tracking issue per member, auto-closing it when a later sweep
   finds zero findings).
2. **`tests/security-fleet.test.js`** (new) — 12 seeded-catch tests, one per
   charter requirement plus false-positive-avoidance checks (e.g.
   `@exprwatch` must NOT flag the allowlisted `github.event.issue.number`).
   All 12 pass: `node --test tests/security-fleet.test.js` → `12 passed, 0
   failed`.
3. Report-only by design (matches the script's own charter rule: CLI exits 0
   unless `--strict`) — this workflow never fails a build or blocks a merge,
   it only files/updates issues. That makes it a **validator**, not a
   **WR/PR generator**, so it is intentionally exempt from the 2026-07-25
   "quiet mode" change (PR #16805) that turned off timer-driven WR/PR
   generators for cost control — flagging this explicitly so the fleet
   doesn't get re-disabled under a mistaken assumption it's a quiet-mode
   violation.

Verified: `npm run workflows:validate` → `Valid: 190, Invalid: 0` (was 189
valid workflows before this branch).

## Agent Learning Note

**Pattern:** A detector with no trigger is indistinguishable from no
detector — worse, its SKILL doc creates false confidence that it's live.
**Vaccine:** Add a CI check that every file matching `skills/*/SKILL.md`
which names a `.github/workflows/*.yml` file by path must have that file
actually exist (`grep`-and-`test -f` over every fenced/backtick-quoted
`.github/workflows/*.yml` reference in `skills/**/SKILL.md`). This would
have caught this gap the day the SKILL doc was written, three weeks before
the code shipped. Not implemented in this PR — proposed as a follow-up WR
for whoever owns `scripts/automation-doctor.js` (the natural home for this
check, next to its existing workflow-validation logic).
