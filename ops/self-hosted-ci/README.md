# Self-hosted CI dispatcher

Runs this repo's existing `.github/workflows/*.yml` on a machine we own, without
GitHub Actions. GitHub sends a webhook, the dispatcher picks the workflows that
event triggers, runs each one with [`act`](https://github.com/nektos/act) in
Docker, and posts the result back to the commit as a status
(`self-hosted / <workflow name>`).

Webhooks and the commit-status API are free repo features. Neither uses Actions
minutes or GitHub-hosted runners, so an Actions billing lock or spending limit
does not stop this. GitHub's own self-hosted runner is not a substitute: GitHub
still dispatches those jobs, and a billing lock can block them too.

## How it works

```text
GitHub ──webhook──▶ dispatcher.js ──▶ act (Docker) ──▶ workflow steps
   ▲                                                       │
   └──────────── commit status (pending/success/failure) ◀─┘
```

- **Workflow definitions come from `main`.** A pull request cannot add or edit a
  workflow and have it run with the dispatcher's secrets before it merges.
- **Trigger matching follows GitHub:** event, `types` (including the
  pull-request defaults), `branches`, `tags`, `paths` and their `-ignore`
  forms. `pull_request` also fires `pull_request_target` workflows, which check
  out the base commit as GitHub does.
- **Bots keep working.** `actions/github-script` steps get a real `GITHUB_TOKEN`,
  so labelers, triage and routers act on GitHub as before.
- **Loop protection.** `check_suite`, `check_run`, `workflow_run`, `workflow_job`
  and `status` events are dropped by default, as are events sent by any login
  in `IGNORE_SENDERS`. Put the token owner's login there.
- **Fork PRs do not run** unless `ALLOW_FORK_PRS=true`. Anyone can open one, and
  it would run their code on your server.
- **Manual runs.** `workflow_dispatch` workflows run through
  `POST /dispatch` (see below).

## Requirements

- A Linux server with Docker. A 4 GB / 2 vCPU droplet handles
  `MAX_CONCURRENCY=2`; add more RAM for more parallel jobs.
- Node.js 22+, git, and [`act`](https://github.com/nektos/act) v0.2.80 or newer.
- A public HTTPS URL for the webhook, either a domain behind Caddy or nginx, or
  a tunnel.

## Setup

1. **Install:**

   ```bash
   sudo useradd --system --create-home --groups docker shci
   sudo -u shci git clone https://github.com/midnghtsapphire/revvel-standards /home/shci/revvel-standards
   cd /home/shci/revvel-standards/ops/self-hosted-ci && sudo -u shci npm ci --omit=dev
   curl -fsSL https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash -s -- -b /usr/local/bin
   ```

2. **Create a GitHub token** (fine-grained, this repo only) with Contents: read,
   Commit statuses: write, Issues: write, Pull requests: write, and Metadata:
   read. Add more scopes only if a workflow needs them. Save it to a file
   readable only by `shci`:

   ```bash
   sudo install -d -m 700 -o shci /etc/shci
   sudo -u shci sh -c 'umask 077; cat > /etc/shci/github-token'   # paste, then Ctrl-D
   openssl rand -hex 32 | sudo -u shci tee /etc/shci/webhook-secret >/dev/null
   openssl rand -hex 32 | sudo -u shci tee /etc/shci/admin-token >/dev/null
   ```

3. **Workflow secrets.** GitHub never exposes repository secrets through its API,
   so copy the ones your workflows use into `/etc/shci/secrets.env` (mode 600),
   one `NAME=value` per line, for example `OPENROUTER_API_KEY=...`.

4. **Configure and start the service** with the unit file in this directory:

   ```bash
   sudo cp shci.service /etc/systemd/system/
   sudo cp shci.env.example /etc/shci/shci.env   # then edit it
   sudo systemctl daemon-reload && sudo systemctl enable --now shci
   curl -s localhost:8080/healthz
   ```

5. **Add the webhook.** In GitHub, open repo **Settings → Webhooks → Add webhook**.
   Set the payload URL to `https://<your-host>/webhook`, the content type to
   `application/json`, and the secret to the contents of
   `/etc/shci/webhook-secret`. Under events, choose the individual events
   `Pushes`, `Pull requests`, `Issues`, `Issue comments`,
   `Pull request reviews`, `Pull request review comments` and `Releases`.
   GitHub then sends a ping; check that it shows a green tick.

6. **Make it the gate.** Under branch protection, require the
   `self-hosted / …` status contexts in place of the Actions checks.

Start narrow if you like. `ONLY_WORKFLOWS=python-flake8.yml,lint-md.yml` runs
just those two workflows until you trust the setup, and then you can widen it.

## Manual runs (`workflow_dispatch`)

```bash
curl -X POST https://<your-host>/dispatch \
  -H "Authorization: Bearer $(sudo cat /etc/shci/admin-token)" \
  -d '{"workflow":"wr-rewrite.yml","ref":"main","inputs":{"dry_run":"true"}}'
```

## Configuration

| Variable | Default | Meaning |
|---|---|---|
| `REPO_FULL_NAME` | required | `owner/repo` this dispatcher serves |
| `WEBHOOK_SECRET` | required | Must match the GitHub webhook secret |
| `GITHUB_TOKEN_FILE` | required | File holding the GitHub token |
| `ADMIN_TOKEN_FILE` | unset | Bearer token for `/dispatch`; unset disables it |
| `SECRETS_FILE` | unset | Extra `NAME=value` secrets passed to workflows |
| `PORT` | `8080` | Listen port |
| `MAX_CONCURRENCY` | `2` | Parallel `act` jobs |
| `JOB_TIMEOUT_MIN` | `30` | Kill a job after this many minutes |
| `IGNORE_SENDERS` | unset | Comma list of logins whose events are ignored (loop guard) |
| `ONLY_WORKFLOWS` / `SKIP_WORKFLOWS` | unset | Comma lists of workflow file names |
| `ALLOW_FORK_PRS` | `false` | Run workflows for PRs from forks (untrusted code) |
| `ALLOW_LOOP_EVENTS` | unset | Re-enable e.g. `check_suite` if you need it |
| `RUNNER_IMAGE` | `catthehacker/ubuntu:act-latest` | Image used for `ubuntu-*` runners |
| `WORK_DIR` / `LOG_DIR` | tmp | Checkouts and per-job logs |
| `LOG_BASE_URL` | unset | If logs are served over HTTP, statuses link to them |

## Known limits

- `act` covers most of the Actions feature set, but not all of it.
  `actions/upload-artifact`, `actions/cache` and some `services:` setups behave
  differently or need extra flags. Check any workflow that fails here but used
  to pass on GitHub against act's issue tracker first.
- `workflow_run`, `check_suite` and `check_run` triggers are off by default
  (loop protection). Workflows that relied on them need another trigger.
- Paths filters on pushes of 20 or more commits, or PRs with over 1,000 changed
  files, are treated as matching. The dispatcher runs rather than guessing.

## Tests

```bash
node --test tests/self-hosted-ci-dispatcher.test.js
```
