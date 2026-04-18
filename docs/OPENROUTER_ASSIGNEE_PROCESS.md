# OpenRouter Assignee — First Line of Sight Process

**Issue reference:** *"Add my openrouter_api_key as first line of sight in revvel-standards as an assignee in issues"* — make OpenRouter the first line of sight (orchestrator / collaborator) on every issue and PR, driven by `OPENROUTER_API_KEY`, running on a Ralph loop 24/7.

This document describes the process, the implementation, and how to tune it.

---

## TL;DR

1. Every new issue in `revvel-standards` is **automatically assigned to `@Copilot`** — the GitHub-visible orchestrator backed by OpenRouter. Open pull requests are picked up by the hourly cron sweep.
2. The issue / PR is labelled **`openrouter`**, **`auto-fix`**, **`copilot`**, plus the default **`role:orchestrator`** label.
3. A **first-line-of-sight comment** is posted that references the `OPENROUTER_API_KEY` secret, the optional `ADMIN_GITHUB_TOKEN`, and the relevant skills.
4. A **cron sweep runs every hour, 24/7**, to pick up anything that was opened while the event workflow missed it or that arrived before the secret was configured.
5. The existing [`ralph-loop.yml`](../.github/workflows/ralph-loop.yml) continues to handle **CI-failure** self-healing on PRs.

Implementation: [`.github/workflows/openrouter-assignee.yml`](../.github/workflows/openrouter-assignee.yml).

---

## Why the GitHub assignee is `@Copilot` and not `@openrouter`

OpenRouter is a service, not a GitHub user — it cannot be set as a GitHub `assignee`. The Revvel Agent Registry (`skills/openrouter-swarms/SKILL.md`) already defines `@Copilot` as the orchestrator that routes through OpenRouter using the `OPENROUTER_API_KEY` secret. So:

| Signal | Value | Purpose |
|---|---|---|
| GitHub `assignee` | `@Copilot` | The entity that appears in the GitHub UI "Assignees" panel — your first line of sight |
| Label | `openrouter` | Routing hint for any automation that filters by OpenRouter-owned work |
| Label | `auto-fix`, `copilot` | Shared routing labels consumed by the Ralph loop |
| Label | `role:orchestrator` | Default role marker for first-line-of-sight routing |
| Comment | First-line-of-sight notice | Points reviewers / auditors at `OPENROUTER_API_KEY`, the skill, and this doc |

If a dedicated GitHub machine user (e.g. `revvel-openrouter-bot`) is provisioned later, swap the `assignees: ['Copilot']` value in the workflow — no other changes required.

---

## Secret: `OPENROUTER_API_KEY`

- Declared in [`.env.example`](../.env.example) under the *AI / LLM* section.
- Vault path: `revvel/shared/llm/openrouter` (see `skills/vault-agent/SKILL.md`).
- Fetch locally:
  ```bash
  vault kv get -field=api_key revvel/shared/llm/openrouter
  ```
- Add to this repo: **Settings → Secrets and variables → Actions → New repository secret**, name `OPENROUTER_API_KEY`.
- The workflow does **not fail** if the secret is missing; it logs a warning and annotates the routing comment with `⚠️ not configured` so you can see at a glance which repos still need provisioning.

---

## Optional: `ADMIN_GITHUB_TOKEN` (elevated routing permissions)

If the default `GITHUB_TOKEN` does not have enough rights to assign `@Copilot` or apply routing labels, provide an elevated token:

- Secret name: `ADMIN_GITHUB_TOKEN`
- Type: GitHub App installation token or PAT with **minimum** scopes (`issues:write`, `pull_requests:write`, `contents:read`).
- Used by: `.github/workflows/openrouter-assignee.yml` for routing on issues/PRs (falls back to `GITHUB_TOKEN` when missing).
- Safety note: the workflow does **not** check out code or execute PR content, so it remains safe for `pull_request_target` runs when scoped minimally.

---

## The 24/7 Ralph cron loop

The `ralph-cron-sweep` job runs on the GitHub Actions `schedule` trigger:

```yaml
on:
  schedule:
    - cron: "0 * * * *"   # every hour, top of the hour
```

### What the sweep does

For every open issue and PR in the repo it:

1. Skips items that already have an assignee (the orchestrator or a human already owns it).
2. Skips items labelled `needs-human` or `blocked` (explicitly escalated — do not re-route).
3. Skips items already labelled `openrouter` (already routed in a previous sweep).
4. Otherwise: assigns `@Copilot`, adds the routing labels, posts a sweep comment.

A run summary is written to the workflow summary page (`Routed / Skipped / Total open / Dry run / Secret status`).

### Tuning the cadence

| Cadence | Cron expression | OpenRouter cost impact |
|---|---|---|
| Every 15 minutes (very responsive) | `"*/15 * * * *"` | ~96 runs/day |
| **Every hour (default)** | `"0 * * * *"` | ~24 runs/day |
| Every 4 hours (budget-safe) | `"0 */4 * * *"` | 6 runs/day |
| Business hours only | `"0 9-17 * * 1-5"` | 9 runs/day, weekdays |
| Nightly only | `"0 3 * * *"` | 1 run/day |

Edit the `schedule:` block in `.github/workflows/openrouter-assignee.yml` and commit. The sweep itself only *routes* — it does **not** consume OpenRouter tokens. Token spend happens when the orchestrator picks the routed item up. So the cron cadence controls **latency**, not cost. Cost is bounded by the budgets in `skills/openrouter-swarms/SKILL.md § Cost Governance`.

### Disabling the sweep

Comment out the `schedule:` block, or delete the `ralph-cron-sweep` job. The `route-new` job (event-driven) will still route newly opened issues.

### Manual run / dry run

```bash
gh workflow run "OpenRouter Assignee — First Line of Sight" -f dry_run=true
```

A dry run logs what *would* be routed without making changes — useful when first enabling the workflow on a repo with a lot of existing open issues.

---

## How this relates to existing workflows

| Workflow | Trigger | Scope | Relationship |
|---|---|---|---|
| `openrouter-assignee.yml` (**new**) | New issue, hourly cron | Routes work **to** the orchestrator (PRs via sweep) | Entry point — "first line of sight" |
| `ralph-loop.yml` | CI failure on a PR | Asks the orchestrator to **fix** a failing PR | Takes over once a PR exists and CI fails |
| `issue-automation.yml` | Issue opened | Template / duplicate / triage checks | Runs alongside the new workflow; independent |
| `sync-labels.yml` | Push to `main` | Syncs `.github/labels.yml` across repos | Propagates the new `openrouter` label |

Together these give you: **route → attempt → self-heal → escalate**, running continuously.

---

## Rolling this out to other Revvel repos

The workflow is self-contained. To enable it on another repo:

1. Copy `.github/workflows/openrouter-assignee.yml` into the target repo.
2. Ensure `OPENROUTER_API_KEY` is set in the target repo's Actions secrets.
3. Ensure the `openrouter`, `auto-fix`, `copilot`, `role:orchestrator`, `needs-human`, `blocked` labels exist (they do automatically if the repo uses `sync-labels.yml` against this repo's `.github/labels.yml`).
4. (Optional) Adjust the cron cadence in the copy to match that repo's activity level.

No other changes are required.

---

## Escalation

If the orchestrator cannot complete a routed item:

- Add the **`needs-human`** label → the sweep will stop re-routing it.
- The existing `ralph-loop.yml` also escalates after 5 failed auto-fix attempts on a PR by pinging `@midnghtsapphire` and applying `needs-human` + `blocked`.

---

## Files touched by this process

- `.env.example` — declares `OPENROUTER_API_KEY` with its Vault path.
- `.github/labels.yml` — adds the `openrouter` label so `sync-labels.yml` propagates it.
- `.github/workflows/openrouter-assignee.yml` — the workflow itself (new).
- `docs/OPENROUTER_ASSIGNEE_PROCESS.md` — this document.

---

## See also

- [`PROOF_OF_LIFE_PROCESS.md`](./PROOF_OF_LIFE_PROCESS.md) — manually-triggered proof-of-life for the app-review `revvel-standards-run` pipeline, with operator choice of role (orchestrator / fixer) and assignee (openrouter / Copilot / codex).
- `skills/openrouter-swarms/SKILL.md` — OpenRouter routing, model selection, agent registry.
- `skills/ralph-loop/SKILL.md` — the Ralph self-healing pattern.
- `skills/vault-agent/SKILL.md` — how secrets (including `OPENROUTER_API_KEY`) are provisioned from Vault.
