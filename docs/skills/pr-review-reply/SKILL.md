---
name: pr-review-reply
description: >-
  Reply to GitHub pull request review comments and resolve the thread only
  after a signed reply. Use when a review thread needs an answer or a pointer
  at the commit that fixed it.
---

# Pull request review reply

**Skill Name:** `pr-review-reply`
**Version:** 1.0.0
**Date:** 2026-11-11
**Status:** Active
**Category:** Developer Workflow
**Type:** Operational

## Attribution

Adapted from the Apache-2.0 skill. Catalog URL <https://github.com/stacklok/toolhive/tree/main/.claude/skills/pr-review-reply> was removed on main in commit `a684b55` (2026-03-17), which folded it into `.claude/skills/pr-review`. The text that was read is the parent of that commit: <https://github.com/stacklok/toolhive/blob/324878c901be3c348ae9fe5b1c13c543c7ca0512/.claude/skills/pr-review-reply/SKILL.md>. Copyright 2025 Stacklok, Inc. License: Apache-2.0. The adaptation signs every reply, uses variables in GraphQL, and refuses to resolve a thread that is still open.

## Where this file lives

Canonical text: this file. `skills/pr-review-reply/SKILL.md` is a loader. `skills/pr-review-reply/pr-review-reply.skill.yml` is the vault machine config. Decision, 2026-11-11, recorded by TriageChief, same layout as `docs/skills/github-read-write-admin/SKILL.md`.

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

A pull request has review comments and the task asks you to answer them. When the request does not name a repository, use `midnghtsapphire/revvel-standards`.

## Procedure

Read the threads before you write.

```bash
FULL=midnghtsapphire/revvel-standards
OWNER=${FULL%%/*}
REPO=${FULL#*/}
gh pr view NUMBER --repo "$FULL" --json number,url,headRefOid,author,isDraft
gh api --paginate "repos/$FULL/pulls/NUMBER/comments" --jq '.[] | {id, path, line, user:.user.login, body}'
```

Thread ids and resolved state come from GraphQL. Keep the query fixed and pass names as variables. Set `OWNER` and `REPO` in the same shell as the query. An empty owner or name returns no threads.

```bash
FULL=midnghtsapphire/revvel-standards
OWNER=${FULL%%/*}
REPO=${FULL#*/}
gh api graphql --paginate -f owner="$OWNER" -f name="$REPO" -F number=NUMBER -f query='
query($owner:String!, $name:String!, $number:Int!, $endCursor:String) {
  repository(owner:$owner, name:$name) {
    pullRequest(number:$number) {
      reviewThreads(first:50, after:$endCursor) {
        pageInfo { hasNextPage endCursor }
        nodes { id isResolved comments(first:100) { pageInfo { hasNextPage endCursor } nodes { databaseId path body author { login } } } }
      }
    }
  }
}'
```

`gh api graphql --paginate` follows `pageInfo.endCursor` only when the query has `after:`. If a thread's own `comments.pageInfo.hasNextPage` is true, query that thread again with its comment cursor before you draft a reply. Do not treat the first page as the whole pull request.

Group what is unresolved. For each thread, say one of these:

- The fix is already on a SHA you name. Reply with that SHA, then resolve.
- The comment needs a code change. Describe the change. Do not resolve until that commit is on the head SHA.
- The comment is a question. Reply with the answer. Do not resolve until the task says the thread is done.

The reply body is `signed_body`. Show the text you are about to send when the task asked you to check first. Send the reply the task authorized.

```bash
gh api -X POST "repos/$FULL/pulls/NUMBER/comments/COMMENT_ID/replies" \
  -f body="$(signed_body "Fixed in SHA.")"
```

Resolve only after that reply exists. Resolving marks the thread resolved. The comment stays on the pull request.

```bash
gh api graphql -f threadId="$THREAD_ID" -f query='
mutation($threadId:ID!) {
  resolveReviewThread(input:{threadId:$threadId}) { thread { isResolved } }
}'
```

Do not resolve a thread that is still a discussion. Do not resolve a batch of threads with one generic sentence unless every one of them was fixed in the SHA you cite and the task said to reply to that set.

GitHub returns 422 when the pull request author account tries to `APPROVE`. Post a comment review and say so. Do not look for a second token.

## Report

List each thread URL, whether you replied, whether you resolved it, and what is still open. Include the head SHA you checked.

## What this skill does not do

It does not delete a review comment. It does not merge. It does not edit rulesets or permissions.

## Trigger keywords

```text
reply to review, resolve review thread, review comment, fixed in SHA
```
