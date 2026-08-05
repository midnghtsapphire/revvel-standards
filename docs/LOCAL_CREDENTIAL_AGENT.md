# Local Credential Agent

**100% local, zero third-party dependencies. Your machine → GitHub only.**

---

## What This Does

This agent runs on YOUR desktop and autonomously:
- Stores credentials locally (no cloud services like Doppler)
- Syncs credentials to GitHub Secrets
- Opens browser to service URLs for easy API key retrieval
- Runs automatically via cron/scheduled task

---

## Quick Setup (One-time)

### Windows (PowerShell)

```powershell
# Download
Invoke-WebRequest -Uri "https://raw.githubusercontent.com/midnghtsapphire/revvel-standards/main/scripts/auto-fetch-credentials.ps1" -OutFile "auto-fetch-credentials.ps1"

# See status
.\auto-fetch-credentials.ps1 status
```

### Mac/Linux

```bash
curl -O https://raw.githubusercontent.com/midnghtsapphire/revvel-standards/main/scripts/auto-fetch-credentials.sh
chmod +x auto-fetch-credentials.sh
./auto-fetch-credentials.sh status
```

---

## Usage

```bash
# See what credentials you have
./auto-fetch-credentials.sh status

# See what credentials you need
./auto-fetch-credentials.sh list

# Open browser to all services (manual entry)
./auto-fetch-credentials.sh open

# Sync all credentials to GitHub
./auto-fetch-credentials.sh sync

# Add a credential manually
./auto-fetch-credentials.sh add BITO_API_KEY sk_live_xxxxx
```

### Windows PowerShell

```powershell
.\auto-fetch-credentials.ps1 status
.\auto-fetch-credentials.ps1 open
.\auto-fetch-credentials.ps1 sync
.\auto-fetch-credentials.ps1 add BITO_API_KEY sk_live_xxxxx
```

---

## Required Credentials

| Credential | Service | Get from |
|------------|---------|----------|
| `OPENROUTER_API_KEY` | OpenRouter AI | openrouter.ai |
| `CLAUDE_API_KEY` | Claude | claude.ai/code |
| `CLAUDE_CODE_TOKEN` | Claude Code Extension | claude.ai/code |
| `LINEAR_API_KEY` | Linear | linear.app |
| `BITO_API_KEY` | Bito AI | bito.ai/settings |
| `JULES_API_KEY` | Google Jules | jules.google.com |
| `NOIMOSAI_API_KEY` | NoimosAI Marketing | noimosai.com |
| `TAVILY_API_KEY` | Tavily Research | app.tavily.com |
| `OPENAI_API_KEY` | OpenAI | platform.openai.com/api-keys |

---

## How It Works

```text
┌─────────────────────────────────────────────────────────┐
│                     YOUR DESKTOP                        │
│                                                          │
│  ┌─────────────────┐      ┌─────────────────────────┐   │
│  │ Credentials Dir │ ───► │ GitHub Actions          │   │
│  │ ~/.local/revvel │      │ (uses secrets)          │   │
│  └─────────────────┘      └─────────────────────────┘   │
│           │                                                 │
│           ▼                                                 │
│  ┌─────────────────┐                                      │
│  │ Sync Script      │ ───► GitHub Secrets                  │
│  │ (cron: every 4h)│                                      │
│  └─────────────────┘                                      │
│                                                          │
│  ┌─────────────────┐                                      │
│  │ Auto-Fetch       │ ───► Browser → API Pages             │
│  │ (opens URLs)     │      (you copy keys)                 │
│  └─────────────────┘                                      │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## File Locations

| File | Purpose |
|------|---------|
| `~/.local/revvel-agent/credentials/` | Local credential storage |
| `~/.local/revvel-agent/logs/` | Sync logs |

---

## Automation

### Cron (Mac/Linux)

Runs every 4 hours:
```bash
0 */4 * * * /path/to/auto-fetch-credentials.sh sync >> ~/.local/revvel-agent/logs/cron.log 2>&1
```

### Task Scheduler (Windows)

Create a task to run `auto-fetch-credentials.ps1 sync` every 4 hours.

---

## Security

- Credentials stored locally in `~/.local/revvel-agent/credentials/`
- Not synced anywhere except GitHub Secrets
- GitHub Secrets are encrypted at rest
- Local folder should have restricted permissions:
  ```bash
  chmod 700 ~/.local/revvel-agent/credentials
  ```

---

## Troubleshooting

### "gh CLI not found
```bash
# Install gh CLI
# Mac: brew install gh
# Linux: sudo apt install gh
# Windows: winget install GitHub.cli
```

### "Not logged in to GitHub
```bash
gh auth login
```

### Permission denied on sync
Make sure your GitHub token has `secrets:write` scope.

---

## Related

- [GitHub Actions Credential Gatekeeper](../.github/workflows/credential-gatekeeper.yml) - Auto-restores deleted secrets
- [Repo Self-Healer](../.github/workflows/repo-self-healer.yml) - Keeps issues clean
