# Archive

Point-in-time **status reports, implementation summaries, and completion notes**
that used to clutter the repository root. They're kept for history and provenance
but are **not active docs** — don't link to them from current documentation, and
don't treat them as the source of truth for how anything works today.

If you need the *current* state of something, start from
[`README.md`](../../README.md), [`AGENTS.md`](../../AGENTS.md), or the relevant
standard under [`docs/`](../).

Moved here from the root during the repo-organization cleanup (Batch 1+2). Excluded
from markdownlint — these are frozen snapshots, not maintained Markdown.

## What's here

- `*_STATUS_REPORT.md`, `*_COMPLETE.md`, `*_SUMMARY*.md` — one-time completion / status writeups
- `TRUSTFORGE_*`, `CODE_REVIEW_RESOLUTION.md`, `RESPONSE_TO_MIDNGHTSAPPHIRE.md` — historical notes
- `reesereviews/` — a one-off search-verification script (`verify_search.py`) and the screenshots it produced
- `root-batch-3/` — one-off root clutter moved here (Batch 3, 2026-11-14): the three
  `AGENT-DEPLOY-ONEFILE*.md` prompts, `IMPLEMENTATION_SUMMARY*.md`, `REPO_AUDIT.md`
  (a 2026-05-02 snapshot), a stray agent `PLAN.md` (`agents_tmp/`), and a WR test
  fixture (`test-wr/`). Pure `git mv`, nothing edited. The full move map is in
  [`docs/INVENTORY.md`](../INVENTORY.md).
