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

Use this as a lookup table before opening a new investigation — that is what
`CLAUDE.md` sends you here for. If you fix a pattern that is not below, add it
in the same shape and cite the PR. That is how self-healing compounds.

> This catalog was present in this file **three times** between #15828 and
> #17843, in three write-ups that had drifted apart — entry 2 prescribed three
> different fixes, and only one of them matched `CLAUDE.md`. A lookup landed on
> whichever copy came first. The copies are merged below, keeping every distinct
> claim; where they disagreed, the version consistent with `CLAUDE.md` and with
> the PRs actually cited leads, and the superseded advice is kept as a note
> rather than dropped. See #17810.

### 1. Unguarded `removeLabel` race (PR #15821)

- **Symptom:** A workflow step fails with `HttpError: Label does not exist on
  this issue` when two workflows race to remove the same label.
- **Root cause:** `octokit.rest.issues.removeLabel` is not idempotent — it
  throws 404 if the label is already gone, so the second caller of a pair
  fails. No idempotency guard.
- **Fix:** Wrap in a guard that swallows **only** 404:
  `try { … } catch (e) { if (e.status !== 404) throw e; }`, or the chained
  `.catch((err) => { if (err.status !== 404) throw err; })`. You may instead
  check `listLabelsOnIssue` first, or use the internal `removeLabelIfPresent`
  helper. Never call `removeLabel` bare in a workflow that can race.
- **Since #17787 / #17799:** the guard is judged by what it *does*, not by the
  presence of a `.catch`. `.catch(() => {})` is the defect this entry exists to
  prevent, not a fix for it: it cannot tell "already gone" — the desired end
  state — from "this token may not write labels". A 401 or 403 must still
  surface. ChaosMender rule `LABEL-RACE-001` enforces this.

### 2. Missing `allowError` on internal API helpers (PR #15824)

- **Symptom:** A helper that is *meant* — or documented — to be best-effort
  ("comment on the issue if possible") aborts the entire workflow or job on a
  transient 5xx.
- **Root cause:** The helper forwards the raw Octokit call without the shared
  `allowError` / retry wrapper used elsewhere in the codebase, so callers had
  no way to say "this is advisory."
- **Fix:** Route all internal Octokit calls through the shared
  `withRetry({ allowError: [404, 5xx] })` helper. A bare `octokit.rest.*` call
  in a workflow script is a smell. This is `CLAUDE.md` gotcha #2.
- **Superseded:** two earlier write-ups of this entry prescribed *building* the
  escape hatch — "add an `allowError` option, default `false`" and "callers
  that tolerate failure must pass `allowError: true` explicitly, and the helper
  documents the default at the top of the file". Both predate the shared
  wrapper. Kept because a helper outside the wrapper's reach still needs an
  explicit default, and callers still have to set it deliberately.

### 3. Default `GITHUB_TOKEN` on agent-created PRs (PR #15823)

- **Symptom:** An agent-authored PR opens, but downstream jobs cannot push
  labels, comments or reviews — and status checks never start at all.
- **Root cause:** Two properties of the default `GITHUB_TOKEN`, both
  intentional. It is minimal by design, and read-only on PRs from forks or from
  `GITHUB_TOKEN`-authored refs. And a push made with it **does not trigger
  further workflow runs**, so `on: push` and `on: pull_request` workflows never
  fire.
- **Fix:** Use a dedicated GitHub App installation token, or a fine-scoped PAT
  stored in `secrets.AGENT_PR_TOKEN`, when the agent opens the PR. Pass it
  explicitly to the steps that need write; keep the default token for human
  PRs; document the token's scopes in `standards/`. Never widen the default
  token's `permissions:` block globally as a shortcut.

### 4. Secrets via argv vs. stdin (PR #15825)

- **Symptom:** The secret's value appears in `ps auxf` output on the runner, in
  the process list of any debug step, and in CI logs — and is readable by any
  subprocess that can see `/proc`.
- **Root cause:** The secret was passed as a command-line argument
  (`tool --token $SECRET`, `mycli --token=$SECRET`) instead of via stdin or an
  environment variable.
- **Fix:** Pipe it on stdin — `printf '%s' "$SECRET" | tool --token-stdin`, or
  `--token-file /dev/stdin` — or pass it in the environment for a tool that
  reads one directly (`MYCLI_TOKEN="$SECRET" mycli`). Never interpolate a
  secret into argv. `curl` takes its headers from `curl --config -`.

### 5. Bash bare-array-variable bug (PR #15827)

- **Symptom:** A loop or command receives only the first element of an array
  and the rest are silently dropped — the script appears to run and does the
  wrong thing. Under `set -u` it can instead report "unbound variable" on an
  array that is plainly defined.
- **Root cause:** Bare `$arr` in bash expands to `${arr[0]}`, not to the whole
  array. `for x in $ARR` iterates one element.
- **Fix:** Always quote and index: `for x in "${ARR[@]}"; do … done`. Run
  `shellcheck` in CI over `.github/scripts/**/*.sh`, or as a pre-commit hook —
  **SC2128** catches this exact bug.

### 6. Exit codes as proxy metrics vs. true resolution state (PR #15826)

- **Symptom:** A workflow reports success while the underlying problem is
  untouched. Three shapes seen: a dispatcher exits `0` because "the agent ran"
  though it produced no PR and left the issue unresolved; a scan reports
  "0 issues found" because the *query* errored, not because the repo is clean;
  a job goes green because the tool finished. Downstream metrics report
  success and the issue silently rots.
- **Root cause:** Conflating process-completion with outcome. `exit 0` meant
  "the analyzer finished," not "there are no findings."
- **Fix:** An exit code MUST reflect **true resolution state**. Wrap the tool
  and re-exit non-zero when the postcondition — empty findings, closed issue,
  green diff — is not met. **Assert, do not comment.** Where the caller needs
  to tell outcomes apart, emit an explicit machine-readable state
  (`{ "status": "clean" | "dirty" | "errored", … }`) and gate on *that*,
  failing loudly on `errored`; or use a distinct exit code (e.g. `2` for "ran,
  produced nothing") and document the code table in the script header.

### 7. `nosemgrep` suppression comment adjacency (PR #15825)

- **Symptom:** Semgrep keeps flagging a line that visibly has a `# nosemgrep`
  suppression "nearby".
- **Root cause:** The suppression must be on the *same line* as the flagged
  expression, or on the line immediately above with **no blank line between**.
  A blank line, an intervening comment, a line-continuation, or placing it on
  the closing brace all break the adjacency, and the suppression silently
  no-ops.
- **Fix:** Put `# nosemgrep: <rule-id>` at the end of the exact flagged line,
  or on the line directly above with no gap. Always name the rule id, so the
  suppression is narrow and auditable — a bare `# nosemgrep` is over-broad and
  will be rejected in review.

### 8. Broken third-party GitHub Action failing every PR (PR #15828)

- **Symptom:** Every PR in the repo shows a red check from a workflow nobody
  recently touched or recognises (`saml-sso-registration.yml`), and merges are
  blocked. The failing step is inside a third-party Action.
- **Root cause:** The Action was pinned by a mutable tag (`@v1`, `@v3`,
  `@main`). Upstream force-moved or deleted the tag, shipped a breaking change
  behind it, or archived the repository — and every workflow run now fetches a
  broken ref.
- **Fix:** Pin every third-party Action to a full commit SHA with the tag as a
  trailing comment: `uses: owner/action@<sha> # v1.2.3`. Add Dependabot for the
  `github-actions` ecosystem so bumps arrive as reviewable PRs. When a pinned
  Action goes stale, replace or fork it — **do not unpin**. If the Action is
  not essential, remove the workflow and record the removal in `learnings.md`.
  This is `CLAUDE.md` gotcha #8.
- **Since #17832:** two further properties of `uses:` resolution, both learned
  the hard way. The runner resolves **every** step's action during "Prepare all
  required actions", *before* any `if:` is evaluated — so a `uses:` you believe
  is switched off still has to resolve, and an unresolvable one fails the job
  having run nothing. And `actionlint` validates the **shape** of a `uses:`,
  not its existence: `owner/repo@ref` is correctly shaped whatever the
  codepoints, which is how two refs containing CJK characters sat failing every
  merged PR.

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

---

## Where the memory lives

- **This file (`standards/AUDIT_AND_SELF_HEALING_PLAYBOOK.md`)** — the *method*
  (how to run an audit) and the *catalog* (the recurring patterns). The
  *before* and the *lookup*. Update the catalog when a new recurring pattern is
  fixed.
- **`learnings.md`** — the chronological incident log: dated per-incident
  postmortems, one entry per event. The *after*. Keep appending here; do not
  fold an incident into this playbook until it recurs.
- **`CLAUDE.md` "Recurring gotchas"** — the short-form checklist the agent
  reads on every task, with a pointer here for depth. A new gotcha belongs
  there once a pattern has bitten twice.
- **`standards/GREEN_MAIN_STANDARD.md`** — the outcome contract this playbook
  serves, and the invariant it exists to defend: `main` stays green. If the
  playbook and the standard disagree, **the standard wins** and this file gets
  updated.

When you learn something new in an audit: add the incident to `learnings.md`,
and if the pattern is likely to recur, add a numbered entry to the catalog
above with its originating PR.
