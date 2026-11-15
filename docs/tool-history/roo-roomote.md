# Roo / Roomote (and Roo-Cline, Cline)

| Field | Value |
| --- | --- |
| Category | coding agent |
| Status | trial |
| First evidence found | 2026-05-03 |
| Latest evidence found | 2026-11-11 |
| Cost | free: pinned open-source Roo Code v3.54.0 (Apache-2.0); paid Roo Cloud and Roomote dropped in open PR |
| Verdict | NEEDS AUDREY |

Dates are the earliest and latest dated artifact found in the searched
repos, not adoption dates. See the [README](README.md) for what the verdict
labels mean.

## What it was used for

Planned coder lane and, from 2026-11-11, the planned default WR rewriter. Roo-Cline was documented as a VS Code agent.

## What worked

- docs/ROO_CLINE_SETUP.md (2026-05-03) records features: autonomous file edits, modes, human approval, multi-LLM, MCP, open source.
- -name- PR #19 (merged 2026-11-07) added the .roomodes scaffold with OpenRouter as default.
- -name- PR #20 (open, 2026-11-11, TriageChief) pins upstream Roo-Code v3.54.0 as a submodule with a CircleCI pin check.

## What did not work

- WR #13590 (2026-05-18): "roo code is closing up shop use free here" (RooCodeInc/Roo-Code).
- docs/process/SYSTEM_MAP.md: there is no default CLI to run, so the coder lane is opt-in via ROO_RUN_COMMAND, with OpenRouter as the backup.

## Why kept or dropped

Plan doc (2026-11-05): Roo or Roomote, free tier first, any paid option needs its own WR and PR. Roo Code was archived on 2026-05-15. An open PR (-name- #20, 2026-11-11) pins the last official release v3.54.0 and drops dependence on paid Roo Cloud and Roomote. The Roo or Roomote lock is from the 2026-11-05 plan doc.

## Evidence

- [Roo-Cline setup guide](https://github.com/midnghtsapphire/revvel-standards/blob/8f3bd64eeee6dd3b207b66f8704f99565f1ca252/docs/ROO_CLINE_SETUP.md)
- [WR #13590 document, commit 8e6b00d62 (2026-05-18)](https://github.com/midnghtsapphire/revvel-standards/commit/8e6b00d625674e3a1127f6c0f6cf761a836a3c40)
- [System map: Roo successors and ROO_RUN_COMMAND](https://github.com/midnghtsapphire/revvel-standards/blob/8f3bd64eeee6dd3b207b66f8704f99565f1ca252/docs/process/SYSTEM_MAP.md)
- [Agent prompt execution evaluation](https://github.com/midnghtsapphire/revvel-standards/blob/8f3bd64eeee6dd3b207b66f8704f99565f1ca252/docs/AGENT_PROMPT_EXECUTION_EVALUATION.md)
- [Plan doc lock 2026-11-05, commit 3c18dc1b9](https://github.com/midnghtsapphire/revvel-standards/blob/3c18dc1b9/docs/plans/WR_TO_PR_PIPELINE_PLAN_2026-11-05.md)
- [Roo skill](https://github.com/midnghtsapphire/revvel-standards/blob/8f3bd64eeee6dd3b207b66f8704f99565f1ca252/skills/roo-cline/SKILL.md)
- [-name- PR #19: .roomodes scaffold (merged 2026-11-07)](https://github.com/midnghtsapphire/-name-/pull/19)
- [-name- PR #20 (open): pin Roo-Code v3.54.0, drop Roo Cloud and Roomote](https://github.com/midnghtsapphire/-name-/pull/20)

## Open gaps for Audrey

- **Needs Audrey:** yes: which successor she picked and whether anything runs
- Whether Roomote is in use. Search found no Roomote workflow or run in the repos.
- Why she picked Roo or Roomote over Jules.
