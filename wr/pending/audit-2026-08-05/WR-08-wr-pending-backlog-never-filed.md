# [WR] P1 — the WR-drafting pipeline itself is the biggest "developed but not wired in" pattern in the repo

**Priority:** P1
**Gate:** 6 (Delegation & Bus Wiring)
**Status:** proven — partial action taken, full backlog needs an owner filing decision

## Evidence

- `wr/pending/*.md` (excluding subdirectories) contains **14** fully-drafted,
  ready-to-file WR bodies (`01-sonnet-hardcode-migration.md` through
  `14-veins-grounding-gate.md`). `wr/pending/README.md` itself says: "Each
  file is a ready-to-file GitHub issue: copy the body into a new issue... **
  Delete a file here once its issue exists**."
- `wr/pending/audit-2026-07-14/*.md` contains **21** more
  (`WR-A1`–`WR-A21`), from a prior external Claude-run audit, in the same
  "ready-to-file" state.
- GitHub issue search (`gh issue list --search`) for representative titles
  from both batches — "security-fleet.js has ZERO triggers", "persona
  delegation is dead wire", "credential-autonomy-agent.yml runs hourly",
  "package.json declares zero dependencies", "state.json is empty" — found
  **no matching filed issues** for any of them (state.json is mentioned only
  in passing in unrelated issues #16889 and #14019, not as its own filed
  WR).
- `wr/pending/README.md` itself records that only 6 items from an earlier,
  even older batch were ever filed: "Already filed as issues:
  #15499–#15504."

## Root Cause

The repo built an entire WR-drafting pipeline (audits produce
template-compliant WR markdown files, ready to paste into a GitHub issue)
but the last mechanical step — actually filing them as issues so the agent
fleet's issue-driven automation can see and pick them up — was never
automated and, per the evidence above, was mostly never done by hand either.
A WR that exists only as a markdown file in `wr/pending/` is invisible to
every issue-triggered workflow in this repo (`agent-fallback.yml`,
`openrouter-coder.yml`, `openrouter-assignee.yml`, etc. all key off GitHub
issue events) — so the drafting half of the pipeline works perfectly and the
delivery half is a complete no-op. This is the single largest
"developed-but-not-wired" finding in the repo by volume: 35 fully-researched,
template-compliant, unactioned work items.

## Fix

**Applied in this PR:** filed GitHub issues for the four new findings from
this audit that already have proven fixes on this branch (WR-01 through
WR-04) — so this PR's own WRs don't repeat the exact pattern this WR is
about. See the PR description for issue links.

**Not applied without owner sign-off:** bulk-filing all 35 pre-existing
`wr/pending/` items as GitHub issues in one pass is a much larger, more
visible action (35 new issues appearing at once) than this audit's own
scope, and several of them may since have been superseded, partially
addressed, or intentionally deprioritized by the owner (e.g. `12-secrets-
sanity.md` appears to already be resolved by the credential-gate removal in
PR #16305 — worth re-verifying before filing rather than filing blind).
Recommended next step: the owner reviews `wr/pending/README.md` and
`wr/pending/audit-2026-07-14/` once against current state, marks any that
are stale/resolved (archived with attribution per the owner's
never-delete preference, not deleted per the README's own "delete once
filed" instruction), and either files the rest in one batch or asks the
fleet to do it as a dedicated follow-up WR.

## Agent Learning Note

**Pattern:** a "ready-to-file" convention with a manual copy-paste step is
exactly as reliable as any other manual step in an otherwise-automated
pipeline — it doesn't happen unless someone remembers to do it, and nobody
did, 35 times in a row, across two separate audit sessions three weeks
apart.
**Vaccine:** replace the manual copy-paste convention with a scheduled
workflow that reads every `wr/pending/**/*.md` file, checks (by title) if a
matching issue already exists, and files one with the `[WR]` prefix and
`work-request` label if not — turning "ready-to-file" into "auto-filed."
This is a natural companion to the existing dedupe-by-title pattern already
used in `compliance-watcher.yml` and this audit's own
`security-fleet.yml`. Proposed as a follow-up WR (not implemented in this
PR, since it would immediately try to file all 35 backlog items the moment
it merges — exactly the "owner sign-off first" action called out above).
