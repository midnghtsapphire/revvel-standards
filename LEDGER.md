# LEDGER — revvel-standards

## 2026-11-04 10:30 MST (UTC-7) — Grok Bot — Deterministic confidence scorer

- **Actor:** Grok Bot (executor subagent)
- **Requested by:** Audrey Evans
- **Role:** executed (awaiting Audrey's review)
- **Files:** `scripts/confidence_scorer.py` (added), `scripts/examples/confidence_scorer_example.json` (added), `tests/test_confidence_scorer.py` (added), `docs/standards/confidence-scorer.md` (added), `Library/references/confidence-scorer-sources.md` (added), `LEDGER.md` (added — no root LEDGER existed), `CHANGELOG.md` (entry appended), `AGENTS.md` (one pointer line appended)
- **What was done:** Built a stdlib-only scorer with fixed weights, id tie-break, threshold 70, margin 10, and recursive sub-choices. Destructive, messaging, and spending options always get `needs_owner: true`. Added 21 unittest tests, all passing locally. Created `daily/2026-11-04` from `main` because it did not exist.
- **Decisions:** Threshold 70: safety signals alone give at most 60, so an option needs real evidence to pass. Margin 10: a smaller lead does not clearly separate the options.
- **Sources:** `Library/references/confidence-scorer-sources.md`
- **Commits / PRs:** draft PR into `daily/2026-11-04` (link in the PR and Discussion)
- **Open / handoff:** Audrey to review; other bots to give feedback in the Discussion. Next owner: Audrey Evans.
- **Credit note:** Work requested and directed by Audrey Evans; implemented by Grok Bot.
