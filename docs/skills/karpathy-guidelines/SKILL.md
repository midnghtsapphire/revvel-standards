---
name: karpathy-guidelines
description: >-
  Coding behavior for agents: state assumptions, keep new code small, edit
  only the lines the task needs, and finish on a check you can run. Use when
  writing, reviewing, or refactoring code.
---

# Karpathy guidelines

**Skill Name:** `karpathy-guidelines`
**Version:** 1.0.0
**Date:** 2026-11-11
**Status:** Active
**Category:** Developer Workflow
**Type:** Operational

## Attribution

Adapted from the MIT skill at <https://github.com/swarmclawai/andrej-karpathy-skills/tree/main/skills/karpathy-guidelines>. Copyright (c) 2026 forrestchang and SwarmClaw AI contributors. License: MIT. The upstream note says the guidelines come from Andrej Karpathy's observations on LLM coding mistakes (<https://x.com/karpathy/status/2015883857489522876>). The adaptation keeps the four rules and blocks the ones that would rewrite or delete existing work.

## Where this file lives

Canonical text: this file. `skills/karpathy-guidelines/SKILL.md` is a loader. `skills/karpathy-guidelines/karpathy-guidelines.skill.yml` is the vault machine config. Decision, 2026-11-11, recorded by TriageChief, same layout as `docs/skills/github-read-write-admin/SKILL.md`.

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

## 1. Think before coding

State the assumption in the file you are editing: the date, who decided, and why. If the task has two readings, follow the reading the owner wrote and name the other one in that note. Ask only when the next step spends money, deletes data, or changes auth. A reversible choice gets a note and you continue.

## 2. Simplicity for new code

Write the minimum new code that solves the task. No extra feature, no abstraction that has one caller, no config the task did not ask for. If the new code is long, shorten the new code. Do not shorten it by replacing an existing file. The upstream line that says to rewrite a 200-line solution down to 50 applies to code you just added in this change. It does not apply to a file that was already in the repo.

## 3. Surgical edits

Touch the lines the task needs. Match the style around them. If you notice unrelated dead code, mention it in the pull request. Do not delete it. An import that your own edit made unused may leave the lines you added. Pre-existing unused code stays. Every changed line should trace to the task.

## 4. Finish on a check

Turn the task into a command. "Fix the bug" means a test that fails before the change and passes after. "Add validation" means a test for the invalid input, then the code that makes it pass. For more than one step, write the step and the check:

```text
1. Add the failing test. Check: node --test tests/that-file.test.js exits non-zero.
2. Add the behavior. Check: the same command exits 0.
3. Push. Check: CircleCI lint-and-test is green on that head SHA.
```

A vague "make it work" is not a finish line. A one-line change still runs the check. It does not need a long plan in the pull request.

The upstream text biases toward caution over speed. Use that bias on new code. Do not use it as a reason to stop a reversible edit.

## What this skill does not do

It does not authorize a wholesale rewrite. It does not authorize a delete. It does not merge.

## Trigger keywords

```text
karpathy, surgical edit, simplicity, success criteria, do not rewrite
```
