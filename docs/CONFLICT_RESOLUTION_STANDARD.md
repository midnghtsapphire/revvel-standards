# Conflict Resolution Standard

**Status:** Active
**Owner:** @midnghtsapphire
**Last updated:** auto-maintained by `conflict-helper.yml`

## 1. Purpose

This standard defines how merge conflicts on PRs are resolved in this repository. The goal is **zero manual conflict resolution for the owner** whenever the conflict is mechanical, and **fast, labeled routing** when it is not.

## 2. Trigger surface

The `conflict-helper.yml` workflow runs on:

- `pull_request` events (`opened`, `synchronize`, `reopened`)
- `issue_comment` with body matching `/resolve-conflicts` or `/resolve` (see §8)
- Manual `workflow_dispatch`

## 3. Phases

| Phase | Name | What it does |
| --- | --- | --- |
| 1 | Annotate | Detect conflicts, post/update sticky comment with provenance table |
| 2 | Mechanical resolve | Try pattern-based auto-resolution (version bumps, additive blocks) |
| 3 | Jules dispatch | Hand semantic conflicts to `jules-coding-agent.yml` |
| 4 | Surrender | Apply `conflicts:needs-human` label and stop |

## 4. Outcomes

Every run terminates in exactly one of three outcomes, reflected in the sticky comment and a label:

| Outcome | Label | Emoji | Owner action |
| --- | --- | --- | --- |
| Auto-resolved | `conflicts:auto-resolved` | ✅ | Wait for CI, then merge |
| Handed to Jules | `conflicts:needs-jules` | 🟡 | Wait for Jules follow-up commit |
| Surrendered | `conflicts:needs-human` | 🔴 | Resolve conflicts manually |

## 5. Sticky-comment anatomy

The sticky comment is identified by an HTML marker `<!-- conflict-helper-sticky -->` and contains, from top to bottom:

1. **Outcome summary** — emoji + one-line status + explicit "your job" line
2. **Phase details** (collapsed `<details>`) — exit codes, dispatch status, decision reason
3. **Provenance table** — base SHA, head SHA, files with conflicts, workflow run link

## 6. Labels

- `conflicts:auto-resolved` — Phase 2 resolved everything; auto-commit pushed
- `conflicts:needs-jules` — Phase 3 dispatched Jules; awaiting agent commit
- `conflicts:needs-human` — Phase 4 reached; owner must resolve

Bookmark for triage:

```
https://github.com/midnghtsapphire/revvel-standards/pulls?q=is%3Apr+is%3Aopen+label%3Aconflicts%3Aneeds-human
```

## 7. Jules dispatch contract

Phase 3 dispatches `jules-coding-agent.yml` with `issue_number=<PR number>`. PRs and issues share GitHub's number space, and Jules declares its input as `issue_number` — passing `pr_number` (the historical bug) is silently discarded by GitHub Actions.

**Caveat:** the Jules callee is currently a scaffolding stub (tracked in #17248). Dispatch works but the callee does not yet call a real Jules API.

## 8. Manual slash-command

Post either of the following as a PR comment to re-run the workflow on demand:

```
/resolve-conflicts
/resolve
```

Gated to actors with association `OWNER`, `MEMBER`, or `COLLABORATOR`. Anonymous or drive-by commenters cannot trigger it.

Useful when:

- A prior run failed transiently (rate limit, network)
- You've pushed new mechanical patterns and want to retry the resolver
- Jules stub has been replaced with a real implementation and you want to re-dispatch

## 9. Interpreting outcomes

### ✅ Auto-resolved

Mechanical patterns matched every conflict. A follow-up commit was pushed to the PR branch. **Your job:** wait for CI, then merge. Nothing to review beyond the auto-commit diff.

### 🟡 Needs Jules

At least one conflict was semantic (required understanding intent, not just syntax). Handed to Jules. **Your job:** wait for the Jules follow-up commit, then review it as a normal PR change. If Jules never comes back within ~30 min, run `/resolve-conflicts` to retry or resolve manually.

### 🔴 Needs human

Both Phase 2 and Phase 3 declined (or Phase 3 is disabled). **Your job:** `git fetch && git checkout <branch> && git merge main`, resolve manually, push. The workflow will re-run on push and should flip the label to `auto-resolved` if the manual resolution is complete.

## 10. What to do when the workflow surrenders

1. Check the collapsed **Phase details** in the sticky comment for exit codes.
2. If Phase 2 exited non-zero due to a pattern the resolver *should* handle, file a WR to widen the pattern list.
3. If Phase 3 failed to dispatch, check that `jules-coding-agent.yml` exists on the default branch and its `issue_number` input hasn't been renamed.
4. Resolve the conflict manually. Push. The workflow re-runs.

## 11. Extending the resolver

Mechanical patterns live in `.github/workflows/conflict-helper.yml` Phase 2. Two patterns are supported today:

- **Version bumps** — both sides changed a version string; pick the higher semver
- **Additive blocks** — both sides added non-overlapping content in the same region; concatenate

Add new patterns behind a feature flag, run against a corpus of historical conflicted PRs to measure false-positive rate, then enable.
