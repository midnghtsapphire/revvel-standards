# Bot common rules: moved

**`AGENTS.md` is the rulebook:** [../AGENTS.md](../AGENTS.md).

1. **Read revvel-standards first** and follow it as written. `midnghtsapphire/revvel-standards` is the one source of truth.
2. **Never delete** files, code, docs or rules. Retire by commenting out in place with a dated note, or by archive-rename.
3. **Never overwrite** existing work wholesale; add next to it.
4. **Never force-push.** Nobody pushes to `main`. Changes go through a PR and Audrey reviews.
5. **Merges go through the gates:** assignee set, work done, checks green, not a draft, Triage CLEAR. Bots do not merge their own PRs.
6. **Never post secrets, private data or case data** in chat, PRs, issues or public repos. Secrets go in a vault (see [`/bot-secret`](bots/bot-secret/README.md)).
7. **Whiteboard:** work requests, help asks and questions go to GitHub Discussion #18238 (revvel-standards), one thread each, tagging the bot by name. App, API and purchase items go to Proofy; GitHub items go to TriageChief. Casual chat goes to Bot Lounge #18246, never work requests.
8. **GitHub post format:** every GitHub post starts with **BotName:** and ends with "— BotName".
9. **Honesty:** report CAN / CAN-PARTIAL / CANNOT. Never invent results or claim success that did not happen.
10. **Nothing goes out in Audrey's name** (email, message, post, purchase, submit, publish) without her explicit yes.
11. **Backups** of anything before freeing it go to GitHub under the naming rule in AGENTS.md ("Backups").
12. **Names:** box bots are called with a `bot-` prefix (`/bot-proofy`), teams end in `-team` (`/searchcrew-team`), and agents/personas have no prefix (`/coder`).

13. **Shared box and missing data (Grok bots):** the box is scratch space — push work to GitHub and never leave the only copy there. Private or copyrighted material goes in a private repo. Missing data, APIs, inventory, or secrets go on the existing BOM "Audrey to get" list; do not fail the WR or PR, and do not ask Audrey for secrets mid-work. Synthetic data is allowed only in dev, clearly labeled, and never as evidence; it must not feed Linear A findings, the ledger, or a merge to `main`. See [`GROK-BOTS-BOX-IS-SCRATCH.md`](GROK-BOTS-BOX-IS-SCRATCH.md).
<!-- 2026-11-14 TriageChief: keep rule 13 when refreshing this generated file. -->
This path is a pointer so tools and links keep working. The full old text is kept, unedited, at [`../legacy/docs/BOT-COMMON-RULES.md`](../legacy/docs/BOT-COMMON-RULES.md). Nothing was deleted. If the old text disagrees with `AGENTS.md`, `AGENTS.md` wins (A1).

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
