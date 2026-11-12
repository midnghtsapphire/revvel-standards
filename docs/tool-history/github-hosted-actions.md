# GitHub-hosted Actions

| Field | Value |
| --- | --- |
| Category | CI |
| Status | unknown |
| First evidence found | 2026-04-01 |
| Latest evidence found | 2026-11-04 |
| Cost | billed per minute for private repos (per docs/Master Revvel-Standards Flow Charts/TOOLS_CATALOG.md); account billing-locked 2026-11-04 |
| Verdict | AUDREY: standing rule is no GitHub-hosted Actions, only her own workflows (MoneyCrew Builder standing rules, set by Audrey) |

Dates are the earliest and latest dated artifact found in the searched
repos, not adoption dates. See the [README](README.md) for what the verdict
labels mean.

## What it was used for

Ran every automated workflow in revvel-standards (hundreds of workflows).

## What worked

- Hundreds of workflows ran on it from 2026-04 (docs/TOOLS_CATALOG.md calls it the backbone).

## What did not work

- Commit 4f4929b97 (2026-11-04): the account was locked for a billing issue, steps were empty, and the job did not start.
- learnings.md: self-hosted runner workflows failed because no self-hosted runner existed.
- docs/LOCAL_LLM_SETUP.md: hosted runners cannot reach a laptop, so every LLM call from CI is a billed call.

## Why kept or dropped

Spend switches (commit c647dcb66, 2026-11-03) gate paid jobs with REVVEL_LLM_ALLOW_CLOUD. Account was billing-locked, so every GitHub-hosted job died before a runner was assigned.

## Evidence

- [Commit 4f4929b97: Actions billing-locked (2026-11-04)](https://github.com/midnghtsapphire/revvel-standards/commit/4f4929b970e285e4479c12616beb84c99d0ad9e8)
- [Spend switches doc and commit c647dcb66](https://github.com/midnghtsapphire/revvel-standards/blob/8f3bd64eeee6dd3b207b66f8704f99565f1ca252/docs/SPEND-SWITCHES.md)
- [Local LLM setup: hosted runners cannot reach a laptop](https://github.com/midnghtsapphire/revvel-standards/blob/8f3bd64eeee6dd3b207b66f8704f99565f1ca252/docs/LOCAL_LLM_SETUP.md)
- [Tools catalog entry](https://github.com/midnghtsapphire/revvel-standards/blob/8f3bd64eeee6dd3b207b66f8704f99565f1ca252/docs/Master%20Revvel-Standards%20Flow%20Charts/TOOLS_CATALOG.md)
- [Learnings](https://github.com/midnghtsapphire/revvel-standards/blob/8f3bd64eeee6dd3b207b66f8704f99565f1ca252/learnings.md)
- [Commit a5fa7db82 (2026-04-01)](https://github.com/midnghtsapphire/revvel-standards/commit/a5fa7db8258a88d13c668666e2fb219e6f86c704)

## Open gaps for Audrey

- **Needs Audrey:** yes: confirm when and why she moved off hosted Actions
- Her reasons for avoiding hosted Actions in her own words.
