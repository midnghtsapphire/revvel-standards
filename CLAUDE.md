# CLAUDE.md

Fast-path guidance for Claude (and other AI coding agents) working in this
repository. Read this **first**, then the standards documents it points to.

## Prime directive

$10k/month → $10M total in 3 years. Every change should either (a) directly
move revenue, (b) protect the systems that produce revenue (green `main`,
working CI, no leaked secrets), or (c) reduce the cost of future changes
(docs, standards, self-healing playbooks).

## Read these before you edit

- `standards/GREEN_MAIN_STANDARD.md` — `main` stays green. Non-negotiable.
- `standards/AUDIT_AND_SELF_HEALING_PLAYBOOK.md` — **how to run an audit**
  and **the fix-pattern catalog** for recurring bugs. If your task is
  "audit," "clean up," "self-heal," or "why is CI broken," start here.
- `learnings.md` — incident log. Grep it before assuming a finding is novel.

## Recurring gotchas

These are the ones that keep coming back. See
`standards/AUDIT_AND_SELF_HEALING_PLAYBOOK.md` for the full pattern catalog
with PR citations.

1. **`removeLabel` throws 404.** Wrap `github.rest.issues.removeLabel` in
   `try/catch` and swallow `error.status === 404`. Label-already-absent is
   the desired end state, not a failure.
2. **Internal API helpers need `allowError`.** Every helper that wraps a
   GitHub API call must accept an `allowError` / `allowedStatuses` option so
   callers can opt into tolerating expected non-2xx responses.
3. **Default `GITHUB_TOKEN` won't trigger downstream workflows on
   agent-created PRs.** Use a PAT or GitHub App token when the PR must run
   required checks or auto-merge.
4. **Secrets go over stdin, not argv.** `echo "$SECRET" | tool
   --token-stdin`, never `tool --token "$SECRET"`. Argv leaks to `ps`, to
   shell history, and to logs when `set -x` is on.
5. **Bash arrays: `"${arr[@]}"`, never bare `"$arr"`.** Bare expansion
   silently gives you only element 0. Run `shellcheck` in CI.
6. **Exit codes must reflect true resolution state, not mere completion.**
   Exit 0 means "the target condition is achieved," not "the script ran to
   the end." Re-check the target state before exiting and return non-zero
   if it isn't resolved. Otherwise dashboards go green while reality stays
   broken.
7. **`nosemgrep` suppression comments must be immediately adjacent.**
   `# nosemgrep: rule-id` only suppresses the same line or the line
   directly above with no blank line between. A gap breaks the
   association. Always name the rule ID — bare `# nosemgrep` is
   over-broad.

## When you finish

- Run `npm ci && npm test` (or the repo's documented equivalent) before
  opening a PR.
- Add a regression test for any bug you fix.
- If the bug matches a pattern in the self-healing catalog, cite the
  catalog entry in your PR description. If it's a new pattern that has
  recurred, promote it into the catalog in the same PR.
- Use conventional-commit PR titles (`feat:`, `fix:`, `docs:`, `chore:`,
  etc.).
