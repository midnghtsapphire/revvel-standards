# Merge Conflict Resolution Guide

> Part of the **$10k → $10M in 3 years** operational playbook.

This document is the **hands-on operator companion** to
[`docs/CONFLICT_RESOLUTION_STANDARD.md`](./CONFLICT_RESOLUTION_STANDARD.md),
which remains the authoritative standard for *how conflicts are routed*. That
standard owns the three-lane ladder (mechanical → semantic → human); this guide
only covers the manual steps a human or agent runs once a conflict has reached
the human lane, plus the reviewer-feedback etiquette around it. It exists to
keep the build pipeline unblocked so revenue-generating features (Polar.sh
funding, OSINT tools, automated product pipeline) can ship continuously.

> Cross-refs:
> [`docs/CONFLICT_RESOLUTION_STANDARD.md`](./CONFLICT_RESOLUTION_STANDARD.md)
> (authoritative three-lane ladder) ·
> [`docs/MERGE_AND_OVERRIDE_POLICY.md`](./MERGE_AND_OVERRIDE_POLICY.md)
> (when a merge may be overridden) ·
> [`standards/SUGGESTION_HANDLING_STANDARD.md`](../standards/SUGGESTION_HANDLING_STANDARD.md)
> (suggestions are advisory, never blocking) ·
> `.github/workflows/conflict-helper.yml` (the runner) ·
> `scripts/auto-resolve-mechanical-conflicts.js` (the deterministic engine).

---

## 1. Priorities (in order)

1. **Revenue path first** — anything touching `polar/`, `funding/`, or the
   automated product pipeline is highest priority.
2. **Security & secrets** — never resolve a conflict by committing a secret,
   token, or private key. If in doubt, redact and open a follow-up issue.
3. **Tests must pass** — a resolved merge that breaks CI is not resolved.
4. **Reviewer comments** — advisory input, never a gate. Reply or fix as time
   allows; an unanswered thread never blocks a merge
   (see `standards/SUGGESTION_HANDLING_STANDARD.md`).

---

## 2. Standard resolution workflow (human lane only)

Before doing anything manually, confirm the conflict actually reached the human
lane: `conflict-helper.yml` runs the mechanical auto-resolver on every
conflicted PR, and Jules handles semantic conflicts. Only conflicts labelled
`conflicts:needs-human` are yours to resolve by hand.

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

The repository receives review comments from many automated reviewers. Per
`standards/SUGGESTION_HANDLING_STANDARD.md`, **no review comment from any
source — bot, agent, or human, including the repository owner — may block a
workflow, PR, or merge gate.** Only a red required check blocks:

| Reviewer | Blocks merge? | Action |
|---|---|---|
| `github-actions[bot]` (red required check) | Yes — the *check* blocks, not the comment | Fix the failing job |
| `circleci-app[bot]` (red required check) | Yes — the *check* blocks, not the comment | Fix the failing step |
| `dependabot[bot]` | No | Merge if tests pass, otherwise pin |
| `imgbot[bot]` | No | Accept optimized images |
| `devin-ai-integration[bot]` | No — advisory | Address or dismiss with reason |
| `openhands-agent` | No — advisory | Address or dismiss with reason |
| `google-labs-jules[bot]` | No — advisory | Address or dismiss with reason |
| `claude` / `codex` / `replit-agent` | No — advisory | Address or dismiss with reason |
| Human reviewers (incl. @midnghtsapphire) | No — advisory | Prioritize highly, reply or rewrite; never gate on it |

Rule of thumb: **red required checks are the only gate; every comment —
human or bot — is advisory input, with human comments prioritized first.**

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

*Added for issue #16168 as part of the merge-hygiene sweep.*
