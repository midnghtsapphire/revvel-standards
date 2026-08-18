# Permanent Merge Conflict Resolution Policy

## Mission Alignment

This document supports the PRIME DIRECTIVE: **$10k/month → $10M in 3 years**.
Merge conflicts block revenue. This policy eliminates them permanently.

## The 20 Common Merge Error Classes

1. **Whitespace / EOL conflicts** — enforced via `.gitattributes` (`* text=auto eol=lf`).
2. **Trailing newline conflicts** — enforced via `.editorconfig` (`insert_final_newline = true`).
3. **Mixed tabs/spaces** — enforced via `.editorconfig` (`indent_style = space`).
4. **Generated file drift** (lockfiles, build artifacts) — marked `merge=ours` in `.gitattributes`.
5. **Binary file conflicts** — marked `binary` in `.gitattributes`.
6. **Markdown table conflicts** — union merge (`merge=union`).
7. **CHANGELOG.md conflicts** — union merge.
8. **Concurrent dependabot updates** — grouped updates (see `.github/dependabot.yml`).
9. **Stale branch conflicts** — auto-rebase enabled via merge queue.
10. **Divergent history** — `pull.rebase = true` recommended.
11. **Case-sensitivity conflicts** — `core.ignorecase = false`.
12. **CRLF/LF conflicts on Windows** — normalized via `.gitattributes`.
13. **Submodule pointer conflicts** — pinned via CI check.
14. **Package manager lockfile races** — regenerated on merge.
15. **Auto-generated docs conflicts** — regenerated post-merge.
16. **Reformatting conflicts** — pre-commit formatters enforced.
17. **Import ordering conflicts** — deterministic sort in CI.
18. **Multiple bots pushing simultaneously** — serialized via merge queue.
19. **Rebase vs merge inconsistency** — squash-merge default.
20. **Force-push overwrites** — protected branches, no force-push to `main`.

## Reviewer Coordination

When multiple bots and reviewers touch the same PR (`@openrouter`, `@github-actions[bot]`,
`@devin-ai-integration[bot]`, `@openhands-agent`, `@google-labs-jules[bot]`, `@codex`,
`@dependabot[bot]`, `@circleci-app[bot]`, `@imgbot[bot]`, `@claude`, `@replit-agent`,
`@RadioChaser`, `/dragnet`, `@midnghtsapphire`), the merge queue serializes writes so that
no two bots race on the same file.

## Enforcement

- `.gitattributes` normalizes text handling.
- `.editorconfig` enforces consistent style across editors.
- Merge queue (GitHub setting) required for `main`.
- Squash-merge is the default strategy.

## Revenue Impact

Every hour lost to merge conflicts is an hour not spent shipping Polar.sh funding
integrations and OSINT tooling. This policy protects the $10M trajectory.
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

The repository receives comments from automated and human reviewers. This guide
does not change GitHub branch protections, required checks, or required-review
rules. Always follow whatever gates are configured on the target branch.

Practical operator rule:

- Fix any red required check.
- Treat review comments as input to evaluate and address.
- Prioritize security and correctness concerns first.

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
