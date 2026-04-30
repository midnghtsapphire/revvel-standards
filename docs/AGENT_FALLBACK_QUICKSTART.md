# Agent Fallback System — Quick Start

Automatic agent fallback: **Devin AI → Cursor → OpenRouter**

When Devin hits rate limits, the system automatically switches to Cursor, then OpenRouter, ensuring zero-downtime automation.

---

## 🚀 Quick Setup

### 1. Run the setup script

```bash
cd revvel-standards
./scripts/setup-agent-fallback.sh midnghtsapphire/YOUR-REPO
```

### 2. Configure API keys

```bash
# Option A: Use credential-gatekeeper workflow (recommended)
gh workflow run credential-gatekeeper.yml

# Option B: Set manually
gh secret set DEVIN_API_KEY --repo midnghtsapphire/YOUR-REPO
gh secret set CURSOR_API_KEY --repo midnghtsapphire/YOUR-REPO
gh secret set OPENROUTER_API_KEY --repo midnghtsapphire/YOUR-REPO

# Option C: From Vault
vault kv get -field=api_key revvel/shared/llm/devin | gh secret set DEVIN_API_KEY
vault kv get -field=api_key revvel/shared/llm/cursor | gh secret set CURSOR_API_KEY
vault kv get -field=api_key revvel/shared/llm/openrouter | gh secret set OPENROUTER_API_KEY
```

### 3. Automatic triggers (no configuration needed!)

The agent-fallback workflow **automatically triggers** on:

✅ **Issues labeled with:**
- `wr:code` — Code generation requests
- `wr:auto` — Automated tasks
- `agent-fallback` — Explicit fallback requests

✅ **Pull requests:**
- Opened (non-draft)
- Reopened
- Ready for review

✅ **Manual trigger:**
- Via GitHub Actions UI or `gh` CLI

### 4. Use in your workflows (optional)

```yaml
# In your workflow:
- name: Generate code with automatic fallback
  uses: ./.github/workflows/agent-fallback.yml
  with:
    task_description: ${{ github.event.issue.body }}
    issue_number: ${{ github.event.issue.number }}
```

---

## 📋 Features

✅ **Automatic triggering** — No manual workflow dispatch needed
✅ **Automatic fallback** — No manual intervention when Devin hits limits
✅ **Zero downtime** — Always have a working agent
✅ **Rate limit detection** — Smart retry with exponential backoff
✅ **Monitoring** — Track fallback events automatically
✅ **Cost optimization** — Route simple tasks to cheaper agents
✅ **Health checks** — Pre-flight verification before expensive operations

---

## 🔄 How It Works

1. **Try Devin AI** (primary, most capable)
   - Handles complex multi-file refactors
   - Full autonomous coding
   - Rate limited: ~10 requests/hour

2. **Fall back to Cursor** (secondary, faster)
   - Good for smaller features and bug fixes
   - Fast iteration, inline editing
   - Rate limited: ~100 requests/hour

3. **Fall back to OpenRouter** (tertiary, unlimited)
   - Multi-model support (Sonnet → Opus → GPT-4)
   - Pay-per-use, effectively unlimited
   - Emergency backup

4. **Manual escalation** (all agents failed)
   - Creates `needs-human` issue
   - Logs full diagnostic context
   - Notifies configured channels

---

## 📊 Monitoring

### View fallback events
```bash
gh issue list --label auto-fallback
```

### Check recent fallbacks
```bash
gh issue list --label auto-fallback --created ">=@{7 days ago}"
```

### Monitor agent health
```bash
gh workflow run agent-fallback.yml --ref main
```

---

## 🛠️ Files Added

- `.cursorrules` → symlink to `AGENTS.md`
- `.env.example` — Updated with `DEVIN_API_KEY`, `CURSOR_API_KEY`
- `.github/workflows/agent-fallback.yml` — Fallback workflow
- `scripts/call-devin-api.sh` — Devin API wrapper
- `scripts/call-cursor-api.sh` — Cursor API wrapper
- `scripts/setup-agent-fallback.sh` — Setup automation
- `docs/AGENT_FALLBACK_PROCESS.md` — Complete documentation

---

## 🔧 Configuration

### Agent Capabilities

| Agent | Best For | Rate Limit | Cost |
|-------|----------|------------|------|
| **Devin AI** | Complex features, architecture changes | ~10/hour | High |
| **Cursor** | Small features, bug fixes | ~100/hour | Medium |
| **OpenRouter** | Docs, reviews, emergency backup | Unlimited* | Variable |

*Pay-per-use, no hard limits

### Environment Variables

```bash
# .env (not committed)
DEVIN_API_KEY=sk-devin-...
CURSOR_API_KEY=sk-cursor-...
OPENROUTER_API_KEY=sk-or-v1-...
```

### Vault Paths

```
revvel/shared/llm/devin        # Devin API key
revvel/shared/llm/cursor       # Cursor API key
revvel/shared/llm/openrouter   # OpenRouter API key
```

---

## 🧪 Testing

### Test automatic triggers

#### 1. Test with an issue label
```bash
# Create a test issue
gh issue create --title "[TEST] Agent fallback test" \
  --body "Test issue for agent fallback system"

# Label it to trigger the workflow
gh issue edit <ISSUE_NUMBER> --add-label "wr:code"

# Watch the workflow run
gh run watch
```

#### 2. Test with a PR
```bash
# Create a branch and PR
git checkout -b test-agent-fallback
echo "test" > test.txt
git add test.txt
git commit -m "test: trigger agent fallback"
git push origin test-agent-fallback

# Create PR (will auto-trigger if not draft)
gh pr create --title "[TEST] Agent fallback" \
  --body "Test PR for agent fallback system"

# Watch the workflow run
gh run watch
```

#### 3. Test manual trigger
```bash
# Trigger manually with an issue number
gh workflow run agent-fallback.yml -f issue_number=123

# Watch the run
gh run watch
```

### Check which agent was used

```bash
# Check issue/PR comments for agent used
gh issue view <ISSUE_NUMBER> --comments

# Or check workflow logs
gh run view <RUN_ID> --log
```

---

## 🔍 Troubleshooting

### All agents fail

**Symptom:** Issue gets `needs-human` label

**Possible causes:**
- All API keys invalid/expired
- Service outages
- Task too complex for AI

**Fix:**
```bash
# Check secret configuration
gh secret list

# Verify keys work
curl -H "Authorization: Bearer $DEVIN_API_KEY" https://api.devin.ai/v1/health
curl -H "Authorization: Bearer $CURSOR_API_KEY" https://api.cursor.sh/v1/health
curl -H "Authorization: Bearer $OPENROUTER_API_KEY" https://openrouter.ai/api/v1/models
```

### Devin always fails

**Symptom:** Fallback events every time

**Possible causes:**
- Rate limit hit
- Quota exceeded
- Key expired

**Fix:**
```bash
# Check quota (if API supports it)
# Rotate key
vault kv get revvel/shared/llm/devin | gh secret set DEVIN_API_KEY

# Or skip Devin temporarily
gh workflow run agent-fallback.yml -f prefer_agent=cursor
```

### Excessive fallbacks

**Symptom:** Many `auto-fallback` issues

**Possible causes:**
- Workflow triggering too frequently
- Malicious automation
- Infinite loop

**Fix:**
```bash
# Check recent runs
gh run list --limit 20

# Check for loops
gh run view --log | grep -i fallback

# Temporarily disable workflow
gh workflow disable agent-fallback.yml
```

---

## 📖 Full Documentation

For complete details, see:
- [`docs/AGENT_FALLBACK_PROCESS.md`](../docs/AGENT_FALLBACK_PROCESS.md) — Full process documentation
- [`docs/AGENTS.md`](../docs/AGENTS.md) — Universal agent instructions
- [`skills/REGISTRY.md`](../skills/REGISTRY.md) — Skills registry

---

## 🎯 Use Cases

### Automated code generation
```yaml
on:
  issues:
    types: [labeled]
jobs:
  generate:
    if: github.event.label.name == 'wr:code'
    uses: ./.github/workflows/agent-fallback.yml
    with:
      task_description: ${{ github.event.issue.body }}
      issue_number: ${{ github.event.issue.number }}
```

### CI/CD with AI assistance
```yaml
on:
  pull_request:
jobs:
  review:
    uses: ./.github/workflows/agent-fallback.yml
    with:
      task_description: "Review PR and suggest improvements"
      issue_number: ${{ github.event.pull_request.number }}
```

### Scheduled maintenance
```yaml
on:
  schedule:
    - cron: '0 2 * * 1'  # Weekly on Monday 2 AM
jobs:
  create-issue:
    runs-on: ubuntu-latest
    outputs:
      issue_number: ${{ steps.issue.outputs.number }}
    steps:
      - uses: actions/github-script@v8
        id: issue
        with:
          script: |
            const { data } = await github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: '[SCHEDULED] Refactor deprecated patterns',
              labels: ['agent-fallback', 'scheduled'],
            });
            core.setOutput('number', data.number);
  refactor:
    needs: create-issue
    uses: ./.github/workflows/agent-fallback.yml
    with:
      task_description: "Refactor deprecated patterns"
      issue_number: ${{ needs.create-issue.outputs.issue_number }}
```

---

## 🚀 Next Steps

1. **Configure secrets** for all three agents
2. **Test the fallback** with a simple issue
3. **Monitor fallback events** for the first week
4. **Optimize routing** based on task patterns
5. **Add cost tracking** to identify expensive operations

---

## 📝 Changelog

| Date | Change | Author |
|------|--------|--------|
| 2026-04-30 | Initial agent fallback system | @copilot |

---

**Questions?** See [`docs/AGENT_FALLBACK_PROCESS.md`](../docs/AGENT_FALLBACK_PROCESS.md) or open an issue.
