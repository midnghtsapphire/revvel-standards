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

## Working conventions

- Develop on the assigned feature branch; commit + push there. Open PRs as **draft**.
- Don't add new always-green `|| echo`-style shims to test/lint steps — the gates
  are intentionally real.
- Repo: `midnghtsapphire/revvel-standards`. Many `gh api` calls hardcode this path;
  prefer `${{ github.repository }}` in new code.
