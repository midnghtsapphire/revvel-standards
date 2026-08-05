# NoimosAI Integration Standard

**Version:** 1.0.0  
**Date:** 2026-04-30  
**Status:** Active  
**Owner:** MIDNGHTSAPPHIRE  
**Scope:** All projects in the Revvel ecosystem

---

## 1. Overview

[NoimosAI](https://noimosai.com) is an autonomous AI marketing team platform. NoimosAI agents handle SEO, content creation, social media scheduling, affiliate link management, and email marketing continuously — without human intervention.

This standard defines how NoimosAI is provisioned, triggered, and governed across **every** Revvel project, consistent with how Jules (coding agent) and OpenRouter (orchestration) are wired in.

---

## 2. Architecture

```text
GitHub Issue / Schedule / Dispatch
          │
          ▼
.github/workflows/noimosai.yml
          │
          ▼
POST https://api.noimosai.com/v1/tasks
    (NOIMOSAI_API_KEY via GitHub Secret)
          │
          ▼
NoimosAI Autonomous Agent Fleet
  ├── SEO Agent         ← keyword research, technical audits, backlinks
  ├── Content Agent     ← blog posts, landing copy, product descriptions
  ├── Social Agent      ← Twitter/X, Instagram, LinkedIn, TikTok
  ├── Affiliate Agent   ← link management, commission auditing
  └── Email Agent       ← newsletters, drip sequences, segmentation
```

---

## 3. Required Configuration

### 3.1 Secrets (Settings → Secrets and variables → Actions → Secrets)

| Name | Purpose | Where to obtain |
|---|---|---|
| `NOIMOSAI_API_KEY` | Authenticates all API calls. Server-only — never expose in client bundles. | [noimosai.com](https://noimosai.com) → Settings → API Keys |

### 3.2 Repository Variables (Settings → Variables → Actions)

| Name | Purpose | Required? |
|---|---|---|
| `NOIMOSAI_WORKSPACE_ID` | Multi-team workspace identifier. Leave empty for single-team setups. | Optional |

### 3.3 Vault Path

```text
revvel/shared/marketing/noimosai
```

Retrieve with:

```bash
vault kv get -field=api_key revvel/shared/marketing/noimosai
```

---

## 4. GitHub Actions Workflow

File: `.github/workflows/noimosai.yml`

The workflow has three jobs:

| Job | Trigger | Purpose |
|---|---|---|
| `dispatch` | `workflow_dispatch` | Ad-hoc marketing task with custom prompt, project, and task type |
| `invoke-on-issue` | `issues: [opened, reopened]` | Auto-route marketing issues to NoimosAI when labels match |
| `daily-refresh` | `schedule: 0 8 * * *` | Daily SEO audit, content ideas, and affiliate health-check |

### Issue Labels That Trigger NoimosAI

The `invoke-on-issue` job fires when **any** of these labels is present:

| Label | NoimosAI task type |
|---|---|
| `noimosai` | general |
| `marketing` | general |
| `seo` | seo |
| `content` | content |
| `affiliate` | affiliate |

---

## 5. Labels

Add the following labels to every Revvel repository. They are the entry point for NoimosAI automation:

| Label | Hex color | Purpose |
|---|---|---|
| `noimosai` | `#7C5CFF` | Direct NoimosAI routing |
| `marketing` | `#FF6B6B` | General marketing task |
| `seo` | `#3DDCFF` | SEO and keyword task |
| `content` | `#F7C948` | Content creation task |
| `affiliate` | `#4CAF50` | Affiliate and revenue task |

Add them to `.github/labels.yml` so `sync-labels.yml` propagates them automatically.

---

## 6. NoimosAI API Reference

### Base URL

```text
https://api.noimosai.com/v1
```

### Authentication

```text
Authorization: Bearer {NOIMOSAI_API_KEY}
```

### `POST /v1/tasks` — Submit a task

**Request body:**

```json
{
  "prompt": "string — the full task description",
  "task_type": "general | seo | content | social | affiliate | email",
  "project": "string — domain or project name (e.g. reesereviews.com)",
  "source": "string — e.g. github-actions",
  "repository": "string — owner/repo",
  "workspace_id": "string (optional)"
}
```

**Success response (HTTP 200/201):**

```json
{
  "task_id": "task_abc123",
  "status": "queued",
  "estimated_completion": "2026-04-30T09:00:00Z"
}
```

### `GET /v1/tasks/{task_id}` — Check task status

```json
{
  "task_id": "task_abc123",
  "status": "completed",
  "result": { ... }
}
```

### `GET /v1/tasks` — List all tasks

Paginated. Add `?page=1&limit=50`.

---

## 7. Onboarding a New Project

Follow these steps when adding NoimosAI to a new repository:

1. **Provision the secret** — Add `NOIMOSAI_API_KEY` to the repo's GitHub Actions secrets (obtain from vault path above or directly from noimosai.com).

2. **Copy the workflow** — Add `.github/workflows/noimosai.yml` (use the canonical copy from `revvel-standards`).

3. **Add labels** — Ensure `noimosai`, `marketing`, `seo`, `content`, and `affiliate` labels exist. Add them to `.github/labels.yml`.

4. **Optional workspace** — Set `NOIMOSAI_WORKSPACE_ID` as a repository variable if using a multi-team workspace.

5. **Smoke-test** — Open a test issue with the `noimosai` label. Confirm:
   - The `invoke-on-issue` job runs and completes with exit 0.
   - A comment is posted to the issue: "🤖 NoimosAI has been notified…"

6. **Verify daily schedule** — Check the Actions tab the following day at 08:00 UTC to confirm `daily-refresh` ran.

---

## 8. Revvel Project Inventory

| Project | Domain | Primary NoimosAI use cases |
|---|---|---|
| Reese Reviews | reesereviews.com | Amazon Vine product SEO, affiliate optimization, review content |
| GrowlingEyes | growlingeyes.oaudrey.com | Product discovery, influencer SEO, social content |
| FieldWork | fieldwork.oaudrey.com | B2B landing-page copy, LinkedIn posts |
| Soul2Bowl | soul2bowl.com | Local SEO, community newsletter, event content |
| ColdTrace | coldtrace.oaudrey.com | Technical content marketing, case studies |
| Penny Sovereign | penny-sovereign.oaudrey.com | Financial content SEO, newsletter |

---

## 9. Verification Checklist

Before marking NoimosAI as wired in for a project, confirm all of the following:

- [ ] `NOIMOSAI_API_KEY` secret exists in the repository.
- [ ] `.github/workflows/noimosai.yml` is present.
- [ ] Labels `noimosai`, `marketing`, `seo`, `content`, `affiliate` exist.
- [ ] Smoke-test issue with `noimosai` label was opened and the workflow ran.
- [ ] Acknowledgment comment was posted by the workflow.
- [ ] `daily-refresh` job ran at least once without errors.

---

## 10. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Workflow skipped with warning "NOIMOSAI_API_KEY is not set" | Secret not provisioned | Settings → Secrets → New secret: `NOIMOSAI_API_KEY` |
| HTTP 401 response | Invalid or expired API key | Re-generate at noimosai.com; update the secret |
| HTTP 429 rate limit | Too many simultaneous tasks | Add jitter/delay in dispatch; reduce `max-parallel` in matrix jobs |
| Workflow file not found | Workflow not copied to target repo | Copy `.github/workflows/noimosai.yml` from revvel-standards |
| No comment posted | `issues: write` permission not granted | Add `permissions: issues: write` to the `invoke-on-issue` job |

---

## 11. Related Files

| File | Purpose |
|---|---|
| `.github/workflows/noimosai.yml` | The automation workflow |
| `skills/noimosai/SKILL.md` | Agent skill instructions |
| `.env.example` | `NOIMOSAI_API_KEY` and `NOIMOSAI_WORKSPACE_ID` documented |
| `skills/REGISTRY.md` | NoimosAI entry in the skills registry |
| `docs/AGENTS.md` | Automation routing section references NoimosAI |

---

*Part of the Revvel Standards ecosystem. See `standards/` for other integration standards.*
