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
