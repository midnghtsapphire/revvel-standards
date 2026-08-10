# Conflict Resolution Standard

## 1. Purpose

Automate merge-conflict resolution on PRs so the maintainer never has to hand-patch a rebase again. The workflow runs in three phases and always leaves a sticky comment explaining what it did.

## 2. Trigger surface

- `pull_request` open/sync/reopen/label
- `issue_comment` containing `/resolve-conflicts` or `/resolve` (gated to `OWNER`/`MEMBER`/`COLLABORATOR`)
- `workflow_dispatch` with `pr_number`

## 3. Phase 1 — annotate

Perform a dry-run merge against `main`; collect the list of files with conflict markers. If clean, exit.

## 4. Phase 2 — mechanical auto-resolve

Attempt `git merge origin/main -X theirs` for the common mechanical cases (version bumps, additive blocks, lockfile churn). If the merge lands, push the resulting commit back to the PR head branch.

## 5. Phase 3 — hand to Jules

If Phase 2 fails, dispatch `jules-coding-agent.yml` with `issue_number=<PR number>` (PRs and issues share GitHub's number space). See #17248 — the Jules callee is currently a scaffolding stub.

## 6. Sticky comment

One comment per PR, marked with `<!-- conflict-helper-sticky -->`. Updated in place on every run.

## 7. Outcome labels

| Label | Meaning |
|-------|---------|
| `conflicts:auto-resolved` | Phase 2 succeeded. Safe to merge once CI is green. |
| `conflicts:needs-jules` | Phase 3 dispatched. Wait for Jules commit. |
| `conflicts:needs-human` | Both phases failed. Maintainer must resolve manually. |

## 8. Manual slash-command

Comment `/resolve-conflicts` (or the shorthand `/resolve`) on any PR to re-run the workflow. Restricted to trusted associations.

## 9. Sticky-comment anatomy

The sticky comment always leads with an outcome block:

```
### Conflict Helper — outcome

<emoji> **<title>** <one-line explanation>.

**Your job:** <next action>.

<details><summary>Phase details</summary>
- Phase 2 (mechanical) outcome: `success|failure|skipped`
- Phase 3 (Jules) dispatched: `true|false|not-attempted`
- Phase decision: `resolved|dispatched-to-jules|needs-human`
</details>
```

## 10. Filtering PRs by outcome

Bookmark the following URL to see PRs still needing manual attention:

```
https://github.com/<org>/<repo>/pulls?q=is%3Apr+is%3Aopen+label%3Aconflicts%3Aneeds-human
```

## 11. When the workflow surrenders

If you see `conflicts:needs-human`:

1. Check `git log` on the PR branch for the last clean state.
2. Rebase locally (`git rebase origin/main`), resolve conflicts, force-push.
3. Re-trigger via `/resolve-conflicts` if you want the workflow to re-verify.

If the workflow keeps surrendering on a class of conflict, file a WR to teach the mechanical resolver about the pattern.
