# Audit and Self-Healing Playbook

**Status:** Active
**Case evidence:** 2026-07-13 audit session (PRs #15821, #15823, #15824, #15825, #15826, #15827, #15828)
**Related:** `standards/GREEN_MAIN_STANDARD.md`, `learnings.md`, `CLAUDE.md`

This playbook formalizes the repeatable **audit methodology** and **fix-pattern
catalog** used to keep automated agent PRs green and self-healing. `learnings.md`
captures individual incidents; this document captures the *process* for finding
them and the *shapes* of the fixes so the next agent (human or AI) doesn't have
to rediscover either from scratch.

---

## How to Run an Audit

1. **Scope into parallel read-only research agents by category.** Do not have
   one agent try to audit everything. Split the surface into categories
   (workflows, scripts, standards docs, in-flight PRs, stale follow-ups) and
   dispatch a read-only subagent per category. Each agent returns findings
   with **file:line citations** — never vague prose.
2. **Cross-reference `learnings.md` for recurrence.** Before flagging a finding
   as novel, grep `learnings.md` and prior PRs. Recurrence = higher priority
   and signals a missing guardrail (test, lint rule, standards entry).
3. **Triage before fixing.** Not every finding becomes an immediate PR. Sort
   into: (a) breaks main / blocks agents now, (b) latent risk, (c) doc/nice-
   to-have. Fix (a) first, file issues for (b), batch (c).
4. **One fix per isolated worktree subagent.** Each fix runs in its own git
   worktree with `npm ci && npm test` plus a regression test that would have
   caught the original bug. No mixing unrelated fixes in one PR.
5. **Watch live CI on your own in-flight PRs.** Static findings are not enough.
   The broken third-party `saml-sso-registration.yml` Action (#15828) was
   only caught by watching CI fail on unrelated PRs. Every open agent PR is a
   live probe — read its checks.
6. **Targeted search, not enumeration, for stale follow-ups.** When hunting
   "Next Action" / "follow-up" / "TODO(agent)" commitments in issue/PR history,
   grep for the specific phrases. Do not try to read every issue.

---

## Self-Healing Correction Pattern Catalog

Each entry: **Symptom** → **Root Cause** → **Fix** → **Citing PR**.

### 1. Unguarded `removeLabel` race
- **Symptom:** Workflow fails with 404 on `removeLabel` when two jobs race to
  remove the same trigger label.
- **Root cause:** `github.rest.issues.removeLabel` throws on missing label;
  no try/catch or existence check.
- **Fix:** Wrap in try/catch and swallow 404 only; re-throw other errors.
- **PR:** #15821

### 2. Missing `allowError` on internal API helpers
- **Symptom:** Agent scripts crash on transient GitHub API errors that should
  be retried or ignored.
- **Root cause:** Internal helper wrappers didn't expose an `allowError` /
  `continueOnError` flag; every caller had to hand-roll try/catch.
- **Fix:** Add `allowError` option to shared API helpers; default `false` to
  preserve strictness, opt-in for known-flaky calls.
- **PR:** #15824

### 3. Default `GITHUB_TOKEN` on agent-created PRs
- **Symptom:** Follow-up CI runs on agent-authored PRs don't trigger required
  workflows because commits are attributed to `github-actions[bot]`.
- **Root cause:** Using the default `GITHUB_TOKEN` for pushes prevents
  workflow-triggering commits (by design).
- **Fix:** Use a scoped PAT (or GitHub App token) for agent commits when
  downstream workflows must run.
- **PR:** #15823

### 4. Secrets via `argv` vs. `stdin`
- **Symptom:** Secrets appear in `ps` output / process listings / error logs.
- **Root cause:** Passing tokens as CLI arguments (`--token=$SECRET`) instead
  of piping via stdin or env.
- **Fix:** Pass secrets via stdin (`echo "$SECRET" | tool --token-stdin`) or
  env var; never as argv.
- **PR:** #15825

### 5. Bash bare-array-variable bug
- **Symptom:** Only the first element of a bash array is used where all
  elements were intended.
- **Root cause:** `"$arr"` expands to `${arr[0]}`, not the whole array. Must
  be `"${arr[@]}"`.
- **Fix:** Always use `"${arr[@]}"` for array expansion; add shellcheck to CI.
- **PR:** #15827

### 6. Exit codes as proxy metrics vs. true resolution state
- **Symptom:** Workflow reports success (exit 0) even though the underlying
  issue was not actually resolved — agent moved on prematurely.
- **Root cause:** Script exits 0 on "I finished running" instead of on "the
  problem is fixed and verified."
- **Fix:** Distinguish `ran-to-completion` from `resolved`. Exit non-zero if
  the resolution assertion (test passes, label removed, PR merged) is not met.
- **PR:** #15826

### 7. `nosemgrep` suppression comment adjacency
- **Symptom:** Semgrep still flags a line that has a `# nosemgrep` comment
  "nearby."
- **Root cause:** `nosemgrep` must be on the **same line** as the finding or
  the **immediately preceding line** — not two lines above, not after a
  blank line.
- **Fix:** Place the suppression comment directly above (no blank line) or
  inline with the flagged code. Prefer rule-specific suppressions
  (`# nosemgrep: rule-id`).
- **PR:** #15825

### 8. Broken third-party GitHub Action failing every PR
- **Symptom:** Every PR has a red check from a workflow nobody touched
  recently (e.g. `saml-sso-registration.yml`).
- **Root cause:** A pinned third-party Action version was yanked / its
  upstream broke; workflow runs on every PR and fails.
- **Fix:** Pin third-party Actions by full commit SHA (not tag). If broken
  and non-essential, disable the workflow or gate it behind a path filter.
  If essential, fork and self-host.
- **PR:** #15828

---

## Where the memory lives

- **This file** — audit method + fix-pattern catalog (shapes of bugs and fixes).
- **`learnings.md`** — chronological per-incident narrative (what happened,
  when, who found it).
- **`standards/GREEN_MAIN_STANDARD.md`** — the definition of "green" this
  playbook defends.
- **`CLAUDE.md` "Recurring gotchas"** — fast-lookup summary for agents mid-task.

When you fix a new class of bug, add:
1. A dated entry to `learnings.md`.
2. A new numbered Symptom/Root Cause/Fix entry here.
3. A gotcha bullet in `CLAUDE.md` if it's likely to recur in agent flows.
