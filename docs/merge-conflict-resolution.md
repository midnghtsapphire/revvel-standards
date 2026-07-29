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
