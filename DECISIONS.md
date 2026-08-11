# DECISIONS Log

This file tracks major operating-mode and architectural decisions.
Each entry is append-only; supersessions are noted inline.

---

## D017 — Exit Quiet Mode (2026-08-08)

**Owner directive:** "no more quiet mode" / "i want the agents out of silent mode"
**Recorded on:** PR #17091
**Standing gate:** issue #17099 (`exit-quiet-mode`) — **MUST remain open**; closing it re-enters quiet mode for issue-gated workflows per `wr/specs/01-quiet-mode.md`.

### Scope

Restore event-driven `on:` triggers on workflows silenced by PR #16805, verbatim from the pre-#16805 commit:

- `.github/workflows/trusted-bot-auto-approve.yml` — restored in PR #17091
- `.github/workflows/agent-fallback.yml` — restored here (issue #17101 / #17266)
- `.github/workflows/auto-approve-clean-prs.yml` — restored here
- `.github/workflows/auto-merge.yml` — restored here
- `.github/workflows/wr-pr-creation.yml` — restored here

### Explicitly out of scope

The ~31 cron generators stripped by #16805 stay OFF. #16805's economic rationale (~80 machine PRs/night, ~$400/week OpenRouter spend) still applies to blanket cron revival. Re-enable crons selectively in follow-up PRs with per-workflow cost justification.

### Preservation

All four re-enabled workflows retain the 2026-07-25 quiet-mode owner-directive comment block, archived in place per RVS-PRESERVE-001 (who/date/why, no deletions).

### ChaosMender remediation folded in

- LABEL-RACE-001: `removeLabel` calls guarded with 404-swallowing `.catch` per error-ledger.
- GITHUB-SCRIPT-INLINE-001: deprecated-Bito archive banner indented off column 0 so the scanner stops mis-parsing it as a truncated `github-script` block. Banner content unchanged.

### Validation

- `yaml` strict parse: clean on all four.
- `node scripts/chaosmender.js --changed-only`: 0 findings.
- `npm test`: 708/709 on this branch; single red is `automation-doctor.test.js` blocked on main's duplicate `steps:` in `apisec-scan.yml` (fixed by PR #17091 → 713/713 once main takes #17091).

---

## D016 and earlier

_See git history prior to this entry._
