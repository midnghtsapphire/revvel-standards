---
name: gh-issue-triage
description: >-
  Label and triage GitHub issues on the repository label allowlist. Maps type
  and priority onto existing labels, adds labels without removing any, and
  signs every comment. Use when an issue needs a type, a priority, a
  duplicate check, or a request for the missing fact.
---

# GitHub issue triage

**Skill Name:** `gh-issue-triage`
**Version:** 1.0.0
**Date:** 2026-11-11
**Status:** Active
**Category:** Developer Workflow
**Type:** Operational

## Attribution

Adapted from the MIT skill at <https://github.com/poindexter12/waypoint/tree/main/workflows/skills/gh-issue-triage>. Copyright (c) 2025 Joe Seymour. License: MIT. The adaptation maps that taxonomy onto `config/labels-allowlist.yml`, refuses label removal, and adds the house rules below.

## Where this file lives

Canonical text: this file. `skills/gh-issue-triage/SKILL.md` is a loader. `skills/gh-issue-triage/gh-issue-triage.skill.yml` is the vault machine config. A second full copy would drift. Decision, 2026-11-11, recorded by TriageChief, same layout as `docs/skills/github-read-write-admin/SKILL.md`.

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

An issue needs a type, a priority, a duplicate pointer, or a comment that names the missing fact. When the request does not name a repository, use `midnghtsapphire/revvel-standards` and pass `--repo`.

## Labels you may add

On this repository, `config/labels-allowlist.yml` is the list. Do not `gh label create` a name that is not on it. `scripts/label-allowlist-check.mjs` rejects the others. Do not pass `--remove-label`. A REST PATCH that sends a `labels` array replaces the set. Use `--add-label`, which adds.

| Upstream word | Add this label |
| --- | --- |
| bug | `bug` |
| feature, enhancement | `enhancement` |
| docs | `documentation` |
| chore, deps | `dependencies` |
| security | `security` |
| infra | `infrastructure` |
| needs triage | `triage` |
| needs info | `needs-human` |
| blocked | `blocked` |
| duplicate | `duplicate` |
| invalid, spam | `invalid` |
| critical | `priority:p0` |
| high | `priority:p1` |
| medium | `priority:p2` |
| low | `priority:p3` |

One type label and one `priority:pN` label. Area labels (`wr:docs`, `wr:code`, `wr:test`, `wr:security`, `content`, `design`, `automation`, `research`, `revenue`) may stack. Read the allowlist file before you invent a fourth priority.

## Procedure

```bash
FULL=midnghtsapphire/revvel-standards
gh issue view NUMBER --repo "$FULL" --json number,title,state,author,labels,url,body \
  | jq '.body |= gsub("(?i)(github_pat_[A-Za-z0-9_]+|gh[pousr]_[A-Za-z0-9_]+)"; "[REDACTED]")'
gh search issues --repo "$FULL" --state open --limit 20 -- "KEYWORDS"
gh search issues --repo "$FULL" --state closed --limit 20 -- "KEYWORDS"
```

1. Read the issue. Search for a duplicate before you add a type.
2. Duplicate: add `duplicate`, comment with `signed_body` naming the original number, and run `gh issue close NUMBER --repo "$FULL" --reason "not planned"`. Do not delete the issue. Add any new fact as a comment on the original.
3. The report is too thin to act on ("it does not work", no steps, no environment): add `needs-human` and `triage` if either is missing, then comment with the exact fact you need. Leave every label that is already there.
4. Otherwise add the type label, one `priority:pN` label, and `triage` if it is missing. If the issue already has a different type label or a different `priority:pN` label, leave those labels in place and comment that a human has to pick one. Do not add a second type or a second priority.

```bash
gh issue edit NUMBER --repo "$FULL" --add-label bug --add-label "priority:p1" --add-label triage
gh issue comment NUMBER --repo "$FULL" --body "$(signed_body "Type bug, priority p1. What I read and why.")"
```

Priority: `priority:p0` is production down, a live security hole, or data loss happening now. `priority:p1` blocks a real workflow. `priority:p2` is the normal bug or request. `priority:p3` is cosmetic or a someday item.

A security issue keeps the detail in the issue that already has it. The comment names the impact and the URL. If the body contains a token, do not quote the token. Say that the credential must be rotated.

Do not assign yourself. Add `--add-assignee` only when the task names that login.

Do not add a workflow to auto-label. Actions runners do not start, and this skill does not edit `.github/workflows`.

## What this skill does not do

It does not close an issue as finished unless the task says the work is done. It does not merge. It does not remove a label that another agent applied.

## Trigger keywords

```text
triage this issue, label this issue, issue priority, duplicate issue, needs-human, labels-allowlist
```
