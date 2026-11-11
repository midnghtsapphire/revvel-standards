---
name: tdd-workflow
description: >-
  Write a failing test, then the code that makes it pass, in the test runner
  the repo already uses. Use when adding a behavior or fixing a bug.
---

# Test-first workflow

**Skill Name:** `tdd-workflow`
**Version:** 1.0.0
**Date:** 2026-11-11
**Status:** Active
**Category:** Developer Workflow
**Type:** Operational

## Attribution

Adapted from the MIT skill at <https://github.com/cfrs2005/claude-init/tree/main/templates/.claude/skills/tdd-workflow>. Copyright (c) 2025 cfrs2005. License: MIT. The source is written in Chinese and targets Jest, Vitest, and Playwright. This adaptation is English, uses `node:test` because that is what this repo runs, and keeps the order: failing test, then code, then refactor.

## Where this file lives

Canonical text: this file. `skills/tdd-workflow/SKILL.md` is a loader. `skills/tdd-workflow/tdd-workflow.skill.yml` is the vault machine config. Decision, 2026-11-11, recorded by TriageChief, same layout as `docs/skills/github-read-write-admin/SKILL.md`.

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

You are adding a behavior or fixing a bug. The test lands in the same commit as the code. This repo's runner is `node:test` (`npm test`). A product that already has Jest, Vitest, or Playwright keeps that runner. Do not add a second runner.

## Order

1. One sentence: who does what, and what they can observe afterward.
2. A test that fails because the behavior is not there yet. Run it and keep the failure in the report.
3. The smallest code that makes that test pass. Add it beside the existing code. Do not replace the file.
4. Run the test again. It passes.
5. Refactor only the lines the test covers, then run it again.
6. The upstream skill asks for 80 percent coverage on lines, branches, functions, and statements for new product code that already has a coverage gate. This standards repo's gate is `npm test` green, plus the new test. Do not add a coverage tool the package does not have.

A bug fix starts from a test that reproduces the bug. The test fails on the parent commit and passes on yours.

## Shape

```js
'use strict';

const test = require('node:test');
const assert = require('node:assert');

test('rejects an empty title', () => {
  assert.throws(() => createItem({ title: '' }), /title/);
});
```

Test the result a caller sees. One test, one behavior. Each test builds its own inputs. Mock the network at the boundary. Do not mock the function you claim to test.

A selector in a browser test uses the role or the accessible name. A class name that is only styling will break when the style changes.

Do not skip a test to get a green run. A skipped test means this skill is not finished.

## Where the test file goes

Put it next to the existing tests. Root behavior goes in `tests/<name>.test.js`. A product keeps its current test directory. End-to-end coverage uses the product's existing browser runner. Do not add Playwright to a repo that does not already depend on it.

## CI

Run the test locally, then report CircleCI `lint-and-test` on the head SHA. That job is the signal that counts.

## What this skill does not do

It does not delete a test that is red. It does not rewrite unrelated tests to make a number move. It does not merge the pull request.

## Trigger keywords

```text
tdd, test first, failing test, reproduce the bug, node:test
```
