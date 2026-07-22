# Zero-Human Framework

## Vision

**"Set it up once, it runs itself. You only touch it when it needs a decision."**

---

## Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│                    ZERO-HUMAN FRAMEWORK                     │
├─────────────────────────────────────────────────────────────┤
│  RECEIVE (n8n/Make/Zapier/Gumloop)                          │
│     ↓                                                        │
│  PROCESS (AI/MCP/OpenClaw)                                  │
│     ↓                                                        │
│  ACT (Notify/Create/Execute)                                │
└─────────────────────────────────────────────────────────────┘
```

---

## Pre-Wired Infrastructure

Every project MUST have from day 1:

### CI/CD Pipeline (Zero-Human)

```yaml
# .github/workflows/zero-human.yml
name: Zero-Human Pipeline

on:
  push: [main, develop]
  pull_request:
  schedule: ['0 2 * * *']  # 2 AM daily
  repository_dispatch:
    - types: [deploy, test, audit]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pytest --cov

  security-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm audit --audit-level=high || pip install safety && safety check

  auto-fix:
    if: failure()
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: |
          ruff check --fix . || true
          npm audit fix || true

  deploy-staging:
    if: github.ref == 'refs/heads/develop'
    runs-on: ubuntu-latest
    steps:
      - run: echo "Deploy to staging"

  deploy-production:
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production
    steps:
      - run: echo "Deploy to production"
```

---

## MCP Server Template

```python
# app/mcp_server.py
class ZeroHumanMCP:
    def __init__(self):
        self.platforms = {
            "n8n": N8NClient(),
            "make": MakeClient(),
            "zapier": ZapierClient(),
            "gumloop": GumloopClient(),
        }
        
    async def handle_email(self, email: dict):
        intent = await self.classify_email(email)
        handlers = {
            "client_request": self.handle_client_request,
            "invoice": self.handle_invoice,
            "meeting": self.handle_meeting,
            "spam": lambda e: None,
        }
        await handlers.get(intent, self.handle_unknown)(email)
        
    async def handle_client_request(self, email: dict):
        requirements = await self.extract_requirements(email)
        quote = self.generate_quote(requirements)
        await self.platforms["n8n"].send_proposal(email["from"], quote)
        await self.create_task("Quote Request", email)
```

---

## n8n Workflows

```json
{
  "workflows": [
    {
      "name": "Client Request → Quote → Proposal",
      "nodes": ["email_trigger", "gpt_requirements", "calc_quote", "doc_proposal", "send_email", "notion_task"]
    },
    {
      "name": "Invoice Processing",
      "nodes": ["email_trigger", "verify_payment", "log_transaction", "notify"]
    },
    {
      "name": "Lead → Website Analysis → Quote",
      "nodes": ["form_trigger", "scrape_website", "ai_analysis", "generate_proposal", "send_email"]
    }
  ]
}
```

---

## Staying Relevant at 60+

| Era | Role | Human Task |
|-----|------|------------|
| 2000s | Coder | Write all code |
| 2010s | Lead | Review + manage |
| 2020s | Architect | Design systems |
| **NOW** | **Strategist** | **Decide what to build** |

### Time Allocation

```text
Traditional (40 hrs):
  Coding: 30 hrs, Meetings: 5 hrs, Admin: 5 hrs

Zero-Human (40 hrs):
  Strategy: 20 hrs, Client Relations: 10 hrs, Decisions: 8 hrs, Reviews: 2 hrs
```

---

## Init Script

```bash
# ./scripts/init-project.sh <name> <stack>
./scripts/init-project.sh myproject fastapi-react
```

This wires:
- ✅ CI/CD pipeline
- ✅ Security audit
- ✅ Auto-linting
- ✅ n8n workflow templates
- ✅ Pre-commit hooks
- ✅ Secrets configured

---

## Revenue Impact

| Process | Before | After | Savings |
|---------|--------|-------|---------|
| Client quote | 2 hrs | 5 min | 95% |
| Invoice processing | 30 min | 0 min | 100% |
| Code review | 1 hr | 10 min | 83% |
| Lead follow-up | 1 hr | 0 min | 100% |
