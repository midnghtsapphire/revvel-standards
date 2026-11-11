# Keploy

| Field | Value |
| --- | --- |
| Category | testing |
| Status | active |
| First evidence found | 2026-05-28 |
| Latest evidence found | 2026-07-09 |
| Cost | free tier; Pro est. $20-$40 per seat per month (estimate) |
| Verdict | RECORDED: keep (D010; cost index) |

Dates are the earliest and latest dated artifact found in the searched
repos, not adoption dates. See the [README](README.md) for what the verdict
labels mean.

## What it was used for

AI-generated unit and API tests in PRs; replaced mabl.

## What worked

- Tests visible in repo; Chrome recorder.

## What did not work

- Does not replace browser E2E; AI tests need a skim; free-tier limits.

## Why kept or dropped

Kept. Tests land in the repo, visible to agents and review; no paid key for the basic tier.

## Evidence

- [Testing stack](https://github.com/midnghtsapphire/revvel-standards/blob/8f3bd64eeee6dd3b207b66f8704f99565f1ca252/docs/TESTING_STACK.md)
- [PR #13967](https://github.com/midnghtsapphire/revvel-standards/pull/13967)
- [Cost index](https://github.com/midnghtsapphire/revvel-standards/blob/8f3bd64eeee6dd3b207b66f8704f99565f1ca252/docs/TOOL_COST_INDEX.md)
- [Upgrade log](https://github.com/midnghtsapphire/revvel-standards/blob/8f3bd64eeee6dd3b207b66f8704f99565f1ca252/docs/UPGRADE_LOG.md)

## Open gaps for Audrey

- **Needs Audrey:** yes: whether it actually ran
- Evidence it has produced tests.
