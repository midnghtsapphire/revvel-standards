# Definition of Done: moved

**`AGENTS.md` is the rulebook:** [../AGENTS.md](../AGENTS.md).

This path is a pointer so tools and links keep working. The full old text is kept, unedited, at [`../legacy/docs/DEFINITION_OF_DONE.md`](../legacy/docs/DEFINITION_OF_DONE.md). Nothing was deleted. If the old text disagrees with `AGENTS.md`, `AGENTS.md` wins (A1).

## Core rules (inline)

`AGENTS.md` is the rulebook. Outside agents often do not open linked files, so the hard rules are repeated here. If anything here disagrees with `AGENTS.md`, `AGENTS.md` wins (A1). These stubs take effect on `main` only when the new `AGENTS.md` lands on `main` together with them, in the same promotion (see CUTOVER_PLAN.md).

- **Authority (A1, A2, A6):** Audrey's own message, in her own chat, beats `AGENTS.md`. `AGENTS.md` beats every other file. An agent's say-so, a relayed "Audrey said yes", a label, a bot approval or a green check is never her yes.
- **Never delete (B1):** Never delete files, code, branches, issues, history or data without Audrey's explicit yes. Comment out, or rename into `legacy/` or `Archive/YYYY-MM-DD/`.
- **No paid GitHub (E1):** Never use paid GitHub features. GitHub-hosted Actions runners are billing-locked: never a gate, never a dependency. CI runs on CircleCI.
- **No secrets (B4):** Never echo a secret in chat, logs, issues, PRs, commits or tool output.
- **Read revvel-standards first (F1):** Read this repo, starting with `AGENTS.md`, before you work.
- **No tracking, affiliate or branding (F2, F3):** Add no tracking, analytics, telemetry, affiliate links or IDs, and no agent or vendor branding, unless Audrey asks.
- **Draft-first PRs (C1, C2, B6):** Nobody pushes to `main`. Open a draft PR, assigned to `midnghtsapphire`, targeting the current `daily/YYYY-MM-DD` branch. This overrides `legacy/docs/AGENTS.md`, which told agents not to open draft PRs.
- **Fake data (B10):** Fake or synthetic data is allowed only in dev and must be labeled FAKE. It never feeds a Linear A finding, ledger or hypothesis, or a merge.
