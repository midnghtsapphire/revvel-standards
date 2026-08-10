# Conflict Resolution Standard

This document describes how conflicting pull requests are handled in this repository.
The automation lives in `.github/workflows/conflict-helper.yml`.

## 1. Goals

- Reduce the manual burden of resolving trivial merge conflicts.
- Give the maintainer a **single, visible signal** on every PR describing what the automation did.
- Never silently corrupt code: if the resolver is not confident, it surrenders and hands the PR to a human.

## 2. Trigger surface

The workflow runs when any of the following happens:

- A PR is opened, synchronized (new commit pushed), reopened, or labeled.
- A `workflow_dispatch` is invoked manually with a `pr_number` input.
- A comment containing `/resolve-conflicts` or `/resolve` is posted on a PR by a user with `OWNER`, `MEMBER`, or `COLLABORATOR` association.

## 3. Three-phase pipeline

### Phase 1 — Annotate

Attempts a `git merge --no-commit --no-ff origin/<base>`. If the merge succeeds cleanly, the workflow reports "no conflicts" and exits. Otherwise it records the list of conflicted files.

### Phase 2 — Mechanical resolve

For each conflicted file, the workflow attempts conservative mechanical patterns. Currently supported:

- **Additive-block union.** If a conflict hunk has non-empty content on both sides and neither side contains nested markers, both sides are concatenated. This handles the common case of two branches adding distinct lines to the same section (imports, dependency lists, changelog entries).

If all conflict markers disappear after applying patterns, the workflow commits the result to the PR branch with:

```
chore(conflicts): auto-resolve mechanical conflicts
```

and pushes. Otherwise the merge is aborted and the workflow proceeds to Phase 3.

### Phase 3 — Dispatch Jules

If Phase 2 could not resolve everything, the workflow dispatches `jules-coding-agent.yml` with `issue_number=<PR number>` (PRs and issues share GitHub's number space).

> ⚠️ **Caveat:** `jules-coding-agent.yml` is currently a scaffolding stub that does not call any real Jules API. This is tracked separately. The dispatch here is correct; the callee's implementation is the follow-up.

## 4. Outcomes

Exactly one of the following outcomes is recorded per run:

| Outcome | Label | Meaning |
| --- | --- | --- |
| ✅ Auto-resolved | `conflicts:auto-resolved` | Phase 2 fixed everything and pushed a commit. Safe to merge after CI. |
| 🟡 Needs Jules | `conflicts:needs-jules` | Phase 2 gave up; Jules was dispatched. Wait for Jules. |
| 🔴 Needs human | `conflicts:needs-human` | Phase 2 gave up and Jules dispatch failed or was not attempted. Resolve manually. |

## 5. Sticky comment

Every run updates (or creates) a single sticky comment on the PR, identified by the HTML marker `<!-- conflict-helper:sticky -->`. The comment has this structure:

```
### Conflict Helper — outcome

<emoji> <one-line status>

**Your job:** <next action>

<details><summary>Phase details</summary>
- Phase 1 (annotate) has_conflicts: ...
- Phase 2 (mechanical) exit code: ...
- Phase 3 (Jules) dispatched: ...
- Phase decision: ...
</details>
```

The maintainer should never have to open the Actions tab to know what happened. The sticky comment is the source of truth.

## 6. Labels

Outcome labels are created on first use (idempotent). Prior outcome labels are cleared before the new one is applied so a PR always carries at most one outcome label.

Filter URLs:

- Needs human: `?q=is%3Apr+is%3Aopen+label%3Aconflicts%3Aneeds-human`
- Needs Jules: `?q=is%3Apr+is%3Aopen+label%3Aconflicts%3Aneeds-jules`
- Auto-resolved: `?q=is%3Apr+is%3Aopen+label%3Aconflicts%3Aauto-resolved`

## 7. Permissions

The workflow requires `contents: write` (to push the resolution commit), `pull-requests: write` and `issues: write` (to comment and label), and `actions: write` (to dispatch Jules).

## 8. Manual slash-command

You can force a re-run at any time by posting either of these on the PR:

- `/resolve-conflicts`
- `/resolve`

The comment is acknowledged with a 🚀 reaction on the triggering comment. Only users with write access can trigger a run this way.

Use this when:

- You've pushed a manual fix and want the sticky comment refreshed.
- The previous run was flaky and you want to retry without pushing an empty commit.
- The PR was labeled `conflicts:needs-human` but you'd like the resolver to try once more after upstream changes.

## 9. Outcome labels (detail)

Labels are applied at the end of every run where Phase 1 detected conflicts. If no conflicts were detected, no outcome label is applied (there's nothing to signal).

Colors:

- `conflicts:auto-resolved` — green (`0e8a16`)
- `conflicts:needs-jules` — yellow (`fbca04`)
- `conflicts:needs-human` — red (`d93f0b`)

## 10. Sticky-comment anatomy

The sticky comment always starts with the marker line so subsequent runs can find and update it in place. The one-line status is deliberately terse (emoji + verb + branch reference). The **Your job** line is prescriptive: it tells the maintainer the single next action to take. Phase details are collapsed by default because they're only useful for debugging.

## 11. What to do when the workflow surrenders

When you see 🔴 `conflicts:needs-human`:

1. Pull the PR branch locally.
2. `git fetch origin <base> && git merge origin/<base>`.
3. Resolve conflicts by hand and push.
4. (Optional) Post `/resolve` on the PR so the sticky comment reflects the new state.

If you believe the conflict pattern is common enough to be worth automating, file a separate work request expanding Phase 2's pattern list. Do **not** widen the patterns speculatively — the whole point of surrender is that the resolver refuses to guess.
