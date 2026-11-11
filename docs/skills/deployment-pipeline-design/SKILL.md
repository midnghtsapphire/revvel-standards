---
name: deployment-pipeline-design
description: >-
  Design a multi-stage deploy path with a human gate, a real health check,
  and a forward rollback. CircleCI is the check that runs. Use when the task
  asks for a pipeline design, a promotion path, or a rollback plan.
---

# Deployment pipeline design

**Skill Name:** `deployment-pipeline-design`
**Version:** 1.0.0
**Date:** 2026-11-11
**Status:** Active
**Category:** Developer Workflow
**Type:** Operational

## Attribution

Adapted from the MIT skill at <https://github.com/wshobson/agents/tree/main/plugins/cicd-automation/skills/deployment-pipeline-design>. Copyright (c) 2024 Seth Hobson. License: MIT. The adaptation keeps the stage order and the rollback rules, names CircleCI as the runner that starts, and does not edit rulesets or workflow permissions from this skill.

## Where this file lives

Canonical text: this file. `skills/deployment-pipeline-design/SKILL.md` is a loader. `skills/deployment-pipeline-design/deployment-pipeline-design.skill.yml` is the vault machine config. Decision, 2026-11-11, recorded by TriageChief, same layout as `docs/skills/github-read-write-admin/SKILL.md`.

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

## When to use

The task asks for a pipeline design, a promotion path between environments, or a rollback plan. The output is a design in the pull request or in the doc the task names. Editing `.circleci/config.yml` happens only when the task names that file. This skill does not edit `.github/workflows`, rulesets, or permissions.

## Stages to specify

Write these stages in order. Name the command or the job for each one.

| Stage | What it proves |
| --- | --- |
| Build | The artifact id (image digest, package version) that later stages deploy. |
| Test | Unit tests plus the SAST command from `docs/skills/sast-configuration/SKILL.md` when the repo has a scanner. |
| Staging | The same artifact, deployed where it cannot take production traffic. |
| Human gate | Assignee set, the diff matches the request, `isDraft` is false, CircleCI `lint-and-test` is green on that head SHA, author is not the merger. |
| Production | Canary (a small share of traffic first) or rolling (one instance at a time). Record the weights or the batch size. |
| Verify | A deep check that reads a real dependency. A `/ping` that returns 200 while the database is down is not this stage. |
| Rollback | A new deploy of the previous artifact digest. A forward commit. Not a force-push and not a deleted branch. |

## Health and data

Say which check is shallow and which one queries a dependency. If the shallow check is what the pipeline currently calls, say that production can look healthy while the dependency is down.

Schema changes stay additive until the previous code is gone from every environment. Keep the undo SQL next to the forward SQL. A destructive statement (`DROP COLUMN`, a new `NOT NULL` on a column old code still writes) stays commented out with the date, the agent, and the reason, until the owner says to run it.

Copy dependency manifests before the rest of the source in a container build so a one-line edit does not bust the dependency layer:

```dockerfile
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build
```

## Secrets and logs

The design names secrets. It does not contain values. A job that prints an environment variable fails this design. If a log already leaked a value, report the job id and stop quoting the value.

## Rollback

Record the previous digest in the changelog when you roll forward to it. CircleCI is the check on the rollback commit too. GitHub Actions not starting is not a failed deploy and not a successful one.

## What this skill does not do

It does not change branch protection, environment reviewers, or Actions secrets. Those are admin changes and need the owner's yes under `docs/skills/github-read-write-admin/SKILL.md`. It does not turn on branch deletion after merge.

## Trigger keywords

```text
deployment pipeline, canary, rollback plan, promotion gate, health check
```
