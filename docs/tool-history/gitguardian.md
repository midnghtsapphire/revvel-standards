# GitGuardian

| Field | Value |
| --- | --- |
| Category | secret scanning |
| Status | active |
| First evidence found | 2026-04-23 |
| Latest evidence found | 2026-11-11 |
| Cost | free for individuals per docs/_MASTER_INVENTORY.md |
| Verdict | NEEDS AUDREY |

Dates are the earliest and latest dated artifact found in the searched
repos, not adoption dates. See the [README](README.md) for what the verdict
labels mean.

## What it was used for

GitHub App that scans every commit in a PR for secrets.

## What worked

- Commit 4f4929b97: a GitHub App, not a workflow, so it still reported while Actions was locked.
- Privacy standard says treat every GitGuardian alert as P0.

## What did not work

- oaudrey PR #11/#12: it flagged ${POSTGRES_PASSWORD:?} variable references in old commit 7422563 (incident 39720036); no real secret leaked.
- It scans every commit in a PR, so fixing needed a clean single-commit branch.

## Why kept or dropped

Kept. Kept running during the Actions billing lock. It flagged a Compose variable reference in oaudrey PR #11.

## Evidence

- [Commit 4f4929b97](https://github.com/midnghtsapphire/revvel-standards/commit/4f4929b970e285e4479c12616beb84c99d0ad9e8)
- [Master inventory entry](https://github.com/midnghtsapphire/revvel-standards/blob/8f3bd64eeee6dd3b207b66f8704f99565f1ca252/docs/_MASTER_INVENTORY.md)
- [Privacy migration standard](https://github.com/midnghtsapphire/revvel-standards/blob/8f3bd64eeee6dd3b207b66f8704f99565f1ca252/docs/Master_Inventory/REPOSITORY_PRIVACY_MIGRATION_STANDARD.md)
- [oaudrey PR #11 (draft, superseded)](https://github.com/midnghtsapphire/oaudrey/pull/11)
- [oaudrey PR #12 (clean single commit, merged)](https://github.com/midnghtsapphire/oaudrey/pull/12)
- [Code quality apps eval (2026-04-23)](https://github.com/midnghtsapphire/revvel-standards/blob/8f3bd64eeee6dd3b207b66f8704f99565f1ca252/docs/CODE_QUALITY_APPS_EVAL_2026-04-23.md)

## Open gaps for Audrey

- **Needs Audrey:** yes: her view of its alerts
- Her verdict.
