# GitHub Governance Playbook

Added 2026-11-05 by Grok Bot for Audrey Evans. Source: Freedom-Angel-Corp/brain-dump#3.

This page collects the governance rules that already exist in this repo and states the daily-branch draft-PR rule in one place. It does not replace any of them. When this page and a linked document disagree, the linked document wins, and the OWNER RULE in `AGENTS.md` wins over everything.

## Existing rules (read these first)

| Rule | Where it lives |
| --- | --- |
| OWNER RULE: never delete, never rewrite, comment out instead, draft PRs only, agents never merge | [`AGENTS.md`](../../AGENTS.md), top section "OWNER RULE — NEVER DELETE, NEVER REWRITE (Audrey Evans, 2026-10-30)" |
| Comment out, don't delete | [`standards/COMMENT-DONT-DELETE.md`](../../standards/COMMENT-DONT-DELETE.md) |
| Rules for agents visiting from other repos or tools | [`VISITING_AGENTS.md`](../../VISITING_AGENTS.md) |
| Agent approval check | [`docs/governance/AGENT_APPROVAL_CHECK.md`](AGENT_APPROVAL_CHECK.md) |
| Archival gate (blocks deletions in CI) | [`.circleci/scripts/check-archival-policy.sh`](../../.circleci/scripts/check-archival-policy.sh) |
| Claude short-form checklist | [`CLAUDE.md`](../../CLAUDE.md) (defers to `standards/` and is overridden by the OWNER RULE) |

## Daily-branch draft-PR rule

1. Each working day has one integration branch named `daily/YYYY-MM-DD` (for example `daily/2026-11-05`), cut from `main`.
2. Agents branch their work from that day's daily branch and open a **draft** PR whose base is the daily branch, not `main`.
3. If the daily branch does not exist yet, create it from the current `main`, then branch from it.
4. Each PR updates `CHANGELOG.md` in the same commit. If the base has a `LEDGER.md`, the same commit also adds a ledger line.
5. Changes are additions only. Nothing is deleted or rewritten wholesale. To retire something, comment it out in place with a dated note.
6. Agents never merge, close, or comment on PRs they were not asked to touch. The owner reviews and merges.
7. The owner promotes the daily branch to `main`.

## Open conflict: needs an owner decision

- `.circleci/scripts/check-archival-policy.sh` lets a PR delete files when a human puts the `allow-destroy` label on it.
- `AGENTS.md` OWNER RULE item 2 (line 8) says: "No label, flag, or agent judgment permits deletion."
- These two disagree. This PR does not change the script. **Audrey to decide:** keep `allow-destroy` as an owner-only escape hatch and amend the OWNER RULE wording, or retire the label path (by commenting it out in the script, not deleting it).
