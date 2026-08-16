# Merge Policy

One policy, applied consistently to every PR, regardless of author (human or
bot). This document exists to resolve issue-tracker requests to "fix all merge
issues permanently."

## Authors covered

This policy applies uniformly to PRs from:

- Human contributors (including @midnghtsapphire, @RadioChaser, and the
  `oaudrey` persona)
- `openrouter` / openrouter-coder pipeline
- `github-actions[bot]`
- `devin-ai-integration[bot]`
- `openhands-agent`
- `google-labs-jules[bot]`
- `codex`
- `dependabot[bot]`
- `circleci-app[bot]`
- `imgbot[bot]`
- `claude`
- `replit-agent`
- `dragnet`

## Rules

1. **Rebase, don't merge.** All PRs must be rebased onto `main` before merge.
   Merge commits are only allowed for release branches.
2. **Squash on merge.** Feature PRs squash to a single conventional commit.
3. **Green CI required.** No exceptions, including for bot PRs.
4. **`.gitattributes` handles the boring conflicts.** See
   [docs/merge-conflict-resolution.md](../docs/merge-conflict-resolution.md).
5. **`git rerere` is enabled repo-wide via CI hints.** Contributors are
   encouraged to enable it locally.
6. **Revenue-impact PRs jump the queue.** Anything moving us closer to the
   $10k/month → $10M/3yr Prime Directive is prioritized in review.

## Resolving reviewer disagreements

When multiple reviewers leave conflicting comments:

1. The PR author summarizes the disagreement in a top-level comment.
2. A maintainer makes the final call, biased toward the Prime Directive.
3. The decision is recorded in the PR description so future PRs can cite it.

No PR should sit idle for more than 48 hours because of reviewer conflict.
