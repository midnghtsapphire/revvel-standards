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
