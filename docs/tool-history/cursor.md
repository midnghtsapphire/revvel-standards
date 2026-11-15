# Cursor (IDE, cloud agents)

| Field | Value |
| --- | --- |
| Category | coding agent |
| Status | active |
| First evidence found | 2026-04-30 |
| Latest evidence found | 2026-11-11 |
| Cost | $20 a month per data/subscriptions.yml; usage billing unverified |
| Verdict | NEEDS AUDREY |

Dates are the earliest and latest dated artifact found in the searched
repos, not adoption dates. See the [README](README.md) for what the verdict
labels mean.

## What it was used for

Backup coding agent, later cloud agents in current MoneyCrew work (Rules-Steward).

## What worked

- LEDGER.md entries on 2026-11-11 show Rules-Steward running as a Cursor cloud agent.

## What did not work

- Commit 514f92c84 (2026-06-14) retired the Cursor tier: paid, non-functional placeholder (call-cursor-api.sh pointed at a placeholder endpoint).
- data/subscriptions.yml: background agents hit "increase spend limit"; usage billing could surprise-bill.

## Why kept or dropped

API tier removed; IDE config (.cursorrules symlink) kept. The Cursor API tier was retired on 2026-06-14, but Cursor cloud agents appear in ledger entries through 2026-11-11.

## Evidence

- [Commit c4eec0ee2: Cursor as backup to Devin (2026-04-30)](https://github.com/midnghtsapphire/revvel-standards/commit/c4eec0ee29d838096b5e005ab3fb5db08eaf4950)
- [Commit 514f92c84: retire Cursor tier (2026-06-14)](https://github.com/midnghtsapphire/revvel-standards/commit/514f92c84968bed0d71c612683abcf5315afdc59)
- [Agent fallback process](https://github.com/midnghtsapphire/revvel-standards/blob/8f3bd64eeee6dd3b207b66f8704f99565f1ca252/docs/AGENT_FALLBACK_PROCESS.md)
- [Subscriptions file](https://github.com/midnghtsapphire/revvel-standards/blob/8f3bd64eeee6dd3b207b66f8704f99565f1ca252/data/subscriptions.yml)
- [LEDGER.md](https://github.com/midnghtsapphire/revvel-standards/blob/8f3bd64eeee6dd3b207b66f8704f99565f1ca252/LEDGER.md)
- [Visiting agents](https://github.com/midnghtsapphire/revvel-standards/blob/8f3bd64eeee6dd3b207b66f8704f99565f1ca252/VISITING_AGENTS.md)

## Open gaps for Audrey

- **Needs Audrey:** yes: how she uses Cursor today and whether the spend limit message surprised her
- Her experience of Cursor versus the other agents.
