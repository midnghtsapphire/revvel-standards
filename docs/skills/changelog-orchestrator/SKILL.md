---
name: changelog-orchestrator
description: >-
  Append changelog bullets from git history and merged pull requests. Keeps
  existing bullets, signs the commit, and opens a pull request without
  merging it. Use when the task asks for a changelog or release notes.
---

# Changelog orchestrator

**Skill Name:** `changelog-orchestrator`
**Version:** 1.0.0
**Date:** 2026-11-11
**Status:** Active
**Category:** Developer Workflow
**Type:** Operational

## Attribution

Adapted from the MIT skill by Mattyp. Catalog URL <https://github.com/jeremylongshore/claude-code-plugins-plus-skills/tree/main/plugins/automation/mattyp-changelog/skills/changelog-orchestrator> returns 404. The text that was read is <https://github.com/jeremylongshore/claude-code-plugins-plus-skills/tree/main/plugins/devops/mattyp-changelog/skills/changelog-orchestrator>. Copyright (c) 2025 Jeremy Longshore. License: MIT. The adaptation writes this repo's bullet shape, appends only, and drops the requirement for a private config file and a Slack source.

## Where this file lives

Canonical text: this file. `skills/changelog-orchestrator/SKILL.md` is a loader. `skills/changelog-orchestrator/changelog-orchestrator.skill.yml` is the vault machine config. Decision, 2026-11-11, recorded by TriageChief, same layout as `docs/skills/github-read-write-admin/SKILL.md`.

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

The task asks for a changelog, release notes, or a weekly note of what merged. The file in this repo is `CHANGELOG.md`. Bullets look like `- YYYY-MM-DD — Name — path: what changed`. Add bullets. Do not rewrite a bullet that is already there.

## Procedure

1. Read the top of `CHANGELOG.md`. If today's `## YYYY-MM-DD` heading exists, add bullets under it. If it does not, add the heading above the previous date heading and then the bullets. Leave every older bullet as it is.
2. Collect the range the task names. Default range is the daily branch the owner named through `HEAD`.

   ```bash
   FULL=midnghtsapphire/revvel-standards
   git fetch origin
   git log --oneline origin/daily/YYYY-MM-DD..HEAD
   gh pr list --repo "$FULL" --state merged --limit 30 --json number,title,mergedAt,url
   ```

3. Group the new bullets as features, fixes, and docs, still in the existing bullet shape. Name a path. A bullet that only says "updates" is not done. Link a pull request with a markdown link when you have the URL.
4. Quality check before you commit. Every new bullet has a date, a name, and a path. No token, no `.env` value, no raw `GH_TOKEN`. If `gh` was unavailable, say that the note is from `git log` only.
5. Commit on a new branch from the daily branch and open the pull request. Do not merge it.

   ```bash
   git switch -c cursor/changelog-YYYY-MM-DD origin/daily/YYYY-MM-DD
   git add CHANGELOG.md
   git commit -m "$(signed_body "docs: append changelog for YYYY-MM-DD")"
   git push -u origin HEAD
   gh pr create --repo "$FULL" --base daily/YYYY-MM-DD --head "$(git branch --show-current)" \
     --assignee LOGIN \
     --title "$(signed_line "docs: append changelog for YYYY-MM-DD")" \
     --body "$(signed_body "Appended changelog bullets from git log. Did not rewrite older entries.")"
   ```

Do not pass `--draft` unless the task said to. The assignee is a person the task names. Do not assign yourself to pass a later merge gate.

A `.changelog-config.json` or a Slack export is an extra source when the task points at one. It is not required. This repo's note comes from git and the pull request list.

## What this skill does not do

It does not replace `CHANGELOG.md`. It does not squash the release into one rewritten history. It does not publish a secret that showed up in a commit subject. It reports the subject as a URL or a SHA instead.

## Trigger keywords

```text
changelog, release notes, append CHANGELOG, weekly notes, draft changelog
```
