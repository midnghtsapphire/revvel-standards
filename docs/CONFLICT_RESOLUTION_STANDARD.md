# Conflict Resolution Standard

This document describes how the conflict-helper workflow behaves, how to invoke it,
and how to interpret its output.

## 1. Purpose

When a PR develops merge conflicts with its base branch, the conflict-helper
workflow attempts to resolve them automatically. It runs through three phases:

1. **Phase 1 — Annotation.** Detect conflicts and post a sticky comment with the
   list of conflicted files.
2. **Phase 2 — Mechanical resolution.** Attempt to resolve well-known conflict
   patterns (version bumps, additive blocks) via a deterministic script.
3. **Phase 3 — Jules handoff.** If mechanical resolution fails, dispatch the
   Jules coding agent to attempt a semantic resolution.

## 2. Triggers

The workflow runs on:

- `pull_request` events (`opened`, `synchronize`, `reopened`)
- `issue_comment` containing `/resolve-conflicts` or `/resolve` on a PR
- Manual `workflow_dispatch`

## 3. Outcome labels

Exactly one of these labels is applied to the PR when the workflow finishes:

| Label | Meaning |
|-------|---------|
| `conflicts:auto-resolved` | Mechanical resolver fixed everything. Safe to merge after CI. |
| `conflicts:needs-jules`   | Handed to Jules coding agent. Wait for its PR/commit. |
| `conflicts:needs-human`   | Workflow surrendered. Manual intervention required. |

Filter PRs needing your attention:

```
is:pr is:open label:conflicts:needs-human
```

## 4. Sticky comment anatomy

The workflow maintains a single sticky comment on the PR. Top-to-bottom:

1. **Outcome block** — emoji + one-line status + "your job" line.
2. **Phase details** — collapsed `<details>` with exit codes and decisions.
3. **Conflicted files table** — the Phase 1 provenance list.

## 5. Mechanical resolver scope

Currently handles:

- Version bumps in `package.json`, `Cargo.toml`, `pyproject.toml` (take max).
- Additive-only blocks in changelogs and lockfiles (union merge).

Anything else is escalated.

## 6. Jules handoff contract

Phase 3 dispatches `jules-coding-agent.yml` with input `issue_number` set to the
PR number. PRs and issues share GitHub's number space, so this is the correct
semantic call.

> **Caveat (tracked in #17248):** the current `jules-coding-agent.yml` is a
> scaffolding stub. The dispatch will succeed but the callee does not yet call a
> real Jules API. Fix the callee before relying on Phase 3.

## 7. Manual invocation

Comment on any PR:

```
/resolve-conflicts
```

or the short form:

```
/resolve
```

Gated to `OWNER`, `MEMBER`, and `COLLABORATOR` associations. Other commenters are
ignored silently.

## 8. Slash-command details

The `/resolve` command re-runs all three phases from scratch. It is idempotent:
if the PR is already resolved, the workflow will detect no conflicts and exit
cleanly with the `conflicts:auto-resolved` label removed if present.

## 9. Interpreting the outcome block

- ✅ **Auto-resolved.** A follow-up commit was pushed. Wait for CI, then merge.
- 🟡 **Handed to Jules.** Do nothing. Jules will push a commit or open a follow-up PR.
- 🔴 **Needs human.** Check out the branch locally and resolve manually. The
  conflicted files are listed below the outcome block.

## 10. What to do when the workflow surrenders

1. `git fetch origin && git checkout <branch>`
2. `git merge origin/<base>` (or `git rebase origin/<base>`)
3. Resolve conflicts in your editor.
4. `git push`.
5. The workflow will re-run on push and should now label `conflicts:auto-resolved`
   (or nothing, if no conflicts remain).

## 11. Debugging a stuck PR

If a PR is labeled `conflicts:needs-jules` for more than a few hours with no
follow-up commit:

1. Check the Actions tab for the most recent `conflict-helper` run.
2. Check the sticky comment's collapsed "Phase details" section for exit codes.
3. If Phase 3 dispatched successfully but nothing happened, the Jules callee is
   likely still stubbed — see #17248.
4. Comment `/resolve` to re-run, or resolve manually per §10.
