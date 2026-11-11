---
name: agentic-eval
description: >-
  Evaluate an agent output against a named bar and revise the failing parts,
  at most three times. Model calls go through the local LLM gate. Use when a
  report, a code change, or a generated answer has to meet a rubric or a test.
---

# Agentic evaluation

**Skill Name:** `agentic-eval`
**Version:** 1.0.0
**Date:** 2026-11-11
**Status:** Active
**Category:** Developer Workflow
**Type:** Operational

## Attribution

Adapted from the MIT skill at <https://github.com/github/awesome-copilot/tree/main/skills/agentic-eval>. Copyright GitHub, Inc. License: MIT. The adaptation keeps the generate, evaluate, and refine loop, routes model calls through `scripts/local_llm.py`, and uses the test command as the evaluator for code.

## Where this file lives

Canonical text: this file. `skills/agentic-eval/SKILL.md` is a loader. `skills/agentic-eval/agentic-eval.skill.yml` is the vault machine config. Decision, 2026-11-11, recorded by TriageChief, same layout as `docs/skills/github-read-write-admin/SKILL.md`.

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

The output has a bar you can name: a test, a rubric, or a schema. One-shot answers that have no bar do not enter this loop.

## The loop

Cap the loop at three passes. Stop earlier when every criterion passes, or when the score is not higher than the previous pass.

1. Generate the output.
2. Evaluate. Each criterion is `PASS` or `FAIL` plus one sentence, as JSON.
3. If every criterion is `PASS`, stop and ship that output.
4. If the score did not rise, stop and report the last output with the failing sentences.
5. Change only the failing parts. Append a line to the note: pass number, score, what changed. Do not delete an earlier pass from that note.

A second model may judge prose when the task asks for a rubric. The judge returns JSON:

```json
{"overall_score": 0.0, "dimensions": {"accuracy": 0.0, "completeness": 0.0}}
```

The default threshold is 0.8 unless the task names another number. Weights belong in the task. If the task did not give weights, treat the criteria as equal.

For code, the evaluator is the test command, not another model. Write the test, run it, and fix from the failure text. Three runs, then stop and report the last failure.

## Model calls

Do not call a provider URL from this skill. Python goes through `scripts/local_llm.py`:

```python
import sys
sys.path.insert(0, "scripts")
import local_llm

result = local_llm.complete(prompt, allow_cloud=False)
```

`allow_cloud=False` keeps this call on the local lane even if the environment would allow a paid call. A caller may narrow the gate. Nothing in this skill widens it. The paid lane runs only when `REVVEL_LLM_ALLOW_CLOUD` is exactly `1` and the call site has opened the gate on purpose. JavaScript uses `assertCloudAllowed` in `scripts/llm-spend-gate.js` before any paid call.

If nothing local answers, `python3 scripts/local_llm.py doctor` says so. Record `result.lane` in the note. Do not paste a prompt or a completion that contains a secret.

## What this skill does not do

It does not loop without a cap. It does not merge, and it does not approve your own pull request. A green rubric is not the CircleCI check. Report `lint-and-test` on the head SHA separately.

## Trigger keywords

```text
agentic eval, rubric, self-check loop, evaluator, refine until the test passes
```
