# Audit and Self-Healing Playbook

**Status:** Active reference (2026-07-13)
**Case evidence:** Formalizes the audit-and-fix session that produced PRs
#15821, #15823, #15824, #15825, #15826, #15827, and #15828.

This playbook exists so the next agent (human or AI) does not have to
rediscover the audit methodology or the fix-pattern catalog from scratch.
`learnings.md` captures individual incidents after the fact; this document
captures the *method* used to find them and the *shape* of the fixes.

---

## How to Run an Audit

1. **Scope into parallel read-only research agents by category.** Do not run
   a single monolithic "audit everything" pass. Split by concern (CI/CD,
   secret handling, shell scripts, third-party Actions, label lifecycle,
   exit-code semantics, follow-up debt) and dispatch each as an independent
   read-only subagent. Parallel scoping is what surfaces cross-cutting
   patterns instead of one-off bugs.
2. **Demand file:line citations for every finding.** A finding without
   `path/to/file.ext:LINE` is not actionable and is not accepted. Citations
   also make cross-referencing `learnings.md` mechanical instead of
   subjective.
3. **Cross-reference `learnings.md` for recurrence.** Before triaging a
   finding as novel, grep `learnings.md` and the standards directory for the
   same symptom. Recurrence changes the priority: a second occurrence is a
   process failure, not a bug.
4. **Triage before fixing.** Not every finding becomes an immediate PR. Sort
   into: (a) fix now in an isolated worktree, (b) file an issue with
   citation, (c) fold into the next relevant PR, (d) explicitly defer with a
   reason. Fixing everything at once defeats bisect and review.
5. **One fix per isolated worktree subagent.** Each fix runs `npm ci &&
   npm test` plus a targeted regression test in its own worktree. No
   fix ships without a regression test that would have caught the original
   symptom.
6. **Watch live CI on your own in-flight PRs.** Static findings are only
   half the audit. The broken third-party Action in
   `saml-sso-registration.yml` (#15828) was not caught by reading code — it
   was caught by watching an unrelated PR fail CI and reading the log. Keep
   a browser tab or `gh run watch` on active PRs during the audit window.
7. **Targeted search, not enumeration, for stale follow-up commitments.**
   `gh search issues "Next Action" OR "follow-up" is:open` beats scrolling.
   Stale "we'll fix this next PR" comments are a rich seam of real bugs
   whose original context has evaporated.

---

## Self-Healing Correction Pattern Catalog

Each entry is Symptom / Root Cause / Fix and cites the PR that shipped the
correction. Use this catalog as a lookup table before opening a new
investigation.

### 1. Unguarded `removeLabel` race (PR #15821)

- **Symptom:** Workflow fails with `HttpError: Label does not exist` when
  two jobs both try to remove the same label.
- **Root cause:** `removeLabel` is not idempotent; second caller 404s.
- **Fix:** Wrap in a `try`/`catch` that swallows 404, or check
  `listLabelsOnIssue` first. Never call `removeLabel` without a guard.

### 2. Missing `allowError` on internal API helpers (PR #15824)

- **Symptom:** A helper that is documented as "best-effort" aborts the
  entire job on a transient 5xx.
- **Root cause:** Helper forwards the raw Octokit call without the
  `allowError` / retry wrapper used elsewhere in the codebase.
- **Fix:** Route all internal Octokit calls through the shared
  `withRetry({ allowError: [404, 5xx] })` helper. Bare `octokit.rest.*`
  calls in workflow scripts are a smell.

### 3. Default `GITHUB_TOKEN` on agent-created PRs (PR #15823)

- **Symptom:** Agent-authored PR cannot trigger downstream workflows;
  status checks never start.
- **Root cause:** The default `GITHUB_TOKEN` intentionally does not trigger
  further workflow runs. Agent PRs need a PAT or a GitHub App token.
- **Fix:** Use a dedicated app-installation token (or a fine-scoped PAT
  stored in `secrets.AGENT_PR_TOKEN`) when the agent opens the PR. Document
  the token's scopes in `standards/`.

### 4. Secrets via argv vs. stdin (PR #15825)

- **Symptom:** Secret value appears in `ps auxf` output and in the runner
  process list, and is captured by any subprocess that reads `/proc`.
- **Root cause:** Secret passed as a command-line argument
  (`tool --token $SECRET`) instead of via stdin or an env var.
- **Fix:** Pipe secrets through stdin (`echo "$SECRET" | tool --token-stdin`)
  or `--token-file /dev/stdin`. Never interpolate a secret into argv.

### 5. Bash bare-array-variable bug (PR #15827)

- **Symptom:** Script silently processes only the first element of an
  array; loop appears to run but does the wrong thing.
- **Root cause:** `for x in $ARR` instead of `for x in "${ARR[@]}"`. Bare
  `$ARR` in bash expands to the first element only.
- **Fix:** Always `"${ARR[@]}"` with quotes and brackets. Add a
  `shellcheck` pre-commit hook — SC2128 catches this exact bug.

### 6. Exit codes as proxy metrics vs. true resolution state (PR #15826)

- **Symptom:** A workflow reports success (exit 0) while the underlying
  issue is still unresolved, because the script's exit code reflects
  "the tool ran" rather than "the problem is fixed."
- **Root cause:** Conflating process-completion with outcome. `exit 0`
  meant "analyzer finished," not "no findings."
- **Fix:** Exit codes MUST reflect true resolution state. Wrap the tool
  and re-exit non-zero when the postcondition (empty findings, closed
  issue, green diff) is not met. Add an assertion, not a comment.

### 7. `nosemgrep` suppression comment adjacency (PR #15825)

- **Symptom:** Semgrep continues to flag a line that appears to have a
  `# nosemgrep` suppression.
- **Root cause:** The suppression comment must be on the *same line* as
  the flagged expression, or on the immediately preceding line with no
  blank line between. Any other placement is silently ignored.
- **Fix:** Place `# nosemgrep: rule-id` on the exact flagged line, or on
  the line immediately above with no gap. Include the rule-id so the
  suppression is narrow and auditable.

### 8. Broken third-party GitHub Action failing every PR (PR #15828)

- **Symptom:** Every PR shows a red check from a workflow no one recently
  touched; the failing step is inside a third-party Action.
- **Root cause:** Upstream Action pushed a breaking change to its
  floating tag (`@v3`, `@main`), or was archived/deleted.
- **Fix:** Pin every third-party Action to a full commit SHA, not a tag.
  Add Dependabot for `github-actions` ecosystem so pins get updated with
  review. When a pinned Action goes stale, replace or fork; do not
  unpin.

---

## Where the memory lives

- **This file (`standards/AUDIT_AND_SELF_HEALING_PLAYBOOK.md`)** — the
  method and the fix-pattern catalog. Update the catalog when a new
  recurring pattern is fixed.
- **`learnings.md`** — individual incident write-ups, one per event.
  Continue to append here; do not fold incidents into this playbook until
  they recur.
- **`CLAUDE.md` "Recurring gotchas"** — the short-form checklist the
  agent reads on every task. New gotchas belong there once a pattern has
  bitten twice.
- **`standards/GREEN_MAIN_STANDARD.md`** — the outcome contract this
  playbook serves. If the playbook and the standard disagree, the
  standard wins and this file gets updated.
