---
name: git-advanced-workflows
description: >-
  Rebase, bisect, worktree, and reflog for local commits that have not been
  pushed. Use when cleaning unpushed history, finding a bad local commit, or
  working in a second checkout. Refuses force-push and any rewrite of a
  commit that is already on a remote.
---

# Git advanced workflows

**Skill Name:** `git-advanced-workflows`
**Version:** 1.0.0
**Date:** 2026-11-11
**Status:** Active
**Category:** Developer Workflow
**Type:** Operational

## Attribution

Adapted from the MIT skill at <https://github.com/wshobson/agents/tree/main/plugins/developer-essentials/skills/git-advanced-workflows>. Copyright (c) 2024 Seth Hobson. License: MIT. The adaptation keeps rebase, bisect, worktree, and reflog, and limits rebase to local commits that have not been pushed. Force-push and hard reset of a shared checkout are not in this skill.

## Where this file lives

Canonical text: this file. `skills/git-advanced-workflows/SKILL.md` is a loader. `skills/git-advanced-workflows/git-advanced-workflows.skill.yml` is the vault machine config. Decision, 2026-11-11, recorded by TriageChief, same layout as `docs/skills/github-read-write-admin/SKILL.md`.

## Revvel house rules

These rules win over the upstream skill. Commands for `git` and `gh` live in `docs/skills/github-read-write-admin/SKILL.md`.

Sign every issue body, discussion post, pull request title, pull request body, review, comment, and commit message. Start with the bot name in bold and end with `— BotName`.

```bash
BOT=TriageChief
signed_line() { printf '**%s** %s — %s\n' "$BOT" "$1" "$BOT"; }
signed_body() { printf '**%s** %s\n\n— %s\n' "$BOT" "$1" "$BOT"; }
```

Replace `TriageChief` with the bot doing the work.

Never delete and never rewrite history. Do not run `git push --force`. Do not run `git push --force-with-lease`. Do not rebase, squash, or amend a commit that has been pushed. Do not pass `--delete-branch`. Do not delete a branch, an issue, a comment, a label, a file, or a ruleset. Comment the old text out, or append a dated note. Append-only files gain lines. A union merge (`git merge -s union`) keeps both sides of an append-only file. Do not `git checkout --ours` or `--theirs` on a ledger.

Merge only when the task asks for that merge, and only when every gate is true on the same head SHA: an assignee is set, the work matches the pull request, `isDraft` is false, every required check on that SHA is green, and the account is not the pull request author. CircleCI `lint-and-test` is the real CI. GitHub Actions runners currently do not start. A missing Actions run is not a green check and is not a reason to edit a workflow, a ruleset, or a permission. Do not merge your own pull request. Do not assign yourself in order to pass the gate.

No secrets in output. Do not run `gh auth token`. Do not echo `GH_TOKEN` or `GITHUB_TOKEN`. If a log contains a token, report the URL or the job id only.

## Scope check before any rewrite

A rebase edits commits. Run it only on local commits that have not been pushed.

```bash
git fetch origin
git status -sb
git rev-list --left-right --count origin/HEAD...HEAD
```

Confirm the fetch exited 0 before you trust `origin/...`. If the commits are contained in any remote ref (`git branch -r --contains SHA` prints a line), stop. The cleanup is a new commit on top, not a rebase. Do not `git reset --hard` a checkout another agent is using. Do not `git stash` that checkout.

## Rebase, local and unpushed only

```bash
git rebase -i HEAD~5
```

`pick` keeps a commit. `reword` changes the message you have not pushed. `squash` and `fixup` fold an unpushed commit into the one before it. `drop` is a rewrite. On this repo, prefer `reword` or a new commit. If you `drop`, the commit must be one you created in this session and it must not be on a remote. If the rebase stops on a conflict, fix it under `docs/skills/resolve-conflicts/SKILL.md` or run `git rebase --abort` and leave the branch as it was.

Do not `git rebase` onto `main` or a daily branch after the feature branch has been pushed. Update a pushed branch with a merge commit.

## Cherry-pick

Cherry-pick copies a commit as a new commit on the current branch. That is allowed. Do not cherry-pick onto `main`.

```bash
git cherry-pick SHA
```

## Bisect

Find the local commit that broke a test. Use a worktree so the shared checkout stays put.

```bash
git worktree add ../repo-bisect HEAD
cd ../repo-bisect
git bisect start
git bisect bad
git bisect good KNOWN_GOOD
git bisect run npm test -- tests/the-failing.test.js
git bisect reset
cd -
git worktree remove ../repo-bisect
```

`git worktree remove` removes that working directory. It does not delete the branch. Do not `git branch -D`. A bisect run script exits 0 for good and 1 through 127, except 125, for bad.

## Worktree

One directory per branch when two lines of work are in flight.

```bash
git worktree list
git worktree add -b cursor/short-name ../repo-topic origin/daily/YYYY-MM-DD
git worktree remove ../repo-topic
```

Do not switch the shared checkout away from another agent's uncommitted files.

## Reflog

The reflog is how you point a new branch at a commit you can no longer see from a branch tip. Unreachable entries expire after about 30 days. Reachable entries expire after about 90 days. Those are git defaults (`gc.reflogExpireUnreachable`, `gc.reflogExpire`).

```bash
git reflog
git branch recovered-name SHA
```

Creating `recovered-name` keeps the commit. Do not move the shared `HEAD` with a hard reset to get there.

## What this skill does not do

It does not force-push. It does not rewrite a commit that `git branch -r --contains` can see. It does not delete a branch, including a branch you recovered.

## Trigger keywords

```text
rebase unpushed, git bisect, git worktree, git reflog, recover a local commit
```
