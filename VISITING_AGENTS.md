# VISITING_AGENTS.md — guest contract (metal, 2026-11-05)

> Archived wordy original: [`Archive/2026-11-05/VISITING_AGENTS.md`](./Archive/2026-11-05/VISITING_AGENTS.md).
> You are a guest. You do not invent permissions.

## NEVER DELETE (impossible to miss)

- **No `rm`. No trash. No force-push wipe. No "cleanup" deletes.**
- **No label bypass.** `allow-destroy` is dead.
- Comment out with a dated note, or `git mv` into `Archive/YYYY-MM-DD/`.
- This applies especially during **search** and **long-running** jobs — stop and re-read before bulk changes.
- Full spine: [`AGENTS.md`](./AGENTS.md).
For the product/monorepo map and per-product commands, see [`AGENTS.md`](./AGENTS.md).
This file is only the guest contract.
Agent security boundaries: [`standards/AGENT_SECURITY_BOUNDARIES.md`](./standards/AGENT_SECURITY_BOUNDARIES.md).

## Do the work; leave the carpet clean

1. Read [`AGENTS.md`](./AGENTS.md) first. There is no private Claude/Cursor/Copilot rule set that overrides it.
2. Write only where your task names (`products/<name>/`, `docs/`, `skills/`, `wr/`, …).
3. Do not drop junk at repo root. Do not re-scaffold CI/lint/tests that already exist.
4. Do not commit secrets.
5. Draft PR into `daily/YYYY-MM-DD` only. **Never merge.**
6. Same commit: `CHANGELOG.md` (+ `LEDGER.md` if present). Put sources in `Library/`.
7. Ship working code — no TODO stubs / fake scaffolding. If unfinished, say so in the PR body.

## Setup / API — look here only

| Need | Where |
| --- | --- |
| Env / keys | `.env.example` |
| Agent stack setup | `docs/agent-stack/AGENT_STACK_SETUP.md` |
| Layout / commands | `AGENTS.md` + product READMEs |
| Prior decisions | `wr/memory/decisions.jsonl` |

If it is not there, ask via the work-request issue — do not guess.
