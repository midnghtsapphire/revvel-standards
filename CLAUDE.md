# CLAUDE.md — Agent operating guide

This file is the fast-lookup operating guide for any Claude / Codex / OpenHands
agent working in this repository. It is intentionally short. Deep procedural
detail lives in `standards/`.

---

## Prime directive

**Ship revenue-producing work. Keep `main` green. Do not leak secrets.**

Everything below is in service of those three, in that order.

---

## Before you start

1. Read the issue / WR carefully. If scope is ambiguous, ask before coding.
2. Skim `standards/GREEN_MAIN_STANDARD.md` — the non-negotiable CI contract.
3. Skim `standards/AUDIT_AND_SELF_HEALING_PLAYBOOK.md` — the repeatable audit
   method and the fix-pattern catalog for known recurring bugs. If your task
   is an audit or a self-healing fix, this is your primary reference.
4. Grep `learnings.md` for keywords from the symptom you're about to fix. If
   we've seen it before, reuse the documented fix.

---

## Recurring gotchas

These are the top patterns that have burned us more than once. The full
catalog with reference PRs lives in
`standards/AUDIT_AND_SELF_HEALING_PLAYBOOK.md` — this list is just the
hot-lookup.

1. **Unguarded `removeLabel` calls race.** Wrap in try/catch and add a
   `concurrency:` block to the workflow. (PR #15821)
2. **Internal API helpers need an explicit `allowError` option.** A 4xx
   should not abort the workflow when the caller expects to branch on
   failure. (PR #15824)
3. **Default `GITHUB_TOKEN` on agent-created PRs does not trigger
   downstream workflows.** Use a dedicated PAT / GitHub App token stored as
   a secret. Never in argv. (PR #15823)
4. **Secrets go on stdin, never argv.** `echo "$SECRET" | tool
   --token-stdin`, not `tool --token=$SECRET`. argv is visible in `ps` and
   often echoed on failure. (PR #15825)
5. **Bash arrays: always `"${arr[@]}"`.** `"$arr"` silently gives you
   element 0 only. Run scripts under `set -euo pipefail`. (PR #15827)
6. **Exit codes must reflect true resolution state, not tool liveness.**
   After the tool runs, re-query the source of truth (issue state, merge
   status, label presence) and exit non-zero if the desired end state is
   not observed. "The command exited 0" is not the same as "the outcome
   happened." (PR #15826)
7. **`nosemgrep` suppression comments must be adjacent to the finding.**
   Same line as the offending code (preferred), or the line immediately
   above with no blank line between. Always name the rule id
   (`# nosemgrep: rule-id`), never a bare `# nosemgrep`. (PR #15825)

When you hit a *new* recurring gotcha (≥2 incidents), add it here **and**
add a Symptom/Root Cause/Fix entry to the playbook catalog.

---

## Working style

- One PR = one concern. If you find a second bug mid-fix, open a second
  issue; do not expand scope.
- Every fix ships with a regression test where feasible.
- Every fix PR appends an entry to `learnings.md`.
- Conventional-commit PR titles (`feat:`, `fix:`, `docs:`, `chore:`, etc.).
- Never commit secrets. Never echo secrets. Never put secrets in argv.

---

## Where the memory lives

- `standards/GREEN_MAIN_STANDARD.md` — the CI contract.
- `standards/AUDIT_AND_SELF_HEALING_PLAYBOOK.md` — audit method +
  fix-pattern catalog.
- `learnings.md` — chronological incident log.
- `CLAUDE.md` (this file) — hot-lookup gotchas + working style.
