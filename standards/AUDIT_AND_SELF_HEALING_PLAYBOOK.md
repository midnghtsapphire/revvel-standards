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

---

## Self-Healing Correction Pattern Catalog

Eight patterns, each observed and fixed in the cited PR. Format:
**Symptom** → **Root cause** → **Fix**.

### 1. Unguarded `removeLabel` race (PR #15821)

- **Symptom:** Workflow step fails with `HttpError: Label does not exist on
  this issue` when two workflows race to remove the same label.
- **Root cause:** `octokit.rest.issues.removeLabel` throws 404 if the label is
  already gone. No idempotency guard.
- **Fix:** Wrap in `try { ... } catch (e) { if (e.status !== 404) throw e; }`,
  or use the internal `removeLabelIfPresent` helper. Never call `removeLabel`
  bare in a workflow that can race.

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
