# GitHub Copilot (coding agent, code review)

| Field | Value |
| --- | --- |
| Category | coding agent / code review |
| Status | active |
| First evidence found | 2026-04-14 |
| Latest evidence found | 2026-08-27 |
| Cost | cost index: Max, $566.17 additional usage Aug 1-21 2026, $421.28 of it code review |
| Verdict | RECORDED: automated code review OFF and auto-assign stopped (owner, 2026-08-21) |

Dates are the earliest and latest dated artifact found in the searched
repos, not adoption dates. See the [README](README.md) for what the verdict
labels mean.

## What it was used for

Coding agent assigned to issues, code review, and CI auto-fix triggers.

## What worked

- Repo history shows Copilot-authored PRs (e.g. growlingeyes#72).
- PR #14092 (2026-05-29) free auto-resolve of merge conflicts, "never Copilot".

## What did not work

- Commits 3acb102ea and e5f039b3f (2026-08-21): stop auto-assigning @Copilot, which spends on every issue.
- Cost index: daily billed usage fell from $97.59 (Aug 20) to $5.71 (Aug 21) after the freeze.
- PR #233 (2026-04-21) replaced Copilot assignee routing with OpenRouter triage.

## Why kept or dropped

Review off, assignment gated behind REVVEL_ALLOW_COPILOT_ASSIGN. Cost: 74% of the additional usage was the code-review model.

## Evidence

- [Cost index row](https://github.com/midnghtsapphire/revvel-standards/blob/8f3bd64eeee6dd3b207b66f8704f99565f1ca252/docs/TOOL_COST_INDEX.md)
- [Commit 3acb102ea: stop auto-assigning (#17864)](https://github.com/midnghtsapphire/revvel-standards/commit/3acb102eac7eb038cada29edec73169b8c81b369)
- [Commit e5f039b3f (#17865)](https://github.com/midnghtsapphire/revvel-standards/commit/e5f039b3f135fa4a38e6d63a6eac5cab8ca86de9)
- [PR #233: replace Copilot assignee routing](https://github.com/midnghtsapphire/revvel-standards/pull/233)
- [PR #236: OpenRouter coding agent replaces Copilot](https://github.com/midnghtsapphire/revvel-standards/pull/236)
- [Test: copilot assignment is gated](https://github.com/midnghtsapphire/revvel-standards/blob/8f3bd64eeee6dd3b207b66f8704f99565f1ca252/tests/copilot-assignment-is-gated.test.js)
- [Commit e26b33729: start Copilot and Codex from mentions (2026-08-27)](https://github.com/midnghtsapphire/revvel-standards/commit/e26b337298c1fb1a0c2726cf816f25f783a101db)
- [Subscriptions file](https://github.com/midnghtsapphire/revvel-standards/blob/8f3bd64eeee6dd3b207b66f8704f99565f1ca252/data/subscriptions.yml)

## Open gaps for Audrey

- **Needs Audrey:** yes: whether Copilot should stay on at all
- Her verdict.
- Current plan and bill.
