# Cloudflare

| Field | Value |
| --- | --- |
| Category | DNS |
| Status | active |
| First evidence found | 2026-11-09 |
| Latest evidence found | 2026-11-11 |
| Cost | free DNS and redirects |
| Verdict | AUDREY: put the domains on Cloudflare and everything under oaudrey.com (2026-11-11) |

Dates are the earliest and latest dated artifact found in the searched
repos, not adoption dates. See the [README](README.md) for what the verdict
labels mean.

## What it was used for

DNS for her domains; oaudrey.com nameservers moved.

## What worked

- Runbook commit 63106ea28 (2026-11-09).

## What did not work

- Runbook stopped; stale docs still say DigitalOcean nameservers.

## Why kept or dropped

Active. Fewer domains to pay for.

## Evidence

- [Runbook](https://github.com/midnghtsapphire/revvel-standards/blob/8f3bd64eeee6dd3b207b66f8704f99565f1ca252/cloudflare/MIGRATION.md)
- [Commit 63106ea28](https://github.com/midnghtsapphire/revvel-standards/commit/63106ea28010aef7eb7633f966f5938d53201706)

## Open gaps for Audrey

- **Needs Audrey:** yes: host for hub page
- Host choice.
