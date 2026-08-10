# Conflict Resolution Standard

This document defines how conflicts on pull requests are triaged, resolved, and
communicated in this repository. It is the source of truth for the
`conflict-helper.yml` workflow behavior.

## 1. Scope

Applies to every pull request opened against `main` (or any protected branch)
in this repository.

## 2. Goals

- Zero-touch resolution of mechanical merge conflicts (version bumps, additive
  blocks, identical-both-sides).
- Deterministic, visible fallback path when mechanics don't apply.
- One place — the PR sticky comment — that says what the workflow did and what
  the maintainer must do next.

## 3. Trigger surface

The workflow runs on:

- `pull_request` events: `opened`, `synchronize`, `reopened`, `labeled`.
- `issue_comment` events on PRs where the comment body contains
  `/resolve-conflicts` or `/resolve` and the commenter is `OWNER`, `MEMBER`, or
  `COLLABORATOR`.

## 4. Phases

### Phase 1 — Detect

Attempt a dry-run merge of the PR's base into its head. Record whether
conflicts exist and which files are involved.

### Phase 2 — Mechanical auto-resolve

For each conflicted file, attempt a conservative union merge of the two sides
of each conflict marker. If **every** marker in **every** file can be
resolved this way, commit and push to the PR head.

### Phase 3 — Dispatch Jules

If Phase 2 could not resolve everything, dispatch
`jules-coding-agent.yml` with `issue_number=<PR number>`. (PRs and issues
share GitHub's number space.)

### Phase 4 — Report

Always run. Applies exactly one outcome label and updates the sticky comment.

## 5. Outcome labels

| Label                          | Meaning                                                         |
| ------------------------------ | --------------------------------------------------------------- |
| `conflicts:auto-resolved`      | Mechanical resolver fixed all conflicts. Safe to merge.         |
| `conflicts:needs-jules`        | Handed to Jules coding agent. Wait for follow-up.               |
| `conflicts:needs-human`        | Workflow surrendered. Maintainer must resolve locally.          |

Only one outcome label is present at a time; the workflow rotates them on each
run.

## 6. Sticky comment marker

The workflow finds and edits the single comment containing the HTML marker
`<!-- conflict-helper:sticky -->`. Creating additional comments with this
marker will confuse the workflow — don't.

## 7. Failure modes

- If Phase 2 partially resolves a file, it aborts the merge and leaves the
  branch untouched.
- If the Jules dispatch call fails (network, permissions, missing workflow),
  the outcome becomes `needs-human`.

## 8. Manual slash-command

Comment `/resolve-conflicts` (or the short form `/resolve`) on any PR to
trigger the workflow on-demand. Useful when:

- You want to retry after pushing a fix to `main`.
- The workflow ran before a mechanical pattern was supported and you've since
  updated the resolver.
- You're unsure whether it ran and want a fresh sticky comment.

Gated to `OWNER` / `MEMBER` / `COLLABORATOR` author associations. Strangers'
comments are ignored.

## 9. Sticky-comment anatomy

Every run rewrites the sticky comment to this shape:

```
### Conflict Helper — outcome

<emoji> <one-line status>

**Your job:** <explicit next action>

<details><summary>Phase details</summary>
- Phase 1 (detect) conflicts: `true|false`
- Phase 2 (mechanical) exit code: `0|1|n/a`
- Phase 2 resolved everything: `true|false`
- Phase 3 (Jules) dispatched: `true|false|not-attempted`
- Phase decision: `clean|resolved|needs-jules|needs-human`
</details>
```

The emoji is the fastest signal: ✅ green means done, 🟡 yellow means waiting on
an agent, 🔴 red means it's on you.

## 10. When the workflow surrenders (`conflicts:needs-human`)

Run locally:

```bash
git fetch origin
git checkout <pr-head-branch>
git merge origin/main
# resolve, then
git push
```

On push, the workflow re-runs automatically (via `synchronize`) and will clear
the `needs-human` label if the new state is clean.

## 11. Filtering PRs by outcome

Bookmark these URLs (replace `<owner>/<repo>`):

- Needs you: `https://github.com/<owner>/<repo>/pulls?q=is%3Apr+is%3Aopen+label%3Aconflicts%3Aneeds-human`
- Waiting on Jules: `https://github.com/<owner>/<repo>/pulls?q=is%3Apr+is%3Aopen+label%3Aconflicts%3Aneeds-jules`
- Auto-resolved, ready to merge: `https://github.com/<owner>/<repo>/pulls?q=is%3Apr+is%3Aopen+label%3Aconflicts%3Aauto-resolved`
