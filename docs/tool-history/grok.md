# Grok (xAI) and the Grok bots

| Field | Value |
| --- | --- |
| Category | LLM / bot platform |
| Status | active |
| First evidence found | 2026-08-03 |
| Latest evidence found | 2026-11-11 |
| Cost | not recorded; Audrey (2026-11-11): runs out of tokens in about two days, extra minutes were about $100 an hour |
| Verdict | AUDREY: likes the interaction, but runs out of tokens in about two days and cannot afford extra minutes (2026-11-11) |

Dates are the earliest and latest dated artifact found in the searched
repos, not adoption dates. See the [README](README.md) for what the verdict
labels mean.

## What it was used for

Runs the MoneyCrew bots, a weekly WR/PR audit, and interactive GitHub work through a connector.

## What worked

- Audrey: she really likes the interaction (2026-11-11).
- Commit 303d404f7 (2026-08-16): Grok weekly audit for WRs and PRs status.

## What did not work

- AUDREY 2026-11-11: runs out of tokens in two days; extra minutes cost too much.
- Issue #16900 (2026-08-03): Grok XAI needs write permissions.

## Why kept or dropped

Kept. Plan: move day-to-day work into GitHub teams to save tokens (WR #18374). Stated by Audrey on 2026-11-11 in chat: she wants GitHub-run teams so the bots use fewer tokens.

## Evidence

- [Issue #16900: Grok needs write permissions (2026-08-03)](https://github.com/midnghtsapphire/revvel-standards/issues/16900)
- [Commit 303d404f7: Grok weekly audit (2026-08-16)](https://github.com/midnghtsapphire/revvel-standards/commit/303d404f794055651ed2ddbd5f9ffc7ee254fa69)
- [WR #18374: GitHub-run agent fleets (2026-11-11)](https://github.com/midnghtsapphire/revvel-standards/issues/18374)
- [NoseyNoodle in Grok setup](https://github.com/midnghtsapphire/revvel-standards/blob/8f3bd64eeee6dd3b207b66f8704f99565f1ca252/docs/prompts/LLM/noseynoodle/GROK_SETUP.md)
- [GitHub auth matrix: Grok connector](https://github.com/midnghtsapphire/revvel-standards/blob/8f3bd64eeee6dd3b207b66f8704f99565f1ca252/standards/GITHUB_AUTH_TOKEN_MATRIX.md)
- [Commit 23fc2ffc7: Grok 4 prompts (2026-08-22)](https://github.com/midnghtsapphire/revvel-standards/commit/23fc2ffc77d2d0141e16f1cf1b6c21d2143cbaaf)

## Open gaps for Audrey

- **Needs Audrey:** yes: monthly cost she pays and the plan
- Monthly spend.
- Which Grok features she wants kept in chat.
