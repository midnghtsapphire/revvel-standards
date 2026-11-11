---
name: lint-and-validate
description: >-
  Run the linter and tests that cover the files you changed, and do not call
  the task done when they fail. Use after a code or docs edit, before commit
  and before push.
---

# Lint and validate

**Skill Name:** `lint-and-validate`
**Version:** 1.0.0
**Date:** 2026-11-11
**Status:** Active
**Category:** Developer Workflow
**Type:** Operational

## Attribution

Adapted from the MIT skill. Catalog URL <https://github.com/vudovn/antigravity-kit/tree/main/.agent/skills/lint-and-validate> returns 404. The text that was read is <https://github.com/vudovn/antigravity-kit/tree/main/.agents/skills/lint-and-validate>. Copyright (c) 2026 VUDOVN. License: MIT. The adaptation uses this repo's `node --test`, markdownlint, and the flake8 baseline, and limits a fixer to the paths you edited.

## Where this file lives

Canonical text: this file. `skills/lint-and-validate/SKILL.md` is a loader. `skills/lint-and-validate/lint-and-validate.skill.yml` is the vault machine config. Decision, 2026-11-11, recorded by TriageChief, same layout as `docs/skills/github-read-write-admin/SKILL.md`.

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

You changed code or markdown and you are about to commit or push. The task is not done while the check that covers the change is failing.

## This repository

Root tests are `node --test`. CircleCI runs `npm test`, which is that suite plus the flake8 baseline gate.

```bash
node --test tests/the-test-you-touched.test.js
npx markdownlint-cli2 docs/skills/the-file.md
```

Run `npm test` before you push when the change can affect the suite. Markdown lint uses `.markdownlint.yaml`. Lint the markdown files you changed. A repo-wide `npm run lint` also walks generated transcripts and any installed `node_modules`, and that flood is pre-existing. Do not treat it as a failure you introduced. Scope the command to your files.

Python you changed goes through `scripts/flake8-baseline-gate.js`. Do not reformat a Python file you did not edit.

A product under `products/<name>/` uses that directory's `npm test` and `npm run lint` when those scripts exist.

## Fixers

A fixer runs on the paths you edited. Do not point `eslint --fix`, `ruff check --fix`, or a formatter at the whole tree. That rewrites files the task did not name, which is a rewrite of history in the working tree.

If the tool is missing, name the file you looked for (`package.json`, `pyproject.toml`, `.markdownlint.yaml`) and run the closest command that exists. Do not add a second lint config beside the one the repo already loads.

## The signal that counts

A local pass is required. CircleCI `lint-and-test` on the head SHA you pushed is the result you report. Pending is not green. GitHub Actions not starting does not replace that CircleCI job.

## What this skill does not do

It does not declare success from a command that exited 0 while the assertion failed. It does not print audit output that contains a credential. It does not edit workflow files to silence a lint failure.

## Trigger keywords

```text
lint, validate, typecheck, markdownlint, npm test, flake8 baseline
```
