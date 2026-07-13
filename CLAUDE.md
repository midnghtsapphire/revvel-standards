# CLAUDE.md — Agent operating notes

This file is the fast-lookup reference for AI agents (Claude, OpenRouter,
OpenHands) working in this repository. Long-form standards live in
`standards/`; incident history lives in `learnings.md`; this file is the
30-second briefing.

## Prime directive

**$10k/month → $10M total in 3 years.** Every change should either directly
move revenue, unblock revenue, or protect the systems that produce revenue.
Docs and standards count when they prevent recurring outages that stall
revenue work.

## Where to look first

- **`standards/GREEN_MAIN_STANDARD.md`** — what "main is green" means and how
  we keep it that way.
- **`standards/AUDIT_AND_SELF_HEALING_PLAYBOOK.md`** — how to run an audit
  and the fix-pattern catalog for recurring bugs. **Read this before
  starting any audit or triage session.**
- **`learnings.md`** — chronological incident log. Grep it before assuming a
  problem is novel.

## Recurring gotchas

Short-form. Each entry links to depth in the playbook or `learnings.md`.

1. **Unguarded `removeLabel` races.** `octokit.issues.removeLabel` 404s if
   the label is already gone. Wrap in try/catch; swallow 404 only. See
   playbook catalog entry 1.

2. **Missing `allowError` on internal API helpers.** Cleanup paths shouldn't
   abort the workflow on non-fatal errors. Thread an `allowError` option
   through helpers; default `false`. See playbook catalog entry 2.

3. **Default `GITHUB_TOKEN` on agent-created PRs.** GitHub suppresses
   downstream workflow triggers for events caused by the default token. Use
   a PAT or GitHub App token for agent-authored PRs. See playbook catalog
   entry 3.

4. **Secrets via argv.** Never `tool --token=$SECRET`. Pipe via stdin or use
   an env var the tool reads directly. See playbook catalog entry 4.

5. **Bash bare-array-variable bug.** Always `"${arr[@]}"` — both the `[@]`
   and the double quotes. `"${arr}"` silently uses only element 0. See
   playbook catalog entry 5.

6. **Exit codes must reflect true resolution state.** A job exiting 0
   because "the last command succeeded" is not the same as the job actually
   resolving its problem. Track resolution state in an explicit variable and
   assert a positive outcome (file written, PR opened, label applied) before
   exiting 0. See playbook catalog entry 6.

7. **`nosemgrep` suppression comment adjacency.** The suppression must be on
   the line *immediately preceding* the flagged line (or trailing on the
   same line). Blank lines or intervening comments break it. Always include
   the specific rule id — never bare `# nosemgrep`. See playbook catalog
   entry 7.

## Before you open a PR

- `npm ci && npm test` locally. All 558+ tests must pass.
- Add a regression test that fails without your fix (for bug fixes).
- Conventional-commit PR title (`feat:`, `fix:`, `docs:`, `chore:`, ...).
- No hardcoded secrets. No `GITHUB_TOKEN` fallback for agent PR creation.
- If your PR is part of an audit, **watch its CI live** (`gh run watch`).
  Static findings are only half the audit — see playbook rule 6.

## When you fix a new recurrence

1. Add a catalog entry to `standards/AUDIT_AND_SELF_HEALING_PLAYBOOK.md`
   (Symptom / Root cause / Fix / Reference PR).
2. Add a chronological entry to `learnings.md`.
3. Add a one-line gotcha here in `CLAUDE.md` if agents will trip on it again
   within days.
