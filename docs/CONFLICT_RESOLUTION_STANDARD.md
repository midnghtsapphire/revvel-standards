# Conflict Resolution Standard

## 1. Purpose

This standard defines how merge conflicts in pull requests are detected, resolved, and escalated across this repository. It exists to eliminate the manual toil of triaging conflicts one PR at a time and to give maintainers a single, predictable signal for what to do next.

## 2. Scope

Applies to every open pull request against `main` (and any protected release branch) in this repository. Applies to automation authored by AI agents and to human contributors equally.

## 3. Roles

- **Maintainer** — reviews outcome summary, approves auto-resolved commits, handles surrendered PRs.
- **Conflict Helper workflow** — detects conflicts, attempts mechanical resolution, dispatches Jules, labels outcomes.
- **Jules coding agent** — receives escalated PRs via `workflow_dispatch` with `issue_number`.
- **Contributor** — rebases or resolves manually when workflow surrenders.

## 4. Trigger surface

The `conflict-helper.yml` workflow runs on:

1. `pull_request` events (`opened`, `synchronize`, `reopened`).
2. `issue_comment` events matching `/resolve-conflicts` or `/resolve` on a PR.
3. `workflow_dispatch` (manual).

## 5. Phases

### Phase 1 — Detect & annotate

Inspect the PR's mergeable state. If clean, exit. If conflicted, post a sticky comment listing conflicted paths and provenance.

### Phase 2 — Mechanical resolution

Attempt an in-place merge from base into head branch. Resolve mechanical patterns (version bumps, additive blocks, non-overlapping list appends). If every conflict is resolved, push the merge commit back to the PR head branch.

### Phase 3 — Escalate to Jules

If Phase 2 cannot resolve every conflict, dispatch `jules-coding-agent.yml` with `issue_number=$PR_NUMBER` (PRs and issues share GitHub's number space). Apply `conflicts:needs-jules`.

### Phase 4 — Surrender

If Jules cannot be dispatched or the dispatch fails, apply `conflicts:needs-human` and update the sticky comment with a clear next-step for the maintainer.

## 6. Outcome labels

| Label | Meaning | Next action |
|-------|---------|-------------|
| `conflicts:auto-resolved` | Mechanical resolver fixed everything | Wait for CI, merge |
| `conflicts:needs-jules` | Handed to Jules coding agent | Wait for Jules PR update |
| `conflicts:needs-human` | Workflow surrendered | Resolve manually |

## 7. Slash-command surface

Comment `/resolve-conflicts` or `/resolve` on any PR to trigger the workflow immediately. Gated to `OWNER`, `MEMBER`, `COLLABORATOR` author associations. Reactions on the triggering comment indicate accepted (`+1`) or rejected (`-1`).

## 8. Sticky comment anatomy

The sticky comment is a single comment identified by an HTML marker (`<!-- conflict-helper:sticky -->`). It is updated in place across every workflow run for the PR. Structure:

1. Outcome block (emoji, one-line status, "your job" line).
2. Collapsed `<details>` phase log for debugging.
3. Provenance table (conflicted paths, base SHA, head SHA, run URL).

## 9. Interpreting the outcome block

- ✅ **Auto-resolved.** A commit has been pushed to the PR head branch. Review the diff, wait for CI, merge.
- 🟡 **Handed to Jules.** No action from you until Jules pushes an update or errors out.
- 🔴 **Needs human.** Rebase locally, resolve, force-push. Then either re-run the workflow via `/resolve-conflicts` or push a fresh commit.

## 10. When the workflow surrenders

1. Fetch base: `git fetch origin main`.
2. Rebase: `git rebase origin/main` on your feature branch.
3. Resolve conflicts in your editor.
4. `git rebase --continue` then `git push --force-with-lease`.
5. Remove `conflicts:needs-human` label (or let the next workflow run clear it).

## 11. Filtering PRs by outcome

Bookmark:

```
https://github.com/midnghtsapphire/revvel-standards/pulls?q=is%3Apr+is%3Aopen+label%3Aconflicts%3Aneeds-human
```

Swap the label suffix for `needs-jules` or `auto-resolved` as needed.

## 12. Non-goals

- This standard does not define the Jules callee's internal behavior. Tracked separately as a scaffolding-ban remediation.
- This standard does not define a Ralph-loop retry policy. The `/resolve` slash-command is the escape hatch.

## 13. Change log

- v1.0 — Initial standard covering Phase 1 detection.
- v1.1 — Added Phase 2 mechanical resolver.
- v1.2 — Added Phase 3 Jules dispatch (input name bug present).
- v1.3 — Fixed Jules dispatch input name; added `/resolve` slash-command; added outcome block + labels (this revision).
