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
