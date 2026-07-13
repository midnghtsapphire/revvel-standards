# Audit and Self-Healing Playbook

**Status:** Active
**Case evidence:** 2026-07-13 audit-and-fix session (PRs #15821, #15823, #15824, #15825, #15826, #15827, #15828)
**Owner:** Shared standard — humans and AI agents

This playbook formalizes the repeatable **audit methodology** and
**self-healing correction patterns** used across recent incident sessions.
`learnings.md` captures individual incidents after the fact; this document
captures the *method* so the next agent (human or AI) doesn't have to
rediscover it from scratch.

---

## How to Run an Audit

1. **Scope into parallel read-only research agents by category.** Do not have
   one agent enumerate everything. Split by category (workflows, scripts,
   labels, secrets, third-party actions, exit codes, etc.) and dispatch
   read-only subagents in parallel. Each agent returns findings with
   `file:line` citations — no fixes yet.
2. **Demand `file:line` citations.** Any finding without a concrete
   `path/to/file.ext:LINE` reference is a rumor, not a finding. Reject and
   re-scope.
3. **Cross-reference `learnings.md` for recurrence.** Before opening a new
   fix PR, grep `learnings.md` for the symptom. If it recurs, the fix must
   also strengthen the standard (add a gotcha to `CLAUDE.md`, add an entry
   here), not just patch the instance.
4. **Triage before fixing.** Not every finding becomes an immediate PR.
   Classify each as: (a) fix now, (b) fix next sprint, (c) accept risk with
   rationale, (d) needs more research. Record the triage decision.
5. **One fix per isolated worktree subagent.** Each fix runs in its own
   `git worktree` with `npm ci && npm test` plus a regression test that
   would have caught the original bug. No batching unrelated fixes.
6. **Watch live CI on your own in-flight PRs.** Static findings miss
   dynamic failures. The broken `saml-sso-registration.yml` third-party
   Action (fixed in PR #15828) was caught only by watching CI red-x on an
   unrelated in-flight PR, not by any static scan.
7. **Targeted search (not enumeration) for stale follow-ups.** Search issue
   and PR history for phrases like `Next Action`, `follow-up`, `TODO(`,
   `will address in`, `deferred`. Do not enumerate every issue — target the
   commitment phrases.

---

## Self-Healing Correction Pattern Catalog

Each entry: **Symptom → Root Cause → Fix → Reference PR**.

### 1. Unguarded `removeLabel` race

- **Symptom:** Workflow fails intermittently with `HttpError: Label does not
  exist` when trying to remove a label.
- **Root Cause:** Another workflow (or a human) removed the label first;
  `removeLabel` is not idempotent.
- **Fix:** Wrap `removeLabel` in try/catch and swallow 404, or check
  `labels.includes(name)` before calling. Never assume label state.
- **Reference:** PR #15821.

### 2. Missing `allowError` on internal API helpers

- **Symptom:** Helper calling an internal API throws and aborts the entire
  agent run on a transient 5xx.
- **Root Cause:** Helper had no `allowError` / retry option; caller had no
  way to say "this call is best-effort."
- **Fix:** Add `allowError: boolean` (default `false`) to helper signatures
  that touch flaky endpoints; on `true`, log and return `null` instead of
  throwing.
- **Reference:** PR #15824.

### 3. Default `GITHUB_TOKEN` on agent-created PRs

- **Symptom:** CI does not run on PRs opened by the agent, or runs with the
  wrong permissions.
- **Root Cause:** Default `GITHUB_TOKEN` from `actions/checkout` on an
  agent-created PR does not trigger downstream workflows (by design, to
  prevent recursion).
- **Fix:** Use a dedicated PAT (or GitHub App token) stored as a secret,
  and pass it explicitly as `token:` in checkout and PR-creation steps.
- **Reference:** PR #15823.

### 4. Secrets via argv vs. stdin

- **Symptom:** Secret value appears in `ps aux`, in shell history, or in
  process-listing logs.
- **Root Cause:** Command was invoked as `tool --secret=$VALUE` — argv is
  world-readable on most systems.
- **Fix:** Pipe secrets on stdin: `echo "$VALUE" | tool --secret-stdin`, or
  use `--secret-from-env VAR_NAME` if the tool supports it. Never argv.
- **Reference:** PR #15825.

### 5. Bash bare-array-variable bug

- **Symptom:** Bash script silently drops all-but-first element of an array
  when passed to a function or command.
- **Root Cause:** Referenced array as `$ARR` instead of `"${ARR[@]}"`.
  Bare `$ARR` expands only to element 0.
- **Fix:** Always `"${ARR[@]}"` for element-wise expansion; `"${ARR[*]}"`
  only when a single joined string is intended. Add `shellcheck` to CI.
- **Reference:** PR #15827.

### 6. Exit codes as proxy metrics vs. true resolution state

- **Symptom:** Workflow reports success (exit 0) but the underlying issue
  was not actually resolved — the tool merely ran to completion.
- **Root Cause:** Script conflated "the command exited cleanly" with "the
  intended state was achieved." Exit code is a proxy, not the truth.
- **Fix:** After the action, **verify the resolution state directly**
  (query the API, re-read the file, check the label is gone). Exit nonzero
  if verification fails, even if the underlying command exited 0.
- **Reference:** PR #15826.

### 7. `nosemgrep` suppression comment adjacency

- **Symptom:** `nosemgrep` comment does not suppress the finding, or
  suppresses the wrong line after a refactor.
- **Root Cause:** `nosemgrep` must be on the **same line** as the offending
  code (or the immediately preceding line, depending on config). A blank
  line or an intervening comment breaks adjacency.
- **Fix:** Keep `// nosemgrep: rule-id` on the exact line, with a short
  justification. Never place it in a docblock above a function.
- **Reference:** PR #15825.

### 8. Broken third-party GitHub Action failing every PR

- **Symptom:** Every PR shows a red X on a job nobody recognizes; the
  Action's own repo has an open issue about the failure.
- **Root Cause:** Pinned to a floating tag (`@v1`, `@main`) of a
  third-party Action that shipped a breaking change.
- **Fix:** Pin third-party Actions to a **full commit SHA**, not a tag.
  Dependabot can bump SHAs safely; floating tags cannot be rolled back.
  Remove or replace unmaintained Actions.
- **Reference:** PR #15828.

---

## Where the memory lives

- **`learnings.md`** — post-incident narrative, one entry per incident.
- **`CLAUDE.md` "Recurring gotchas"** — short numbered rules for the next
  agent's default context.
- **This playbook** — the *method* (audit) and the *pattern catalog* (fix).
- **`standards/GREEN_MAIN_STANDARD.md`** — the invariant this all serves:
  `main` is always green.

When a new incident recurs, update all four. When the fix is novel, add a
new catalog entry here and cite the PR.
