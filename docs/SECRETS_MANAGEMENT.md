# Secrets Management — Workflow ↔ Secret Matrix

> **Last audited:** 2026-04-25
> **Source:** Gap analysis session ([link](https://app.devin.ai/sessions/40f0ab04ae9b44459499712d0cc4dd2f))

This document maps every GitHub Actions workflow to the secrets it requires
(excluding `GITHUB_TOKEN`, which is auto-provided). Use this to verify
that all automations have the secrets they need to actually run.

## Secret Inventory

| Secret | Used By | Skip Guard? | Notes |
|---|---|---|---|
| `OPENROUTER_API_KEY` | ai-pr-review, ai-ci-failure-helper, ai-weekly-changelog, openrouter-triage, openrouter-coder, openrouter-instantiation-check, priority-router, proof-of-life, research-module, run-human-testing-api | Most have guards | Core LLM routing key — if missing, most AI features silently skip |
| `JULES_API_KEY` | jules-invoke, jules-feedback, jules-pr-comment, jules-pr-reviewer | Yes (all guarded) | Google Jules agent integration |
| `OPENAI_API_KEY` | panda-ops | Yes | PandaOps AI PR review |
| `RECURSE_ML_API_KEY` | recurse-ml | No guard | RecurseML code review — will fail if missing |
| `ADMIN_GITHUB_TOKEN` | fork-audit-bot, openrouter-instantiation-check, ready-for-review, saml-sso-registration | Varies | Fine-grained PAT with elevated repo permissions |
| `READY_FOR_REVIEW_TOKEN` | ready-for-review | Yes | Fine-grained PAT for promoting drafts |
| `APP_ID` | mabl, research-module, run-human-testing-api | No guard | GitHub App ID for app-based auth |
| `APP_PRIVATE_KEY` | mabl, research-module, run-human-testing-api | No guard | GitHub App private key |
| `MABL_API_KEY` | mabl | No guard | mabl testing platform API key |
| `MIRROR_GIST_ID` | durability-mirror | Yes | Gist ID for durability mirror backup |
| `MIRROR_GIST_TOKEN` | durability-mirror | Yes | PAT with gist scope for mirror |

## Workflows Without Custom Secrets

These workflows only use `GITHUB_TOKEN` (auto-provided):

- `arsc-labels.yml`
- `auto-merge.yml`
- `close-linked-issue.yml`
- `commit-queue-monitor.yml`
- `compliance-watcher.yml`
- `create-issue-branch.yml`
- `flow-chart-sync.yml`
- `match-labels.yml`
- `mergify-merge-queue-labels-copier.yml`
- `migration-cron.yml`
- `ralph-loop.yml`
- `stale-branch-cleanup.yml`
- `sync-labels.yml`
- `triage-cron.yml`

## Workflows Missing Skip Guards

These workflows will **fail hard** if their secrets are not configured
(no graceful "skip if not set" check):

| Workflow | Missing Guard For |
|---|---|
| `mabl.yml` | `APP_ID`, `APP_PRIVATE_KEY`, `MABL_API_KEY` |
| `openrouter-coder.yml` | `OPENROUTER_API_KEY` |
| `openrouter-instantiation-check.yml` | `OPENROUTER_API_KEY` |
| `recurse-ml.yml` | `RECURSE_ML_API_KEY` |
| `research-module.yml` | `APP_ID`, `APP_PRIVATE_KEY`, `OPENROUTER_API_KEY` |
| `run-human-testing-api.yml` | `APP_ID`, `APP_PRIVATE_KEY`, `OPENROUTER_API_KEY` |

**Recommendation:** Add skip guards to these workflows so they degrade
gracefully instead of failing CI when secrets aren't configured.

## How to Verify

Run the **Secrets Health Check** workflow (`.github/workflows/secrets-health-check.yml`)
manually via `workflow_dispatch`. It reports which secrets are configured vs. missing
without exposing any values.
