---
name: multi-pr-review
description: >-
  Review one pull request in three passes (correctness, code health, and UX),
  confirm each finding against the diff, and post a signed summary. The
  verdict is advice. Merge gates still apply. Use when the task asks for a
  multi-angle pull request review.
---

# Multi-pass pull request review

**Skill Name:** `multi-pr-review`
**Version:** 1.0.0
**Date:** 2026-11-11
**Status:** Active
**Category:** Developer Workflow
**Type:** Operational

## Attribution

Adapted from the skill at <https://github.com/dyad-sh/dyad/tree/main/.claude/skills/multi-pr-review>. That path sits outside `src/pro/`. The repository LICENSE says content outside `src/pro/` is Apache-2.0. GitHub reports SPDX `NOASSERTION` because the same file points `src/pro/` at a separate license. Copyright (c) Dyad contributors. The adaptation signs comments, refuses a repo-root patch file, and does not treat the verdict as a merge.

## Where this file lives

Canonical text: this file. `skills/multi-pr-review/SKILL.md` is a loader. `skills/multi-pr-review/multi-pr-review.skill.yml` is the vault machine config. Decision, 2026-11-11, recorded by TriageChief, same layout as `docs/skills/github-read-write-admin/SKILL.md`.

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

The task asks for a review of one pull request from more than one angle. When the request does not name a repository, use `midnghtsapphire/revvel-standards`.

## Read the diff

Do not write the patch into the repository root. A root file is junk in this repo. Read the diff from `gh`.

```bash
FULL=midnghtsapphire/revvel-standards
gh pr view NUMBER --repo "$FULL" --json number,title,body,headRefOid,isDraft,author,url
gh pr diff NUMBER --repo "$FULL"
gh api --paginate "repos/$FULL/pulls/NUMBER/comments" --jq '.[] | {path, line, user:.user.login, body}'
HEAD_SHA=$(gh pr view NUMBER --repo "$FULL" --jq .headRefOid)
gh pr checks NUMBER --repo "$FULL" --required --json name,bucket,state,link
```

`gh pr checks` talks to GitHub. CircleCI `lint-and-test` on that same `HEAD_SHA` is the check that counts. Pending is not green.

## Three passes

Read the changed files in a different order on each pass so the first file does not dominate.

| Pass | Look for |
| --- | --- |
| Correctness | Bugs, broken edge cases, injection, missing error handling, a behavior the test does not cover. |
| Code health | Duplication, a branch that is too deep to follow, a comment that hides why, a new table or flag that nothing reads. |
| UX | Empty states, error text a person can act on, labels and contrast on a UI diff. |

Severity:

- HIGH: security hole, data loss, crash, or a broken behavior.
- MEDIUM: a logic miss, a real edge case, or a UX gap a person will hit.
- LOW: naming and polish.

Confirm a finding by reading the file at the line. A second pass agreeing is not proof. If you cannot show the line, leave the finding out of the comment and say why in the summary. Do not delete a source file to make a finding go away.

Skip a finding that matches an existing comment on the same path within three lines.

## Verdict

The verdict is advice. It does not merge the pull request.

| Verdict | When |
| --- | --- |
| YES | No HIGH finding, and CircleCI `lint-and-test` is green on this head SHA. |
| NOT SURE | MEDIUM findings remain, or the CircleCI check was not read. |
| NO | A HIGH finding remains, or CircleCI failed on this SHA. |

YES does not skip the merge gates. This skill does not merge.

## Post

One summary comment, signed:

```bash
gh pr comment NUMBER --repo "$FULL" --body "$(signed_body "Verdict: NOT SURE. Findings and the CircleCI result on HEAD_SHA.")"
```

HIGH and MEDIUM findings go in one review with `event` set to `COMMENT`. Build the JSON outside the repo. Do not commit it. The review body is signed. Each comment body starts with the bot name.

```bash
gh api -X POST "repos/$FULL/pulls/NUMBER/reviews" --input "$PAYLOAD"
```

Do not send `event` `APPROVE` when you are the author. GitHub returns 422. Do not send `APPROVE` unless the task asked for an approval and the merge gates pass.

## What this skill does not do

It does not approve its own pull request. It does not store the diff in the tree. It does not treat a GitHub Actions run as the CI result.

## Trigger keywords

```text
multi-pr review, review this pull request, correctness pass, code health, review verdict
```
