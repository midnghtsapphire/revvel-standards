# Vercel

| Field | Value |
| --- | --- |
| Category | hosting |
| Status | unknown |
| First evidence found | 2026-05-01 |
| Latest evidence found | 2026-11-09 |
| Cost | Hobby $0; Pro $20 per user per month (cost index); account blocked per cost index |
| Verdict | NEEDS AUDREY |

Dates are the earliest and latest dated artifact found in the searched
repos, not adoption dates. See the [README](README.md) for what the verdict
labels mean.

## What it was used for

Preview and production deploys (Website-in-Test), required for DB integrations per subscriptions file.

## What worked

- Definition of Done requires a Vercel link in the README (PR #13918, 2026-05-25).

## What did not work

- Issue #17831 (2026-08-20): account blocked, disconnect the integrations.

## Why kept or dropped

Cost index: keep, but red until unblocked. Account blocked; three deployment checks failed red on PRs (#17831). The 2026-11-09 domain runbook plans oaudrey.com on Vercel free; the later plan is open between Vercel, DigitalOcean, or GitHub Pages.

## Evidence

- [Cost index row](https://github.com/midnghtsapphire/revvel-standards/blob/8f3bd64eeee6dd3b207b66f8704f99565f1ca252/docs/TOOL_COST_INDEX.md)
- [Issue #17831](https://github.com/midnghtsapphire/revvel-standards/issues/17831)
- [PR #13918: Definition of Done with Vercel link](https://github.com/midnghtsapphire/revvel-standards/pull/13918)
- [Domain runbook (commit 63106ea28, 2026-11-09)](https://github.com/midnghtsapphire/revvel-standards/commit/63106ea28010aef7eb7633f966f5938d53201706)
- [Subscriptions file](https://github.com/midnghtsapphire/revvel-standards/blob/8f3bd64eeee6dd3b207b66f8704f99565f1ca252/data/subscriptions.yml)
- [Vercel deploy script](https://github.com/midnghtsapphire/revvel-standards/blob/8f3bd64eeee6dd3b207b66f8704f99565f1ca252/scripts/deploy-vercel.js)

## Open gaps for Audrey

- **Needs Audrey:** yes: choose hosting for the oaudrey.com hub
- Whether the block was cleared.
- Her choice of host.
