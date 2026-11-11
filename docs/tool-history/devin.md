# Devin (Cognition)

| Field | Value |
| --- | --- |
| Category | coding agent / code review |
| Status | unknown |
| First evidence found | 2026-04-25 |
| Latest evidence found | 2026-08-17 |
| Cost | $80 a month per data/subscriptions.yml (renewal 2026-07-08); cost index later says trial expired, no credits |
| Verdict | NEEDS AUDREY |

Dates are the earliest and latest dated artifact found in the searched
repos, not adoption dates. See the [README](README.md) for what the verdict
labels mean.

## What it was used for

PR review app and an in-repo lane; wrote growlingeyes PR #148.

## What worked

- DEVIN_OBSERVATIONS.md: catches shell-syntax bugs, YAML parse bugs, pre-existing dead code; higher hit-rate than Octopus or Copilot on shell issues.

## What did not work

- Same doc: hallucinates commit SHAs (observed on #14436).
- Cost index: posts "Full review skipped: trial expired and no credits remaining" on every PR; referenced by 14 workflows that no-op.
- PR #14375 (wire the lane) was closed unmerged.

## Why kept or dropped

Cost index: keep (inert). Observations exist, but the cost index later says trial expired and no credits remain.

## Evidence

- [Devin observations (2026-06)](https://github.com/midnghtsapphire/revvel-standards/blob/8f3bd64eeee6dd3b207b66f8704f99565f1ca252/docs/agent-stack/DEVIN_OBSERVATIONS.md)
- [Cost index row](https://github.com/midnghtsapphire/revvel-standards/blob/8f3bd64eeee6dd3b207b66f8704f99565f1ca252/docs/TOOL_COST_INDEX.md)
- [Subscriptions file](https://github.com/midnghtsapphire/revvel-standards/blob/8f3bd64eeee6dd3b207b66f8704f99565f1ca252/data/subscriptions.yml)
- [PR #14375 (closed unmerged)](https://github.com/midnghtsapphire/revvel-standards/pull/14375)
- [PR #14447: capture Devin behavior notes](https://github.com/midnghtsapphire/revvel-standards/pull/14447)
- [Workflow devin-code-review.yml](https://github.com/midnghtsapphire/revvel-standards/blob/8f3bd64eeee6dd3b207b66f8704f99565f1ca252/.github/workflows/devin-code-review.yml)
- [PR growlingeyes#148 by devin-ai-integration](https://github.com/midnghtsapphire/growlingeyes/pull/148)

## Open gaps for Audrey

- **Needs Audrey:** yes: whether she cancelled and what she thought of the reviews
- Cancellation status.
- Her verdict.
