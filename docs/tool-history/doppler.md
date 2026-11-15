# Doppler

| Field | Value |
| --- | --- |
| Category | secrets |
| Status | active |
| First evidence found | 2026-04-25 |
| Latest evidence found | 2026-08-12 |
| Cost | free Developer tier |
| Verdict | NEEDS AUDREY |

Dates are the earliest and latest dated artifact found in the searched
repos, not adoption dates. See the [README](README.md) for what the verdict
labels mean.

## What it was used for

Secrets sync and credential gatekeeper.

## What worked

- Free tier; gatekeeper integration.

## What did not work

- Subscriptions file: hourly persistence-guard cron disabled because Doppler overwrote fresh tokens.

## Why kept or dropped

Kept; reconcile first. Optional per credential routing; overwrote fresh tokens with stale values once.

## Evidence

- [PR #308: gatekeeper and Doppler sync (2026-04-25)](https://github.com/midnghtsapphire/revvel-standards/pull/308)
- [Credential routing](https://github.com/midnghtsapphire/revvel-standards/blob/8f3bd64eeee6dd3b207b66f8704f99565f1ca252/docs/CREDENTIAL_ROUTING_PROCESS.md)
- [Subscriptions file](https://github.com/midnghtsapphire/revvel-standards/blob/8f3bd64eeee6dd3b207b66f8704f99565f1ca252/data/subscriptions.yml)
- [Cost index](https://github.com/midnghtsapphire/revvel-standards/blob/8f3bd64eeee6dd3b207b66f8704f99565f1ca252/docs/TOOL_COST_INDEX.md)

## Open gaps for Audrey

- **Needs Audrey:** yes: keep or drop
- Her verdict.
