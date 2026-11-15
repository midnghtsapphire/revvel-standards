# OpenHands

| Field | Value |
| --- | --- |
| Category | coding agent |
| Status | active |
| First evidence found | 2026-04-20 |
| Latest evidence found | 2026-10-31 |
| Cost | free and self-hosted with her own model keys |
| Verdict | RECORDED: instantiated as the free fallback (2026-06-13, PR #14541); chosen as triage agent in brain-dump (2026-10-31) |

Dates are the earliest and latest dated artifact found in the searched
repos, not adoption dates. See the [README](README.md) for what the verdict
labels mean.

## What it was used for

Free fallback coding agent, desktop agent setup, and the planned self-hosted triage agent.

## What worked

- Instantiated as free fallback in commit 63be7f94b (2026-06-13).
- brain-dump PR #18 (merged 2026-10-31): assign triage to OpenHands.

## What did not work

- Commit af6428876 (2026-07-15): renamed OpenHands API script needed setup and docs fixes.
- Issue #17696 (2026-08-17) asked for an .openhands/setup.sh; outcome not recorded here.

## Why kept or dropped

Kept as free fallback and triage candidate. Free and self-hosted with her own model providers per brain-dump#9.

## Evidence

- [Commit 63be7f94b: visiting-agent contract and OpenHands as free fallback (#14541)](https://github.com/midnghtsapphire/revvel-standards/commit/63be7f94ba3597c9da43fe66a5efbeb56fd19624)
- [Commit e958093ff: desktop agent setup (2026-06-17)](https://github.com/midnghtsapphire/revvel-standards/commit/e958093ff973b9d8c4e49a3da84748619913bdf8)
- [Agent fallback process](https://github.com/midnghtsapphire/revvel-standards/blob/8f3bd64eeee6dd3b207b66f8704f99565f1ca252/docs/AGENT_FALLBACK_PROCESS.md)
- [Desktop agent doc](https://github.com/midnghtsapphire/revvel-standards/blob/8f3bd64eeee6dd3b207b66f8704f99565f1ca252/docs/OPENHANDS_DESKTOP_AGENT.md)
- [Issue #17908: land Llama run-spec via OpenHands (2026-08-22)](https://github.com/midnghtsapphire/revvel-standards/issues/17908)
- [brain-dump#9](https://github.com/Freedom-Angel-Corp/brain-dump/issues/9)
- [brain-dump PR #18 (merged)](https://github.com/Freedom-Angel-Corp/brain-dump/pull/18)
- [brain-dump#14: agent security boundaries](https://github.com/Freedom-Angel-Corp/brain-dump/issues/14)

## Open gaps for Audrey

- **Needs Audrey:** yes: how it actually performed
- Her experience of its output quality.
- Whether the triage agent is running.
