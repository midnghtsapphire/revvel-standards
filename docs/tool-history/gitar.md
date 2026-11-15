# Gitar

| Field | Value |
| --- | --- |
| Category | code review / CI fix |
| Status | active |
| First evidence found | 2026-11-05 |
| Latest evidence found | 2026-11-11 |
| Cost | trial or entitlement controlled by Gitar (REVVEL_TRIGGER_CATALOG); amount NEEDS AUDREY |
| Verdict | NEEDS AUDREY |

Dates are the earliest and latest dated artifact found in the searched
repos, not adoption dates. See the [README](README.md) for what the verdict
labels mean.

## What it was used for

GitHub App reviewing PRs, mostly in linear-a and oaudrey.

## What worked

- Commit 5875fa935 (2026-11-07) fixed H4/H5 evidence per a Gitar review.
- oaudrey PR #12: Gitar asked for localhost-only binds; all three were applied.

## What did not work

- REVVEL_TRIGGER_CATALOG: "Gitar fix CI" commands are external, no repo-owned implementation.

## Why kept or dropped

In use. Several fixes were made from its reviews (commit 5875fa935, 2026-11-07; oaudrey PR #12).

## Evidence

- [Commit 5875fa935](https://github.com/midnghtsapphire/revvel-standards/commit/5875fa9353838d39116a93344680ad70eeb1c41f)
- [Trigger catalog entries](https://github.com/midnghtsapphire/revvel-standards/blob/8f3bd64eeee6dd3b207b66f8704f99565f1ca252/docs/process/REVVEL_TRIGGER_CATALOG.md)
- [oaudrey PR #12](https://github.com/midnghtsapphire/oaudrey/pull/12)
- [linear-a PR #124](https://github.com/midnghtsapphire/linear-a/pull/124)

## Open gaps for Audrey

- **Needs Audrey:** yes: how it was added, cost, and whether she wants it
- Install date and plan.
- Her verdict.
