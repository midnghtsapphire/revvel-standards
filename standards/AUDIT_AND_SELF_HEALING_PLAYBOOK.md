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

**Status:** Locked-in (2026-07-13)
**Case evidence:** PRs #15821 #15822 #15823 #15824 #15825 #15826 #15827 #15828

## Why this doc exists

`learnings.md` is an incident log — one entry per specific failure, written after
the fact. It answers "what broke on this date." It does not answer "how do I run
an audit well" or "I've seen this exact shape of bug before, what's the fix."
This doc is the missing piece: a repeatable **method** for auditing the fleet
(`## How to Run an Audit`) and a fast-lookup **catalog** of fix patterns that
already showed up more than once (`## Self-Healing Correction Pattern Catalog`),
so the next agent — human or AI — doesn't have to rediscover either from scratch.
It was written after a 2026-07-13 audit pass that used the method below to find
and fix eight distinct issues (PRs #15821–#15828); read it before your next audit,
and add to the catalog instead of re-deriving a pattern that's already here.

## How to Run an Audit

1. **Scope into parallel, read-only research agents, one category each.** Don't
   have one agent try to cover the whole repo. Split by concern — e.g. one agent
   for workflow YAML gotchas (missing `GH_REPO`/auth/permissions/unsafe
   interpolation — see CLAUDE.md gotchas #1–#4), one for `scripts/` correctness
   bugs, one for unresolved incidents in `learnings.md` plus broken
   `workflow_run` references. None of the research agents may edit anything —
   research and fixing are separate passes.
2. **Demand file:line citations and real code quotes, not summaries.** A finding
   that says "some workflows might be missing permissions" is not actionable.
   "`self-healing-alert.yml:42`, job `escalate`, has no `issues: write`" is. Tell
   research agents this explicitly, and reject vague findings.
3. **Cross-reference `learnings.md`'s incident history for recurrence.** A
   pattern that has already bitten the repo once is a strong signal it will bite
   it again elsewhere — grep the log for the same shape of bug before assuming a
   finding is novel.
4. **Triage before fixing — don't rush every finding into a PR.** Not everything
   the research pass turns up is worth fixing immediately. Rank findings by
   impact and mechanical-fixability, and pick a small, distinct, high-confidence
   set for the first pass. Explicitly defer the rest as follow-up (e.g. a large
   batch of shell-injection findings in `auto-error-handler.yml` and similar was
   deliberately deferred on 2026-07-13 rather than rushed alongside eight other
   in-flight fixes) — write down what you deferred and why, so it isn't lost.
5. **One fix, one subagent, one isolated worktree.** Assign each chosen fix to
   its own subagent running in an isolated git worktree (`isolation: 'worktree'`)
   so parallel agents touching different files never collide or interleave (see
   `standards/GREEN_MAIN_STANDARD.md` for what happens when they do). Each fix
   subagent should: re-read the exact current code first (line numbers from a
   static audit drift — never trust them blindly), make the minimal fix, run
   `npm ci && npm test` locally, add a regression test where practical, then open
   its own draft PR. For a bug that manifests as a false-success exit code,
   reproduce it end-to-end before trusting the fix: build the failing scenario
   for real (e.g. a temp git repo with a forced binary merge conflict), run the
   broken script, confirm the bad exit code, then verify the fix flips it — see
   the conflict-resolver fix, PR #15826.
6. **Watch live CI on your own fix PRs, not just static findings.** While the
   fix PRs are in flight, watch their real CI output. A new bug can surface that
   no static pass would find — e.g. on 2026-07-13, babysitting checks across
   several in-flight PRs surfaced the *same* check failing on all of them
   (`saml-sso-registration.yml`'s "Verify SAML SSO Identity" step), which traced
   to a broken third-party action tag (`gagoar/get-saml-identity-action@0.9.0`
   missing `dist/index.js`). Confirm via actual job logs before fixing — never
   guess at a live failure's cause. See PR #15828.
7. **When hunting for stale "we'll fix this later" commitments, search
   targeted, don't enumerate.** A repo with 15,000+ issues can't be read
   linearly. Use targeted phrase search (`search_issues`/`search_pull_requests`
   for "follow-up", "Next Action:", "deferred", etc.) and triage the top hits.
   For each candidate, verify against the *current* repo state — grep for
   whether the promised file or fix actually exists — rather than trusting a
   comment that says "done." A closed issue or a cheerful status update is not
   evidence; the file being there is.

## Tools & Skills Used

The concrete toolset behind the method above, for whoever runs the next one of
these (see `learnings.md`'s 2026-07-13T15:45:00Z entry for the full session
writeup this section was distilled from):

- **Parallel subagent orchestration.** Spawn read-only research agents (no file
  edits) for the investigation pass, one per category, in a single batch so
  they run concurrently. Give each a self-contained prompt — file paths, line
  numbers, exact repo conventions — since a subagent has no memory of the
  parent conversation. Once findings are triaged, spawn one code-writing agent
  per fix, each in an **isolated worktree**, so N agents editing different
  files never race on the same working tree or each other's git state.
- **Progress tracking that mirrors reality.** Track every distinct fix/feature
  as its own task, moved to in-progress on dispatch and completed only once a
  real PR/issue exists — not a formality; it's what keeps a long session with
  many concurrent background agents coherent instead of losing track of what
  actually shipped.
- **GitHub interaction via API/MCP tooling, not assumption.** Use the GitHub
  API (or your environment's MCP wrapper for it) for the full PR/issue
  lifecycle — search/list for recon, reading actual check-run output and job
  logs to diagnose CI failures instead of guessing from a check's name alone,
  and the create/update/merge/comment calls for the outcome. Some environments
  don't have a local `gh` CLI available — check first rather than assuming.
- **Verify by execution, not by reading.** The highest-confidence findings in
  this doc's catalog were confirmed by actually running the broken code path —
  compiling an extracted script payload, reproducing a bug end-to-end in a
  throwaway repo — not by reading the code and reasoning about what it
  probably does. Docs and comments in a large, long-lived automation fleet
  drift from reality; grep/read/execute the live tree before trusting a claim
  about it, including claims in this repo's own documentation.
- **Direct (non-delegated) edits, used sparingly.** Reserve doing something
  yourself, rather than spinning up an agent for it, for changes you're
  confident are small and low-risk — a one-line follow-up to a subagent's
  already-reviewed work, a PR-metadata change. If it needs real investigation
  or touches logic, delegate it.
- **When a tool fails, don't block indefinitely on it.** State the assumption
  you're proceeding under and keep moving; note it clearly so the human can
  redirect. A broken clarification channel is not a reason to stall a whole
  session.
- **Packaging as a Skill is a natural next step, not yet done.** As of this
  writing the loop above ("diagnose → scope a fix → isolated-worktree agent →
  verify → draft PR") is hand-assembled each time via direct tool
  orchestration, not a packaged Skill/slash-command. If this becomes a
  recurring need, packaging it would make it invocable in one step.

## Self-Healing Correction Pattern Catalog

Fast lookup for a future agent debugging something that looks like one of
these. Each pattern below was found and fixed at least once in this repo.

### 1. Unguarded `removeLabel` race
- **Symptom:** A script iterating GitHub labels to remove one crashes with a 404.
- **Root cause:** No try/catch around the removal call. A concurrent workflow
  removed the same label between the fetch and the removal.
- **Fix:** Wrap the removal in try/catch, swallow 404, rethrow anything else —
  match the try/catch style already established elsewhere in the same file
  rather than inventing a new one. See PR #15821 (`issue-state-machine`).

### 2. Missing `allowError: true` on internal API helpers
- **Symptom:** A self-healing "sweep" script hard-crashes entirely on one
  transient API error (rate limit, 5xx) instead of finishing the rest of the
  sweep.
- **Root cause:** The script calls a shared `repoApi()`/`api()` helper without
  `allowError`, so any single failed call propagates and kills the whole run.
- **Fix:** Allow the error, log a warning, fall back to an empty/safe default,
  and keep going. A self-healing script's job is to survive partial failure,
  not propagate it. See PR #15824 (`biome-crew`).

### 3. Default `GITHUB_TOKEN` used for agent-created PRs
- **Symptom:** Agent-generated PRs (or labels) silently skip all downstream
  `pull_request`-gated review/CI workflows.
- **Root cause:** GitHub blocks the default `GITHUB_TOKEN` from triggering other
  workflows. A PR or label created with it looks fine but never cascades.
- **Fix:** Use the repo's admin-PAT-with-fallback pattern (CLAUDE.md gotcha #2)
  for any job whose output needs to trigger other workflows. See PR #15823
  (`coding-agent-pat-fallback`).

### 4. Secrets passed via argv instead of stdin
- **Symptom:** A plaintext secret is readable via `/proc/<pid>/cmdline` or
  `ps aux` for the life of the process.
- **Root cause:** The secret was passed as a CLI argument, e.g.
  `gh secret set NAME --body VALUE`.
- **Fix:** Pipe the value via stdin instead — `gh secret set NAME` reads stdin
  when `--body` is omitted. See PR #15825 (`credential-agent-secret-stdin`).

### 5. Bash bare-array-variable bug
- **Symptom:** A membership check against a bash array only ever matches the
  array's first element; everything else silently fails the check.
- **Root cause:** `"$ARRAY_VAR"` without `[@]`/`[*]` expands to just the first
  element, not the whole array.
- **Fix:** `printf '%s\n' "${ARRAY_VAR[@]}" | grep -qx "$needle"`, or
  `[[ " ${ARRAY_VAR[*]} " == *" $needle "* ]]`. See PR #15827
  (`secrets-guardian-array-match`).

### 6. Exit code must reflect true resolution state, not a proxy metric
- **Symptom:** A merge-conflict auto-resolver exits 0 on a file that was never
  actually resolved, and the caller trusts exit 0 to mean "safe to push."
- **Root cause:** The script's gating condition was a counter for one specific
  "ambiguous" case, which stays zero — and looks like success — when a
  *different* failure path (e.g. a file with zero detected conflict markers)
  never increments it either.
- **Fix:** Gate on an explicit "was everything actually fully resolved?" check,
  not a metric that can read zero for the wrong reason. See PR #15826
  (`conflict-resolver-exit-code`) — verified by reproducing a real forced binary
  merge conflict end-to-end and confirming the fix flips the exit code.

### 7. `nosemgrep` suppression comment adjacency
- **Symptom:** A previously clean file starts failing the semgrep gate with no
  code-behavior change.
- **Root cause:** Semgrep's inline suppression only applies when the
  `// nosemgrep: <rule-id>` comment is immediately above (or on) the flagged
  line. A new explanatory comment inserted *between* the directive and the code
  silently breaks the suppression.
- **Fix:** When adding comments near a `nosemgrep`-suppressed line, keep the
  directive as the last comment line immediately before the code — move it back
  into place if something landed between them. See PR #15825
  (`credential-agent-secret-stdin`, second commit).

### 8. Broken third-party GitHub Action failing every PR
- **Symptom:** The same named check fails identically across many unrelated,
  otherwise-healthy PRs.
- **Root cause:** A pinned third-party Action tag is itself broken (here:
  `gagoar/get-saml-identity-action@0.9.0` was missing `dist/index.js` in the
  published tag), not anything in this repo's diff.
- **Fix:** Confirm via job logs that the failure is identical and pre-existing
  across PRs (not something your change caused), then replace the dependency —
  e.g. inline the equivalent logic via GraphQL instead of depending on the
  broken Action. This is also the concrete example behind the "watch live CI on
  your own PRs" audit step above. See PR #15828
  (`saml-sso-check-broken-action`).

### 9. GitHub installation API rate limit during CodeQL SARIF upload
- **Symptom:** CodeQL `Analyze` job fails with `API rate limit exceeded for
  installation` during SARIF fingerprinting/upload or telemetry gathering.
  The analysis itself completes, but results never reach the Security tab.
- **Root cause:** Multiple matrix jobs (e.g. `actions`, `javascript-typescript`,
  `python`) run simultaneously, each hitting the GitHub REST API during their
  post-analysis upload phase. The installation token's rate limit is shared
  across ALL concurrent workflow runs in the repo — parallel SARIF uploads
  from the same workflow, plus any other automation, can exhaust it.
- **Fix:** (1) Add `max-parallel: 1` to the matrix strategy so language scans
  serialize their upload phases. (2) Add a retry step with 60s backoff after
  the first upload attempt fails. The `continue-on-error: true` on upload
  already prevents PR gating. See issue #15851 (`codeql.yml`).
- **Tools:** `github/codeql-action/upload-sarif@v4`, `wait-for-processing`,
  GitHub Actions `get_job_logs`, `max-parallel` strategy key.

## Where the memory lives

- This playbook: `standards/AUDIT_AND_SELF_HEALING_PLAYBOOK.md`
- Incident-by-incident detail: `learnings.md`
- The red-gate discipline that protects every fix above:
  `standards/GREEN_MAIN_STANDARD.md`
- Recurring workflow gotchas (#1–#7): `CLAUDE.md`, "Recurring gotchas"
