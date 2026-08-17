# revvel-standards Quick Start

This guide gets you from zero to automated in 5 minutes.

---

## One-Command Setup

```bash
# Clone and run
git clone https://github.com/midnghtsapphire/revvel-standards.git
cd revvel-standards
./scripts/init-project.sh myproject fastapi-react
```

---

## Available Scripts

| Script | Purpose |
|--------|---------|
| `scripts/init-project.sh` | Initialize new project with full automation |
| `scripts/setup-automation.sh` | Add automation to existing project |

---

## Workflow Templates

Copy from `templates/github-workflows/`:

| Workflow | Use |
|----------|-----|
| `python-test.yml` | Python CI |
| `typescript-test.yml` | TypeScript CI |
| `auto-merge.yml` | Auto-merge PRs |
| `cleanup.yml` | Clean old branches |
| `security-audit.yml` | Security scanning |
| `deploy.yml` | Docker deployment |
| `daily-standup.yml` | Daily report |

---

## Pre-Wired Infrastructure

Every new project gets:

```yaml
✅ CI/CD pipeline (test, lint, security)
✅ Auto-merge PRs
✅ Branch cleanup (7+ days old)
✅ Security audit (daily)
✅ Deployment (staging + production)
✅ Daily standup report
```

---

## Automation Platforms

| Platform | Setup |
|----------|-------|
| **n8n** | Import `n8n/workflows/*.json` |
| **Zapier** | Use templates from `zapier/` |
| **Make** | Use scenarios from `make/` |
| **OpenHands** | Use automations from `openhands/` |

---

## CLI Tools

Install recommended tools:

```bash
# macOS
brew install gh git curl jq

# Python
pip install ruff black safety

# Node
npm install -g npm-check-updates
```

---

## GitHub Secrets

Set these for automation:

```bash
gh secret set SENTRY_DSN
gh secret set OPENAI_API_KEY  
gh secret set DISCORD_WEBHOOK_URL
gh secret set SLACK_WEBHOOK_URL
gh secret set DISPATCH_TOKEN
```

---

## Quick Commands

```bash
# Create new branch
git checkout -b feature/my-feature

# Auto-commit with AI
git add -A
git commit -m "Add feature

Co-authored-by: openhands <openhands@all-hands.dev>"

# Create PR
gh pr create --title "Feature" --body "Description"

# Merge PR
gh pr merge --admin --merge
```

---

## Standards by Category

| Category | File |
|-----------|------|
| **Testing** | `standards/TESTING.md` |
| **Security** | `standards/SECURITY.md` |
| **Docker** | `standards/DOCKER.md` |
| **Pricing** | `standards/PRICING.md` |
| **Integrations** | `standards/INTEGRATIONS.md` |
| **Automation** | `standards/ZERO_HUMAN_FRAMEWORK.md` |
| **CLI/MCP** | `standards/CLI_MCP_AUTOMATION.md` |

---

## Next Steps

1. **Initialize a project**: `./scripts/init-project.sh projectname stack`
2. **Configure secrets**: Set GitHub secrets
3. **Import automation**: Set up n8n workflows
4. **Test automation**: Run a test workflow
5. **Go to production**: Merge first PR

---

## Getting Help

- GitHub: <https://github.com/midnghtsapphire/revvel-standards>
- Issues: <https://github.com/midnghtsapphire/revvel-standards/issues>
