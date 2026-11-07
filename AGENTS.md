# AGENTS.md — metal spine (2026-11-05)

> Archived wordy original: [`Archive/2026-11-05/AGENTS.md`](./Archive/2026-11-05/AGENTS.md).
> Audrey (2026-11-05): rewrite standards — more metal, less wordy. Visiting LLMs do not invent permissions.

## NEVER DELETE (read this first — every task, every search, every long run)

1. **No `rm`. No trash. No force-push wipe. No "cleanup" that removes files.**
2. **No label, flag, env, or agent judgment permits deletion.** `allow-destroy` is dead (2026-11-05).
3. To retire code/prose: **comment it out** in place with a dated note, **or** `git mv` into `Archive/YYYY-MM-DD/`.
4. Comment-out / archive-rename is allowed. Deletion is not.
5. Search jobs, long-running processes, and visiting LLMs are the usual failure mode — re-read this before every bulk edit.
6. OWNER RULE (Audrey Evans, 2026-10-30) still governs. Louder, not quieter.
## OWNER RULE — SILENT MERGE (Audrey Evans, 2026-11-05)

Audrey lock, exact via Pedal + 1-Git-Triage, 2026-11-05: "Make sure the code has been assigned and done before merge."

Silent-merge only when all three are true: the PR assignee is set, the linked work was assigned and is done (acceptance met), and required checks are green. Plan-only and "no bots until green-light" drafts stay draft. Item 6 stands: agents never merge their own PRs.

Canonical rule: [`docs/governance/SILENT_MERGE.md`](./docs/governance/SILENT_MERGE.md).

> ⚡ **Call chain (what starts → what runs next):**  
> Read **[`START_HERE_CALL_CHAIN.md`](./START_HERE_CALL_CHAIN.md)** before changing workflows or claiming a step is “done.”  
> Do not invent a second pipeline; do not edit random folders for UI color — see that file’s “Where to change” table.
>
> **Visiting / transient agent?** (OpenHands, Cursor Cloud, Lovable, Replit, a one-off
> API caller…) Read [`VISITING_AGENTS.md`](./VISITING_AGENTS.md) **first** — it's the
> short guest contract: where you may write, where setup/API info lives, and how not to
> scaffold over the repo.
>
> Agent security boundaries: [`standards/AGENT_SECURITY_BOUNDARIES.md`](./standards/AGENT_SECURITY_BOUNDARIES.md).
>
> Every error is a training module. Append lessons to [`learnings.md`](./learnings.md)
> using the TM-NNNN format at the bottom of that file — future agents (and future
> auto-fix scripts) read those modules as their curriculum.

## One rule set

- **This file + [`VISITING_AGENTS.md`](./VISITING_AGENTS.md)** are the only agent contracts.
- Do **not** follow a private Claude / Cursor / Copilot rule essay. Stubs below point here.
- Archived parallel sets: `Archive/2026-11-05/{CLAUDE,cursorrules,copilot-instructions,docs-AGENTS}.md`.

## Draft PRs only

- Open **draft** PRs into `daily/YYYY-MM-DD` only.
- **Agents never merge.** Audrey merges (or evening daily→main).
- Same commit: update `CHANGELOG.md`. Update `LEDGER.md` only if it exists on the base.

## Sources / Library

- Put source notes and materials under `Library/` (and `Library/references/`).
- Write-as-you-go: ledger + changelog + library in the same commit as the work.

## Confidence / Proofy

- Rank options with the deterministic confidence scorer (`standards/DECISION_SCORING_ENGINE_STANDARD.md`).
- Work the top option **silently**. Report to Proofy.
- Still escalate to Audrey for: **money**, **irreversible delete**, **secrets**, sending under her name.

## Prefer metal over essays

- Short, imperative, enforceable (scripts / clippy / `cargo fmt` / `cargo check` / CircleCI archival gate).
- Prefer **CRUX** (Rust core / thin shells), **PyO3 + Maturin** hot paths, **compiler feedback loop** (`cargo check` → LLM), **Guarded Archivist** (diffs only into memory/rules). See [`docs/governance/GUARDED_ARCHIVIST.md`](./docs/governance/GUARDED_ARCHIVIST.md).
- **No new GitHub-hosted Actions.** Prefer personal / CircleCI / local scripts that also run by hand.
- Diagram may show Dependabot / ImgBot — **diagram artifact; prefer personal CI.** Do not adopt vendor lock-in bots.

## Gates (enforce)

- Existing CircleCI archival / no-destroy gates (fail closed; no label bypass).
- Where Rust exists: `clippy`, `cargo fmt`, `cargo check`.
- Comment-don't-delete: `standards/COMMENT-DONT-DELETE.md` (REVVEL-DISABLED).

## Owner-directed work

- Audrey decides what to explore, store, publish. Agents do not veto with copyright/plausibility theater.
- Everything worked on goes in the repo. Sandbox-only copies are not durable.
- Calling LLM providers (e.g. OpenRouter) directly is allowed.

## Doc order

- System of record / pipeline order: [`MASTER.md`](./MASTER.md).
- Guest contract: [`VISITING_AGENTS.md`](./VISITING_AGENTS.md).
- Call chain: `START_HERE_CALL_CHAIN.md`.
- Metal rewrite sources: `Library/references/metal-rewrite-2026-11-05.md`.
