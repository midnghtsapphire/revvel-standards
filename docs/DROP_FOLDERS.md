# Drop folders: how they process themselves

**WR:** [#18379](https://github.com/midnghtsapphire/revvel-standards/issues/18379). Conventions come from PR #14871 (research-drafts and per-source buckets) and PR #13637 (inbox intake and the runner-orchestrator).

Put a `.md` file in one of the drop folders and push. CircleCI reads it, runs the handler the routing table names, and stores a report. Nothing runs on the bot box, nothing is scheduled, and nothing is written back to the repo.

## The routing table

`config/drop-folders.json` is the only place folder-to-handler routing lives. Add a folder by adding a row. `tests/drop-folder-process.test.js` fails if a row names a handler that does not exist or a required folder has no row.

| Folder | Handler | What it does |
| --- | --- | --- |
| `docs/inbox/` | `inbox-ingest` | Reads the `TEMPLATE.md` front matter and runs `engines/runner-orchestrator/orchestrate.js` in dry-run. Shows the deliver channel and label. Refuses an intake with no revenue target (`engines/CONTRACT.md` Rule 4). Intakes already `routed` or `archived` are skipped. |
| `docs/research-drafts/<topic>/` | `research-draft-compile` | Checks the topic has `README.md`, `NOTEBOOK.md` and `sources.md`. Writes a digest: title, source rows, confidence tags, dated sections. |
| `docs/notebook/`, `docs/chatgpt/`, `docs/claudeai/`, `docs/claudecode/`, `docs/claudecoworker/`, `docs/grok/` | `source-bucket-route` | Says which `docs/research-drafts/<topic>/` the file belongs to (the first subfolder), or that the topic is missing and the `cp -r _TEMPLATE` command to make it. Marks the file unverified and notes missing provenance. |

`README.md` and `TEMPLATE*.md` files and `_TEMPLATE/` are ignored. Every processed file also gets a secret scan. A match fails the job and the matched text is never printed.

## What you get

CircleCI job `drop-folder-process` stores these under Artifacts, in `drop-folders/`:

- `report.md` and `report.json`: one row per file with a status (`ok`, `routed`, `needs-topic`, `refused`, `skipped`, `warning`).
- `compiled/<topic>.md`: the digest for each research-drafts topic that changed.

A refused intake or a missing topic is a report row, not a red build. Only a secret match fails the job. `--strict` also fails on refused intakes.

## Path filtering

The job runs on every push, then does the filtering itself. It diffs against the merge-base with `origin/main` (on `main`, the last commit) and processes only files the table claims. When nothing matches it prints a short report and ends. It installs npm dependencies only when an inbox intake changed.

The CircleCI setup-workflow plus path-filtering orb route was not used. It would turn `.circleci/config.yml` into a setup config, and every job would fail while "Enable dynamic config using setup workflows" is off in the project settings. The in-job filter gives the same result without that switch. If you later want the orb, the table here is already the single list of paths to filter on.

## Run it by hand

```bash
node scripts/drop-folder-process.js --all                       # every .md in the 8 folders
node scripts/drop-folder-process.js --files docs/inbox/my-idea.md
node scripts/drop-folder-process.js --base origin/main          # what a branch changed
node scripts/drop-folder-process.js --check-trigger dashboard   # prints true or false
```

Output goes to `/tmp/drop-folder-artifacts` (change with `--out`). The inbox handler needs `npm ci` first because the orchestrator uses `ajv`.

## What it does not do

- It does not commit, open PRs, or move files. Writing results back needs a push token and is a separate decision for Audrey.
- It does not promote drafts. Promotion stays a human step (see `docs/research-drafts/README.md`).
- It does not pull from NotebookLM. That is scoped in its own WR: [#18380](https://github.com/midnghtsapphire/revvel-standards/issues/18380).

## The dashboard

Served from the same push-triggered pattern. See [DASHBOARD_HOSTING.md](DASHBOARD_HOSTING.md).
