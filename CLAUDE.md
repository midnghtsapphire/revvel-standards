# CLAUDE.md — Agent Operating Notes

This file is the short-form checklist the agent reads on every task. Long-form
methodology lives in `standards/`. If this file and a document in `standards/`
disagree, the standards document wins and this file gets updated.

## Prime directive

Start at $10k/month → scale to $10M total by year 3. Every change should
defensibly serve one of: POLAR.SH funding surface, OSINT tooling, or the
automated product pipeline. If a change serves none of those, justify it in
the PR body or don't ship it.

## Before you start a task

1. Read the issue and any linked issues/PRs end-to-end.
2. Skim `learnings.md` for the same symptom or file path.
3. Skim `standards/GREEN_MAIN_STANDARD.md` for the outcome contract.
4. Skim `standards/AUDIT_AND_SELF_HEALING_PLAYBOOK.md` if the task is an
   audit, a recurring bug, or a self-healing / CI-repair task — the
   fix-pattern catalog there is a lookup table, not a read-through.
5. Only then plan the edit.

## Recurring gotchas

Each entry is a pattern that has bitten us at least twice. See
`standards/AUDIT_AND_SELF_HEALING_PLAYBOOK.md` for the full fix-pattern
catalog with PR citations.

1. **`removeLabel` is not idempotent.** Wrap in try/catch that swallows 404,
   or check with `listLabelsOnIssue` first. Two workflows removing the same
   label will race.
2. **Bare Octokit calls in workflow scripts.** Route through the shared
   `withRetry({ allowError: [...] })` helper. "Best-effort" helpers that
   forward raw calls abort the job on transient 5xx.
3. **Default `GITHUB_TOKEN` does not trigger downstream workflows.**
   Agent-authored PRs need an app-installation token or a fine-scoped PAT
   (`secrets.AGENT_PR_TOKEN`). Otherwise checks never start.
4. **Secrets belong on stdin, never in argv.** `tool --token $SECRET` leaks
   into `ps` and `/proc`. Use `--token-stdin` or `--token-file /dev/stdin`.
5. **Quote bash array expansions.** `for x in $ARR` silently iterates only
   the first element. Always `"${ARR[@]}"`. Run `shellcheck` — SC2128 catches
   this.
6. **Exit codes must reflect true resolution state, not process
   completion.** `exit 0` should mean "the postcondition holds" (empty
   findings, closed issue, green diff), not "the tool finished running."
   Wrap tools and re-exit non-zero when the outcome is not met. Assert, do
   not comment.
7. **`nosemgrep` suppression comments must be adjacent.** The `# nosemgrep:
   rule-id` comment has to be on the same line as the flagged expression, or
   on the line immediately above with no blank line between. Anything else
   is silently ignored. Always include the rule-id so the suppression is
   narrow and auditable.
8. **Pin third-party GitHub Actions to a full commit SHA.** Floating tags
   (`@v3`, `@main`) break every PR when upstream ships a breaking change or
   archives the repo. Add Dependabot for `github-actions`.

## Found a bug? Open a PR for it — even if it isn't yours

Any defect you find while doing something else gets its own PR. Do not leave
it in a comment, a summary, or a follow-up list where it dies with the
session. Three regressions reached `main` in a single day because the thing
that would have caught them was known and unfixed.

**If the fix must land before the work you are currently doing, mark it as a
blocker:**

1. Keep the conventional-commit type first, then the marker:
   `fix(ci): 🔴 BLOCKER — <what is broken>`. The type must lead so the title
   still satisfies the conventional-commit rule below; the emoji cannot lead,
   because that rule and this one would otherwise contradict each other.
   GitHub renders no colour in titles, so the emoji plus the label is the
   strongest signal the platform actually supports.
2. Apply `priority:p0` — the canonical name in `config/labels-allowlist.yml`.
   (`priority-p0` is an accepted alias there, but prefer the canonical form.
   Note neither is currently defined in `.github/labels.yml`, the source
   `sync-labels.yml` syncs from, so a sync could drop it; adding the priority
   axis to that file is worth doing separately.)
3. Open the body with a **Blocks:** list naming what is waiting on it, by PR
   number or by description if the dependent work is not opened yet.
4. Say plainly in one line why it must go first.

The dependent PR then references the blocker in its own body, as
`Blocked by: #N`, so the ordering survives in both directions and does not
depend on anyone remembering a conversation.

Ordinary (non-blocking) bug PRs need none of that — just open them, one fix
per PR, with a regression test.

## Green-main rules (short form)

- Every fix ships with a regression test that would have caught the
  original symptom.
- One fix per PR / per worktree. No drive-by refactors in a bugfix PR.
- `npm ci && npm test` must pass locally before pushing.
- Watch live CI on your own in-flight PRs; static review is only half of it.
- PR titles use conventional commits (`feat:`, `fix:`, `docs:`, `chore:`).
- Close the source issue via `Closes #N` in the PR body.

## Where the memory lives

- **`CLAUDE.md`** (this file) — short-form checklist, read every task.
- **`learnings.md`** — one incident per entry, append-only.
- **`standards/GREEN_MAIN_STANDARD.md`** — outcome contract for main.
- **`standards/AUDIT_AND_SELF_HEALING_PLAYBOOK.md`** — audit methodology
  and fix-pattern catalog with PR citations.
