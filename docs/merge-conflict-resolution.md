# Merge Conflict Resolution Guide

**Prime Directive:** $10k/month → $10M in 3 years. Every merge conflict blocking a
revenue-generating PR is a direct threat to the timeline. Resolve fast, resolve
permanently.

## Automated Resolution Policy

This repository uses an automated merge-conflict resolution strategy to keep the
revenue pipeline unblocked. The policy is:

1. **`main` is the source of truth.** All long-running branches must rebase onto
   `main` at least once per day.
2. **Union merge for append-only files.** Changelogs, TODO lists, and generated
   manifests use `merge=union` via `.gitattributes` so parallel additions never
   conflict.
3. **Ours-strategy for lockfiles.** `package-lock.json`, `poetry.lock`, and
   `Cargo.lock` are regenerated post-merge rather than hand-merged.
4. **Bot PRs auto-rebase.** Dependabot, imgbot, circleci-app, and other bot PRs
   are configured to rebase automatically on the target branch.

## Reviewer Comment Triage

When multiple reviewers (@midnghtsapphire, openrouter, github-actions,
devin-ai-integration, openhands-agent, google-labs-jules, codex, dependabot,
circleci-app, imgbot, claude, replit-agent, RadioChaser, dragnet) leave comments
on the same PR:

1. Group comments by file and by concern (style, correctness, security,
   revenue-impact).
2. Address **revenue-impact** and **security** first. Everything else can ship
   in a follow-up.
3. Mark resolved threads immediately after pushing the fix commit.
4. If two reviewers disagree, the reviewer whose feedback aligns with the Prime
   Directive wins. Document the decision in the PR description.

## Permanent Fix Checklist

- [ ] Rebase branch onto latest `main`.
- [ ] Run `git rerere` so the resolution is remembered for future rebases.
- [ ] Ensure `.gitattributes` covers any newly-added append-only files.
- [ ] Squash fixup commits before merging.
- [ ] Confirm CI is green on the rebased branch, not just the pre-rebase HEAD.
- [ ] Verify no reviewer thread is left unresolved.

## Enabling `git rerere` locally

```bash
git config --global rerere.enabled true
git config --global rerere.autoupdate true
```

This makes conflict resolutions persistent across rebases, which is the
"permanent fix" requested in issue tracking.
