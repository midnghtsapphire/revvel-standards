# WR → PR Pipeline (Runbook)

How the 447x band was shipped 2026-07-20; reusable for any WR.

## Flow
1. Spec WR in chat (skeleton-first, rev 0)
2. Branch: `wr/<number>-<slug>` from `main`
3. File: `standards/WR-<number>-<slug>.md`, commit `feat(wr): add WR-<number> <title> (rev 0)`
4. PR into `main`: Summary / Files / Follow-ups (checkboxes) / Review focus / Labels
5. Human merges (dependency order first, e.g. 4471 → 4473 → 4472 → 4474)
6. Follow-up issues per PR checklist via structured Task/Constraints/Acceptance body

## Zapier Skills (saved on the Zapier MCP account)
- `wr to pr revvel-standards` — branch + file + PR, params locked to this repo
- `wr followup issue revvel-standards` — structured fleet issue

## Auto-merge policy (4470 band)
Auto-merge only for changes that cannot alter enforcement machinery or operating directives. Directive amendments (WR-42xx) and enforcement code (Dragnet personas, gates, triage wiring) always require human merge.

## Shipped in this cycle
- WRs: 4471, 4472, 4473, 4474 (PRs #16458–#16461, merged)
- Issues: #16463 index/cross-links (+auto-merge policy line), #16464 lefthook template, #16465 WR-4200 --no-verify ban, #16466 gate-tamper persona, #16467 Sentry wiring + keyless-lane failover check
