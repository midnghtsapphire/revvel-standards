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
# Audit and Self-Healing Playbook — method + pattern catalog

**Status:** Active
**Case evidence:** 2026-07-13 audit session — 8 patterns fixed across PRs
#15821, #15823, #15824, #15825, #15826, #15827, #15828.
**Owner:** Shared standard — every agent (human or AI) should reference this
before starting an audit or applying a self-healing fix.

This playbook formalizes the *method* of auditing and correcting recurring
failure modes in this repository. `learnings.md` captures individual incidents
after the fact; this document captures the **repeatable process** for
discovering and fixing them, plus a fast-lookup catalog of known
symptom→root-cause→fix mappings.

---

## How to Run an Audit

1. **Scope into parallel, read-only research agents by category.**
   Do not try to audit "everything" in one pass. Split by concern —
   workflows, scripts, security, tests, docs — and dispatch each as an
   independent read-only agent. This keeps context windows small and lets
   you cross-reference findings later.

2. **Demand file:line citations for every finding.**
   A finding without a `path/to/file.ext:NN` citation is a rumor. Reject it
   and re-run the sub-audit. Citations are what make triage and fix-PRs
   auditable.

3. **Cross-reference `learnings.md` for recurrence.**
   Before opening a new fix PR, grep `learnings.md` for the symptom. If it
   has happened before, the fix pattern is likely already documented — reuse
   it rather than reinventing. If it is *new*, the fix PR must add a
   `learnings.md` entry.

4. **Triage before fixing.**
   Not every finding becomes an immediate PR. Rank by (a) blast radius —
   does this break `main` or leak secrets? — (b) recurrence — has it bitten
   us before? — (c) fix cost. Low-blast-radius, low-recurrence items go on
   a backlog issue, not a PR.

5. **One fix per isolated worktree subagent.**
   Each accepted finding gets its own `git worktree` and its own subagent.
   The subagent runs `npm ci && npm test`, adds a regression test where
   feasible, and opens exactly one PR. This keeps blame, revert, and review
   surface minimal.

6. **Watch live CI on your own in-flight PRs.**
   Static findings are only half the audit. The other half is opening the
   Actions tab on the PRs *you just filed* and watching them run. This is
   how the broken third-party Action in `saml-sso-registration.yml` was
   actually caught (#15828) — it was green in isolation and red only under
   the PR-triggered matrix.

7. **Use targeted search, not enumeration, for stale commitments.**
   To find un-kept "follow-up" / "Next Action" / "TODO(owner)" promises in
   issue and PR history, `gh search issues` and `gh search prs` with the
   exact phrase — do not page through every issue. Enumeration wastes
   context; targeted search hits the actual debt.

---

## Self-Healing Correction Pattern Catalog

Each entry: **Symptom** → **Root cause** → **Fix** → **Reference PR**.

### 1. Unguarded `removeLabel` race

- **Symptom:** Workflow fails with `HttpError: Label does not exist` when
  removing a label that another concurrent run already removed.
- **Root cause:** `octokit.rest.issues.removeLabel` throws on 404; no
  concurrency guard on the workflow.
- **Fix:** Wrap the call in `try/catch` and swallow 404, *and* add
  `concurrency:` to the workflow so only one run mutates labels at a time.
- **Reference:** PR #15821.

### 2. Missing `allowError` on internal API helpers

- **Symptom:** A single 4xx from an internal helper aborts the entire
  workflow step, even when the caller expected to branch on failure.
- **Root cause:** Helper defaulted to `throwOnError: true`; callers assumed
  the opposite.
- **Fix:** Add an explicit `allowError` option (default `false` for
  backward-compat) and thread it through call sites that branch on
  failure.
- **Reference:** PR #15824.

### 3. Default `GITHUB_TOKEN` on agent-created PRs

- **Symptom:** PRs opened by an agent workflow do not trigger downstream
  `on: pull_request` workflows (CI never runs).
- **Root cause:** GitHub deliberately suppresses recursive workflow
  triggers when the actor is `GITHUB_TOKEN`.
- **Fix:** Use a dedicated PAT (or GitHub App token) with `pull_requests:
  write` when opening the PR. Store as a repo secret, not in argv.
- **Reference:** PR #15823.

### 4. Secrets via argv vs. stdin

- **Symptom:** Secrets appear in `ps auxf`, in workflow logs on failure,
  or in shell history.
- **Root cause:** Passing `--token=$SECRET` on the command line — argv is
  world-readable on the host and often echoed by set -x.
- **Fix:** Pipe secrets on stdin (`echo "$SECRET" | tool --token-stdin`)
  or read from an env var the tool consumes directly. Never argv.
- **Reference:** PR #15825.

### 5. Bash bare-array-variable bug

- **Symptom:** Loop iterates once over a joined string instead of N times
  over N elements; or `"${arr}"` silently drops elements 2..N.
- **Root cause:** `"$arr"` expands to element 0 only. You want
  `"${arr[@]}"`.
- **Fix:** Always `"${arr[@]}"` for iteration, and `set -u` at the top of
  every script so unset arrays fail loud.
- **Reference:** PR #15827.

### 6. Exit codes as proxy metrics vs. true resolution state

- **Symptom:** A job reports success (exit 0) even though the underlying
  work (e.g., "issue resolved") did not actually happen — because the
  script only checked whether the *tool* ran, not whether the *outcome*
  was achieved.
- **Root cause:** Conflating "command completed without error" with
  "business outcome achieved."
- **Fix:** After the tool runs, re-query the source of truth (issue
  state, PR merge status, label presence) and exit non-zero if the
  desired end state is not observed. Exit codes must reflect *true
  resolution state*, not just tool liveness.
- **Reference:** PR #15826.

### 7. `nosemgrep` suppression comment adjacency

- **Symptom:** Semgrep still flags a line that has a `# nosemgrep` comment
  "nearby."
- **Root cause:** Semgrep requires the suppression comment to be on the
  *same line* as the finding, or on the immediately preceding line — a
  blank line or an intervening comment breaks the association.
- **Fix:** Place `# nosemgrep: rule-id` directly on the offending line
  (preferred) or on the line immediately above with no blank line between.
  Always include the specific rule id, never a bare `# nosemgrep`.
- **Reference:** PR #15825.

### 8. Broken third-party GitHub Action failing every PR

- **Symptom:** A required check (e.g., `saml-sso-registration.yml`) fails
  on every PR with an error originating inside a third-party Action —
  not in our code.
- **Root cause:** The upstream Action shipped a breaking change under a
  floating tag (`@v2` moved), or was archived/removed. Our workflow pinned
  by tag, not by SHA.
- **Fix:** (a) Immediate — pin to a known-good commit SHA. (b) Follow-up —
  either replace the Action or vendor its logic. Add the Action to the
  Dependabot config so future upstream moves surface as PRs, not outages.
- **Reference:** PR #15828.

---

## Where the memory lives

- **This file (`standards/AUDIT_AND_SELF_HEALING_PLAYBOOK.md`)** — the
  *method* and the *fix-pattern catalog*. Update when a new recurring
  pattern is identified (≥2 incidents).
- **`learnings.md`** — the *incident log*. Every fix PR appends an entry;
  entries here feed step 3 of the audit method above.
- **`CLAUDE.md` "Recurring gotchas"** — the *hot list* for agents. Only
  the top ~10 gotchas live there; anything longer belongs in this
  playbook.
- **`standards/GREEN_MAIN_STANDARD.md`** — the invariant this playbook
  ultimately protects: `main` stays green.
