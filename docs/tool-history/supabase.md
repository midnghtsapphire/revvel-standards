# Supabase

| Field | Value |
| --- | --- |
| Category | database |
| Status | unknown |
| First evidence found | 2026-03-07 |
| Latest evidence found | 2026-08-09 |
| Cost | unknown |
| Verdict | RECORDED: Postgres standard, Supabase optional add-on (docs/Master_Inventory/DATABASE_ARCHITECTURE_STANDARD.md, 2026-04-06) |

Dates are the earliest and latest dated artifact found in the searched
repos, not adoption dates. See the [README](README.md) for what the verdict
labels mean.

## What it was used for

Visual Postgres add-on in several apps (reese-reviews, neurooz, growlingeyes).

## What worked

- Standard lists real-time and visual editor as benefits.

## What did not work

- neighborly-services#2 (2026-08-09): Supabase credentials committed in .env.
- reese-reviews PR #11 (2026-03-19) hardened the integration and stopped tracking .env.

## Why kept or dropped

Optional. Standard: Supabase is Postgres under the hood; use it for a web UI.

## Evidence

- [Database architecture standard](https://github.com/midnghtsapphire/revvel-standards/blob/8f3bd64eeee6dd3b207b66f8704f99565f1ca252/docs/Master_Inventory/DATABASE_ARCHITECTURE_STANDARD.md)
- [reese-reviews PR #11](https://github.com/midnghtsapphire/reese-reviews/pull/11)
- [neurooz PR #3](https://github.com/midnghtsapphire/neurooz/pull/3)
- [neighborly-services#2](https://github.com/midnghtsapphire/neighborly-services/issues/2)
- [growlingeyes#8](https://github.com/midnghtsapphire/growlingeyes/issues/8)

## Open gaps for Audrey

- **Needs Audrey:** yes: whether it is still used
- Which projects still use it.
