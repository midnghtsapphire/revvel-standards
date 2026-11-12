# DigitalOcean

| Field | Value |
| --- | --- |
| Category | hosting |
| Status | active |
| First evidence found | 2026-02-16 |
| Latest evidence found | 2026-11-11 |
| Cost | $250 a month per data/subscriptions.yml (renewal 2026-07-15) |
| Verdict | NEEDS AUDREY |

Dates are the earliest and latest dated artifact found in the searched
repos, not adoption dates. See the [README](README.md) for what the verdict
labels mean.

## What it was used for

Droplets (7 per team_state), App Platform, GrowlingEyes host; DO deploy jobs in draft PR #18372.

## What worked

- GrowlingEyes ran on a droplet independent of Manus (growlingeyes#72).

## What did not work

- Subscriptions file: sites currently down; verify and cancel idle ones.
- Contradiction: runbook "no DigitalOcean" vs PR #18372.

## Why kept or dropped

Open. Subscriptions file says sites were down and to cancel idle droplets. The 2026-11-09 runbook says no DigitalOcean, while draft PR #18372 deploys to it.

## Evidence

- [Subscriptions file](https://github.com/midnghtsapphire/revvel-standards/blob/8f3bd64eeee6dd3b207b66f8704f99565f1ca252/data/subscriptions.yml)
- [Domain runbook](https://github.com/midnghtsapphire/revvel-standards/blob/8f3bd64eeee6dd3b207b66f8704f99565f1ca252/cloudflare/MIGRATION.md)
- [PR #18372 (draft)](https://github.com/midnghtsapphire/revvel-standards/pull/18372)
- [oAudrey deployment standard](https://github.com/midnghtsapphire/revvel-standards/blob/8f3bd64eeee6dd3b207b66f8704f99565f1ca252/standards/OAUDREY_DEPLOYMENT_STANDARD.md)
- [Team state (2026-02-16)](https://github.com/midnghtsapphire/revvel-standards/blob/8f3bd64eeee6dd3b207b66f8704f99565f1ca252/docs/team_state.md)
- [PR #18373 (open)](https://github.com/midnghtsapphire/revvel-standards/pull/18373)

## Open gaps for Audrey

- **Needs Audrey:** yes: which droplets to keep and whether DO stays
- Droplet inventory and cost.
- Her decision.
