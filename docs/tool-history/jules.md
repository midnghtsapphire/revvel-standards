# Jules (Google)

| Field | Value |
| --- | --- |
| Category | coding agent |
| Status | dropped |
| First evidence found | 2026-04-19 |
| Latest evidence found | 2026-11-05 |
| Cost | usage-priced per Google plan (cost index); latest invoice NEEDS AUDREY |
| Verdict | RECORDED: replaced as WR rewriter by Roo or Roomote from 2026-11-11 (plan doc, 2026-11-05) |

Dates are the earliest and latest dated artifact found in the searched
repos, not adoption dates. See the [README](README.md) for what the verdict
labels mean.

## What it was used for

Deep-research WR template agent, PR reviewer, and the WR rewriter in wr_rewrite.

## What worked

- Auto-assigned to every WR via the jules label and jules-invoke.yml (docs/JULES_AUTO_REVIEW_ROUTING.md).
- Used for leftovers in conflict resolution (commit 39099e404).

## What did not work

- Issue #17248 (2026-08-10): jules-coding-agent.yml is a scaffolding stub that never calls Jules.
- Commit 2bd6cad1a (2026-07-01): perpetual AGENT-FAILURE false alerts from Jules 404.
- Commit ff5bb80f1 (2026-08-12): broken Jules dispatch fixed in conflict-helper.
- Veins issues #15038, #15040 (2026-07-03): stuck Jules Coding Agent workflow.

## Why kept or dropped

Plan doc: Roo or Roomote becomes the default WR rewriter from 2026-11-11, free tier first. A plan doc records a lock dated 2026-11-05: Roo or Roomote is the Jules successor for WR rewrite.

## Evidence

- [Jules auto-review routing doc](https://github.com/midnghtsapphire/revvel-standards/blob/8f3bd64eeee6dd3b207b66f8704f99565f1ca252/docs/JULES_AUTO_REVIEW_ROUTING.md)
- [Commit d37c3e752: Jules system evaluation (2026-04-19)](https://github.com/midnghtsapphire/revvel-standards/commit/d37c3e752c7e208d311c6a6766269d6b47988e03)
- [Issue #17248: jules-coding-agent.yml is a stub](https://github.com/midnghtsapphire/revvel-standards/issues/17248)
- [Commit 2bd6cad1a: Jules 404 false alerts](https://github.com/midnghtsapphire/revvel-standards/commit/2bd6cad1afc832f222dc6116b715ad1a09e54f0b)
- [Commit ff5bb80f1: broken Jules dispatch](https://github.com/midnghtsapphire/revvel-standards/commit/ff5bb80f172c38731676109b3d297e1e322ad165)
- [PR #18267: WR-to-PR pipeline plan, Jules rewrite in code](https://github.com/midnghtsapphire/revvel-standards/pull/18267)
- [Plan doc with the 2026-11-05 lock (branch task/wr-to-pr-pipeline-plan-20261105, commit 3c18dc1b9)](https://github.com/midnghtsapphire/revvel-standards/blob/3c18dc1b9/docs/plans/WR_TO_PR_PIPELINE_PLAN_2026-11-05.md)
- [Cost index row](https://github.com/midnghtsapphire/revvel-standards/blob/8f3bd64eeee6dd3b207b66f8704f99565f1ca252/docs/TOOL_COST_INDEX.md)

## Open gaps for Audrey

- **Needs Audrey:** yes: why she moved off Jules
- Whether she wants Jules fully removed or kept as a fallback.
- Latest Jules invoice.
