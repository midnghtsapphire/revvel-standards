# Conflict Resolution Standard

This document describes how the `conflict-helper` workflow behaves and how to
interact with it as a maintainer.

## 1. Purpose

Merge conflicts are the single largest source of unbounded manual work in this
repo. The `conflict-helper` workflow is the automation contract that reduces
that work to (a) approving a summary, or (b) handling a small residue of
truly-manual cases.

## 2. Triggers

The workflow runs on:

- `pull_request` events (`opened`, `synchronize`, `reopened`, `labeled`)
- `issue_comment` events matching `/resolve` or `/resolve-conflicts`
- `workflow_dispatch` with a `pr_number` input

## 3. Phases

1. **Phase 1 — Detect.** Attempt a dry `git merge` of `base` into the PR head.
   If clean, exit ✅.
2. **Phase 2 — Mechanical resolve.** Try conservative pattern-based resolution
   for lockfiles (`--ours`) and additive `CHANGELOG.md` conflicts (`--theirs`).
   Push the commit if every conflict was handled.
3. **Phase 3 — Jules handoff.** If Phase 2 surrenders, dispatch
   `jules-coding-agent.yml` with `issue_number=<PR number>`.
4. **Surrender.** If Jules dispatch fails, label the PR `conflicts:needs-human`.

## 4. Fixed: Jules dispatch input name

The callee declares its input as `issue_number`, not `pr_number`. PRs and
issues share GitHub's number space, so passing `issue_number=$PR_NUMBER` is
semantically correct. Prior versions of this workflow passed `pr_number`, which
was silently discarded.

## 5. Fixed: Sticky comment visibility

The sticky comment is now upserted after **every** run with an outcome block
at the top: emoji + one-line status + explicit "your job" line + collapsed
phase details.

## 6. Trusted roles

Slash-command dispatch is gated to `OWNER`, `MEMBER`, and `COLLABORATOR`.

## 7. Failure semantics

Phase 2 and Phase 3 use `continue-on-error: true` so a failure in one phase
does not prevent the summary/label from being written. The final job step
reflects the true state.

## 8. Manual slash-command

Comment `/resolve` (or `/resolve-conflicts`) on any PR to re-run the workflow.
Useful when:

- Base branch moved forward since the last run.
- Jules dispatched but never pushed anything.
- You just want to see the outcome summary refreshed.

## 9. Outcome labels

| Label                        | Meaning                                          |
| ---------------------------- | ------------------------------------------------ |
| `conflicts:auto-resolved`    | Phase 2 succeeded (or no conflicts existed).     |
| `conflicts:needs-jules`      | Handed off to Jules; wait for it.                |
| `conflicts:needs-human`      | Neither mechanical nor Jules dispatch succeeded. |

Bookmark this URL for the "PRs I need to touch" view:

```
https://github.com/OWNER/REPO/pulls?q=is%3Apr+is%3Aopen+label%3Aconflicts%3Aneeds-human
```

## 10. Sticky-comment anatomy

```
### Conflict Helper — outcome

<emoji> <headline>

**Your job:** <next action>

<details><summary>Phase details</summary>
- Phase 2 (mechanical) outcome: `resolved` | `surrendered` | `not-attempted`
- Phase 3 (Jules) dispatched: `true` | `false` | `not-attempted`
- Phase decision: `no-conflicts` | `resolved` | `jules-dispatched` | `needs-human`
- Run: link to the Actions run
</details>
```

## 11. When the workflow surrenders

If a PR ends up labeled `conflicts:needs-human`:

1. Rebase (`git rebase origin/main`) or merge (`git merge origin/main`) locally.
2. Resolve by hand — usually because the conflict crosses semantic boundaries
   the mechanical resolver refuses to touch.
3. Push. The next `pull_request` synchronize event will re-run the workflow and
   flip the label to `conflicts:auto-resolved` if the head is now clean.

## 12. Known caveat

`jules-coding-agent.yml` is currently a scaffolding stub that does not call any
real Jules API. The dispatch-name fix in this standard is necessary but not
sufficient; the callee needs a real implementation. Tracked separately.
| Phase | When it fires | What it does |
| --- | --- | --- |
| **Phase 1: Annotate** | Always when `mergeable_state: dirty` | Posts a sticky comment naming current vs incoming with PR provenance |
| **Phase 2: Mechanical** | After Phase 1 | Runs the script; resolves version bumps + additive blocks; pushes a single audit-trail commit |
| **Phase 3: Jules** | If Phase 2 left anything ambiguous | Applies `conflicts:needs-jules` and dispatches `jules-coding-agent.yml` with `issue_number=<PR number>` (Jules' declared input name — PRs and issues share GitHub's number space) |
| **Phase 4: Human** | If Phase 3 surrenders (`conflicts:needs-human`) | The owner takes over |

## 8. Manual trigger — `/resolve-conflicts`

Post a comment containing `/resolve-conflicts` (or the short alias `/resolve`)
on any PR with conflicts to kick the workflow immediately without waiting for
a new commit or label change. Gated to `OWNER`, `MEMBER`, or `COLLABORATOR` so
random commenters cannot dispatch the workflow.

Useful when:

- A previous run failed and you want to retry after fixing a dependency
- You want to force a fresh run after main advanced
- Jules was down before but is now available

## 9. Outcome labels — filter your PR list without opening each one

After every run, the workflow applies exactly one of these labels so the PR
list becomes filterable:

| Label | Meaning | Your action |
| --- | --- | --- |
| `conflicts:auto-resolved` | Phase 2 fixed everything and pushed a commit | Wait for CI, then merge |
| `conflicts:needs-jules` | Phase 2 handed leftovers to Jules and dispatch succeeded | Wait for Jules to push |
| `conflicts:needs-human` | Everything else — script errored, or Jules dispatch failed, or Jules already tried and quit | You resolve manually |

Bookmark this URL for a one-click "PRs I need to touch" view:

```text
https://github.com/midnghtsapphire/revvel-standards/pulls?q=is%3Apr+is%3Aopen+label%3Aconflicts%3Aneeds-human
```

## 10. What the sticky comment tells you

At the top of the sticky comment is a **Conflict Helper — outcome** block
with three lines:

1. **Emoji + one-line headline** — ✅ auto-resolved, 🟡 handed to Jules, 🔴 needs you
2. **Your job** — exactly what you should do next
3. **Phase details** (collapsed by default) — exit codes, dispatch state,
   phase decision. Only unfold if something looks wrong.

Below that is the original Phase-1 provenance table — who introduced each
side of each conflict — for the cases where you still want to inspect.

## 11. When the sticky comment says the PR needs a human

The workflow surrenders. You have three choices:

1. **Fix it locally in GitHub's web UI** — click the "Resolve conflicts"
   button, edit each hunk, mark resolved, commit. This is the "brute force"
   answer that always works.
2. **Rebase-then-force-push** — if you have a git client handy, `git rebase
   origin/main`, resolve the few hunks Jules couldn't, force-push. Cleaner
   history, but requires CLI.
3. **Retry Jules** — if the dispatch failed for a fixable reason (secret was
   missing, workflow file broke, rate limit), fix the root cause and comment
   `/resolve-conflicts` to try again.
