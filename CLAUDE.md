# CLAUDE.md — Agent operating guide

This file is the fast-lookup operating guide for any Claude / Codex / OpenHands
agent working in this repository. It is intentionally short. Deep procedural
detail lives in `standards/`.

---

## Prime directive

**Ship revenue-producing work. Keep `main` green. Do not leak secrets.**

Everything below is in service of those three, in that order.

---

## Before you start

1. Read the issue / WR carefully. If scope is ambiguous, ask before coding.
2. Skim `standards/GREEN_MAIN_STANDARD.md` — the non-negotiable CI contract.
3. Skim `standards/AUDIT_AND_SELF_HEALING_PLAYBOOK.md` — the repeatable audit
   method and the fix-pattern catalog for known recurring bugs. If your task
   is an audit or a self-healing fix, this is your primary reference.
4. Grep `learnings.md` for keywords from the symptom you're about to fix. If
   we've seen it before, reuse the documented fix.

---

## Recurring gotchas

These are the top patterns that have burned us more than once. The full
catalog with reference PRs lives in
`standards/AUDIT_AND_SELF_HEALING_PLAYBOOK.md` — this list is just the
hot-lookup.

1. **Unguarded `removeLabel` calls race.** Wrap in try/catch and add a
   `concurrency:` block to the workflow. (PR #15821)
2. **Internal API helpers need an explicit `allowError` option.** A 4xx
   should not abort the workflow when the caller expects to branch on
   failure. (PR #15824)
3. **Default `GITHUB_TOKEN` on agent-created PRs does not trigger
   downstream workflows.** Use a dedicated PAT / GitHub App token stored as
   a secret. Never in argv. (PR #15823)
4. **Secrets go on stdin, never argv.** `echo "$SECRET" | tool
   --token-stdin`, not `tool --token=$SECRET`. argv is visible in `ps` and
   often echoed on failure. (PR #15825)
5. **Bash arrays: always `"${arr[@]}"`.** `"$arr"` silently gives you
   element 0 only. Run scripts under `set -euo pipefail`. (PR #15827)
6. **Exit codes must reflect true resolution state, not tool liveness.**
   After the tool runs, re-query the source of truth (issue state, merge
   status, label presence) and exit non-zero if the desired end state is
   not observed. "The command exited 0" is not the same as "the outcome
   happened." (PR #15826)
7. **`nosemgrep` suppression comments must be adjacent to the finding.**
   Same line as the offending code (preferred), or the line immediately
   above with no blank line between. Always name the rule id
   (`# nosemgrep: rule-id`), never a bare `# nosemgrep`. (PR #15825)

When you hit a *new* recurring gotcha (≥2 incidents), add it here **and**
add a Symptom/Root Cause/Fix entry to the playbook catalog.

---

## Working style

- One PR = one concern. If you find a second bug mid-fix, open a second
  issue; do not expand scope.
- Every fix ships with a regression test where feasible.
- Every fix PR appends an entry to `learnings.md`.
- Conventional-commit PR titles (`feat:`, `fix:`, `docs:`, `chore:`, etc.).
- Never commit secrets. Never echo secrets. Never put secrets in argv.

---

## Where the memory lives

- `standards/GREEN_MAIN_STANDARD.md` — the CI contract.
- `standards/AUDIT_AND_SELF_HEALING_PLAYBOOK.md` — audit method +
  fix-pattern catalog.
- `learnings.md` — chronological incident log.
- `CLAUDE.md` (this file) — hot-lookup gotchas + working style.
# CLAUDE.md

Fast-path guidance for Claude (and other AI coding agents) working in this
repository. Read this **first**, then the standards documents it points to.

## Prime directive

$10k/month → $10M total in 3 years. Every change should either (a) directly
move revenue, (b) protect the systems that produce revenue (green `main`,
working CI, no leaked secrets), or (c) reduce the cost of future changes
(docs, standards, self-healing playbooks).

## Read these before you edit

- `standards/GREEN_MAIN_STANDARD.md` — `main` stays green. Non-negotiable.
- `standards/AUDIT_AND_SELF_HEALING_PLAYBOOK.md` — **how to run an audit**
  and **the fix-pattern catalog** for recurring bugs. If your task is
  "audit," "clean up," "self-heal," or "why is CI broken," start here.
- `learnings.md` — incident log. Grep it before assuming a finding is novel.

## Recurring gotchas

These are the ones that keep coming back. See
`standards/AUDIT_AND_SELF_HEALING_PLAYBOOK.md` for the full pattern catalog
with PR citations.

1. **`removeLabel` throws 404.** Wrap `github.rest.issues.removeLabel` in
   `try/catch` and swallow `error.status === 404`. Label-already-absent is
   the desired end state, not a failure.
2. **Internal API helpers need `allowError`.** Every helper that wraps a
   GitHub API call must accept an `allowError` / `allowedStatuses` option so
   callers can opt into tolerating expected non-2xx responses.
3. **Default `GITHUB_TOKEN` won't trigger downstream workflows on
   agent-created PRs.** Use a PAT or GitHub App token when the PR must run
   required checks or auto-merge.
4. **Secrets go over stdin, not argv.** `echo "$SECRET" | tool
   --token-stdin`, never `tool --token "$SECRET"`. Argv leaks to `ps`, to
   shell history, and to logs when `set -x` is on.
5. **Bash arrays: `"${arr[@]}"`, never bare `"$arr"`.** Bare expansion
   silently gives you only element 0. Run `shellcheck` in CI.
6. **Exit codes must reflect true resolution state, not mere completion.**
   Exit 0 means "the target condition is achieved," not "the script ran to
   the end." Re-check the target state before exiting and return non-zero
   if it isn't resolved. Otherwise dashboards go green while reality stays
   broken.
7. **`nosemgrep` suppression comments must be immediately adjacent.**
   `# nosemgrep: rule-id` only suppresses the same line or the line
   directly above with no blank line between. A gap breaks the
   association. Always name the rule ID — bare `# nosemgrep` is
   over-broad.

## When you finish

- Run `npm ci && npm test` (or the repo's documented equivalent) before
  opening a PR.
- Add a regression test for any bug you fix.
- If the bug matches a pattern in the self-healing catalog, cite the
  catalog entry in your PR description. If it's a new pattern that has
  recurred, promote it into the catalog in the same PR.
- Use conventional-commit PR titles (`feat:`, `fix:`, `docs:`, `chore:`,
  etc.).
# CLAUDE.md — Agent memory for `revvel-standards`

This repo is an automation fleet: **166+ GitHub Actions workflows** plus Node/shell
scripts that triage issues, route work to coding agents, open/review/merge PRs, and
**self-heal** when things break. Most "logic" lives in `.github/workflows/*.yml` and
`scripts/`. When you change automation, keep the loop able to run unattended.

## The self-healing loop (how it's supposed to run on its own)

1. **Detect** — `self-healing.yml` (every 4h) and `agent-monitor.yml` scan recent
   workflow runs, stuck issues, and agent health.
2. **File work** — failures become issues/WRs (e.g. `[AGENT-FAILURE]`,
   `[SELF-HEAL]`) with labels like `auto-fix`, `ralph-loop`, `scorecard`.
3. **Assign** — `openrouter-assignee.yml` / routers pick up labeled issues.
4. **Fix & PR** — `wr-pr-creation.yml` and coding-agent workflows open PRs.
5. **Review/merge** — AI review + `auto-merge` / `auto-approve-clean-prs`.
6. **Reset** — `reset-self-heal-issue.yml` re-labels + re-triggers a stuck item.

`repo-self-healer.yml` (daily 3 AM) runs `scripts/self-heal-repo.js` for cleanup
(close stale, dedupe). The gate that protects all of this is CircleCI +
`wr-lint` / `fix-wr-gate`.

## Recurring gotchas (these are what actually break the fleet)

### 1. `gh` needs a repo target when there's no checkout
Jobs that call the `gh` CLI but have **no `actions/checkout` step** fail with
`failed to run git: fatal: not a git repository ... exit 1`, because `gh` infers
the repo from the local git remote. Fix by setting at job/workflow `env:`:
```yaml
env:
  GH_REPO: ${{ github.repository }}
```
(Or pass `--repo ${{ github.repository }}` on every `gh` call.) `gh api repos/OWNER/REPO/...`
with a full literal path is exempt, but `gh issue create/comment/list` and
`gh workflow run` are not. **Fixed so far:** `agent-monitor.yml`, `self-healing.yml`.

### 2. `gh` must be authenticated
A job using `gh` with **no `GH_TOKEN`/`GITHUB_TOKEN` env** runs unauthenticated and
fails (or hits anonymous rate limits). Use the repo-standard token-with-fallback so
healing actions can cascade to downstream workflows (the default `GITHUB_TOKEN`
cannot trigger other workflows; the PAT can):
```yaml
env:
  GH_TOKEN: ${{ secrets.ADMIN_GITHUB_TOKEN != '' && secrets.ADMIN_GITHUB_TOKEN || secrets.GITHUB_TOKEN }}
```

### 3. Permissions must match what the job does
Default `permissions: contents: read` is not enough for jobs that label issues
(`issues: write`), re-run workflows (`actions: write`), or touch PRs
(`pull-requests: write`). Grant the narrowest set the job actually needs.

### 4. Don't interpolate untrusted `${{ ... }}` into `run:` shells
`${{ github.event.* }}` / issue / PR / comment bodies interpolated directly into a
`run:` script is a command-injection vector. Pass them through `env:` and reference
`"$VAR"` inside the script instead. Internal computed outputs (counts, statuses)
are lower risk but the env pattern is still preferred.

### 5. A red gate on main is a stop sign — and watch for interleaved merges
Never build on a red `npm test` (see `standards/GREEN_MAIN_STANDARD.md`; incident
entries in `learnings.md`). On 2026-07-08, six red test files on main turned out
to hide a dead `wr/scripts/generate-wr.sh`, a broken `wr-auto-classify.yml`
trigger, and two non-compiling github-script blocks in `wr-pr-creation.yml` — all
caused by **parallel agents pasting competing fixes of the same block on top of
each other** while the gates that would have caught it were already red. Before
fixing anything: check whether a fix already landed and reconcile (one
implementation per behavior, delete the losers). The interleave signature:
redeclared `const`, repeated `return`, stacked comments citing different issues.
Make count/list assertions drift-proof (derive from the registry, never hardcode).

### 6. Exit codes must reflect true resolution state, not a proxy metric
A script that counts one specific case (e.g. "ambiguous conflicts found") and
exits 0 whenever that counter is zero can report a **false success** if a
different failure path never increments the same counter — e.g. a file with
zero detected conflict markers still isn't resolved. Fix: gate the exit code on
an explicit "was everything actually fully resolved?" check, not a metric that
can read zero for the wrong reason. Found in a merge-conflict auto-resolver
whose caller trusted exit 0 to mean "safe to push" (PR #15826).

### 7. `nosemgrep` suppression comments must stay physically adjacent
Semgrep's inline suppression only applies when the `// nosemgrep: <rule-id>`
comment is immediately above (or on) the flagged line. Inserting a new
explanatory comment **between** the directive and the code it covers silently
breaks the suppression, so a previously clean file starts failing CI with no
behavior change. Fix: when adding comments near a `nosemgrep`-suppressed line,
keep the directive as the last comment line immediately before the code
(PR #15825).

See `standards/AUDIT_AND_SELF_HEALING_PLAYBOOK.md` for the full audit
methodology and a fast-lookup catalog of these and other established fix
patterns — read it before running a new audit pass.

## Verifying changes locally (mirror the CircleCI gate)

CircleCI (`.circleci/config.yml`) runs two **real** gates — replicate them before pushing:
```bash
npm ci
npm test          # node --test 'tests/**/*.test.js' + bash tests/social_post_formatter.test.sh
# changed-Markdown lint (same scope as CI):
BASE="$(git merge-base origin/main HEAD)"
FILES="$(git diff --name-only --diff-filter=d "$BASE" HEAD -- '*.md')"
[ -n "$FILES" ] && npx markdownlint-cli2 $FILES || echo "no changed md"
```
`npm run lint` lints the whole repo (has a large pre-existing backlog); CI only
gates **changed** Markdown on purpose. Always `python3 -c "import yaml; yaml.safe_load(open(F))"`
a workflow after editing it.

If changed-Markdown lint is red, don't hand-fix: run
`npm run markdown:heal -- <files>` (`scripts/heal-markdown.js`). It fixes the
non-`--fix`-able structural rules too (MD025 extra H1s → demoted to H2, MD003
setext → ATX) and then runs `markdownlint-cli2 --fix`. The same healer runs
automatically on every same-repo PR touching Markdown
(`markdown-lint-auto-heal.yml`, pushes a `[md-auto-heal]` commit) and at WR
generation time (`wr-pr-creation.yml`). The gates themselves stay real.

## Working conventions

- Develop on the assigned feature branch; commit + push there. Open PRs as **draft**.
- Don't add new always-green `|| echo`-style shims to test/lint steps — the gates
  are intentionally real.
- Repo: `midnghtsapphire/revvel-standards`. Many `gh api` calls hardcode this path;
  prefer `${{ github.repository }}` in new code.
