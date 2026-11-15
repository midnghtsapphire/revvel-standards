# Bito

| Field | Value |
| --- | --- |
| Category | code review |
| Status | unknown |
| First evidence found | 2026-04-30 |
| Latest evidence found | 2026-11-11 |
| Cost | free tier (limited) or paid per user; Audrey paid 2026-11-11, amount NEEDS AUDREY |
| Verdict | AUDREY: just paid for Bito (2026-11-11). Repo also holds a 2026-07-08 CUT decision (D006). The two are not reconciled. |

Dates are the earliest and latest dated artifact found in the searched
repos, not adoption dates. See the [README](README.md) for what the verdict
labels mean.

## What it was used for

AI pull-request reviewer, installed as a GitHub App (installation 128849516) with a workflow, labels, and a skill.

## What worked

- CODE_REVIEW_STANDARD.md (v1.2.0, PR #13350, 2026-05-06) lists high signal-to-noise versus prior providers, native inline comments, and custom guidelines per repo.
- It replaced Venice AI as primary reviewer per the provider-history table in that standard (the table is dated 2025-Q1, which predates the repo history; treat the dates as unverified).

## What did not work

- D006 (2026-07-08): "Key absent -> silent no-op on every PR; zero unique catches vs OpenRouter lane; bito-ai.yml auto-triggers disabled".
- docs/TOOL_COST_INDEX.md row: cut, workflow skips gracefully when the key is absent.

## Why kept or dropped

Repo: cut on 2026-07-08 (D006). Audrey: paid on 2026-11-11. Current status unknown. Both facts are on record and conflict. The repo decision says no unique catches and a silent no-op without its key. Audrey paid on 2026-11-11.

## Evidence

- [DECISIONS.md D006: cut Bito (2026-07-08)](https://github.com/midnghtsapphire/revvel-standards/blob/8f3bd64eeee6dd3b207b66f8704f99565f1ca252/DECISIONS.md)
- [Cost index row for Bito](https://github.com/midnghtsapphire/revvel-standards/blob/8f3bd64eeee6dd3b207b66f8704f99565f1ca252/docs/TOOL_COST_INDEX.md)
- [Code review standard naming Bito primary](https://github.com/midnghtsapphire/revvel-standards/blob/8f3bd64eeee6dd3b207b66f8704f99565f1ca252/CODE_REVIEW_STANDARD.md)
- [PR #13350: update code review to reflect production setup (Bito AI) (2026-05-06)](https://github.com/midnghtsapphire/revvel-standards/pull/13350)
- [Install verification doc](https://github.com/midnghtsapphire/revvel-standards/blob/8f3bd64eeee6dd3b207b66f8704f99565f1ca252/docs/BITO_INSTALLATION_VERIFICATION.md)
- [Commit 4a2d62a7c: add Bito AI integration (2026-04-30)](https://github.com/midnghtsapphire/revvel-standards/commit/4a2d62a7cfa92b3ea4e75259321399cb5dc0cf56)
- [Subscriptions file: Bito evaluating](https://github.com/midnghtsapphire/revvel-standards/blob/8f3bd64eeee6dd3b207b66f8704f99565f1ca252/data/subscriptions.yml)
- [Issue #498: bito should be handling api retrieval (2026-05-02)](https://github.com/midnghtsapphire/revvel-standards/issues/498)
- [brain-dump#10: Omni-Bito, a self-hosted clone idea (2026-10-30)](https://github.com/Freedom-Angel-Corp/brain-dump/issues/10)

## Open gaps for Audrey

- **Needs Audrey:** yes: why she paid after the July cut, which plan, and what she expects it to do
- What Audrey paid and which plan. No billing record is in the repo.
- Whether the Bito workflow should be turned back on. Workflow bito-ai.yml has auto-triggers disabled since D006.
- Issue #498 (2026-05-02) shows she once asked Bito to handle API retrieval; the outcome is not recorded.
