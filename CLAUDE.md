# CLAUDE.md — Agent Operating Notes

This file is the fast-lookup reference for agents (human or AI) working in
this repository. It is intentionally short. For the long form of the audit
method and the full fix-pattern catalog, see
[`standards/AUDIT_AND_SELF_HEALING_PLAYBOOK.md`](standards/AUDIT_AND_SELF_HEALING_PLAYBOOK.md).

## Prime directive

Main stays green. See `standards/GREEN_MAIN_STANDARD.md`.

## Recurring gotchas

These are the patterns that have bitten this repo more than once. When you
see the symptom, apply the fix — do not rediscover it.

1. **Unguarded `removeLabel` races.** Wrap `github.rest.issues.removeLabel`
   in `try/catch` and swallow 404. Two concurrent jobs will both try to
   remove the same label; the loser must not crash the workflow.
   (See playbook entry #1, PR #15821.)

2. **Missing `allowError` on internal API helpers.** Helpers that wrap
   `fetch`/`octokit` must expose an `allowError` (or `allowStatuses`)
   option so callers can distinguish expected misses from real failures.
   (See playbook entry #2, PR #15824.)

3. **Default `GITHUB_TOKEN` on agent-created PRs.** PRs opened with the
   default `GITHUB_TOKEN` do **not** trigger downstream workflows. Use a
   PAT or GitHub App installation token for any agent that opens PRs.
   (See playbook entry #3, PR #15823.)

4. **Secrets via argv.** Never pass secrets as CLI arguments — they leak
   into `ps`, logs, and crash dumps. Pipe on stdin or export as an env
   var the tool reads directly.
   (See playbook entry #4, PR #15825.)

5. **Bash bare-array variables.** `$arr` is *not* the array; it is
   `${arr[0]}`. Always use `"${arr[@]}"`. Enable `set -euo pipefail` and
   `shellcheck` where practical.
   (See playbook entry #5, PR #15827.)

6. **Exit codes must reflect true resolution state.** A script must exit
   0 only when the intended outcome is confirmed (tests passed, PR
   merged, label applied) — not merely when the process ran to
   completion. Add an explicit post-condition check before the final
   `exit 0`.
   (See playbook entry #6, PR #15826.)

7. **`nosemgrep` suppression comment adjacency.** A `# nosemgrep:
   <rule-id>` comment only suppresses the finding when it is on the
   same line as, or the line immediately preceding, the offending code —
   with no blank line between them. Always include the specific rule
   id; never use a bare `# nosemgrep`.
   (See playbook entry #7, PR #15825.)

## When you fix a new class of bug

1. Add a Symptom / Root Cause / Fix entry to the catalog in
   `standards/AUDIT_AND_SELF_HEALING_PLAYBOOK.md`, citing the PR.
2. If it belongs in the fast-lookup, add a one-line gotcha above.
3. Add a postmortem entry to `learnings.md` for chronological memory.

## Running an audit

See the "How to Run an Audit" section of the playbook. In brief:
parallel read-only agents by category, `file:line` citations required,
cross-reference `learnings.md`, **triage before fixing**, one fix per
isolated worktree, and watch live CI on your own in-flight PRs — not
just the static tree.
