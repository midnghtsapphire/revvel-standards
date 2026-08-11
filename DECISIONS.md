# Decisions Log

This file tracks operating-mode and architectural decisions for the repository.

## D017 — Exit Quiet Mode (2026-08-08)

**Decision:** Restore event-driven automation triggers on the four remaining
workflows silenced by PR #16805. Cron generators stripped by #16805 stay off.

**Owner directive:** "no more quiet mode" / "i want the agents out of silent mode"
(2026-08-08).

**Scope:**
- `.github/workflows/agent-fallback.yml` — restore `issues`,
  `pull_request_target`, `workflow_call`, `workflow_dispatch` triggers.
- `.github/workflows/auto-approve-clean-prs.yml` — restore `check_suite`,
  `pull_request: labeled`, `workflow_dispatch` triggers.
- `.github/workflows/auto-merge.yml` — restore `pull_request: labeled/unlabeled`
  triggers.
- `.github/workflows/wr-pr-creation.yml` — restore
  `issues: opened/reopened/labeled`, `workflow_dispatch` triggers.
- `.github/workflows/trusted-bot-auto-approve.yml` — restored in PR #17091
  (separate).

**Non-scope:** The ~31 cron generators disabled by #16805 remain disabled. The
#16805 rationale (~80 machine PRs/night, ~$400/week OpenRouter spend) still
argues against blanket cron revival. Restore selectively in follow-ups only
with explicit owner approval and per-workflow cost/value justification.

**Gate signal:** Issue #17099 (`exit-quiet-mode`) is the *standing* Quiet Mode
gate per `wr/specs/01-quiet-mode.md`. It **must remain open**. Closing #17099
re-enters quiet mode for any issue-gated workflow that reads that signal.
PRs implementing D017 (this one, #17091) MUST NOT include `Closes #17099`.

**Preservation:** All four restored workflows keep the 2026-07-25 quiet-mode
owner-directive comment inline, archived per RVS-PRESERVE-001 (who / date /
why). No deletions.

**ChaosMender hygiene applied during restore:**
- `LABEL-RACE-001` — every `removeLabel` call in a re-enabled workflow now
  carries the error-ledger prescribed `.catch` guard that swallows 404s (the
  label may already be gone by the time we react to the event).
- `GITHUB-SCRIPT-INLINE-001` — the deprecated-Bito archive banner is indented
  so the column-0 scanner stops mis-reading it as a truncated `github-script`
  block. Banner *content* is unchanged; the archive is preserved.

**Validation:**
- All four workflows parse cleanly under strict YAML.
- `node scripts/chaosmender.js --changed-only` → 0 findings on the four files.
- `npm run workflows:validate` (automation-doctor) is unchanged vs. clean main.
- Full `npm test`: 708/709 on this branch; the single failure
  (`automation-doctor.test.js → validateWorkflows`) is a *pre-existing* main
  breakage from a duplicate `steps:` key in `apisec-scan.yml`, fixed by
  PR #17091 (713/713 green there). Once #17091 merges and this branch takes
  main back in, `ci/circleci: lint-and-test` and the Ship Quality grounding
  gate go green here too.
- `Create Neon Branch` failure is infrastructure (Neon API 422 — preview-branch
  quota exhausted by open PRs), not a code defect.

**References:**
- PR #16805 — original quiet-mode enter (disabled triggers + crons).
- PR #17091 — restores `trusted-bot-auto-approve.yml` and fixes
  `apisec-scan.yml` duplicate-key.
- Issue #17099 — standing Quiet Mode gate signal (keep open).
- `wr/specs/01-quiet-mode.md` — spec for the gate-signal contract.
- `SYSTEM_MAP.md` — descriptions of these four workflows become accurate again
  post-restore; no doc edit required.
- Error ledger: `LABEL-RACE-001`, `GITHUB-SCRIPT-INLINE-001`,
  `RVS-PRESERVE-001`.
