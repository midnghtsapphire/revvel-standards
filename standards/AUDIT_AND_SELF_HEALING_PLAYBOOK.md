# Audit and Self-Healing Playbook

**Status:** Active
**Case evidence:** 2026-07-13 audit session (PRs #15821-#15828)
**Owner:** revvel-standards

This playbook formalizes a repeatable **audit methodology** and a fast-lookup
**fix-pattern catalog** so the next agent (human or AI) doesn't have to
rediscover either from scratch. It complements `learnings.md` (which captures
individual incidents after the fact) by documenting the *process* and the
*recurring patterns*.

---

## How to Run an Audit

1. **Scope into parallel read-only research agents by category.** Split the
   audit surface (workflows, scripts, secrets handling, CI config, docs) into
   disjoint categories and dispatch one read-only subagent per category.
   Read-only means: no edits, no PRs, no branch creation — only findings.

2. **Demand `file:line` citations for every finding.** A finding without a
   concrete `path/to/file.ext:LN` reference is not actionable and should be
   rejected or re-scoped. This also makes cross-referencing trivial.

3. **Cross-reference `learnings.md` for recurrence.** Before treating a
   finding as novel, grep `learnings.md` and closed issues/PRs. Recurrence
   upgrades severity and usually indicates a missing standard or lint rule.

4. **Triage before fixing.** Not every finding becomes an immediate PR.
   Classify each as: (a) fix now, (b) file issue and defer, (c) accept and
   document, (d) reject. Batching unrelated fixes into one PR is an
   anti-pattern — it destroys bisectability.

5. **One fix per isolated worktree subagent.** Each accepted finding gets its
   own `git worktree`, its own branch, and its own subagent. The subagent
   must run `npm ci && npm test` locally and add a regression test that fails
   without the fix.

6. **Watch live CI on your own in-flight PRs.** Static findings are only half
   the audit. The broken third-party Action in `saml-sso-registration.yml`
   (see catalog entry 8) was caught only by watching the actual CI runs of
   the audit's own PRs — not by reading the workflow file. Tail
   `gh run watch` on every PR you open during an audit.

7. **Targeted search, not enumeration, for stale follow-ups.** When hunting
   for stale "follow-up" or "Next Action" commitments in issue/PR history,
   use targeted `gh search issues --search 'follow-up in:body'` and similar
   — not full enumeration. Enumeration wastes tokens and buries signal.

---

## Self-Healing Correction Pattern Catalog

Each entry: **Symptom** / **Root cause** / **Fix** / **Reference PR**.

### 1. Unguarded `removeLabel` race

- **Symptom:** Workflow fails intermittently with `HttpError: Label does not
  exist` when trying to remove a label that another concurrent run already
  removed.
- **Root cause:** `octokit.issues.removeLabel` throws 404 if the label is
  already gone. Two workflow runs racing on the same issue both try to remove
  it; the second one crashes.
- **Fix:** Wrap in try/catch and swallow 404s only (re-throw other errors),
  or check label presence first. Prefer the try/catch because the check is
  itself racy.
- **Reference:** PR #15821.

### 2. Missing `allowError` on internal API helpers

- **Symptom:** Helper functions that call the GitHub API abort the entire
  workflow on a single non-fatal error (e.g., comment-not-found on cleanup).
- **Root cause:** Internal helpers didn't accept an `allowError` /
  `ignoreNotFound` option, so callers couldn't opt into graceful degradation.
- **Fix:** Add an `allowError` option (default `false` to preserve existing
  behavior) and thread it through. Callers on cleanup paths pass `true`.
- **Reference:** PR #15824.

### 3. Default `GITHUB_TOKEN` on agent-created PRs

- **Symptom:** PRs opened by an automation agent don't trigger downstream
  workflows (CI, labelers, etc.).
- **Root cause:** GitHub intentionally suppresses workflow triggers for
  events caused by the default `GITHUB_TOKEN` to prevent recursion. Agents
  using the default token silently break the pipeline.
- **Fix:** Use a dedicated PAT or a GitHub App token for agent-authored PRs.
  Store as a repo secret; never fall back to `GITHUB_TOKEN` for PR creation.
- **Reference:** PR #15823.

### 4. Secrets via argv instead of stdin

- **Symptom:** Secrets leak into `ps` output, shell history, or process
  listings on shared runners.
- **Root cause:** Passing a secret as a CLI argument (`tool --token=$SECRET`)
  makes it visible to any process that can read `/proc/*/cmdline`.
- **Fix:** Pipe via stdin (`echo "$SECRET" | tool --token-stdin`) or use an
  environment variable that the tool reads directly. Never argv.
- **Reference:** PR #15825.

### 5. Bash bare-array-variable bug

- **Symptom:** A bash script silently processes only the first element of an
  array, or expands unquoted and word-splits on whitespace in filenames.
- **Root cause:** `"${arr}"` (no `[@]`) expands only element 0; `${arr[@]}`
  (unquoted) word-splits. Both are near-invisible in code review.
- **Fix:** Always `"${arr[@]}"` with both the `[@]` and the double quotes.
  Add a shellcheck rule to CI.
- **Reference:** PR #15827.

### 6. Exit codes as proxy metrics vs. true resolution state

- **Symptom:** A job "passes" (exit 0) but the underlying problem isn't
  actually resolved — e.g., a linter that exits 0 when it finds no files, or
  a healer that exits 0 when it fails to open a PR.
- **Root cause:** Exit code was wired to the *last command's* status, not to
  the *semantic* success of the job. Exit 0 became a proxy metric divorced
  from resolution state.
- **Fix:** Explicitly track resolution state in a variable and `exit` on that
  variable at the end. Add an assertion that a positive outcome (file
  written, PR opened, label applied) actually occurred before exiting 0.
- **Reference:** PR #15826.

### 7. `nosemgrep` suppression comment adjacency

- **Symptom:** `# nosemgrep: rule-id` doesn't suppress the finding; CI still
  fails on the flagged line.
- **Root cause:** Semgrep requires the suppression comment to be on the line
  *immediately preceding* the flagged line (or on the same line, trailing).
  A blank line, a different comment, or a wrapped statement breaks adjacency.
- **Fix:** Place `# nosemgrep: <rule-id>` on the line directly above the
  offending code with no intervening blank lines or comments. If the
  offending statement wraps, put the suppression on the first line of the
  statement. Always include the specific rule id — never bare `# nosemgrep`.
- **Reference:** PR #15825.

### 8. Broken third-party GitHub Action failing every PR

- **Symptom:** Every PR fails a required check with an opaque error from a
  third-party Action (e.g., `saml-sso-registration.yml`), even PRs that
  don't touch the relevant surface.
- **Root cause:** A pinned third-party Action version was yanked, the
  upstream repo was renamed/deleted, or the Action's runtime (e.g., Node 16)
  was deprecated by GitHub. The workflow file itself looks fine on static
  read.
- **Fix:** Repin to a known-good SHA (not a tag), replace with a maintained
  fork, or inline the logic. Add the Action to a dependabot config so future
  breakage surfaces as a PR, not a red CI. **Caught only by watching live
  CI, not by reading the workflow file.**
- **Reference:** PR #15828.

---

## Where the memory lives

- **This playbook** (`standards/AUDIT_AND_SELF_HEALING_PLAYBOOK.md`) — the
  repeatable *method* and the *pattern catalog*.
- **`learnings.md`** — chronological incident log; one entry per incident,
  written after the fact.
- **`CLAUDE.md`** — "Recurring gotchas" section, short-form pointers for
  agents; links back here for depth.
- **`standards/GREEN_MAIN_STANDARD.md`** — sibling standard; this playbook
  mirrors its Status / Case evidence / numbered-rules / "Where the memory
  lives" structure.

When you fix a new recurrence: (1) add a catalog entry here, (2) add a
chronological entry to `learnings.md`, (3) add a one-line gotcha to
`CLAUDE.md` if it's the kind of thing an agent will trip on again within
days.
