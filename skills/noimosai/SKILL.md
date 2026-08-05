# Skill: NoimosAI — Autonomous Marketing Team

**Version:** 1.0.0  
**Date:** 2026-04-30  
**Status:** Active  
**Platform:** [NoimosAI](https://noimosai.com) — Autonomous AI Marketing Team  
**Standard:** `standards/NOIMOSAI_INTEGRATION_STANDARD.md`  
**Workflow:** `.github/workflows/noimosai.yml`

---

## What is NoimosAI

NoimosAI is an autonomous AI marketing team platform. You define high-level goals — SEO rankings, content calendars, social media presence, affiliate revenue — and NoimosAI's agents carry them out continuously without manual intervention.

NoimosAI replaces a human marketing team for autonomous, always-on marketing operations across all Revvel projects.

---

## When to Load This Skill

Load this skill when the task involves:

- Marketing automation or campaign management
- SEO audits, keyword research, or content briefs
- Social media content generation or scheduling
- Affiliate link management or revenue optimization
- Email marketing campaigns or newsletters
- Content strategy or editorial calendar planning
- Any issue labelled `noimosai`, `marketing`, `seo`, `content`, or `affiliate`

---

## How NoimosAI Is Wired into Revvel

NoimosAI is **always-on** in every Revvel project via three entry points:

### 1. Label-triggered (instant)
Any issue with labels `noimosai`, `marketing`, `seo`, `content`, or `affiliate` automatically invokes NoimosAI within seconds of being opened. The workflow posts an acknowledgment comment and queues the task.

### 2. Daily schedule (08:00 UTC)
`.github/workflows/noimosai.yml` runs three daily tasks automatically:
- SEO audit across active projects
- Content idea generation
- Affiliate link health-check

### 3. Workflow dispatch (manual/ad-hoc)
Operators can trigger NoimosAI directly from GitHub Actions → NoimosAI → Run workflow with a custom prompt, project name, and task type.

---

## Task Types

| Type | Description |
|---|---|
| `general` | Any marketing task not covered by the others |
| `seo` | Keyword research, on-page audit, backlink analysis, technical SEO |
| `content` | Blog posts, landing page copy, product descriptions, FAQs |
| `social` | Twitter/X, Instagram, LinkedIn, TikTok posts and scheduling |
| `affiliate` | Amazon affiliate links, commission rate auditing, link refresh |
| `email` | Newsletter drafts, drip campaigns, subscriber segmentation |

---

## Configuration

### Secrets

| Secret | Purpose | Where to get it |
|---|---|---|
| `NOIMOSAI_API_KEY` | Authenticates all NoimosAI API calls | [noimosai.com](https://noimosai.com) → Settings → API Keys |

### Repository Variables (optional)

| Variable | Purpose |
|---|---|
| `NOIMOSAI_WORKSPACE_ID` | Multi-team NoimosAI setups; identifies the workspace |

### Vault Path

```text
revvel/shared/marketing/noimosai
```

---

## Labels

Add these labels to the repository (`.github/labels.yml` should include them):

| Label | Color | Meaning |
|---|---|---|
| `noimosai` | `#7C5CFF` | Route this issue to NoimosAI |
| `marketing` | `#FF6B6B` | Marketing task — auto-routed to NoimosAI |
| `seo` | `#3DDCFF` | SEO task |
| `content` | `#F7C948` | Content creation task |
| `affiliate` | `#4CAF50` | Affiliate link / revenue task |

---

## API Reference (summary)

NoimosAI exposes a REST API at `https://api.noimosai.com/v1/`.

### `POST /v1/tasks`

Submit a new marketing task to the autonomous team.

```json
{
  "prompt": "Write three SEO-optimized blog post titles for reesereviews.com targeting 'best Amazon headphones 2026'",
  "task_type": "seo",
  "project": "reesereviews.com",
  "source": "github-actions",
  "repository": "midnghtsapphire/revvel-standards",
  "workspace_id": "YOUR_WORKSPACE_ID"
}
```

**Headers:**
```text
Authorization: Bearer NOIMOSAI_API_KEY
Content-Type: application/json
```

**Response:**
```json
{
  "task_id": "task_abc123",
  "status": "queued",
  "estimated_completion": "2026-04-30T09:00:00Z"
}
```

### `GET /v1/tasks/{task_id}`

Check the status of a submitted task.

### `GET /v1/tasks`

List all tasks in the workspace (paginated).

---

## Agent Workflow — How NoimosAI Agents Work

```text
Issue opened with `marketing` label
    ↓
.github/workflows/noimosai.yml fires
    ↓
NOIMOSAI_API_KEY verified
    ↓
POST /v1/tasks with issue title + body
    ↓
NoimosAI SEO Agent picks up task
    ↓
NoimosAI Content Agent writes assets
    ↓
NoimosAI Social Agent schedules posts
    ↓
Results published to project (Notion, GitHub comment, or direct deploy)
```

---

## Revvel Projects Using NoimosAI

| Project | Domain | Primary NoimosAI tasks |
|---|---|---|
| Reese Reviews | reesereviews.com | Amazon Vine SEO, affiliate link optimization, review content |
| GrowlingEyes | growlingeyes.oaudrey.com | Product reviews, social content, influencer SEO |
| FieldWork | fieldwork.oaudrey.com | B2B content, LinkedIn posts, landing-page copy |
| Soul2Bowl | soul2bowl.com | Local SEO, community content, email campaigns |
| ColdTrace | coldtrace.oaudrey.com | Content marketing, case studies, technical blogs |

---

## Agent Rules When Using This Skill

1. **Always apply `noimosai` label** to issues routed to NoimosAI — this ensures the workflow fires automatically.
2. **Never include real API keys** in prompts or issue bodies — NoimosAI reads only the text you provide.
3. **Task type matters** — choose the most specific `task_type` so NoimosAI routes to the right specialist agent.
4. **Daily automation is on by default** — the schedule runs without any human action once `NOIMOSAI_API_KEY` is provisioned.
5. **Verify NOIMOSAI_API_KEY is set** in every new repository that is being onboarded onto the Revvel org.

---

## Onboarding a New Revvel Repo onto NoimosAI

1. Add `NOIMOSAI_API_KEY` to the repo's GitHub Actions secrets.
2. Copy `.github/workflows/noimosai.yml` into the new repo.
3. Ensure the labels `noimosai`, `marketing`, `seo`, `content`, `affiliate` exist in that repo's labels.
4. (Optional) Set `NOIMOSAI_WORKSPACE_ID` as a repository variable if using a multi-team workspace.
5. Open a test issue with the `noimosai` label and verify the workflow runs and posts a comment.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Workflow skipped with "NOIMOSAI_API_KEY is not set" | Secret not provisioned | Settings → Secrets → New secret: `NOIMOSAI_API_KEY` |
| HTTP 401 from NoimosAI | Invalid API key | Re-generate at noimosai.com → Settings → API Keys |
| HTTP 429 rate limit | Too many tasks submitted | Reduce label-triggered submissions; increase dispatch rate limits |
| No comment posted on issue | `issues: write` permission missing | Check workflow `permissions:` block |

---

*Part of the Revvel Standards skills vault. See `skills/REGISTRY.md` for the full catalog.*
