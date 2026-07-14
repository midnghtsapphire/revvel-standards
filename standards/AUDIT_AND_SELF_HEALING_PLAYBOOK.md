# Audit and Self-Healing Playbook

**Status:** Active reference — formalizes the 2026-07-13 audit-and-fix session
into a repeatable methodology.
**Case evidence:** PRs #15821, #15823, #15824, #15825, #15826, #15827, #15828.

This playbook is the piece that was missing next to `learnings.md`. Where
`learnings.md` captures individual incidents *after the fact*, this document
captures the **audit methodology** and a fast-lookup **fix-pattern catalog** so
the next agent (human or AI) does not have to rediscover either from scratch.

---

## How to Run an Audit

1. **Scope into parallel read-only research agents by category.**
   Do not run one monolithic "find all bugs" pass. Split by concern
   (CI workflows, agent scripts, secret handling, label/state machines,
   third-party Actions, monetization surfaces) and dispatch each as an
   independent read-only subagent. This is faster and produces
   citations rather than opinions.

2. **Demand `file:line` citations for every finding.**
   A finding without a path and line number is a rumor. Reject it or
   send it back for evidence.

3. **Cross-reference `learnings.md` for recurrence.**
   Before filing a new finding, grep `learnings.md` for the same
   symptom. If it has recurred, escalate it: the previous fix was
   incomplete or the guardrail was missing.

4. **Triage before fixing.**
   Not every finding becomes an immediate PR. Sort into
   *fix-now / guardrail-later / accept-and-document*. Fixing everything
   at once creates merge conflicts and drowns review.

5. **One fix per isolated worktree subagent.**
   Each accepted finding gets its own git worktree and its own subagent.
   Each subagent must run `npm ci && npm test` and add a regression
   test that fails without the fix. No fix ships without a test that
   pins the behavior.

6. **Watch live CI on your own in-flight PRs — not just static findings.**
   The broken third-party `saml-sso-registration.yml` Action (fixed in
   #15828) was caught by watching CI on unrelated PRs, not by reading
   code. Static audit misses dynamic breakage. Keep one eye on the
   Actions tab while the audit runs.

7. **Targeted search for stale "follow-up" / "Next Action" commitments.**
   Search issue and PR history for `Next Action`, `follow-up`,
   `TODO(followup)`, `will address in a later PR`. Do not enumerate
   every issue — search for the commitment phrases. Stale promises are
   themselves audit findings.

8. **Close the loop in `learnings.md`.**
   Every accepted fix updates `learnings.md` with the symptom, the root
   cause, and the PR link. If the same pattern appears here twice, it
   graduates into this playbook's catalog below.

---

## Self-Healing Correction Pattern Catalog

Eight patterns fixed during the 2026-07-13 session. Each entry is
**Symptom / Root cause / Fix / PR**. When a new incident matches a
symptom here, apply the fix pattern directly instead of re-deriving it.

### 1. Unguarded `removeLabel` race

- **Symptom:** Workflow fails intermittently with `HttpError: Label does
  not exist` when trying to remove a label that a concurrent workflow
  already removed.
- **Root cause:** `github.rest.issues.removeLabel` throws on 404 by
  default; concurrent runs race on the same label.
- **Fix:** Wrap the call and swallow 404 only. Do not blanket
  `try/catch` — narrow to `error.status === 404`.
- **PR:** #15821.

### 2. Missing `allowError` on internal API helpers

- **Symptom:** Helper functions bubble non-fatal 404s / 409s as fatal
  and abort the workflow.
- **Root cause:** Internal API wrappers did not expose an `allowError`
  or `expectedStatuses` option, so callers could not distinguish
  "expected miss" from "real failure."
- **Fix:** Add `allowError` / `expectedStatuses` option to the helper
  and pass it explicitly at the call site with a comment naming the
  expected condition.
- **PR:** #15824.

### 3. Default `GITHUB_TOKEN` on agent-created PRs

- **Symptom:** Agent-authored PRs cannot trigger downstream workflows;
  checks stay pending forever.
- **Root cause:** The default `GITHUB_TOKEN` is intentionally denied
  the ability to trigger further `on: pull_request` runs. Agent PRs
  need a bot PAT or a GitHub App token.
- **Fix:** Use a dedicated bot token (App-installation token
  preferred) for `gh pr create` in agent workflows. Never use the
  default `GITHUB_TOKEN` for agent-authored PRs that must trigger CI.
- **PR:** #15823.

### 4. Secrets via argv vs. stdin

- **Symptom:** Secret material appears in `ps auxww` output or in
  workflow logs when a step echoes its command line.
- **Root cause:** Passing secrets as CLI arguments makes them visible
  to every process on the host and to any `set -x` trace.
- **Fix:** Pass secrets on stdin (`printenv SECRET | tool --stdin`) or
  via a file descriptor. Never as `--token $SECRET`.
- **PR:** #15825.

### 5. Bash bare-array-variable bug

- **Symptom:** A bash script that should iterate an array only ever
  sees the first element.
- **Root cause:** `"$ARR"` expands only `${ARR[0]}`. Correct form is
  `"${ARR[@]}"`.
- **Fix:** Always quote-and-splat bash arrays as `"${ARR[@]}"`. Add a
  shellcheck step to CI to catch this class of bug.
- **PR:** #15827.

### 6. Exit codes as proxy metrics vs. true resolution state

- **Symptom:** A workflow reports success (`exit 0`) even though the
  underlying issue was not actually resolved — the script only checked
  that its subcommand did not crash.
- **Root cause:** Conflating "the tool ran cleanly" with "the desired
  end state was achieved." Exit code was being used as a proxy for
  resolution.
- **Fix:** After the action, **assert the desired state explicitly**
  (e.g. re-query the API, check the label is gone, verify the file
  exists). Exit non-zero if the post-condition is not met, even if the
  subcommand exited 0.
- **PR:** #15826.

### 7. `nosemgrep` suppression comment adjacency

- **Symptom:** A `# nosemgrep: rule-id` comment does not actually
  suppress the finding; the rule still fires in CI.
- **Root cause:** Semgrep requires the suppression comment on the
  **same line** as, or the line **immediately preceding**, the offending
  code — with no blank line, no unrelated comment, and no reordering by
  a formatter in between.
- **Fix:** Place `# nosemgrep: <rule-id>` on the exact same line as the
  triggering expression when possible. If placed above, ensure no
  intervening blank line and add a lint check that formatters preserve
  adjacency.
- **PR:** #15825.

### 8. Broken third-party GitHub Action failing every PR

- **Symptom:** Every PR shows a red check for a workflow that no one
  recently touched (e.g. `saml-sso-registration.yml`).
- **Root cause:** A pinned third-party Action was deleted, renamed, or
  had a breaking release; the workflow silently 404s on checkout of
  the Action itself.
- **Fix:** Pin third-party Actions by **commit SHA**, not by tag. Add
  a scheduled workflow that dry-runs critical Actions weekly so
  breakage is detected without waiting for the next unrelated PR.
- **PR:** #15828.

---

## Where the memory lives

- **`learnings.md`** — chronological, per-incident. Write here first
  when something new breaks.
- **`standards/AUDIT_AND_SELF_HEALING_PLAYBOOK.md`** (this file) —
  methodology + patterns that have recurred. Promote from `learnings.md`
  when a pattern shows up twice.
- **`standards/GREEN_MAIN_STANDARD.md`** — the invariant that `main`
  must stay green; this playbook is how we keep that invariant true.
- **`CLAUDE.md`** — the "Recurring gotchas" section is the fast-path
  index into the two documents above.
