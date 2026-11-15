# CircleCI

| Field | Value |
| --- | --- |
| Category | CI |
| Status | active |
| First evidence found | 2026-04-20 |
| Latest evidence found | 2026-11-11 |
| Cost | free tier (6,000 build minutes a month per the cost index) |
| Verdict | NEEDS AUDREY |

Dates are the earliest and latest dated artifact found in the searched
repos, not adoption dates. See the [README](README.md) for what the verdict
labels mean.

## What it was used for

CI gate (lint-and-test) and, since 2026-11-04, the lane PRs merge through while GitHub Actions is billing-locked. Also a Railway deploy job.

## What worked

- Still ran when GitHub-hosted Actions was billing-locked. Commit 4f4929b97 (2026-11-04) names CircleCI as one of the lanes that still reported, and ci/circleci: lint-and-test is a required check in ruleset 17149543.
- Free tier per docs/TOOL_COST_INDEX.md.
- Commit 514f92c84 (2026-06-14) made it a real gate: tests run for real, markdownlint is scoped to changed files.

## What did not work

- Removed 2026-04-23 (commit bc3bb7a89, "stop failing CircleCI pipelines") then restored minimal on 2026-04-25 (a488ee13d).
- docs/WORKFLOW_BOTTLENECK_ANALYSIS.md says it was intentionally disabled with all CI on GitHub Actions at the time of writing.
- Before 2026-06-14 its lint-and-test used "|| echo" soft passes and a duplicate OpenRouter review job (commit 514f92c84).

## Why kept or dropped

Kept. It is now the required merge gate. Repo record: kept as the merge gate. It was removed on 2026-04-23 and restored on 2026-04-25.

## Evidence

- [Commit 4f4929b97: green the CircleCI lane while Actions are billing-locked (2026-11-04)](https://github.com/midnghtsapphire/revvel-standards/commit/4f4929b970e285e4479c12616beb84c99d0ad9e8)
- [Commit 514f92c84: make CircleCI a real scoped gate (#14539, 2026-06-14)](https://github.com/midnghtsapphire/revvel-standards/commit/514f92c84968bed0d71c612683abcf5315afdc59)
- [Commit bc3bb7a89: remove stale config (2026-04-23)](https://github.com/midnghtsapphire/revvel-standards/commit/bc3bb7a897d61b7bb51845cc9b3de6cb2eb7f574)
- [Commit a488ee13d: restore minimal config (2026-04-25)](https://github.com/midnghtsapphire/revvel-standards/commit/a488ee13dcbe1060dc1776ca086ce71459127c38)
- [Commit e51839440: CircleCI to Railway deploy (#18292, 2026-11-07)](https://github.com/midnghtsapphire/revvel-standards/commit/e51839440fc2c345bcc9deaf2f43e669d06681f1)
- [Current config](https://github.com/midnghtsapphire/revvel-standards/blob/8f3bd64eeee6dd3b207b66f8704f99565f1ca252/.circleci/config.yml)
- [CircleCI integration standard](https://github.com/midnghtsapphire/revvel-standards/blob/8f3bd64eeee6dd3b207b66f8704f99565f1ca252/standards/CIRCLECI_INTEGRATION_STANDARD.md)
- [Upgrade log row 2026-07-07](https://github.com/midnghtsapphire/revvel-standards/blob/8f3bd64eeee6dd3b207b66f8704f99565f1ca252/docs/UPGRADE_LOG.md)

## Open gaps for Audrey

- **Needs Audrey:** yes: her own view of CircleCI versus the other CI she has tried
- Why it was removed on 2026-04-23.
- Whether she wants it to stay the main gate once GitHub Actions billing is fixed.
