---
name: pr-create-from-body
description: >-
  Open a GitHub pull request whose body comes from a local Markdown file,
  signed, with an assignee, into the daily branch the owner named. Use when
  a body file is ready and the branch is pushed.
---

# Create a pull request from a body file

**Skill Name:** `pr-create-from-body`
**Version:** 1.0.0
**Date:** 2026-11-11
**Status:** Active
**Category:** Developer Workflow
**Type:** Operational

## Attribution

Adapted from the MIT skill. Catalog URL <https://github.com/VisActor/VChart/tree/develop/.trae/skills/pr-create-from-body> was removed on `develop` in commit `b78c8ce` (2026-01-22, message "feat: move skill to spec kit"). The text that was read is the parent: <https://github.com/VisActor/VChart/blob/3e5663868080d9d5b09ba13a27e06a8545ce69a5/.trae/skills/pr-create-from-body/SKILL.md>. Copyright (c) 2023 Bytedance, Inc. and its affiliates. License: MIT. The adaptation keeps the body file, signs the title and body, targets the owner's daily branch, and does not unset the job token.

## Where this file lives

Canonical text: this file. `skills/pr-create-from-body/SKILL.md` is a loader. `skills/pr-create-from-body/pr-create-from-body.skill.yml` is the vault machine config. Decision, 2026-11-11, recorded by TriageChief, same layout as `docs/skills/github-read-write-admin/SKILL.md`.

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

## Inputs

| Input | Required | Default |
| --- | --- | --- |
| Title | Yes | None. The conventional type stays in the subject (`docs:`, `feat:`, `fix:`). |
| Base branch | No | The `daily/YYYY-MM-DD` the owner named. If that ref is missing, the newest `daily/*` from `git ls-remote --heads origin 'daily/*'`. Do not target `main` unless the owner named `main`. |
| Head branch | No | The current branch, already pushed. |
| Body file | No | `./.trae/output/pr.body.local.md` when that file exists and is non-empty. Otherwise the task must name the file. |
| Assignee | Yes before merge | The login the task names. Do not assign yourself to pass the gate. |
| Repository | No | `midnghtsapphire/revvel-standards` |

## Procedure

1. The body file exists and is not empty. Read it. If it does not already start with `**BotName**` and end with `— BotName`, write a copy that wraps the original prose with `signed_body`. Keep the author's sentences. The copy sits outside the repo so it is not committed. Do not create an empty body file to satisfy the path.
2. `gh auth status` shows an account. Do not print the token. Do not unset `GH_TOKEN` or `GITHUB_TOKEN` to go looking for a different credential. A 401 means the login is missing. A 403 means you name the missing permission and stop.
3. Push the head branch if the remote does not have it. Do not push `main`. If the push is rejected, fetch and merge. Do not force-push.

   ```bash
   FULL=midnghtsapphire/revvel-standards
   git push -u origin HEAD
   gh pr create --repo "$FULL" --base daily/YYYY-MM-DD --head "$(git branch --show-current)" \
     --assignee LOGIN \
     --title "$(signed_line "docs: subject")" \
     --body-file "$SIGNED_FILE"
   ```

   Do not pass `--draft` unless the task said to open a draft. Do not pass `--delete-branch`. `--label` adds a label. Do not send a labels array that drops labels already on the pull request.

4. Report the pull request URL and the head SHA. Stop. Merge only when the task asked and the gates in the house rules pass, including CircleCI `lint-and-test` on that SHA.

## What this skill does not do

It does not rewrite the body file's meaning. It does not create a pull request with an empty body. It does not search the worktree for a token when `gh auth status` fails.

## Trigger keywords

```text
create pull request from body file, gh pr create --body-file, open a pr from markdown
```
