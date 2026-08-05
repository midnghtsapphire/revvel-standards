# Lovable Integration Standard

**Purpose:** Use Lovable AI to build websites and mobile apps from Work Requests
**Status:** Available on all Lovable plans (including Free)
**Updated:** 2026-06-15

---

## Overview

Lovable is an AI-powered builder that creates production-ready websites and web apps from natural language descriptions. It integrates with our workflow via:

1. **GitHub Sync** - Code syncs directly to GitHub repositories
2. **MCP Chat Connectors** - Can connect to internal tools
3. **REST API** - Programmatic project creation

---

## Integration Options

### Option 1: GitHub Connector (Recommended)

Lovable has a native GitHub connector that:
- Syncs generated code to GitHub repos
- Creates branches for iterations
- Supports code review workflow

**Setup:**
1. Go to Lovable → Connectors → Chat connectors
2. Click "GitHub"
3. Authorize with GitHub
4. Select repository for sync

### Option 2: Custom MCP Server

Connect Lovable to internal tools via MCP:

```json
{
  "mcpServers": {
    "lovable": {
      "command": "npx",
      "args": ["-y", "@lovable/mcp-server"],
      "env": {
        "LOVABLE_API_KEY": "${LOVABLE_API_KEY}"
      }
    }
  }
}
```

### Option 3: API-Based Integration

Use Lovable's API to create projects programmatically:

```bash
# Create project via API
curl -X POST "https://api.lovable.dev/v1/projects" \
  -H "Authorization: Bearer $LOVABLE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Dashboard App",
    "prompt": "Create a live dashboard that displays CL4R1T4S data"
  }'
```

---

## Workflow Integration

### WR Processing with Lovable

```text
Issue Opened → Triage (Perplexity No-Key fallback) → 
  ↓ If area:ui or output-type:production-app
Lovable Build → GitHub Sync → Code Review → Deploy
```

### GitHub Actions Integration

```yaml
name: Trigger Lovable Build
on:
  issue_comment:
    types: [created]

jobs:
  trigger-lovable:
    if: contains(github.event.comment.body, '/build')
    runs-on: ubuntu-latest
    steps:
      - name: Extract requirements
        id: parse
        run: |
          ISSUE_NUMBER=$(echo "${{ github.event.issue.number }}")
          echo "issue=$ISSUE_NUMBER" >> $GITHUB_OUTPUT

      - name: Call Lovable API
        env:
          LOVABLE_API_KEY: ${{ secrets.LOVABLE_API_KEY }}
        run: |
          # Create project with requirements from issue
          curl -X POST "https://api.lovable.dev/v1/projects" \
            -H "Authorization: Bearer $LOVABLE_API_KEY" \
            -H "Content-Type: application/json" \
            -d "{
              \"name\": \"Issue #${{ steps.parse.outputs.issue }}\",
              \"prompt\": \"${{ github.event.issue.body }}\",
              \"github_repo\": \"midnghtsapphire/revvel-standards\"
            }"

      - name: Add comment
        uses: actions/github-script@v9
        with:
          script: |
            await github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '🤖 Lovable build triggered! Check https://lovable.dev for progress.'
            });
```

---

## Available Connectors in Lovable

| Category | Tools |
|----------|-------|
| **Project Management** | Linear, Jira, Asana, Notion |
| **Design** | Figma, Miro, Paper |
| **Analytics** | Amplitude, PostHog |
| **Communication** | Slack, Telegram, Granola |
| **CMS** | Contentful, Sanity, WordPress, Storyblok |
| **eCommerce** | Shopify, Stripe |
| **Database** | Supabase, Snowflake, BigQuery |
| **AI** | Perplexity, Gemini Enterprise |

---

## Lovable Plans

| Feature | Free | Hobby ($19/mo) | Pro ($49/mo) | Business ($99/mo) |
|---------|------|----------------|--------------|-------------------|
| Projects | 3 | Unlimited | Unlimited | Unlimited |
| Credits | Limited | 10,000/mo | 25,000/mo | 100,000/mo |
| GitHub Sync | ✅ | ✅ | ✅ | ✅ |
| Custom MCP | ✅ | ✅ | ✅ | ✅ |
| Team workspace | ❌ | ❌ | ✅ | ✅ |
| SSO | ❌ | ❌ | ❌ | ✅ |

---

## For Issue #14626 (CL4R1T4S Dashboard)

**Recommended approach:**
1. Copy the issue description and requirements
2. Go to <https://lovable.dev>
3. Create new project with prompt:
   ```text
   Create a live-type dashboard that repurposes data from https://github.com/elder-plinius/CL4R1T4S
   
   Requirements:
   - Real-time data display
   - Interactive visualizations
   - Modern, responsive UI
   - Mobile-friendly design
   ```
4. Iterate until satisfied
5. Sync to GitHub
6. Deploy

---

## Related Standards

- [MCP Standard](./MCP_STANDARD.md) - Model Context Protocol
- [WR Processing](./WR_PROCESSING_STANDARD.md) - Work Request handling
- [Deployment Standard](./DEPLOYMENT_STANDARD.md) - Deployment pipeline
- [FREE_LLM_FALLBACK.md](./FREE_LLM_FALLBACK.md) - Free LLM fallback strategy

---

## Quick Start

1. **Create Lovable account** at <https://lovable.dev>
2. **Connect GitHub** at Connectors → Chat connectors → GitHub
3. **Create project** by describing what you want to build
4. **Iterate** with feedback until satisfied
5. **Sync to GitHub** with one click

---

**Last Updated:** 2026-06-15
