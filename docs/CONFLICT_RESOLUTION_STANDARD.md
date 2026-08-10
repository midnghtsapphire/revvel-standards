# Conflict Resolution Standard

> How the `conflict-helper` workflow handles PR merge conflicts, and what you need to know to interpret its output.

## 1. Purpose

Merge conflicts on PRs are a tax on maintainer attention. This standard defines a three-phase automated pipeline that resolves as many conflicts as possible without human intervention, and — when it can't — leaves clear breadcrumbs telling you exactly what to do next.

**Prime directive:** the maintainer should never have to open the Actions tab, cross-reference commit history, and eyeball label state just to figure out what a workflow run did.

## 2. The three phases

| Phase | Name | What it does | Exit criteria |
| ----- | ---- | ------------ | ------------- |
| 1 | Annotate | Detects conflicts, posts sticky comment with provenance table (base SHA, head SHA, conflicting files). | Always runs. |
| 2 | Mechanical resolver | Applies pattern-based auto-fixes (version bumps, additive-only blocks in known files). Commits + pushes if it succeeds. | Exit 0 = fully resolved; exit non-zero = falls through to Phase 3. |
| 3 | Jules dispatch | Hands the PR to `jules-coding-agent.yml` via `workflow_dispatch` with `issue_number=<pr_number>`. Applies `conflicts:needs-jules` label. | Only runs if Phase 2 failed. |

If all three phases fail, the workflow applies `conflicts:needs-human` and surrenders cleanly.

## 3. Outcome labels

After every run, exactly one of these labels is applied to the PR:

- `conflicts:auto-resolved` — ✅ Phase 2 fixed everything. Safe to merge once CI is green.
- `conflicts:needs-jules` — 🟡 Handed off to Jules. Wait for its follow-up commit or PR.
- `conflicts:needs-human` — 🔴 Both automated phases surrendered. You handle it.

**One-click filter for PRs you need to touch personally:**

```
https://github.com/midnghtsapphire/revvel-standards/pulls?q=is%3Apr+is%3Aopen+label%3Aconflicts%3Aneeds-human
```

Bookmark that URL. That's your queue.

## 4. Triggers

The workflow runs on:

1. `pull_request` events (opened, synchronize, reopened) against any base branch.
2. Push to a PR head branch that already had a conflict label.
3. **NEW:** Comment containing `/resolve-conflicts` or `/resolve` on the PR — see §8.

## 5. Provenance table (Phase 1 output)

Every sticky comment includes a provenance block:

```
| Field       | Value                                    |
| ----------- | ---------------------------------------- |
| Base branch | `main`                                   |
| Base SHA    | `abc1234`                                |
| Head SHA    | `def5678`                                |
| Files       | `pkg/foo.go`, `README.md`                |
```

If you're debugging an incorrect resolution, cite these SHAs.

## 6. Mechanical resolver scope (Phase 2)

Currently handles:

- Version-string bumps in `package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod` (takes max of both sides).
- Additive-only conflicts in `CHANGELOG.md`, `docs/*.md` (concatenates both blocks preserving order).

Anything else falls through to Phase 3. Widening this list is a separate work-request.

## 7. Jules dispatch contract (Phase 3)

Phase 3 calls:

```bash
gh workflow run jules-coding-agent.yml -f issue_number="$PR_NUMBER"
```

**Input name is `issue_number` — not `pr_number`.** PRs and issues share GitHub's number space; the callee only declares `issue_number`. Using the wrong name causes the input to be silently discarded and Jules to run against nothing.

> ⚠️ As of this writing `jules-coding-agent.yml` is a scaffolding stub — the dispatch reaches it, but the callee doesn't yet call a real Jules API. Tracked in #17248.

## 8. Manual trigger: `/resolve-conflicts` slash-command

Post either of these as a comment on any PR to re-run the workflow immediately:

- `/resolve-conflicts`
- `/resolve` (short alias)

**Authorization:** the comment author must have association `OWNER`, `MEMBER`, or `COLLABORATOR`. Random drive-by commenters cannot trigger it.

Use this when:

- You've merged main into your PR and want another pass without pushing a dummy commit.
- The previous run landed on `conflicts:needs-jules` and Jules is being slow — you want to try mechanical again against fresher SHAs.
- You're testing the workflow itself.

## 9. Sticky-comment anatomy

Every run edits (not appends to) a single sticky comment identified by the marker `<!-- conflict-helper:sticky -->`. Layout, top to bottom:

```
### Conflict Helper — outcome

<emoji> **<one-line status>.**

**Your job:** <explicit next action>

<details><summary>Phase details</summary>
- Phase 2 (mechanical) exit code: `<n>`
- Phase 3 (Jules) dispatched: `<yes|no|not-attempted>`
- Phase decision: `<resolved|handed-off|surrendered>`
</details>

---

### Provenance

<provenance table from §5>
```

The outcome block is regenerated every run. The provenance block is regenerated every run. Nothing is appended; the comment length stays bounded.

## 10. What to do when the workflow surrenders (`conflicts:needs-human`)

1. Read the sticky comment's provenance table — that's your ground truth for what conflicted.
2. `gh pr checkout <pr>` locally.
3. `git fetch origin <base-branch> && git merge origin/<base-branch>` to reproduce the conflict.
4. Resolve, commit, push.
5. Remove the `conflicts:needs-human` label (the workflow will re-evaluate on the next push).

Do **not** delete the sticky comment. The workflow keys off its marker; deleting it will cause a duplicate to appear on the next run.

## 11. Escalation & scope-separated follow-ups

- Jules callee is still a stub — #17248.
- Wider mechanical patterns — file a WR with concrete examples of a conflict you saw ≥3 times in the last month.
- Ralph-loop / self-retry — deliberately out of scope; the manual `/resolve` slash-command is the escape hatch.

## 12. Change log

- **v2** — Fixed Jules dispatch input name (`pr_number` → `issue_number`). Added outcome summary, outcome labels, `/resolve-conflicts` slash-command. Sticky comment now updates after Phases 2 & 3, not just Phase 1.
- **v1** — Initial three-phase pipeline.
