# Agent Routing Policy

**Version:** 1.0.0  
**Date:** 2026-05-03  
**Status:** Active

---

## Executive Summary

This document defines the agent routing policy for all automation in the `midnghtsapphire/revvel-standards` repository. The policy prioritizes **free and affordable agents** (OpenRouter) over paid services (OpenHands, GitHub Copilot) to minimize operational costs while maintaining high-quality automation.

---

## Policy Overview

### Primary Principle: Minimize Costs

> **Use free/affordable agents first. Paid agents are opt-in only.**

All automation workflows must default to free or affordable agent options:
1. **OpenRouter** (primary) - Pay-per-use with affordable models
2. **Cursor** (fallback) - If available and cost-effective
3. **OpenHands** (opt-in only) - Requires explicit `prefer_agent: OpenHands` parameter

### Prohibited Actions

❌ **DO NOT** route to paid agents (OpenHands, Copilot) by default  
❌ **DO NOT** use `auto` mode that prefers paid agents  
❌ **DO NOT** add paid agents to workflows without explicit approval  

### Required Actions

✅ **DO** default to OpenRouter for all agent tasks  
✅ **DO** require explicit opt-in for paid agents  
✅ **DO** document costs for any paid service usage  
✅ **DO** use CircleCI for PR reviews instead of paid GitHub tools  

---

## Agent Capabilities & Costs

| Agent | Type | Cost | Use Case | Default? |
|-------|------|------|----------|----------|
| **OpenRouter** | API | Pay-per-use (~$0.001-0.01/request) | PR reviews, triage, research, code generation | ✅ Yes |
| **CircleCI** | CI/CD | Free tier available | PR reviews, automated checks | ✅ Yes |
| **BITO AI** | Code review | Free tier | Code reviews with repo memory | ✅ Yes |
| **Cursor** | IDE agent | Subscription (~$20/month) | Interactive development | ⚠️ Fallback |
| **OpenHands AI** | Autonomous | Pay-per-task (~$50+/task) | Complex multi-file tasks | ❌ Opt-in only |
| **GitHub Copilot** | Code assist | $10-19/month | Inline code suggestions | ❌ Not for automation |

---

## Workflow Routing Configuration

### 1. agent-fallback.yml

**Purpose:** Fallback chain for issue/PR automation

**Default chain:**
```text
OpenRouter (primary) → Cursor (fallback) → OpenHands (opt-in only)
```

**Configuration:**
```yaml
prefer_agent: "openrouter"  # Default value
```

**Opt-in to OpenHands:**
```yaml
prefer_agent: "OpenHands"  # Must be explicit
```

### 2. pr-auto-review.yml

**Purpose:** Automated PR code reviews

**Default:** OpenRouter via `OPENROUTER_API_KEY`

**Models used:**
- Primary: `anthropic/claude-sonnet-4` (balanced quality/cost)
- Fallback: `anthropic/claude-haiku-4.5` (faster, cheaper)

### 3. bito-ai.yml

**Purpose:** Code reviews with repository memory

**Default:** BITO AI (free tier available)

**When to use:**
- PR opened/synchronized
- Needs context from entire repository
- Free tier sufficient for current usage

### 4. CircleCI (.circleci/config.yml)

**Purpose:** CI/CD with integrated PR reviews

**Default:** Enabled for all PRs

**Capabilities:**
- Run tests and linters
- OpenRouter-powered PR reviews
- Post review comments directly in PRs
- No GitHub Actions minutes consumed

---

## Cost Management

### Monthly Budget Guidelines

| Service | Budget | Usage Limit | Override Process |
|---------|--------|-------------|------------------|
| OpenRouter | $50/month | ~5000 requests | Auto-throttle at 80% |
| BITO AI | $0/month | Free tier only | Upgrade requires approval |
| CircleCI | $0/month | Free tier only | Paid plan requires approval |
| OpenHands AI | $0/month | Explicit opt-in only | Per-task approval required |

### Cost Monitoring

All workflows must log:
- Agent used
- API calls made
- Estimated cost
- Fallback events

Monitor via:
- OpenRouter dashboard: <https://openrouter.ai/usage>
- CircleCI insights: <https://app.circleci.com/>
- GitHub Actions usage: Settings → Billing

---

## CircleCI Integration

### Why CircleCI for PR Reviews

1. **Direct PR integration** - Comments appear inline with "Commit" button
2. **Free tier** - 6,000 build minutes/month free
3. **OpenRouter compatibility** - Can call OpenRouter API from CircleCI
4. **No GitHub Actions minutes** - Preserves GitHub Actions free tier

### Configuration

Located in `.circleci/config.yml`:

```yaml
workflows:
  pr-workflow:
    jobs:
      - lint-and-test
      - pr-review:
          requires:
            - lint-and-test
```

**Required secrets in CircleCI:**
- `OPENROUTER_API_KEY` - For AI-powered reviews
- `GITHUB_TOKEN` - For PR/issue operations

### Setup Instructions

1. **Enable CircleCI:**
   - Go to <https://app.circleci.com/>
   - Connect midnghtsapphire/revvel-standards repository
   - Confirm webhook is active

2. **Configure secrets:**
   ```bash
   # In CircleCI project settings
   OPENROUTER_API_KEY=sk-or-v1-...
   GITHUB_TOKEN=ghp_...
   ```

3. **Test:**
   - Open a test PR
   - Wait for CircleCI workflow to complete
   - Verify review comment appears

---

## Workflow Examples

### Example 1: Default PR Review

**Trigger:** PR opened

**Flow:**
1. GitHub Actions detects PR
2. `pr-auto-review.yml` triggers
3. Calls OpenRouter API
4. Posts review comments
5. **Cost:** ~$0.01

### Example 2: Fallback Chain

**Trigger:** Issue labeled `wr:code`

**Flow:**
1. `agent-fallback.yml` triggers
2. Tries OpenRouter → **fails** (rate limit)
3. Tries Cursor → **succeeds**
4. Posts completion comment
5. Creates fallback monitoring issue

### Example 3: Opt-in OpenHands

**Trigger:** Manual workflow dispatch

**Input:**
```yaml
prefer_agent: "OpenHands"
issue_number: 123
```

**Flow:**
1. Skips OpenRouter (explicit opt-in)
2. Skips Cursor (explicit opt-in)
3. Calls OpenHands AI
4. **Cost:** ~$50-100

---

## Troubleshooting

### OpenRouter Rate Limits

**Symptom:** `429 Too Many Requests`

**Solution:**
1. Check OpenRouter dashboard for rate limit status
2. Wait for rate limit reset (usually 1 minute)
3. Workflow will automatically retry with exponential backoff

### CircleCI Not Running

**Symptom:** No CircleCI checks on PR

**Solution:**
1. Verify CircleCI webhook is active in GitHub settings
2. Check `.circleci/config.yml` is valid (not disabled)
3. Confirm `OPENROUTER_API_KEY` is set in CircleCI project settings

### BITO Failing at Start

**Symptom:** BITO AI workflow fails immediately

**Solution:**
1. Check `BITO_API_KEY` is configured
2. Verify BITO API status
3. Check if PR is draft (BITO skips drafts)
4. Consider using `[skip-bito]` in PR title if not needed

---

## Related Documentation

- `docs/AGENTS.md` - Universal AI agent instructions
- `docs/AGENT_FALLBACK_PROCESS.md` - Detailed fallback chain documentation
- `docs/PR_AUTO_REVIEW_AUTOMATION.md` - PR review automation
- `.circleci/config.yml` - CircleCI configuration

---

## Changelog

### 2026-05-03 - v1.0.0
- Initial policy document
- Changed default from OpenHands → OpenRouter
- Re-enabled CircleCI for PR reviews
- Made OpenHands opt-in only
- Updated agent-fallback.yml routing order

---

## Approval

**Author:** GitHub Copilot Coding Agent  
**Reviewer:** Required - @midnghtsapphire  
**Status:** Pending approval

---

*This policy aligns with the Prime Directive: Ship working, tested code — not plans. All automation must be cost-effective and sustainable.*
