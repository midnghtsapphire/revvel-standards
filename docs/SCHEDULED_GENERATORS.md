# Scheduled generators (CircleCI)

Added 2026-11-19 by TriageChief for [WR #18488](https://github.com/midnghtsapphire/revvel-standards/issues/18488).
Owner approval, Audrey Evans, 2026-11-19 (t457u): "Yes, move the dashboard and catalog jobs to a CircleCI schedule".

Four generators used to refresh files and README blocks through GitHub Actions. GitHub Actions is billing-locked, and
[PR #17851](https://github.com/midnghtsapphire/revvel-standards/commit/69b6e36284661bf23fccd55b0b880ec3561cb0ca)
(Aug 20) commented out every `schedule:` trigger. `tests/no-scheduled-workflows.test.js` keeps it that way. The same four
jobs now run on a CircleCI schedule instead. The GitHub workflow files stay in place (a dated header note says where the job
went), and nothing here adds a GitHub schedule (rule E1).

## The jobs

| Job | Replaces | Runs | Writes |
| --- | --- | --- | --- |
| `dashboard` | `update-project-dashboard.yml` | every 4 hours | `dashboard.html`, `dashboard-data.json`, `state.json` |
| `agent-creator` | `update-agent-creator-data.yml` | daily | `agent-creator-data.json`, `agent-creator-data.js` |
| `flow-charts` | `flow-chart-sync.yml` | daily | `docs/Master Revvel-Standards Flow Charts/` (includes `TOOLS_CATALOG.csv` and `TOOLS_CATALOG.md`) |
| `connections-registry` | `connections-registry.yml` | daily | `docs/CONNECTIONS_REGISTRY.md`, `connections-dashboard.html`, the README "Connections at a glance" block |

Each job runs the same script the GitHub workflow ran (`scripts/aggregate-project-dashboard.js` then `scripts/populate-state.js`;
`scripts/build-agent-creator-data.js`; `scripts/sync-flow-charts.js`; `scripts/connections-registry.js --markdown --html`).
One wrapper, `.circleci/scripts/run-scheduled-generator.sh <job>`, runs the script and then does the following.

1. Skips cleanly (exit 0, one line) if `GENERATORS_GITHUB_TOKEN` is not set.
2. Finds the newest `daily/YYYY-MM-DD` branch and uses it as the base. It refuses to fall back to `main`.
3. Continues the open bot PR for that job if there is one. Otherwise it starts a new branch `bot/generators/<job>-<UTC date-time>`
   from the base.
4. Runs the generator.
5. Ignores changes made only of timestamps (for example `lastUpdated` or "Last sync"), so a PR is not opened or updated just
   because the clock moved.
6. If something real changed: commits, pushes (never a force-push), and opens or updates ONE draft PR into the base, assigned to
   `midnghtsapphire`. Nothing here merges. Audrey or TriageChief merges under the usual gates (C1, C3).

Why not push straight to the branch: rule C1 (every change is a draft PR) and rule B6 (nobody pushes to `main`, no agent merges its
own PR). Old bot branches are left in place when a PR is merged (rule B1, never delete). The next run starts a new dated branch.

The agent-creator job never sets `REVVEL_LLM_ALLOW_CLOUD` and never receives an OpenRouter key. The script does not call a model.
That keeps rule E3 intact.

## Why a separate config file

`.circleci/scheduled-generators.yml` is its own pipeline so it cannot disturb the `lint-and-test` gate in `.circleci/config.yml`,
and so it never runs on a PR push. Two guards keep it from running on pushes:

- The pipeline in CircleCI has schedule triggers only, no push trigger.
- Every workflow in the file has a `when:` on the pipeline parameter `generator`. The default is `none`, so any trigger that does
  not set it runs nothing.

## One-time CircleCI setup (done by Secret, or by Audrey in the console)

### 1. Context `generators-bot`

Organization Settings, Contexts, Create Context, name `generators-bot`. Add one variable:

| Variable | Value |
| --- | --- |
| `GENERATORS_GITHUB_TOKEN` | A fine-grained GitHub token for `midnghtsapphire/revvel-standards` only, with **Contents: read and write** and **Pull requests: read and write**. Nothing else. Metadata read is added by GitHub automatically. |

Restrict the context to this project if the plan allows it. Do not add any other secret to it. The scheduled jobs do not need an LLM
key, `ADMIN_GITHUB_TOKEN` or any review key. Never paste the token into an issue, PR or chat (rule B4). Rotate it by editing the one
variable.

### 2. Register the pipeline

Project Settings for `revvel-standards`, Project Setup (GitHub App projects) or Pipelines (older projects), then create a pipeline:

- Name: `scheduled-generators`
- Config file path: `.circleci/scheduled-generators.yml`
- Add NO push or pull request trigger. Schedule triggers only.

### 3. Add the schedule triggers

Times are UTC. CircleCI may start a run up to 10 minutes late and keeps that offset for later runs. For each row, Add schedule,
set the pipeline parameter, and save with Trigger status enabled.

| Trigger name | Parameter `generator` | Cron (UTC) | Older UI (timetable) |
| --- | --- | --- | --- |
| `dashboard-every-4h` | `dashboard` | `7 */4 * * *` | per-hour 1, hours-of-day 0, 4, 8, 12, 16, 20, every day |
| `agent-creator-daily` | `agent-creator` | `17 7 * * *` | per-hour 1, hours-of-day 7, every day |
| `flow-charts-daily` | `flow-charts` | `27 7 * * *` | per-hour 1, hours-of-day 7, every day |
| `connections-registry-daily` | `connections-registry` | `37 7 * * *` | per-hour 1, hours-of-day 7, every day |

Set both **Config branch** and **Checkout branch** to a branch that contains `.circleci/scheduled-generators.yml`:

- Before this change reaches `main`: use the daily branch that carries it (the one the PR merged into).
- After `daily/*` is promoted to `main`: use `main`. The job still works on the newest `daily/` branch whatever branch the trigger
  checks out; it switches to it itself and copies its own helper scripts first.

Pipeline attribution: the scheduling system, so no personal seat is used.

### 4. Check it

Run a trigger once by hand (Trigger Pipeline, parameter `generator` = `dashboard`). Expect one of three outcomes in the job log:
`SKIP (dashboard): GENERATORS_GITHUB_TOKEN is not set`, `no meaningful change; nothing to commit`, or a draft PR URL.
The parameter value `all` runs all four, which is useful for a first fill after a long gap.

## Cost note (ESTIMATED)

A small Docker job. The dashboard runs 6 times a day and the other three once a day, so about 9 runs a day, a few minutes each.
At CircleCI's published small-Docker rate this is a few thousand credits a month at most. Check Plan Usage after the first week.
Disabling a trigger stops its spend. No GitHub minutes are used.

## Not moved

The dashboard workflow also deployed to GitHub Pages with an Actions step. That step is not moved: it needs GitHub Actions. The
generated `dashboard.html` is still committed, so it can be published by any host Audrey picks.

## Run it locally (scratch only)

The tests in `tests/scheduled-generators.test.js` run the script against a throw-away local git remote and a mock GitHub API.
Never run the generators for real on the bot box; the scheduled CircleCI job is the production path (rule E2).

```bash
node --test tests/scheduled-generators.test.js
```
