# 📖 Reminders — "Before you do X, read Y first

> ⚡ **Busy / lost in folders?** Open **[START_HERE_CALL_CHAIN.md](./START_HERE_CALL_CHAIN.md)** first — which workflow starts and what runs next.

This is the activity-based companion to the topic-based [`README.md` Reference Materials table](./README.md#-reference-materials). Same content, different access pattern: this file is sorted by *what you're trying to do right now*, not by *where the doc lives in the repo*.

When you're about to start something new, grep this file with the verb of your activity (e.g., `provision`, `wire`, `file`, `evaluate`, `refresh`).

---

## Provisioning a new GitHub Project v2 board (<https://github.com/users/midnghtsapphire/projects/5>)

**For the live `revvel-standards` Project board:**

- Live board: [https://github.com/users/midnghtsapphire/projects/5](https://github.com/users/midnghtsapphire/projects/5) (`Revvel-Standards`)
- Active auth path: classic PAT — `PROJECTS_PAT` repo secret on `midnghtsapphire/revvel-standards`
- Live IDs and validation evidence: see the [Live deployment](./docs/github-project-v2-workflows.md#live-deployment-for-revvel-standards) section in the workflows doc

**Read before you provision a new (different) board:**

- [`docs/reference/github-projects-automation-guide.pdf`](./docs/reference/github-projects-automation-guide.pdf) — GraphQL API, auth scope rules, hard limits (50 fields per Project, 50 options per single-select, 25 issue fields per org, 10 pinned per issue type)
- [`docs/github-project-schema.md`](./docs/github-project-schema.md) — the field/option/status schema this repo expects
- [`docs/github-project-v2-workflows.md`](./docs/github-project-v2-workflows.md) — operator setup walkthrough for the default-field-setter workflows

**Why these first:** The auth model dictates which workflow variant you use (App vs PAT), and the platform limits dictate whether single-select fields should live on the Project or as org-level issue fields. Decide both before you create the board, or you'll re-create it.

**Workflows that fire automatically once configured:**

- `.github/workflows/set-default-project-v2-fields.yml` — runs when `vars.PROJECTS_APP_ID` is set (GitHub App auth)
- `.github/workflows/default-project-v2-fields-pat.yml` — runs when `secrets.PROJECTS_PAT` is set (classic PAT auth). Sets the **floor**: `Status=Inbox`, `Priority=medium`, `Research Mode=standard` on every new issue.
- `.github/workflows/wr-auto-classify.yml` — runs alongside the PAT workflow on `issues.opened` with the `work-request` label. **Extends** the floor by reading the issue body and asking OpenRouter to classify the routing dropdowns the user left on `auto-classify`. Respects explicit picks; falls back to opinionated defaults if OpenRouter is unavailable; tags `auto:default-fallback` when any fallback was used so a human can spot-check ambiguous cases.
- All three skip silently when their credentials are absent. The currently active auth path for `revvel-standards` is PAT + OpenRouter; both `PROJECTS_PAT` and `OPENROUTER_API_KEY` are configured.

---

## Wiring the Project v2 default-field-setter workflows (for <https://github.com/users/midnghtsapphire/projects/5>)

**Read before you start:**

- [`docs/github-project-v2-workflows.md`](./docs/github-project-v2-workflows.md) — full setup walkthrough including the seven repo/org variables and one secret you need, plus the live values currently set on `revvel-standards`

**One-shot helper to retrieve the IDs you need:**

- Run `.github/workflows/print-project-v2-ids.yml` (App auth) or `.github/workflows/print-project-v2-ids-pat.yml` (PAT auth) manually from the Actions tab. Pass `owner_type`, `owner`, and `project_number` (for the live `revvel-standards` board: `user`, `midnghtsapphire`, `5`). The workflow prints `PROJECT_ID`, every field's node ID, and every option ID. Copy them into repo or org variables.

---

## Filing a new Work Request (intake → score → route → build)

**Read before you start:**

- [`docs/operating-model.md`](./docs/operating-model.md) — Sections 0–14 of the master operating spec
- [`templates/viability-gate-template.md`](./templates/viability-gate-template.md) — the 1–5 rubric across six dimensions
- [`promptforproject.md`](./promptforproject.md) — Step 0 router that reads `OUTPUT_TYPE`, `RESEARCH_MODE`, `DELIVERY_MODE`, `ITERATION_MODE`, `LIFECYCLE_MODE`, `COMMERCIAL_MODE`, `DEPLOYMENT_TARGET` and routes work before any implementation

**The form to use:**

The `New issue` chooser shows two cards, both of which file a Work Request and apply the `work-request` + `weekly-research` labels so the auto-classifier and downstream automation treat them identically. The WR workflows also accept the BASIC WR issue type and normalize missing labels.

- [`.github/ISSUE_TEMPLATE/00-work-request.yml`](./.github/ISSUE_TEMPLATE/00-work-request.yml) — open via `New issue` → `Work Request`. **Primary, anti-under-scoping form.** The `00-` prefix forces this template to sort first in the chooser. Output Type is the only required field; other routing/scope fields are optional so intake can stay lightweight. The anti-under-scoping sections are still available when you want to lock a full bundle contract.
- [`.github/ISSUE_TEMPLATE/10-OpenHands-system-wr.yml`](./.github/ISSUE_TEMPLATE/10-OpenHands-system-wr.yml) — open via `New issue` → `OpenHands System WR (Quick / Internal)`. **Lightweight system form.** Output Type is the only required routing decision; every other routing dropdown defaults to `auto-classify` and is filled from your prose by [`wr-auto-classify.yml`](./.github/workflows/wr-auto-classify.yml). Use this for low-risk, internal, or agent-driven work where the heavy bundle contract would be overkill. Carries the extra `quick` and `OpenHands` labels so workflows can distinguish lightweight WRs.

Older templates are archived under `templates/issue-template-archive/`.

**Hard rules to remember:**

- `RESEARCH_MODE` controls research depth only, not the deliverable
- `OUTPUT_TYPE` is the hard constraint on the deliverable
- Viability scoring is mandatory before implementation
- Score 24–30 = BUILD, 16–23 = HOLD, below 16 = ARCHIVE (unless explicitly overridden)
- `DELIVERY_MODE=proposal-first` stops at proposal; `build-direct` implements after viability passes
- CLI / MCP / API / PDF requests are not silently converted into web apps

---

## Evaluating an invention idea before committing to a build

**Read before you start:**

- [`templates/invention-flow-template.md`](./templates/invention-flow-template.md) — the 11-section invention evaluation flow

**Why before:** invention-flow runs *before* viability scoring for `OUTPUT_TYPE=invention-flow` requests. It catches "smart recombination" vs "true invention" classification errors that would otherwise propagate into the Project board as commercial misreads.

---

## Refreshing or rebuilding an existing legacy project

**Read before you start:**

- [`templates/legacy-refresh-checklist.md`](./templates/legacy-refresh-checklist.md) — current-state audit, market recheck, monetization recheck, viability rescore, refresh decision, launch decision

**Why before:** `LIFECYCLE_MODE=refresh-existing` requires an audit of the current repo/assets *before* proposing rebuilds. Skipping the audit leads to rebuilding what already works.

---

## Adding a new MCP server to the WR/PR control plane

**Read before you start:**

- [`docs/Master_Inventory/MCP_STANDARD.md`](./docs/Master_Inventory/MCP_STANDARD.md) — the conformance contract every MCP server must satisfy
- [`docs/MCP_REVVEL_CATALOG.md`](./docs/MCP_REVVEL_CATALOG.md) — the existing inventory; check for overlap before building a new one
- [`mcp-servers/wr-control-plane/README.md`](./mcp-servers/wr-control-plane/README.md) — known v0.1.0 trade-offs to inherit or fix

**Then update:**

- `.env.example` (with Vault path comment per convention)
- `templates/mcp/.env.mcp.example` (downstream-repo mirror)
- `SYSTEM_STATE.md` (new "Last updated" entry)

---

## Setting up the Notion knowledge layer

**Read before you start:**

- [`docs/notion-structure.md`](./docs/notion-structure.md) — the Notion database schema and sync contract

**Why before:** the Notion layer is downstream of the GitHub Project, not a replacement for it. Read the structure spec first so you don't duplicate state.

---

## Editing this file

- New activity? Add a heading. Sort alphabetically *only* if you genuinely can't pick a "natural" reading order; otherwise group by user journey.
- Each section should be ~5–10 lines. If a section grows beyond that, the underlying doc should grow instead.
- Every link should resolve from repo root. No external links unless absolutely necessary — those go in the README Reference Materials table.
- When you commit a new reference doc to `docs/reference/`, add it to *both* this file and the README table in the same PR.
