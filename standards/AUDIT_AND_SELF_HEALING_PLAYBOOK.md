# Audit and Self-Healing Playbook

**Status:** Active reference — extracted from the 2026-07-13 audit-and-fix
session per an explicit user request: "can everybody save memory and learnings
in revvel-standards — how to perform audit — how to correct for self healing."

**Case evidence:** PRs #15821, #15823, #15824, #15825, #15826, #15827, #15828.
Each fix in the catalog below cites the PR where the pattern was actually
applied so the next agent can see a real diff, not a hypothetical.

**Why this doc exists:** `learnings.md` captures individual incidents *after*
they happen. What was missing was the piece *before* — a repeatable method for
running the audit in the first place, and a fast-lookup catalog of
symptom → root cause → fix so the next agent (human or AI) doesn't rediscover
either from scratch.
**Status:** Active
**Case evidence:** 2026-07-13 audit-and-fix session (PRs #15821–#15828)
**Audience:** Human maintainers and AI coding agents working in this repo

This playbook formalizes the reusable audit methodology and fix-pattern
catalog derived from a real multi-PR self-healing session. `learnings.md`
captures individual incidents *after the fact*; this file captures the
repeatable **method** for finding and correcting them, so the next agent
(human or AI) does not have to rediscover it from scratch.
**Status:** Active reference (2026-07-13)
**Case evidence:** Formalizes the audit-and-fix session that produced PRs
## 15821, #15823, #15824, #15825, #15826, #15827, and #15828

This playbook exists so the next agent (human or AI) does not have to
rediscover the audit methodology or the fix-pattern catalog from scratch.
`learnings.md` captures individual incidents after the fact; this document
captures the *method* used to find them and the *shape* of the fixes.

---

## How to Run an Audit

This is the method actually used on 2026-07-13, not a theoretical one.

1. **Scope into parallel read-only research agents by category.** Do not send
   one agent to "audit the repo." Send N agents, each with a narrow category
   (e.g. "workflow token scoping," "shell quoting in `.github/scripts/**`,"
   "secret handling in argv," "exit-code semantics in dispatcher scripts").
   Read-only means they produce a report, not a branch.

2. **Demand file:line citations.** Every finding must include
   `path/to/file.ext:LINE` (or a line range). A finding without a citation is a
   guess and must be re-run or dropped. This is non-negotiable — it is the
   single biggest quality gate on agent output.

3. **Cross-reference `learnings.md` for recurrence.** Before triaging a
   finding as new, grep `learnings.md` for the same symptom. If it recurs, the
   fix belongs in a *standard* (this doc, `CLAUDE.md`, or
   `standards/GREEN_MAIN_STANDARD.md`), not just in a one-off PR — otherwise
   the next agent hits it again.

4. **Triage before fixing.** Not every finding becomes an immediate PR. Sort
   into: (a) actively breaking CI or prod → fix now; (b) latent footgun with a
   plausible trigger → fix this session; (c) style/nit → log and defer.
   Batching (c) into a PR wastes review budget.

5. **One fix per isolated worktree subagent.** Each accepted finding gets its
   own `git worktree` and its own subagent. The subagent's contract is:
   `npm ci && npm test` passes, a regression test is added where feasible, and
   the PR body cites the audit finding (file:line) it closes. Do not batch
   unrelated fixes — it makes bisection and revert impossible.

6. **Watch live CI on your own in-flight PRs.** Static findings are not the
   whole picture. The broken third-party Action in `saml-sso-registration.yml`
   (fixed in #15828) was caught only because the auditor watched CI on the
   audit-generated PRs themselves and noticed *every* PR was red on the same
   check for an unrelated reason. Static analysis would not have found it.

7. **Targeted search, not enumeration, for stale follow-ups.** To find dropped
   commitments, don't enumerate every closed issue. Grep issue/PR history for
   specific stale-commitment phrases: `"follow-up"`, `"follow up"`,
   `"Next Action"`, `"TODO(next)"`, `"will address in a follow"`. Filter to
   items >30 days old with no linked PR. This is ~10x faster than enumeration
   and catches the actual signal.

8. **Close the loop in `learnings.md`.** After each fix merges, append a
   dated entry with symptom, root cause, and the PR link. This is what makes
   step 3 work next time.
9. **Scope into parallel read-only research agents by category.**
   Do not run one monolithic "audit everything" pass. Spawn several
   read-only subagents, each with a narrow category (e.g. "CI workflows",
   "secret handling", "label/state races", "shell scripts", "third-party
   Actions"). Read-only means: they may `grep`, `cat`, `gh api`, but they
   **must not** edit files or open PRs.

10. **Demand file:line citations.**
   Every finding must include `path/to/file.ext:LN` or a PR/issue URL.
   Findings without citations are rumors and must be re-verified before
   triage.

11. **Cross-reference `learnings.md` for recurrence.**
   Before treating a finding as novel, grep `learnings.md` and prior PR
   titles. A recurring pattern deserves a catalog entry here, not just a
   one-off fix.

12. **Triage before fixing.**
   Not every finding becomes an immediate PR. Categorize each as:
- **Fix now** — user-visible, security, or actively-breaking CI.
- **Fix next** — real bug, not on fire, tracked as an issue.
- **Document only** — intentional trade-off; add to `learnings.md`.
- **Reject** — false positive; record *why* so the next audit skips it.

1. **One fix per isolated worktree subagent.**
   Each fix runs in its own `git worktree` with its own branch. The
   subagent must run `npm ci && npm test` and add a regression test
   before opening the PR. This prevents fix-A from masking or reverting
   fix-B.

2. **Watch live CI on your own in-flight PRs.**
   Static findings are not enough. Poll `gh pr checks` on the PRs *this
   audit is opening*. The broken `saml-sso-registration.yml` third-party
   Action (fixed in #15828) was only caught because a fix-PR's CI failed
   for an unrelated reason and someone actually looked.

3. **Targeted search for stale commitments — do not enumerate.**
   Search issue/PR history for phrases like `Next Action`, `follow-up`,
   `TODO`, `will address in a follow-up`. Do not try to read every open
   issue. Stale commitments become new findings; close them or convert
   them to tracked issues.
4. **Scope into parallel read-only research agents by category.** Do not run
   a single monolithic "audit everything" pass. Split by concern (CI/CD,
   secret handling, shell scripts, third-party Actions, label lifecycle,
   exit-code semantics, follow-up debt) and dispatch each as an independent
   read-only subagent. Parallel scoping is what surfaces cross-cutting
   patterns instead of one-off bugs.
5. **Demand file:line citations for every finding.** A finding without
   `path/to/file.ext:LINE` is not actionable and is not accepted. Citations
   also make cross-referencing `learnings.md` mechanical instead of
   subjective.
6. **Cross-reference `learnings.md` for recurrence.** Before triaging a
   finding as novel, grep `learnings.md` and the standards directory for the
   same symptom. Recurrence changes the priority: a second occurrence is a
   process failure, not a bug.
7. **Triage before fixing.** Not every finding becomes an immediate PR. Sort
   into: (a) fix now in an isolated worktree, (b) file an issue with
   citation, (c) fold into the next relevant PR, (d) explicitly defer with a
   reason. Fixing everything at once defeats bisect and review.
8. **One fix per isolated worktree subagent.** Each fix runs `npm ci &&
   npm test` plus a targeted regression test in its own worktree. No
   fix ships without a regression test that would have caught the original
   symptom.
9. **Watch live CI on your own in-flight PRs.** Static findings are only
   half the audit. The broken third-party Action in
   `saml-sso-registration.yml` (#15828) was not caught by reading code — it
   was caught by watching an unrelated PR fail CI and reading the log. Keep
   a browser tab or `gh run watch` on active PRs during the audit window.
10. **Targeted search, not enumeration, for stale follow-up commitments.**
   `gh search issues "Next Action" OR "follow-up" is:open` beats scrolling.
   Stale "we'll fix this next PR" comments are a rich seam of real bugs
   whose original context has evaporated.

---

## Self-Healing Correction Pattern Catalog

Nine patterns, each observed and fixed in the cited PR. Format:
**Symptom** → **Root cause** → **Fix**.

### 1. Unguarded `removeLabel` race (PR #15821)

- **Symptom:** Workflow step fails with `HttpError: Label does not exist on
  this issue` when two workflows race to remove the same label.
- **Root cause:** `octokit.rest.issues.removeLabel` throws 404 if the label is
  already gone. No idempotency guard.
- **Fix:** Wrap in `try { ... } catch (e) { if (e.status !== 404) throw e; }`,
  or use the internal `removeLabelIfPresent` helper. Never call `removeLabel`
  bare in a workflow that can race.

### 9. A marker asserting a postcondition nothing verified (PRs #17782, #17791, #17792, #17793, #17797)

- **Symptom:** A label, exit code, `Closes #N`, count, or comment states that
  something happened. Every check is green. The thing did not happen. Often the
  marker also *blocks* the work that would clear it, so the state cannot be
  left — an open issue labelled `issue:done` could never receive another WR PR,
  and nothing could remove the label.
- **Root cause:** The signal was written without confirming the state, and read
  without confirming it either. Both halves are needed for the defect and both
  are single missing lines, so review sees nothing wrong: the defect is the
  *absence* of a check elsewhere.
- **Fix:** Establish the state first, then write the marker — and if you cannot
  confirm the state, write no marker. On the consuming side, decide on the
  state, and treat a marker that contradicts it as damage to repair rather than
  a fact to obey. Guard it by **naming, not counting**; by asserting behaviour
  rather than the presence of a string; by stripping comments before matching
  source; and by mutation-testing the guard against the exact defect. Full
  rule, with all eight observed instances:
  `standards/VERIFY_THE_POSTCONDITION.md` (RVS-VERIFY-001).

### 2. Missing `allowError` on internal API helpers (PR #15824)

- **Symptom:** A helper that is *meant* to be best-effort (e.g. "comment on
  issue if possible") aborts the entire workflow on transient 5xx.
- **Root cause:** The helper called the API client directly without an
  `allowError: true` (or equivalent try/catch) escape hatch. Callers had no
  way to say "this is advisory."
- **Fix:** Add an `allowError` option (default `false` to preserve strict
  callers). When `true`, log-and-continue on non-2xx. Audit every call site
  to set it explicitly.

### 3. Default `GITHUB_TOKEN` on agent-created PRs (PR #15823)

- **Symptom:** Agent-created PR triggers workflows but downstream jobs cannot
  push labels/comments/reviews; the token has read-only scopes on PRs from
  forks or from GITHUB_TOKEN-authored refs.
- **Root cause:** The workflow relied on the default `GITHUB_TOKEN`, which is
  intentionally minimal for security. Agent PRs need elevated but scoped
  credentials.
- **Fix:** Use a scoped bot PAT (or GitHub App installation token) stored as a
  secret, and pass it explicitly to the steps that need write. Never widen the
  default token's `permissions:` block globally as a shortcut.

### 4. Secrets via argv vs. stdin (PR #15825)

- **Symptom:** Secret value appears in `ps auxf` output on the runner and in
  any process-listing debug step.
- **Root cause:** Secret passed as a positional CLI argument
  (`mycli --token=$SECRET`) instead of via stdin or an env var.
- **Fix:** Pipe via stdin (`printf '%s' "$SECRET" | mycli --token-stdin`) or
  pass via environment (`MYCLI_TOKEN="$SECRET" mycli`). Never argv.

### 5. Bash bare-array-variable bug (PR #15827)

- **Symptom:** Loop over an array only processes the first element, or
  `set -u` reports "unbound variable" on a defined array.
- **Root cause:** `$arr` in bash expands to `${arr[0]}`, not the whole array.
  Must be `"${arr[@]}"`.
- **Fix:** Always quote and index: `for x in "${arr[@]}"; do ... done`. Enable
  `shellcheck` in CI for `.github/scripts/**/*.sh` to catch this class.

### 6. Exit codes as proxy metrics vs. true resolution state (PR #15826)

- **Symptom:** A dispatcher script exits `0` because "the agent ran," even
  though the agent produced no PR / left the issue unresolved. Downstream
  metrics report success; the issue silently rots.
- **Root cause:** The script conflated "the subprocess did not crash" with
  "the work is done." Exit code was a proxy for process health, not for
  resolution.
- **Fix:** Exit code must reflect **true resolution state**. If the agent
  ran-but-produced-nothing, exit non-zero (or a distinct code, e.g. `2` for
  "ran, no output") so the caller can distinguish. Document the code table in
  the script header.

### 7. `nosemgrep` suppression comment adjacency (PR #15825)

- **Symptom:** Semgrep still flags a line that has a `# nosemgrep: rule-id`
  comment "nearby."
- **Root cause:** `nosemgrep` must be on the *same line* as the finding, or
  on the immediately preceding line — not two lines up, not after a blank
  line, not on the closing brace.
- **Fix:** Place `# nosemgrep: <rule-id>` on the exact offending line (end of
  line) or the line immediately above with no blank line between. Always cite
  the specific rule id; never bare `# nosemgrep`.

### 8. Broken third-party GitHub Action failing every PR (PR #15828)

- **Symptom:** Every PR in the repo shows a red check from the same
  third-party Action (e.g. a SAML-SSO registration Action pinned to a tag
  that was force-moved or deleted upstream).
- **Root cause:** Third-party Action pinned by mutable tag (`@v1`) rather than
  by commit SHA. Upstream changed the tag; every workflow run now fetches a
  broken ref.
- **Fix:** Pin third-party Actions by full commit SHA with the tag as a
  trailing comment: `uses: owner/action@<sha> # v1.2.3`. Add a Dependabot
  entry so bumps are reviewed. If the Action is not essential, remove it.
Each entry: **Symptom → Root Cause → Fix**, with the PR that established
the pattern.
Each entry is Symptom / Root Cause / Fix and cites the PR that shipped the
correction. Use this catalog as a lookup table before opening a new
investigation.

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

### 1. Unguarded `removeLabel` race (PR #15821)

- **Symptom:** Workflow step fails with `HttpError: Label does not exist on
  this issue` when two workflows race to remove the same label.
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

- **This file** — audit methodology + fix-pattern catalog (the *before* and
  the *lookup*).
- **`learnings.md`** — dated per-incident postmortems (the *after*).
- **`CLAUDE.md` "Recurring gotchas"** — short inline reminders for the agent
  loop, with a pointer here for depth.
- **`standards/GREEN_MAIN_STANDARD.md`** — the rule that main stays green;
  this playbook is how we keep it green when it drifts.

If you fix a pattern that isn't in the catalog above, add it here in the same
Symptom / Root cause / Fix format and cite the PR. That is how self-healing
compounds.
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
