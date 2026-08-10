# Conflict Resolution Standard

## 1. Purpose

This document defines how merge conflicts are resolved across PRs in this repository. The goal is to minimize maintainer toil: the workflow should either resolve the conflict itself, hand it to an agent, or clearly surrender to a human — never leave a PR in an ambiguous state.

## 2. Trigger surfaces

The `conflict-helper.yml` workflow runs when:

- A PR is opened, synchronized, or reopened against a protected branch.
- A comment `/resolve-conflicts` (or `/resolve`) is posted on a PR by an `OWNER`, `MEMBER`, or `COLLABORATOR`.
- The `conflicts:retry` label is applied to a PR.

## 3. Phases

### Phase 1 — Annotation

Detect conflicted files, produce a provenance table, and post/update a sticky comment on the PR.

### Phase 2 — Mechanical resolution

Attempt to auto-resolve conflicts that match known safe patterns:

- Version bumps in `package.json`, `pyproject.toml`, `Cargo.toml` — take the higher semver.
- Additive-only conflicts in changelog/append-only files — concatenate both sides.

If every conflict matches, the resolver pushes a follow-up commit to the PR branch and labels it `conflicts:auto-resolved`.

### Phase 3 — Jules dispatch

If mechanical resolution cannot cover all conflicts, dispatch `jules-coding-agent.yml` with `issue_number=<PR number>` (PRs and issues share GitHub's number space). Label the PR `conflicts:needs-jules`.

### Phase 4 — Surrender

If both Phase 2 and Phase 3 fail (or Jules is disabled), label the PR `conflicts:needs-human` and update the sticky comment with the surrender outcome.

## 4. Outcome labels

| Label | Meaning | Your action |
|---|---|---|
| `conflicts:auto-resolved` | Mechanical resolver fixed everything; commit pushed | Wait for CI, then merge |
| `conflicts:needs-jules` | Handed to Jules agent | Wait for Jules PR update |
| `conflicts:needs-human` | Workflow surrendered | Resolve manually |

Bookmark for one-click triage of PRs needing you:

```
https://github.com/midnghtsapphire/revvel-standards/pulls?q=is%3Apr+is%3Aopen+label%3Aconflicts%3Aneeds-human
```

## 5. Sticky comment anatomy

The sticky comment on every conflicted PR contains, in order:

1. **Outcome block** (top) — emoji + one-line status + "your job" line + collapsed phase details.
2. **Provenance table** — which files conflict and against which base commits.
3. **Diagnostic tail** — links to the workflow run and any Jules dispatch.

## 6. Manual escape hatch

Post `/resolve-conflicts` or `/resolve` on any conflicted PR to retry the full workflow. Useful when:

- You've pushed a base-branch fix and want to re-check without a new PR commit.
- A prior Jules dispatch failed silently.
- You want to force a fresh outcome summary.

## 7. Slash-command permissions

Only `OWNER`, `MEMBER`, and `COLLABORATOR` associations can trigger `/resolve-conflicts`. External contributors cannot invoke it — they should ping a maintainer.

## 8. Interpreting the outcome block

| Emoji | Outcome | Next step |
|---|---|---|
| ✅ | Auto-resolved | Wait for CI, merge |
| 🟡 | Needs Jules | Wait for Jules to push a fix |
| 🔴 | Needs human | You resolve manually |

The collapsed `<details>` block shows Phase 2 exit code, whether Phase 3 was dispatched, and the final phase decision. Use it when debugging why a particular outcome was chosen.

## 9. When the workflow surrenders

If the sticky comment shows 🔴 `conflicts:needs-human`:

1. Check out the PR branch locally: `gh pr checkout <number>`
2. Rebase or merge the base branch: `git fetch origin && git merge origin/main`
3. Resolve conflicts manually with your preferred tool.
4. Push. The workflow will re-run and (assuming clean) drop the `needs-human` label.

## 10. Known limitations

- `jules-coding-agent.yml` is currently a scaffolding stub (tracked in #17248). Phase 3 dispatches correctly but the callee does not yet call a real API. Until #17248 lands, treat `conflicts:needs-jules` as "parked, will need human eventually."
- The mechanical resolver only handles two pattern families (version bumps, additive blocks). Widening the pattern list is a separate work request.
- No Ralph-loop retry: if Jules fails, the workflow does not retry automatically. Use `/resolve` to force a retry.

## 11. Scope boundaries

This standard covers only the conflict-helper workflow. Related but separate:

- General PR review standards → `docs/PR_REVIEW_STANDARD.md`
- Agent scaffolding-ban policy → `AGENTS.md`
- Jules agent implementation → `.github/workflows/jules-coding-agent.yml` (see #17248)
