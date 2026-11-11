---
name: octocode-pr-review
description: >-
  Review a pull request or a local diff with a stated scope, a proof line for
  every finding, and a signed recommendation. Use when the task asks for a
  pull request review, a safe-to-merge read, or a review of the local diff.
---

# Pull request review with proof

**Skill Name:** `octocode-pr-review`
**Version:** 1.0.0
**Date:** 2026-11-11
**Status:** Active
**Category:** Developer Workflow
**Type:** Operational

## Attribution

The catalog path `packages/octocode-cli/skills/octocode-pr-review` on <https://github.com/bgauryy/octocode-mcp> returns 404 on `main` and on the tags that were checked (`v2.3.28`, `v5.0.0`, `6.3.0`, `7.0.0`, `8.0.0`, `9.1.1`). The MIT text that was read, and that this skill adapts, is the current review workflow in that repository:

- <https://github.com/bgauryy/octocode-mcp/blob/main/skills/octocode-research/references/workflow-pr-review.md>
- <https://github.com/bgauryy/octocode-mcp/blob/main/skills/octocode-research/references/workflow-pr-review-analysis.md>
- <https://github.com/bgauryy/octocode-mcp/blob/main/skills/octocode-research/references/workflow-pr-review-report.md>

Copyright (c) 2026 Guy Bary. License: MIT. The adaptation uses `git` and `gh` when the Octocode CLI is absent, signs the review, and keeps CircleCI as the check that counts.

## Where this file lives

Canonical text: this file. `skills/octocode-pr-review/SKILL.md` is a loader. `skills/octocode-pr-review/octocode-pr-review.skill.yml` is the vault machine config. Decision, 2026-11-11, recorded by TriageChief, same layout as `docs/skills/github-read-write-admin/SKILL.md`.

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

| Input | Mode |
| --- | --- |
| Pull request number or URL | Remote pull request |
| A file path and no pull request | That file, its direct imports, and one caller |
| The local diff | `git diff` and `git status` |

If the target is ambiguous, read both the open pull request for the branch and the local diff, and say which one you reviewed.

## Tools

Use `gh` and `git`. If an `octocode` binary is on `PATH`, you may use it for search. If it is missing, say coverage is reduced and continue. Do not invent the contents of a file you did not read. Do not guess a line.

Load `AGENTS.md` and any skill the task named. The owner's rule in the file you are reviewing wins over a generic review habit.

## Scope

Skip generated files, vendor trees, and a comment that only restyles a line. Mark each changed file HIGH (auth, data, API, money, permissions) or LOW (docs, copy). A diff over about 500 lines, or a diff that mixes a HIGH file with unrelated edits, gets called out as mixed before the findings.

For a pull request, read metadata, the changed files, open review comments, and the patches for HIGH files. For a small pull request, read every patch. Past roughly 2000 changed lines, stay on the HIGH files and say what you did not read.

```bash
FULL=midnghtsapphire/revvel-standards
gh pr diff NUMBER --repo "$FULL"
gh pr view NUMBER --repo "$FULL" --json headRefOid,isDraft,author,url
```

## Proof

Read the changed symbol and one caller before you say the caller is broken. Order the work: security, correctness, flow, structure, performance, errors. A finding needs a location. Empty of findings is allowed only after you name the query you ran and the files you opened.

```text
[SEC-1] title
Severity: HIGH
Confidence: confirmed
Location: path:line
Evidence: the line you read, and the caller
Impact: what breaks for a user or a contract
Fix: the smallest change
```

Do not label a finding `#1`. GitHub turns `#1` into an issue link. Use a prefix like `[SEC-1]`.

Confidence is `confirmed` or `likely`. Drop a `likely` finding you cannot tighten, and mention it as a limit. Do not delete code to erase a finding you changed your mind about.

Run the smallest test that covers the change. If you cannot run it, the recommendation stays `COMMENT`.

## Recommendation

| Word | When |
| --- | --- |
| COMMENT | No blocker you can prove, or the test was not run. |
| REQUEST_CHANGES | A HIGH finding, or CircleCI `lint-and-test` failed on this head SHA. |
| APPROVE | You are not the author, the task asked you to approve, the gates pass, and the test you ran passed. |

Post the recommendation with `gh pr review` and `signed_body`. The report lists the head SHA, the CircleCI result, the guidelines you loaded, and the findings in severity order.

Do not write a review markdown file into the repo unless the task asked for that file.

## What this skill does not do

It does not merge. It does not require the Octocode CLI. It does not treat a missing GitHub Actions run as a failed review or as a passing one.

## Trigger keywords

```text
review the pull request, safe to merge, review my diff, proof the finding
```
