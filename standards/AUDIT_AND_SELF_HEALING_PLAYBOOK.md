# Audit and Self-Healing Playbook

**Status:** Active reference — captures the repeatable audit methodology and
fix-pattern catalog derived from the 2026-07-13 audit-and-fix session.

**Case evidence:** PRs #15821, #15823, #15824, #15825, #15826, #15827, #15828.

**Purpose:** `learnings.md` records incidents after the fact. This document
captures the piece that was missing — *how to perform an audit* and *how to
correct for self-healing* — so the next agent (human or AI) doesn't have to
rediscover either from scratch.

---

## How to Run an Audit

1. **Scope into parallel read-only research agents by category.**
   Split the surface area (workflows, scripts, security posture, CI health,
   stale commitments, secrets handling, etc.) across independent read-only
   subagents. Each returns findings with **file:line citations** — no fixes,
   no writes. Parallelism is the point: serial audits miss recurrence.

2. **Demand file:line citations for every finding.**
   A finding without `path/to/file.ext:LINE` is a rumor. Reject it and
   re-scope. Citations make triage, deduplication, and later fix-PR
   authorship mechanical.

3. **Cross-reference `learnings.md` for recurrence.**
   Before treating a finding as novel, grep `learnings.md` for the symptom
   and root cause. Recurrence is a stronger signal than severity — repeat
   offenders get promoted in the triage queue and get catalog entries here.

4. **Triage before fixing.**
   Not every finding becomes an immediate PR. Bucket findings into: (a) fix
   now, (b) file issue for later, (c) accept and document, (d) false
   positive. Skipping triage floods reviewers and buries the high-signal
   fixes.

5. **One fix per isolated worktree subagent.**
   Each accepted finding gets its own git worktree and its own fix subagent.
   The subagent runs `npm ci && npm test` and adds a regression test that
   would have caught the original bug. No batching — batched fix PRs hide
   regressions and stall on unrelated review comments.

6. **Watch live CI on your own in-flight PRs — don't just audit static
   findings.**
   The broken third-party Action in `saml-sso-registration.yml` (fixed in
   #15828) was **not** discoverable from static scanning; it was caught by
   noticing that every in-flight PR from the audit itself was failing the
   same required check. Live CI on your own audit PRs is a second-order
   audit surface. Watch it.

7. **Targeted search — not enumeration — for stale follow-up commitments.**
   Search issue/PR history for the specific phrases that mark unfinished
   work (`Next Action`, `follow-up`, `TODO(owner)`, `will address in`, etc.).
   Do **not** enumerate every open issue; the signal-to-noise ratio is too
   low. Targeted phrase search is how #15826 surfaced.

---

## Self-Healing Correction Pattern Catalog

Each entry: **Symptom → Root cause → Fix**, with the PR that implemented it.

### 1. Unguarded `removeLabel` race

- **Symptom:** Workflow fails intermittently with `HttpError: Label does not
  exist` when removing a label that another concurrent run already removed.
- **Root cause:** `github.rest.issues.removeLabel` throws on 404; no guard
  around the call.
- **Fix:** Wrap in `try/catch` and swallow `error.status === 404`. Treat
  "label already absent" as success — it's the desired end state.
- **Reference:** #15821.

### 2. Missing `allowError` on internal API helpers

- **Symptom:** Helper functions that call the GitHub API abort the whole
  workflow on transient 5xx or expected 404s.
- **Root cause:** Internal helpers hard-coded `throw` on any non-2xx instead
  of accepting an `allowError` / `allowedStatuses` option.
- **Fix:** Add an `allowError` (or `allowedStatuses: number[]`) parameter to
  every internal API helper. Callers that expect a 404 pass it explicitly;
  everyone else keeps the strict default.
- **Reference:** #15824.

### 3. Default `GITHUB_TOKEN` on agent-created PRs

- **Symptom:** Agent-authored PRs don't trigger downstream workflows
  (required checks never run, auto-merge never fires).
- **Root cause:** PRs created by the default `GITHUB_TOKEN` intentionally do
  **not** trigger `pull_request` workflows — a GitHub anti-recursion
  guardrail.
- **Fix:** Create agent PRs with a PAT or GitHub App token, not the default
  `GITHUB_TOKEN`. Store as a repo/org secret and pass explicitly.
- **Reference:** #15823.

### 4. Secrets via argv vs. stdin

- **Symptom:** Secret values appear in `ps`, in shell history, in process
  listings, and (worst) in workflow logs when `set -x` is on.
- **Root cause:** Secret passed as a CLI argument (`tool --token $SECRET`)
  instead of over stdin or an env var.
- **Fix:** Pipe secrets over stdin (`echo "$SECRET" | tool --token-stdin`)
  or read from env inside the tool. Never argv.
- **Reference:** #15825.

### 5. Bash bare-array-variable bug

- **Symptom:** Only the first element of a bash array is used; loop body
  silently runs once.
- **Root cause:** `"$arr"` (bare) expands to `${arr[0]}`. Must be
  `"${arr[@]}"` to expand to all elements.
- **Fix:** Always `"${arr[@]}"` when iterating or passing an array.
  `shellcheck` catches this — run it in CI.
- **Reference:** #15827.

### 6. Exit codes as proxy metrics vs. true resolution state

- **Symptom:** A job "succeeds" (exit 0) but the underlying condition it was
  supposed to resolve is still broken. Dashboards look green; reality isn't.
- **Root cause:** The script exits 0 on "I ran to completion" rather than
  on "the target state is achieved." Exit code became a proxy for
  "finished" instead of "resolved."
- **Fix:** After the work, **re-check the target state** and exit non-zero
  if it isn't achieved. Exit codes must reflect true resolution, not mere
  completion.
- **Reference:** #15826.

### 7. `nosemgrep` suppression comment adjacency

- **Symptom:** Semgrep still flags a line that has a `# nosemgrep` comment
  "nearby."
- **Root cause:** `nosemgrep` only suppresses the **immediately adjacent**
  line (same line, or the line directly above with no blank line between).
  A blank line or an intervening comment breaks the association.
- **Fix:** Put `# nosemgrep: rule-id` on the exact line being suppressed,
  or on the line **immediately** above with no gap. Always name the rule
  ID — bare `# nosemgrep` is over-broad.
- **Reference:** #15825.

### 8. Broken third-party GitHub Action failing every PR

- **Symptom:** A required check fails on every PR with an error from a
  third-party Action (deleted repo, yanked tag, breaking change on a
  floating `@v1` ref).
- **Root cause:** Third-party Action pinned to a moving ref (`@main`,
  `@v1`) or to a repo that disappeared. No pin to a commit SHA.
- **Fix:** Pin every third-party Action to a full commit SHA with a
  version comment (`uses: owner/action@<sha> # v1.2.3`). Add a scheduled
  workflow that alerts when pins go stale. If the upstream is dead, fork
  and pin to the fork.
- **Reference:** #15828.

---

## Where the memory lives

- **`learnings.md`** — incident log, one entry per event, written after the
  fact.
- **`standards/AUDIT_AND_SELF_HEALING_PLAYBOOK.md`** (this file) — the
  *method* for finding recurrence and the *catalog* of known fix patterns.
- **`standards/GREEN_MAIN_STANDARD.md`** — the invariant this playbook
  defends: `main` stays green.
- **`CLAUDE.md`** — the fast-path "recurring gotchas" list that points here.

If a fix pattern recurs, promote it from `learnings.md` into the catalog
above and cite the PR. If the audit method itself gains a new step, add it
to "How to Run an Audit" — do not let the method live only in chat history.
