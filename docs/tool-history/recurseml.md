# RecurseML

| Field | Value |
| --- | --- |
| Category | code review |
| Status | dropped |
| First evidence found | 2026-04-14 |
| Latest evidence found | 2026-08-21 |
| Cost | 14-day trial from 2026-06-13; about $250 a year per subscriptions file |
| Verdict | RECORDED: cut (D007), restored (D014), workflow triggers cut again (D016, 2026-08-21) |

Dates are the earliest and latest dated artifact found in the searched
repos, not adoption dates. See the [README](README.md) for what the verdict
labels mean.

## What it was used for

Autonomous PR review App and workflow.

## What worked

- App kept reporting independently of workflow.

## What did not work

- Issue #17739: key not set, restored lane inert.
- App still reports error on every PR (#17872).

## Why kept or dropped

Workflow cut; App to uninstall. D014 says D007 measured the wrong lane (workflow vs App).

## Evidence

- [DECISIONS.md D007, D014, D016](https://github.com/midnghtsapphire/revvel-standards/blob/8f3bd64eeee6dd3b207b66f8704f99565f1ca252/DECISIONS.md)
- [Subscriptions file](https://github.com/midnghtsapphire/revvel-standards/blob/8f3bd64eeee6dd3b207b66f8704f99565f1ca252/data/subscriptions.yml)
- [Issue #17739](https://github.com/midnghtsapphire/revvel-standards/issues/17739)
- [Issue #17872](https://github.com/midnghtsapphire/revvel-standards/issues/17872)
- [PR #14274](https://github.com/midnghtsapphire/revvel-standards/pull/14274)
- [Skill](https://github.com/midnghtsapphire/revvel-standards/blob/8f3bd64eeee6dd3b207b66f8704f99565f1ca252/skills/recurse-ml/SKILL.md)

## Open gaps for Audrey

- **Needs Audrey:** yes: renew or cancel; uninstall the App
- Billing outcome after trial.
