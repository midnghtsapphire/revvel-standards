# Cursor Bugbot

| Field | Value |
| --- | --- |
| Category | code review |
| Status | active |
| First evidence found | 2026-11-03 |
| Latest evidence found | 2026-11-11 |
| Cost | unknown; listed as a dashboard-only service in spend switches |
| Verdict | NEEDS AUDREY |

Dates are the earliest and latest dated artifact found in the searched
repos, not adoption dates. See the [README](README.md) for what the verdict
labels mean.

## What it was used for

Reviewed PR #18365; its finding led to a fix.

## What worked

- LEDGER.md entry dated 2026-11-11 14:20 UTC: Bugbot found a gap in PR #18365 and Rules-Steward fixed it.

## What did not work

- docs/SPEND-SWITCHES.md: cannot be stopped by GitHub variables; only in the vendor dashboard.

## Why kept or dropped

Unknown. One credited catch is on record.

## Evidence

- [LEDGER.md Bugbot entry](https://github.com/midnghtsapphire/revvel-standards/blob/8f3bd64eeee6dd3b207b66f8704f99565f1ca252/LEDGER.md)
- [Spend switches](https://github.com/midnghtsapphire/revvel-standards/blob/8f3bd64eeee6dd3b207b66f8704f99565f1ca252/docs/SPEND-SWITCHES.md)
- [PR #18365](https://github.com/midnghtsapphire/revvel-standards/pull/18365)

## Open gaps for Audrey

- **Needs Audrey:** yes: whether she wants it on, and cost
- Cost, plan, and whether she installed it on purpose.
