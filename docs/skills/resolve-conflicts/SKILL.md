---
name: resolve-conflicts
description: >-
  Resolve git merge conflicts by keeping both sides' intent. Append-only
  files use a union merge. Retired lines are commented out with a dated
  note. Use when git status shows unmerged paths.
---

# Resolve merge conflicts

**Skill Name:** `resolve-conflicts`
**Version:** 1.0.0
**Date:** 2026-11-11
**Status:** Active
**Category:** Developer Workflow
**Type:** Operational

## Attribution

Adapted from the Apache-2.0 skill at <https://github.com/antinomyhq/forge/tree/main/.forge/skills/resolve-conflicts>. Copyright 2025 Tailcall. License: Apache-2.0. The adaptation drops deletion as a resolution, uses a union merge for append-only files, and adds the house rules below.

## Where this file lives

Canonical text: this file. `skills/resolve-conflicts/SKILL.md` is a loader. `skills/resolve-conflicts/resolve-conflicts.skill.yml` is the vault machine config. Decision, 2026-11-11, recorded by TriageChief, same layout as `docs/skills/github-read-write-admin/SKILL.md`.

## Revvel house rules

These rules win over the upstream skill. Commands for `git` and `gh` live in `docs/skills/github-read-write-admin/SKILL.md`.

Sign every issue body, discussion post, pull request title, pull request body, review, comment, and commit message. Start with the bot name in bold and end with `— BotName`.

```bash
BOT=TriageChief
signed_line() { printf '**%s** %s — %s\n' "$BOT" "$1" "$BOT"; }
signed_body() { printf '**%s** %s\n\n— %s\n' "$BOT" "$1" "$BOT"; }
```

Replace `TriageChief` with the bot doing the work.

Never delete and never rewrite history. Do not run `git push --force`. Do not run `git push --force-with-lease`. Do not rebase, squash, or amend a commit that has been pushed. Do not pass `--delete-branch`. Do not delete a branch, an issue, a comment, a label, a file, or a ruleset. Comment the old text out, or append a dated note. Append-only files gain lines. Do not run `git merge -s union`: git has no strategy by that name. For one append-only file, run `git merge-file --union`. `CHANGELOG.md`, `AUTHORS`, and `CONTRIBUTORS` already have `merge=union` in `.gitattributes`, so a normal `git merge` keeps both sides of those files. Do not `git checkout --ours` or `--theirs` on a ledger.

Merge only when the task asks for that merge, and only when every gate is true on the same head SHA: an assignee is set, the work matches the pull request, `isDraft` is false, every required check on that SHA is green, and the account is not the pull request author. CircleCI `lint-and-test` is the real CI. GitHub Actions runners currently do not start. A missing Actions run is not a green check and is not a reason to edit a workflow, a ruleset, or a permission. Do not merge your own pull request. Do not assign yourself in order to pass the gate.

No secrets in output. Do not run `gh auth token`. Do not echo `GH_TOKEN` or `GITHUB_TOKEN`. If a log contains a token, report the URL or the job id only.

## When to use

`git status` lists unmerged paths. Write the plan before you edit a conflict. The plan names each file, the conflict type, and the strategy. Put the plan in the commit message or the pull request body.

## Conflict types

| Type | Strategy |
| --- | --- |
| Append-only ledger, `CHANGELOG.md`, `wr/memory/decisions.jsonl` | Union merge. Read the file. Both sides' new lines are present. No conflict marker remains. |
| One side deleted, the other modified | Keep the file. Comment the retired part out with the date, the agent, and the reason. Keep the modification. |
| Imports or tests | Keep every unique import and every test. Rename a test when both sides used the same name for different behavior. |
| Lockfile or other generated file | Regenerate from the project command (`npm install` at the root, or inside the product). Do not hand-edit the lockfile. |
| Code that does two different jobs | Keep both. |
| Code that does one job two ways | Keep the version the test passes. Comment the other out with a dated note. |
| Binary | Stop. Report both blob SHAs. Do not pick a side in silence. |

## Procedure

```bash
git status
git diff --name-only --diff-filter=U
```

Append-only file. `CONFLICTED` is the unmerged path from `git status`. Read the three index stages into a temp directory. Stage 1 is the base, stage 2 is ours, stage 3 is theirs. Do not redirect `git merge-file` onto `$CONFLICTED`. The shell truncates the target of `>` before the command runs, so that redirect empties the ledger and then stages the empty file when the inputs were never written.

```bash
CONFLICTED=path/from/git-status
STAGE=$(mktemp -d)
git show ":2:$CONFLICTED" > "$STAGE/ours" &&
git show ":1:$CONFLICTED" > "$STAGE/base" &&
git show ":3:$CONFLICTED" > "$STAGE/theirs" &&
git merge-file --union --stdout "$STAGE/ours" "$STAGE/base" "$STAGE/theirs" > "$STAGE/merged" &&
test -s "$STAGE/merged" &&
cp "$STAGE/merged" "$CONFLICTED" &&
git add "$CONFLICTED"
```

`&&` stops the copy when `git show` or `git merge-file` fails. `test -s` refuses an empty result, which is what three empty stage files produce. Search `"$CONFLICTED"` for conflict markers before you commit. Union can reorder lines. Confirm both new blocks are present.

A whole-branch merge does not take `-s union`. Git reports `Could not find merge strategy 'union'`. Merge the branch with the default strategy. For a ledger that is not already `merge=union` in `.gitattributes`, resolve that file with `git merge-file --union` as above. `CHANGELOG.md` already has the attribute, so the default merge keeps both sides of that file.

Deleted-and-modified: stage the kept file after the dated comment is in place. Do not `git rm` the path to clear the unmerged state.

After the files are clean:

```bash
git grep -n '<<<<<<<' || true
```

A hit that is a real marker is not done. A hit inside a string or a doc that is teaching the marker syntax stays, and you say so.

Run the test that covers the files you touched. Then:

```bash
git add "$CONFLICTED"
if [ -d .git/rebase-merge ] || [ -d .git/rebase-apply ]; then
  git rebase --continue
elif [ -f .git/CHERRY_PICK_HEAD ]; then
  git cherry-pick --continue
elif [ -f .git/REVERT_HEAD ]; then
  git revert --continue
else
  git commit -m "$(signed_body "fix: resolve merge conflict in path")"
fi
```

`git commit` during a rebase, cherry-pick, or revert does not finish that operation. Use the matching `--continue` when that state directory or file is present.

If the branch is already on the remote, the resolution is a new merge commit. Do not rebase that branch to hide the merge.

## What this skill does not do

It does not force-push. It does not drop one side of a ledger. It does not delete a file a branch removed when the other branch still has changes in it.

## Trigger keywords

```text
merge conflict, unmerged paths, union merge, both sides, conflict marker
```
