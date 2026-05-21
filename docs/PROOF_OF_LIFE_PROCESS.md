# Proof of Life — app-review `revvel-standards-run` Process

**Issue reference:** *"proof of life new app-review revvel-standards-run process"* — stand up a manually-triggered **proof-of-life** for the new app-review `revvel-standards-run` pipeline, with **OpenRouter as the orchestrator or fixer** and a **choice in `assigned to`** so the run can either work **independently of Copilot** or **use Copilot / Codex within OpenRouter**.

Implementation: [`.github/workflows/proof-of-life.yml`](../.github/workflows/proof-of-life.yml).

---

## TL;DR

1. Open **Actions → *Proof of Life — app-review revvel-standards-run* → Run workflow**.
2. Pick a **role** — `orchestrator` (plan + delegate) or `fixer` (pick up a failing run).
3. Pick an **assignee**:
   - **`openrouter`** — runs **independently of Copilot**. No GitHub user is assigned; the `openrouter` label carries the routing signal.
   - **`Copilot`** — assigns GitHub `@Copilot` (orchestrated by OpenRouter).
   - **`codex`** — routes Codex via OpenRouter (`openai/codex-5.1`); label-only, no GitHub user.
   - **`Rex`** — routes the oAudrey Agent Factory / no-key Perplexity lane via the `rex` label; label-only, no GitHub user.
4. *(Optional)* Enter a `target_issue` (issue or PR number) to have the workflow assign, label and comment on it. Leave blank for a log-only heartbeat.
5. The workflow verifies `OPENROUTER_API_KEY`, applies routing labels (`openrouter`, `proof-of-life`, `role-<role>`, plus `copilot` or `codex` where relevant), and posts the proof-of-life comment.

---

## Inputs

| Input | Type | Default | Purpose |
|---|---|---|---|
| `role` | choice: `orchestrator` \| `fixer` | `orchestrator` | Role the OpenRouter agent plays for the run. `orchestrator` plans and delegates; `fixer` takes over a failing run and pushes a fix. |
| `assignee` | choice: `openrouter` \| `Copilot` \| `codex` \| `Rex` | `openrouter` | Who the work is assigned to. `openrouter` = independent of Copilot; `Copilot` = GitHub Copilot; `codex` = Codex via OpenRouter; `Rex` = oAudrey Agent Factory / no-key Perplexity lane. |
| `target_issue` | string (number) | *(empty)* | Optional issue or PR number to assign / label / comment on. Blank → log-only run. |
| `dry_run` | boolean | `false` | Log what *would* happen without making any GitHub mutations. |

---

## Why the three assignee options

OpenRouter is a service, not a GitHub user, and `codex` is a model behind OpenRouter — neither can be a GitHub `assignee`. So the workflow encodes the operator's intent through the combination of GitHub `assignees` and routing labels:

| Input `assignee` | GitHub `assignees` | Labels added | Meaning |
|---|---|---|---|
| `openrouter` | *(none)* | `openrouter`, `proof-of-life`, `role-<role>` | **Independent of Copilot.** OpenRouter owns the run end-to-end; routing is label-only. |
| `Copilot` | `@Copilot` | `openrouter`, `proof-of-life`, `role-<role>`, `copilot` | Orchestrated by OpenRouter, executed by GitHub Copilot. |
| `codex` | *(none)* | `openrouter`, `proof-of-life`, `role-<role>`, `codex` | Orchestrated by OpenRouter, executed by the Codex model (`openai/codex-5.1`) — label-only, no GitHub user. |
| `Rex` | *(none)* | `openrouter`, `proof-of-life`, `role-<role>`, `rex` | oAudrey Agent Factory lane for no-key Perplexity and research-first runs — label-only, no GitHub user. |

If a dedicated GitHub machine user (e.g. `revvel-openrouter-bot` or `revvel-codex-bot`) is provisioned later, swap the `githubAssignee` resolution block in the workflow — no other changes required.

---

## Secret: `OPENROUTER_API_KEY`

- Declared in [`.env.example`](../.env.example) under the *AI / LLM* section.
- Vault path: `revvel/shared/llm/openrouter`.
- The workflow does **not fail** if the secret is missing; it logs a warning and annotates the proof-of-life comment with `⚠️ not configured` so you can see at a glance which repos still need provisioning. That is intentional — the whole point of *proof of life* is to surface configuration state, not to fail on it.

---

## How to run

### From the GitHub UI

1. *Actions* → *Proof of Life — app-review revvel-standards-run* → *Run workflow*.
2. Fill in the inputs, click *Run workflow*.
3. Inspect the run summary for the proof-of-life table (role, assignee, labels, secret status).

### From the CLI

```bash
# Independent of Copilot, log-only heartbeat
gh workflow run "Proof of Life — app-review revvel-standards-run" \
  -f role=orchestrator -f assignee=openrouter

# Route a specific issue to Copilot, orchestrated by OpenRouter
gh workflow run "Proof of Life — app-review revvel-standards-run" \
  -f role=orchestrator -f assignee=Copilot -f target_issue=42

# Send a fixer run via Codex on PR #137, dry run first
gh workflow run "Proof of Life — app-review revvel-standards-run" \
  -f role=fixer -f assignee=codex -f target_issue=137 -f dry_run=true
```

---

## How this relates to existing workflows

| Workflow | Trigger | Scope | Relationship |
|---|---|---|---|
| `proof-of-life.yml` (**new**) | `workflow_dispatch` | On-demand proof-of-life for the app-review `revvel-standards-run` pipeline | Manual heartbeat — pick role + assignee |
| `openrouter-assignee.yml` | Issue/PR opened or reopened, PR `ready_for_review`, hourly cron | Routes work **to** the OpenRouter orchestrator (attempts `@oaudrey`, falls back to labels/comments) | Automatic entry point — "first line of sight" |
| `ralph-loop.yml` | CI failure on a PR | Asks the orchestrator to **fix** a failing PR | Takes over once a PR exists and CI fails |

The three together give you: **automatic routing → CI-failure self-healing → manual proof-of-life heartbeat** with operator choice of role and executor.

---

## Rolling this out to other Revvel repos

The workflow is self-contained. To enable it on another repo:

1. Copy `.github/workflows/proof-of-life.yml` into the target repo.
2. Ensure `OPENROUTER_API_KEY` is set in the target repo's Actions secrets (optional — the workflow tolerates it being absent).
3. Ensure the `openrouter`, `proof-of-life`, `copilot`, `codex`, `rex`, `role:orchestrator`, `role:fixer` labels exist (automatic if the repo uses `sync-labels.yml` against this repo's `.github/labels.yml`). Missing labels are skipped, not fatal.

---

## Escalation

If a proof-of-life run flags `⚠️ not configured` or doesn't land within 1 hour:

- Add the **`needs-human`** label to the target issue / PR to stop auto-reroute.
- Provision `OPENROUTER_API_KEY` from Vault (`revvel/shared/llm/openrouter`).
- Re-run the workflow — the summary table will flip to `✅ configured`.

---

## See also

- [`OPENROUTER_ASSIGNEE_PROCESS.md`](./OPENROUTER_ASSIGNEE_PROCESS.md) — automatic first-line-of-sight routing.
- `skills/openrouter-swarms/SKILL.md` — OpenRouter routing, model selection, agent registry (including `openai/codex-5.1`).
- `skills/ralph-loop/SKILL.md` — the Ralph self-healing pattern that complements this proof-of-life heartbeat.
