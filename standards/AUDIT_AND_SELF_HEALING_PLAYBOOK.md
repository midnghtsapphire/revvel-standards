# Audit and Self-Healing Playbook

**Status:** Active
**Last updated:** 2026-07-13
**Case evidence:** Formalizes the audit-and-fix session of 2026-07-13, in which
parallel read-only research agents surfaced eight distinct bug patterns across
CI workflows and agent scripts, each subsequently fixed in an isolated
worktree PR (#15821-#15828).

This playbook exists so the next agent (human or AI) does not have to
rediscover either the audit methodology or the recurring fix patterns from
scratch. `learnings.md` captures individual incidents after the fact; this
document captures the **repeatable method** for finding them and the
**fast-lookup catalog** for fixing them.

---

## How to Run an Audit

1. **Scope into parallel read-only research agents by category.**
   Do not run one monolithic "audit everything" pass. Split by concern —
   e.g. "CI workflows", "agent scripts", "secret handling", "label
   lifecycle", "exit-code semantics" — and dispatch each as an independent
   read-only agent. Parallelism keeps each context small and each finding
   traceable to a single reviewer.

2. **Demand `file:line` citations for every finding.**
   A finding without a citation is a rumor. Every reported issue must point
   at a specific path and line range; otherwise the triage step below
   cannot proceed and the fix agent cannot work in isolation.

3. **Cross-reference `learnings.md` for recurrence.**
   Before filing a finding as novel, grep `learnings.md` and this catalog.
   Recurrence upgrades severity and usually indicates that a prior fix was
   local rather than systemic.

4. **Triage before fixing.** Not every finding becomes an immediate PR.
   Classify each as: (a) fix now in an isolated worktree, (b) file a
   tracking issue, or (c) accept and document. Triage prevents the audit
   from ballooning into an unreviewable mega-PR.

5. **One fix per isolated worktree subagent.**
   Each accepted finding gets its own worktree, its own branch, and its own
   PR. The subagent runs `npm ci && npm test` plus a targeted regression
   test that would have caught the original bug. No bundling.

6. **Watch live CI on your own in-flight PRs.**
   Static findings are only half the audit. The broken third-party Action
   in `saml-sso-registration.yml` (#15828) was not visible in the source
   tree — it was only visible as a red check on the audit's own PRs. Keep
   `gh pr checks --watch` running on every in-flight PR the audit opens.

7. **Targeted search, not enumeration, for stale commitments.**
   To find abandoned "follow-up" or "Next Action" promises in issue/PR
   history, search for the specific phrases (`"Next Action"`,
   `"follow-up"`, `"TODO("`, `"will address in"`) rather than paging
   through every closed issue. Enumeration wastes context; targeted search
   finds the debt.

---

## Self-Healing Correction Pattern Catalog

Each entry is Symptom / Root Cause / Fix, with the PR that first applied
the fix. When you see the symptom, apply the fix directly.

### 1. Unguarded `removeLabel` race (PR #15821)

- **Symptom:** Workflow fails intermittently with `HttpError: Label does
  not exist` when trying to remove a label that another job already
  removed.
- **Root cause:** `github.rest.issues.removeLabel` throws on 404; two
  jobs racing to clean up the same label both call it, and the loser
  crashes the workflow.
- **Fix:** Wrap in `try { ... } catch (e) { if (e.status !== 404) throw
  e; }`, or check label presence first via `listLabelsOnIssue`. Never
  call `removeLabel` unguarded from a workflow that can run
  concurrently.

### 2. Missing `allowError` on internal API helpers (PR #15824)

- **Symptom:** A recoverable 404/409 from an internal helper aborts the
  entire workflow instead of being handled by the caller.
- **Root cause:** The helper wraps `fetch`/`octokit` and throws on any
  non-2xx, giving the caller no way to distinguish "expected miss" from
  "real failure".
- **Fix:** Add an `allowError` (or `allowStatuses: number[]`) option to
  the helper. Callers opt in per call-site; default remains throw-on-
  error so the change is backward compatible.

### 3. Default `GITHUB_TOKEN` on agent-created PRs (PR #15823)

- **Symptom:** Agent-created PRs do not trigger downstream workflows
  (CI, labelers, review bots).
- **Root cause:** GitHub deliberately suppresses workflow triggers from
  events created with the default `GITHUB_TOKEN` to prevent recursion.
- **Fix:** Create agent PRs with a dedicated PAT or GitHub App
  installation token, not the default `GITHUB_TOKEN`. Store the token
  as an org- or repo-level secret and reference it explicitly in the
  `gh pr create` / `peter-evans/create-pull-request` step.

### 4. Secrets via argv vs. stdin (PR #15825)

- **Symptom:** Secret values appear in `ps` output, workflow logs, or
  crash dumps.
- **Root cause:** The secret was passed as a CLI argument
  (`tool --token $SECRET`) instead of on stdin or via an environment
  variable that the tool reads directly.
- **Fix:** Pipe the secret on stdin (`echo "$SECRET" | tool --token-
  stdin`) or export it as an env var the tool reads (`GH_TOKEN=$SECRET
  gh ...`). Never place a secret in argv.

### 5. Bash bare-array-variable bug (PR #15827)

- **Symptom:** A bash script that appears to iterate over an array
  actually only sees the first element, or silently does nothing.
- **Root cause:** Referencing a bash array as `$arr` yields only
  `${arr[0]}`. Correct expansion is `"${arr[@]}"` (quoted, with `[@]`).
- **Fix:** Always use `"${arr[@]}"` for iteration and `"${#arr[@]}"`
  for length. Enable `set -euo pipefail` and, where practical,
  `shellcheck` in CI to catch this class of bug automatically.

### 6. Exit codes as proxy metrics vs. true resolution state (PR #15826)

- **Symptom:** A workflow reports success (exit 0) even when the
  underlying task did not actually resolve — e.g. "agent ran to
  completion" is treated as "issue fixed".
- **Root cause:** The script exits 0 whenever the *invocation* succeeds,
  conflating "the process didn't crash" with "the intended outcome was
  achieved".
- **Fix:** Exit 0 **only** when the true resolution state is confirmed
  (tests pass, PR merged, label applied, artifact present). Otherwise
  exit non-zero and let the caller decide. Add an explicit
  post-condition check before the final `exit 0`.

### 7. `nosemgrep` suppression comment adjacency (PR #15825)

- **Symptom:** A `# nosemgrep: <rule-id>` comment does not actually
  suppress the finding; Semgrep still reports the rule.
- **Root cause:** The suppression comment must be on the **same line**
  as, or the line **immediately preceding**, the offending code — with
  no blank line between them. A blank line or an intervening comment
  breaks adjacency and the suppression silently no-ops.

  Reference: see the PR referenced above for the exact reworded
  example.
- **Fix:** Place `# nosemgrep: <rule-id>` on the line immediately above
  the flagged line, with no blank line in between, and include the
  specific rule id (never a bare `# nosemgrep`).

### 8. Broken third-party GitHub Action failing every PR (PR #15828)

- **Symptom:** Every PR shows a red check from a workflow no one
  recently touched (in this case `saml-sso-registration.yml`).
- **Root cause:** A third-party Action pinned by tag was force-pushed
  or yanked upstream, or its runtime (e.g. `node12`) was removed by
  GitHub. The workflow file is unchanged; the dependency broke under
  it.
- **Fix:** Pin third-party Actions by full commit SHA, not by tag or
  branch. When a break is detected, either bump to a known-good SHA of
  a maintained fork, or remove the workflow if it is no longer needed.
  Add a monthly Dependabot config for `github-actions` so upstream
  breakage surfaces as a PR instead of as red main.

---

## Where the memory lives

- **`learnings.md`** — per-incident postmortems, chronological.
- **`standards/AUDIT_AND_SELF_HEALING_PLAYBOOK.md`** (this file) —
  the repeatable audit method and the fix-pattern catalog.
- **`standards/GREEN_MAIN_STANDARD.md`** — the invariant this playbook
  defends: main stays green.
- **`CLAUDE.md`** — "Recurring gotchas" quick-reference, which points
  here for the long form.

When you fix a new class of bug, add a numbered entry to the catalog
above in the same Symptom / Root Cause / Fix shape, cite the PR, and
(if it belongs in the fast-lookup) add a one-line gotcha to `CLAUDE.md`.
