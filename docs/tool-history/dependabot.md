# Dependabot

| Field | Value |
| --- | --- |
| Category | dependency updates |
| Status | active |
| First evidence found | 2026-04-14 |
| Latest evidence found | 2026-11-06 |
| Cost | free |
| Verdict | RECORDED: mandatory standard (2026-04-14) |

Dates are the earliest and latest dated artifact found in the searched
repos, not adoption dates. See the [README](README.md) for what the verdict
labels mean.

## What it was used for

Automated dependency PRs.

## What worked

- Standard in place.

## What did not work

- Issue #18286: five unmerged Dependabot PRs carried security patches, stalled 8 weeks.

## Why kept or dropped

Kept. Built into GitHub.

## Evidence

- [Standard](https://github.com/midnghtsapphire/revvel-standards/blob/8f3bd64eeee6dd3b207b66f8704f99565f1ca252/docs/Master_Inventory/DEPENDABOT_STANDARD.md)
- [Config](https://github.com/midnghtsapphire/revvel-standards/blob/8f3bd64eeee6dd3b207b66f8704f99565f1ca252/.github/dependabot.yml)
- [Issue #18286](https://github.com/midnghtsapphire/revvel-standards/issues/18286)

## Open gaps for Audrey

- **Needs Audrey:** yes: what to do with stalled PRs
- Stalled PR plan.
