# LEDGER Standard

**Rule:** Every project has a `LEDGER.md` at its root. The LEDGER is a detailed play-by-play and handoff record of who did what, when, in which files, with which decisions and sources. Audrey uses it to decide AI crediting, so every entry names the actor exactly.

## Relationship to other standards

- `WRITE_AS_YOU_GO_STANDARD.md` (PR #18213, not yet merged at the time of writing) requires agents to record their work in the same commit as the work, add a `CHANGELOG.md` line per commit, and keep sources in `Library/`. The LEDGER is the detailed record behind those rules; `CHANGELOG.md` stays a one-line-per-commit summary.
- A project's findings ledger (for Tărtăria: `tartaria-dating-current.md`) still holds findings, values, and grades. The LEDGER records the work that produced them and links to them.

## Requirements

1. Add a LEDGER entry in the same commit as the work it describes.
2. Name the actor precisely: the human by name, or the AI agent by agent name, tool or product, and model when known (for example `Proofy (Claude, via Cursor)`, `GitHubOrchestrator (Grok Bot)`).
3. Record when (date and time with time zone), which files changed, what was decided and why, and which sources were used (with a `Library/` path where one exists).
4. Record handoffs: what is finished, what is open, and who picks it up next.
5. Never rewrite or delete past entries. Correct them with a new entry that references the old one.
6. Keep entries newest-first.

## Template

```markdown
# LEDGER — <project name>

## <YYYY-MM-DD HH:MM TZ> — <actor> — <short title>

- **Actor:** <human name | agent name (tool/product, model)>
- **Requested by:** <who asked for the work>
- **Role:** <proposed | executed | reviewed | approved>
- **Files:** `<path>` (added | changed | moved | removed)
- **What was done:** <plain account of the steps taken>
- **Decisions:** <decision> — because <reason>
- **Sources:** <author, year, title> — `Library/<filename>`
- **Commits / PRs:** <sha or PR link>
- **Open / handoff:** <what remains> — next owner: <actor>
- **Credit note:** <contribution share or notes for Audrey's crediting decision>
```
