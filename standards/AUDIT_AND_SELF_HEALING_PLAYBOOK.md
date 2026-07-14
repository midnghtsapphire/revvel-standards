# Audit and Self-Healing Playbook

**Status:** Active
**Case evidence:** 2026-07-13 audit-and-fix session (PRs #15821–#15828)
**Audience:** Human maintainers and AI coding agents working in this repo

This playbook formalizes the reusable audit methodology and fix-pattern
catalog derived from a real multi-PR self-healing session. `learnings.md`
captures individual incidents *after the fact*; this file captures the
repeatable **method** for finding and correcting them, so the next agent
(human or AI) does not have to rediscover it from scratch.

---

## How to Run an Audit

1. **Scope into parallel read-only research agents by category.**
   Do not run one monolithic "audit everything" pass. Spawn several
   read-only subagents, each with a narrow category (e.g. "CI workflows",
   "secret handling", "label/state races", "shell scripts", "third-party
   Actions"). Read-only means: they may `grep`, `cat`, `gh api`, but they
   **must not** edit files or open PRs.

2. **Demand file:line citations.**
   Every finding must include `path/to/file.ext:LN` or a PR/issue URL.
   Findings without citations are rumors and must be re-verified before
   triage.

3. **Cross-reference `learnings.md` for recurrence.**
   Before treating a finding as novel, grep `learnings.md` and prior PR
   titles. A recurring pattern deserves a catalog entry here, not just a
   one-off fix.

4. **Triage before fixing.**
   Not every finding becomes an immediate PR. Categorize each as:
   - **Fix now** — user-visible, security, or actively-breaking CI.
   - **Fix next** — real bug, not on fire, tracked as an issue.
   - **Document only** — intentional trade-off; add to `learnings.md`.
   - **Reject** — false positive; record *why* so the next audit skips it.

5. **One fix per isolated worktree subagent.**
   Each fix runs in its own `git worktree` with its own branch. The
   subagent must run `npm ci && npm test` and add a regression test
   before opening the PR. This prevents fix-A from masking or reverting
   fix-B.

6. **Watch live CI on your own in-flight PRs.**
   Static findings are not enough. Poll `gh pr checks` on the PRs *this
   audit is opening*. The broken `saml-sso-registration.yml` third-party
   Action (fixed in #15828) was only caught because a fix-PR's CI failed
   for an unrelated reason and someone actually looked.

7. **Targeted search for stale commitments — do not enumerate.**
   Search issue/PR history for phrases like `Next Action`, `follow-up`,
   `TODO`, `will address in a follow-up`. Do not try to read every open
   issue. Stale commitments become new findings; close them or convert
   them to tracked issues.

---

## Self-Healing Correction Pattern Catalog

Each entry: **Symptom → Root Cause → Fix**, with the PR that established
the pattern.

### 1. Unguarded `removeLabel` race (PR #15821)

- **Symptom:** Workflow fails with `HttpError: Label does not exist` when
  two jobs both try to remove the same label.
- **Root cause:** `octokit.rest.issues.removeLabel` throws on 404; a
  concurrent job already removed it.
- **Fix:** Wrap in `try { ... } catch (e) { if (e.status !== 404) throw; }`,
  or use `github-script` with an explicit 404 swallow.

### 2. Missing `allowError` on internal API helpers (PR #15824)

- **Symptom:** Non-fatal internal API call aborts the whole workflow.
- **Root cause:** Helper defaulted `allowError: false`; callers assumed
  the opposite.
- **Fix:** Callers that tolerate failure must pass `allowError: true`
  explicitly. Helper documents the default at the top of the file.

### 3. Default `GITHUB_TOKEN` on agent-created PRs (PR #15823)

- **Symptom:** CI jobs on agent-authored PRs cannot trigger downstream
  workflows.
- **Root cause:** The default `GITHUB_TOKEN` on a PR opened by a bot
  does not have `workflow: write` and does not re-trigger `on: push`
  workflows.
- **Fix:** Use a scoped PAT (or GitHub App token) stored as a secret
  for agent PRs; keep the default token for human PRs.

### 4. Secrets via argv vs. stdin (PR #15825)

- **Symptom:** Secret leaks into `ps auxf` and CI logs.
- **Root cause:** Passing tokens as CLI arguments (`--token $X`) exposes
  them to any process on the runner.
- **Fix:** Pipe secrets on stdin (`echo "$X" | tool --token-stdin`) or
  read from an env var the tool consumes directly.

### 5. Bash bare-array-variable bug (PR #15827)

- **Symptom:** Only the first element of an array is passed to a
  command; the rest are silently dropped.
- **Root cause:** `$arr` in bash expands to `${arr[0]}`, not all
  elements.
- **Fix:** Always use `"${arr[@]}"` when passing an array to a
  command. Add `shellcheck` to CI.

### 6. Exit codes as proxy metrics vs. true resolution state (PR #15826)

- **Symptom:** A script exits 0 and CI is green, but the underlying
  problem is unresolved (e.g. "0 issues found" because the query
  errored, not because the repo is clean).
- **Root cause:** Exit code was being used as a proxy for "success"
  when it only meant "the script ran to completion".
- **Fix:** Emit an explicit machine-readable resolution state
  (`{ "status": "clean" | "dirty" | "errored", ... }`) and gate on
  *that*, not on exit code alone. Fail loudly on `errored`.

### 7. `nosemgrep` suppression comment adjacency (PR #15825)

- **Symptom:** Semgrep still flags the line the suppression was meant
  to cover.
- **Root cause:** `# nosemgrep: rule-id` must be on the same line as
  the finding, or on the line immediately above with no blank line
  between. A blank line, a comment, or a line-continuation breaks the
  adjacency and the suppression silently no-ops.
- **Fix:** Place `# nosemgrep: <rule-id>` on the exact offending line,
  or the line directly above with no gap. Include the rule id — a bare
  `# nosemgrep` is over-broad and will be rejected by review.

### 8. Broken third-party GitHub Action failing every PR (PR #15828)

- **Symptom:** Every PR's CI shows a red check from a workflow no one
  recognizes (`saml-sso-registration.yml`), blocking merges.
- **Root cause:** A third-party Action pinned by tag was updated
  upstream in a breaking way; our workflow inherited the break.
- **Fix:** Pin third-party Actions by full commit SHA, not by tag or
  branch. When an Action is genuinely abandoned, remove the workflow
  and record the removal in `learnings.md`.

---

## Where the memory lives

- **`learnings.md`** — chronological incident log; one entry per
  learned lesson, dated.
- **`standards/AUDIT_AND_SELF_HEALING_PLAYBOOK.md`** (this file) —
  the *method* (how to audit) and the *catalog* (recurring patterns).
- **`standards/GREEN_MAIN_STANDARD.md`** — the invariant this playbook
  exists to defend: `main` stays green.
- **`CLAUDE.md`** — day-to-day gotcha list for the next agent; points
  here for the deeper method.

When you learn something new in an audit: add the incident to
`learnings.md`, and if the pattern is likely to recur, add a numbered
entry to the catalog above with its originating PR.
