# mabl

| Field | Value |
| --- | --- |
| Category | testing |
| Status | dropped |
| First evidence found | 2026-04-15 |
| Latest evidence found | 2026-07-09 |
| Cost | est. starts $150+ a month (cost index); local and CI runs credit-free per skills/mabl-expert |
| Verdict | AUDREY: wants mabl run locally (2026-11-11). Repo also records a pause (D010, 2026-05-27). |

Dates are the earliest and latest dated artifact found in the searched
repos, not adoption dates. See the [README](README.md) for what the verdict
labels mean.

## What it was used for

Cloud E2E testing via CLI and GitHub App; paused 2026-05-27.

## What worked

- Hands-off cloud E2E, visual recorder, cross-browser (workflow header).
- Local CLI runs are credit-free per skills/mabl-expert.

## What did not work

- Plans lived in mabl dashboard, invisible to repo and agents.
- Paid MABL_API_KEY kept going missing, causing sentinel spam.
- Silently no-op when the key was absent.

## Why kept or dropped

Paused 2026-05-27; reactivation gate documented 2026-07-07. Pause reasons are in the workflow header; her new ask is local running.

## Evidence

- [Pause PR #13967 (2026-05-28)](https://github.com/midnghtsapphire/revvel-standards/pull/13967)
- [Workflow header liked/disliked](https://github.com/midnghtsapphire/revvel-standards/blob/8f3bd64eeee6dd3b207b66f8704f99565f1ca252/.github/workflows/mabl.yml)
- [Testing stack](https://github.com/midnghtsapphire/revvel-standards/blob/8f3bd64eeee6dd3b207b66f8704f99565f1ca252/docs/TESTING_STACK.md)
- [mabl-expert skill](https://github.com/midnghtsapphire/revvel-standards/blob/8f3bd64eeee6dd3b207b66f8704f99565f1ca252/skills/mabl-expert/SKILL.md)
- [Upgrade log rows](https://github.com/midnghtsapphire/revvel-standards/blob/8f3bd64eeee6dd3b207b66f8704f99565f1ca252/docs/UPGRADE_LOG.md)
- [Cost index row](https://github.com/midnghtsapphire/revvel-standards/blob/8f3bd64eeee6dd3b207b66f8704f99565f1ca252/docs/TOOL_COST_INDEX.md)
- [Commit cfd01c93f: add mabl (2026-04-15)](https://github.com/midnghtsapphire/revvel-standards/commit/cfd01c93f12179d5ce409ffb9ed02b585cc89b35)

## Open gaps for Audrey

- **Needs Audrey:** yes: which mabl features and whether plans should live in the repo
- Set up local runs (not done here).
- Whether plans should be exported into the repo.
