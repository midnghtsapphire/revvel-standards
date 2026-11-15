# CodeQL / Semgrep

| Field | Value |
| --- | --- |
| Category | security scanning |
| Status | active |
| First evidence found | 2026-04-30 |
| Latest evidence found | 2026-08-21 |
| Cost | free (Semgrep Community; CodeQL on public repos) |
| Verdict | RECORDED: adopt Semgrep (eval 2026-04-23); OSSAR retired (D015) |

Dates are the earliest and latest dated artifact found in the searched
repos, not adoption dates. See the [README](README.md) for what the verdict
labels mean.

## What it was used for

Static analysis in CI.

## What worked

- Semgrep diff-aware gate.

## What did not work

- CodeQL swapped out then re-added within weeks; OSSAR retired.

## Why kept or dropped

Kept. Semgrep faster with custom rules; OSSAR crashed.

## Evidence

- [PR #13340](https://github.com/midnghtsapphire/revvel-standards/pull/13340)
- [PR #13512](https://github.com/midnghtsapphire/revvel-standards/pull/13512)
- [Eval](https://github.com/midnghtsapphire/revvel-standards/blob/8f3bd64eeee6dd3b207b66f8704f99565f1ca252/docs/CODE_QUALITY_APPS_EVAL_2026-04-23.md)
- [D015](https://github.com/midnghtsapphire/revvel-standards/blob/8f3bd64eeee6dd3b207b66f8704f99565f1ca252/DECISIONS.md)

## Open gaps for Audrey

- **Needs Audrey:** yes
- Her view.
