# AI Agent Stack Setup

## What this does
When you open a WR issue:
1. **auto-route.yml** reads the body, applies labels (`fix-me`, `swe-fix`, routing profile, model tags), assigns bot.
2. **openhands-resolver.yml** triggers on `fix-me` → calls OpenRouter (claude-3.7-sonnet → deepseek-v3.2 fallback) → attempts a PR.
3. **swe-agent.yml** triggers on `swe-fix` → runs SWE-agent with OpenRouter backend → attempts a PR.
4. **augment-check.yml** checks every new PR for Augment Code review — prompts you to install the App if missing.
5. If any agent fails, it comments on the issue with a direct workflow log link.

## Setup checklist

### 1. Bot account
- [ ] Create GitHub account: `yourorg-openrouter-bot`
- [ ] Enable 2FA on it
- [ ] Add to this repo with **Write** access
- [ ] Generate a PAT with `repo` + `workflow` scope on that account

### 2. Repo secrets (Settings → Secrets → Actions)
| Secret | Value |
|---|---|
| `BOT_GITHUB_TOKEN` | PAT from bot account |
| `OPENROUTER_API_KEY` | Your OpenRouter API key |

### 3. Repo variables (Settings → Variables → Actions)
| Variable | Value |
|---|---|
| `BOT_USERNAME` | e.g. `yourorg-openrouter-bot` |

### 4. Repo Actions permissions (Settings → Actions → General)
- [x] Read and write permissions
- [x] Allow GitHub Actions to create and approve pull requests

### 5. Augment Code GitHub App (manual install)
👉 <https://app.augmentcode.com/settings/code-review>
- Click Install GitHub App
- Select this repo
- Done — Augment Code will auto-review every PR

## Usage
Open an issue using the WR template. Everything else is automatic.

## Failure path
Agent fails → comments on issue with log link → you jump in.
No silent failures.
