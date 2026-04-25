# CLI, MCP & Automation Standards

## Research Summary

Based on research of GitHub Marketplace and MCP ecosystem.

---

## GitHub Marketplace CLI Tools

### Must-Have GitHub Actions

| Action | Purpose | Use Case |
|--------|---------|----------|
| **peter-evans/automerge-action** | Auto-merge PRs | Merge approved PRs |
| **peter-evans/repository-dispatch** | Custom triggers | Slash commands |
| **mmorenoregalado/github-branch-cleaner** | Clean old branches | Remove merged |
| **actions/checkout** | Checkout code | Every workflow |
| **actions/setup-node** | Node.js | Node projects |
| **actions/setup-python** | Python | Python projects |

---

## MCP Server Standards

### GitHub MCP Server Capabilities

```python
tools = {
    "repositories": ["list", "get", "create", "delete"],
    "issues": ["list", "create", "update", "close"],
    "pull_requests": ["list", "create", "merge"],
    "code": ["get_file", "update_file", "list_commits"]
}
```

### Custom MCP Server Template

```python
class ZeroHumanMCPServer:
    def __init__(self):
        self.tools = {}
        
    def tool(self, name: str):
        def decorator(func):
            self.tools[name] = func
            return func
        return decorator
        
    async def handle(self, tool: str, params: dict):
        return await self.tools[tool](**params)
```

---

## GitHub CLI Workflows

### Auto-Merge PR

```yaml
# .github/workflows/auto-merge.yml
name: Auto Merge

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  automerge:
    runs-on: ubuntu-latest
    steps:
      - uses: peter-evans/automerge-action@v6
```

### Branch Cleanup

```yaml
# .github/workflows/cleanup.yml
name: Cleanup

on:
  schedule: ['0 3 * * *']

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - uses: mmorenoregalado/github-branch-cleaner@v1
        with:
          days_old: 7
```

---

## n8n Workflow Templates

### Client Request Pipeline

```json
{
  "nodes": [
    {"name": "Email Trigger"},
    {"name": "AI Classifier"},
    {"name": "Route"},
    {"name": "Generate Quote"},
    {"name": "Send Reply"}
  ]
}
```

### Invoice Processing

```json
{
  "nodes": [
    {"name": "Email Invoice"},
    {"name": "Parse PDF"},
    {"name": "Verify Payment"},
    {"name": "Log to Sheets"},
    {"name": "Send Receipt"}
  ]
}
```

---

## OpenHands Automations

### Prompt Preset - Daily Report

```bash
curl -X POST "${OPENHANDS_HOST}/api/automation/v1/preset/prompt" \
  -d '{
    "name": "Daily Report",
    "prompt": "Generate daily status for midnghtsapphire repos. Check PRs, commits, deployments.",
    "trigger": {"type": "cron", "schedule": "0 9 * * 1-5"}
  }'
```

### Prompt Preset - Code Review

```bash
curl -X POST "${OPENHANDS_HOST}/api/automation/v1/preset/prompt" \
  -d '{
    "name": "Weekly Code Review",
    "prompt": "Review all open PRs for security, test coverage, quality. Post to Discord.",
    "trigger": {"type": "cron", "schedule": "0 10 * * 1"}
  }'
```

### Plugin Preset

```bash
curl -X POST "${OPENHANDS_HOST}/api/automation/v1/preset/plugin" \
  -d '{
    "name": "Project Audit",
    "plugins": [{"source": "github:midnghtsapphire/revvel-standards"}],
    "prompt": "Audit repository. Generate inventory report."
  }'
```

---

## Zapier Core Zaps

```
Zap 1: GitHub PR → Slack
  Trigger: New PR with label "needs-review"
  Actions: Format → Slack → Notion task

Zap 2: Typeform → Lead Pipeline
  Trigger: New form submission
  Actions: Sheets → Notion → Email quote

Zap 3: Stripe → Deliver License
  Trigger: Payment success
  Actions: Generate key → Email → CRM

Zap 4: Calendar → Client Reminder
  Trigger: 24 hours before
  Actions: Email → CRM → Create task
```

---

## Make Scenarios

```
Scenario: Invoice Processing
  Email → Parse PDF → Stripe check → Sheets → Slack

Scenario: Lead Qualification
  Form → Scrape → AI analyze → Proposal → Email sequence

Scenario: GitHub PR → Deploy
  PR → Tests → Code review → Merge → Deploy
```

---

## Automation Architecture

```
┌─────────────────────────────────────┐
│         AUTOMATION LAYER            │
├─────────────────────────────────────┤
│ GitHub Actions  │ MCP Servers       │
│  - automerge    │  - GitHub MCP     │
│  - branch-clean│  - Google Toolbox │
│  - create-pr   │  - Custom         │
├─────────────────────────────────────┤
│ n8n/Make/Zapier  │ OpenHands       │
│  - Email         │  - Prompt      │
│  - Slack/Discord │  - Plugin      │
│  - Notion/Stripe │  - Cron        │
├─────────────────────────────────────┤
│ Decision Router (Human when needed)  │
└─────────────────────────────────────┘
```

---

## Recommended Tools

| Category | Priority | Tools |
|----------|----------|-------|
| CI/CD | High | GitHub Actions, peter-evans/* |
| MCP | High | GitHub MCP, Custom |
| Email | High | n8n, Zapier |
| Notifications | High | Slack, Discord, Telegram |
| Tasks | Medium | Notion, Linear |
| AI Agents | High | OpenHands, Claude |
| Scheduling | High | GitHub Actions cron |
| Code Review | Medium | AI + MCP |

