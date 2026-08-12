# GitHub Advanced Features Checklist (Models, Projects, Agents)

**Status:** ACTIVE · **Updated:** 2026-08-05
**Goal:** Stop leaving power on the table. Agents must **probe and wire** these surfaces before inventing parallel systems.

## Preflight (before every non-trivial request)

Agents MUST run a short "capability probe" (see `standards/PROACTIVE_PREFLIGHT.md`) and record which advanced surfaces are available and already wired.

## GitHub Models

GitHub Models (model catalog / playground / Actions integration) is for:

- Evaluating models **inside GitHub** without scattering keys
- Prompt experiments with audit trail
- Possible Actions `models` inference steps where available on the plan

**House rule still stands:** production fleet routing is **OpenRouter** via `.github/agent-models.yml` / `MODEL_CONFIG.md`.
GitHub Models is for **evaluation + optional Actions inference**, not a second production router unless explicitly approved.

### Wire checklist

- [ ] Confirm account has Models access
- [ ] Document allowed model IDs under `config/model-lookup.json` (extend, don't fork)
- [ ] Add a workflow job that *proves* Models API key / permission (or records `unavailable`)
- [ ] Never store model secrets in repo files

## GitHub Copilot coding agent / PR agent

- Label: `copilot` (allowlisted)
- Use for well-scoped code tasks with human review
- Prefer `create_pull_request_with_copilot` style handoff over pasting huge patches in chat

## Projects V2

- One command project: **Revvel Command**
- Fields: see `standards/GITHUB_PROJECT_FIELDS.md`
- Automations: auto-add issues, set stage, status updates weekly

## Issue types & Issue fields (2026)

- Prefer typed Issue Fields (Priority, Effort) at org level when available
- Until then, Project fields + allowlisted labels

## Rulesets & branch protection

- `main` requires: green formal check, human review on agent PRs, no force-push
- Status checks named, not label-based

## Discussions / Wikis

- Discussions for RFCs
- Wiki optional; **standards live in git** (`standards/`) so they survive disasters

## Codespaces / Dev containers

- Prefer for human onboarding, not agent state

## Actions advanced

- Reusable workflows
- OIDC to cloud (no long-lived cloud keys when possible)
- Environment protection rules for production deploys
- `concurrency` groups to stop stampeding herds
- Artifact retention for formal reports + scorecards

## Security advanced

- Code scanning, secret scanning, Dependabot/Renovate
- Fine-grained PATs only; never classic if avoidable
- CODEOWNERS on `standards/`, `config/`, `.github/`

## What "wired" means

A feature is **wired** only if:

1. Config exists in-repo
2. A workflow or automation invokes it on a schedule or event
3. A badge or Project field shows health
4. Failure opens an auto-WR (or auto-error issue)

If any of 1–4 is missing, the preflight must report **not wired** and the preferred agent action is to open a WR+PR that completes the wiring — not to invent a new label.
