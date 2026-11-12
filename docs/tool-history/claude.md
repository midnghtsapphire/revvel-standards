# Claude (Claude Code, API)

| Field | Value |
| --- | --- |
| Category | LLM / coding agent |
| Status | active |
| First evidence found | 2026-04-25 |
| Latest evidence found | 2026-11-11 |
| Cost | paid subscription (TOOLS_CATALOG); API via OpenRouter |
| Verdict | NEEDS AUDREY |

Dates are the earliest and latest dated artifact found in the searched
repos, not adoption dates. See the [README](README.md) for what the verdict
labels mean.

## What it was used for

Claude Code sessions, transcript capture, and many reviewer and persona runs.

## What worked

- docs/agents/claude/PROFILE.md: good at bash, YAML, regex edge cases, cross-file refactors, audit diagnosis.

## What did not work

- Same profile: over-engineers with architecture pitches, phase plans, and follow-up questions; she counters with "one iteration, full version".
- brain-dump#4 (open, 2026-10-30): investigate Claude agents reversing the never-delete rules and imposing vendor lock-in. The transcript is not attached yet; Audrey is to re-paste it.
- Audrey, 2026-11-11: visiting LLMs forget her rules even with sticky-note reminders (see visiting-llms.md).

## Why kept or dropped

In use. A profile exists but no verdict from Audrey.

## Evidence

- [Claude profile](https://github.com/midnghtsapphire/revvel-standards/blob/8f3bd64eeee6dd3b207b66f8704f99565f1ca252/docs/agents/claude/PROFILE.md)
- [Agents index](https://github.com/midnghtsapphire/revvel-standards/blob/8f3bd64eeee6dd3b207b66f8704f99565f1ca252/docs/agents/README.md)
- [Tools catalog](https://github.com/midnghtsapphire/revvel-standards/blob/8f3bd64eeee6dd3b207b66f8704f99565f1ca252/docs/Master%20Revvel-Standards%20Flow%20Charts/TOOLS_CATALOG.md)
- [LLM recommendations BOM](https://github.com/midnghtsapphire/revvel-standards/blob/8f3bd64eeee6dd3b207b66f8704f99565f1ca252/docs/Universal-BOM_List/LLM_RECOMMENDATIONS.md)
- [Commit ebda38de4 (2026-04-25)](https://github.com/midnghtsapphire/revvel-standards/commit/ebda38de47746c1580f07e836e095ec7a6a55f19)
- [brain-dump#4: Claude agents reversing never-delete rules](https://github.com/Freedom-Angel-Corp/brain-dump/issues/4)
- [Visiting LLMs note](https://github.com/midnghtsapphire/revvel-standards/blob/8f3bd64eeee6dd3b207b66f8704f99565f1ca252/VISITING_AGENTS.md)

## Open gaps for Audrey

- **Needs Audrey:** yes: her own pros and cons
- Her verdict.
