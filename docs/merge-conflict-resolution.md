# Merge Conflict Resolution Guide

> Part of the **$10k → $10M in 3 years** operational playbook.

This document describes the canonical process for resolving merge conflicts,
code review comments, and reviewer feedback in this repository. It exists to
keep the build pipeline unblocked so revenue-generating features (Polar.sh
funding, OSINT tools, automated product pipeline) can ship continuously.

---

## 1. Priorities (in order)

1. **Revenue path first** — anything touching `polar/`, `funding/`, or the
   automated product pipeline is highest priority.
2. **Security & secrets** — never resolve a conflict by committing a secret,
   token, or private key. If in doubt, redact and open a follow-up issue.
3. **Tests must pass** — a resolved merge that breaks CI is not resolved.
4. **Reviewer comments** — every unresolved review thread must be either
   addressed with a commit or explicitly acknowledged with a reply.

---

## 2. Standard resolution workflow

```bash
# 1. Sync with the target branch
git fetch origin
git checkout <feature-branch>
git rebase origin/main        # prefer rebase for linear history

# 2. For each conflicted file
#    - Open the file
#    - Remove <<<<<<<, =======, >>>>>>> markers
#    - Keep the union of intent, not just one side
#    - Re-run local tests for that module

# 3. Continue the rebase
git add <resolved-files>
git rebase --continue

# 4. Push with lease (never force-push blindly)
git push --force-with-lease
```

If the branch is shared, prefer `git merge origin/main` instead of rebase to
avoid rewriting collaborators' history.

---

## 3. Handling reviewer bots and personas

The repository receives review comments from many automated reviewers. Treat
them as advisory unless they block CI:

| Reviewer | Blocking? | Action |
|---|---|---|
| `github-actions[bot]` | Yes when it reports CI failure | Fix the failing job |
| `dependabot[bot]` | No | Merge if tests pass, otherwise pin |
| `imgbot[bot]` | No | Accept optimized images |
| `circleci-app[bot]` | Yes on red build | Fix the failing step |
| `devin-ai-integration[bot]` | Advisory | Address or dismiss with reason |
| `openhands-agent` | Advisory | Address or dismiss with reason |
| `google-labs-jules[bot]` | Advisory | Address or dismiss with reason |
| `claude` / `codex` / `replit-agent` | Advisory | Address or dismiss with reason |
| Human reviewers | Yes | Must resolve every thread |

Rule of thumb: **CI-blocking bots > human reviewers > advisory AI reviewers.**

---

## 4. Preventing future merge issues

- Keep PRs small (< 400 lines changed where possible).
- Rebase daily while a PR is open.
- Enable auto-merge only after all required checks pass.
- Use `CODEOWNERS` so the right humans are pinged automatically.
- Prefer feature flags over long-lived branches.

---

## 5. Escalation

If a conflict cannot be resolved safely (e.g. two features touched the same
revenue-critical module in incompatible ways):

1. Open a tracking issue titled `merge-block: <area>`.
2. Freeze both PRs.
3. Assign to the module owner from `CODEOWNERS`.
4. Ship the higher-revenue-impact change first.

---

_Last updated as part of the merge-hygiene sweep referenced in issue #16144._
