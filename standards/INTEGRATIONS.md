# Integrations Standards

## Overview

This standard defines integrations with communication platforms that can be sold as packages.

---

## Available Integrations

| Platform | Package Name | Use Case | Price |
|----------|-------------|----------|-------|
| **Discord** | Discord Alerts | CI/CD notifications, team alerts | $500-2,000 |
| **Slack** | Slack Bot | Team notifications, commands | $500-2,000 |
| **Telegram** | Telegram Bot | Mobile notifications, alerts | $300-1,500 |
| **OpenClaw** | OpenClaw Agent | Multi-platform management | $1,000-5,000 |
| **Notion** | Notion Sync | Project tracking, docs | $500-2,000 |
| **Okta** | Okta SSO | Enterprise authentication | $2,000-10,000 |
| **RevenueCat** | Subscriptions / IAP | Cross-platform billing, paywalls, entitlements | See [REVENUECAT.md](REVENUECAT.md) |

---

## Discord Integration

### Features
- CI/CD build status notifications
- Error alerts from Sentry
- Deployment notifications
- Team mentions for critical issues
- Slash commands for quick actions

### Implementation

```python
# app/integrations/discord.py
import httpx
from typing import Optional

class DiscordNotifier:
    def __init__(self, webhook_url: str):
        self.webhook_url = webhook_url
        
    async def send_message(self, content: str, embed: Optional[dict] = None):
        """Send message to Discord channel."""
        payload = {"content": content, "allowed_mentions": {"parse": []}}
        if embed:
            payload["embeds"] = [embed]
            
        async with httpx.AsyncClient() as client:
            await client.post(self.webhook_url, json=payload)
            
    async def send_build_status(self, build: dict):
        """Send CI/CD build status."""
        status = "✅ Passed" if build["status"] == "success" else "❌ Failed"
        embed = {
            "title": f"Build #{build['number']} {status}",
            "description": build.get("message", ""),
            "color": 0x00FF00 if build["status"] == "success" else 0xFF0000,
            "fields": [
                {"name": "Branch", "value": build["branch"]},
                {"name": "Duration", "value": f"{build['duration']}s"}
            ]
        }
        await self.send_message(f"Build {status}", embed)
        
    async def send_error_alert(self, error: dict):
        """Send Sentry error alert."""
        embed = {
            "title": f"🚨 Error: {error['title']}",
            "description": error.get("message", "")[:200],
            "color": 0xFF0000,
            "url": error.get("url", ""),
            "fields": [
                {"name": "Level", "value": error.get("level", "error")},
                {"name": "Count", "value": str(error.get("count", 1))}
            ]
        }
        await self.send_message("🚨 New Error Detected", embed)
```

### Slack Integration

```python
# app/integrations/slack.py
from slack_sdk import WebClient
from slack_sdk.errors import SlackApiError

class SlackNotifier:
    def __init__(self, bot_token: str):
        self.client = WebClient(token=bot_token)
        
    async def send_message(self, channel: str, text: str, blocks: list = None):
        """Send message to Slack channel."""
        try:
            result = self.client.chat_postMessage(
                channel=channel,
                text=text,
                blocks=blocks or []
            )
            return result
        except SlackApiError as e:
            print(f"Error: {e.response['error']}")
            
    def create_deploy_block(self, deploy: dict) -> list:
        """Create deployment notification block."""
        status = "✅" if deploy["status"] == "success" else "❌"
        return [
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"{status} *Deployment {deploy['status']}*\n"
                           f"*Version:* {deploy['version']}\n"
                           f"*Environment:* {deploy['env']}"
                }
            }
        ]
```

### Telegram Integration

```python
# app/integrations/telegram.py
import httpx

class TelegramNotifier:
    def __init__(self, bot_token: str, chat_id: str):
        self.bot_token = bot_token
        self.chat_id = chat_id
        self.api_url = f"https://api.telegram.org/bot{bot_token}"
        
    async def send_message(self, text: str, parse_mode: str = "Markdown"):
        """Send message to Telegram chat."""
        payload = {
            "chat_id": self.chat_id,
            "text": text,
            "parse_mode": parse_mode
        }
        async with httpx.AsyncClient() as client:
            await client.post(f"{self.api_url}/sendMessage", json=payload)
            
    async def send_alert(self, title: str, message: str, severity: str = "warning"):
        emoji = {"critical": "🚨", "warning": "⚠️", "info": "ℹ️"}.get(severity, "📢")
        text = f"{emoji} *{title}*\n\n{message}"
        await self.send_message(text)
```

---

## OpenClaw Integration

### What is OpenClaw
Multi-agent management platform for orchestrating AI agents across services.

### Features
- Centralized agent management
- Cross-platform task execution
- Workflow automation
- Monitoring dashboard

### Implementation

```python
# app/integrations/openclaw.py
import httpx

class OpenClawClient:
    def __init__(self, api_key: str, base_url: str = "https://api.openclaw.io"):
        self.api_key = api_key
        self.base_url = base_url
        self.headers = {"Authorization": f"Bearer {api_key}"}
        
    async def register_agent(self, agent_config: dict):
        """Register an agent with OpenClaw."""
        async with httpx.AsyncClient() as client:
            return await client.post(
                f"{self.base_url}/agents",
                json=agent_config,
                headers=self.headers
            )
            
    async def execute_task(self, agent_id: str, task: dict):
        """Execute a task via OpenClaw."""
        async with httpx.AsyncClient() as client:
            return await client.post(
                f"{self.base_url}/agents/{agent_id}/tasks",
                json=task,
                headers=self.headers
            )
            
    async def get_agent_status(self, agent_id: str):
        """Get agent status."""
        async with httpx.AsyncClient() as client:
            return await client.get(
                f"{self.base_url}/agents/{agent_id}",
                headers=self.headers
            )
```

---

## Notion Integration

### Features
- Sync project tasks to Notion database
- Create pages for new clients/projects
- Update project status automatically
- Store meeting notes

### Implementation

```python
# app/integrations/notion.py
import httpx

class NotionClient:
    def __init__(self, integration_key: str):
        self.integration_key = integration_key
        self.headers = {
            "Authorization": f"Bearer {integration_key}",
            "Notion-Version": "2022-06-28"
        }
        
    async def create_project_page(self, parent_id: str, project: dict):
        """Create a new project page in Notion."""
        payload = {
            "parent": {"page_id": parent_id},
            "properties": {
                "title": {"title": [{"text": {"content": project["name"]}}]},
                "Status": {"select": {"name": project.get("status", "Active")}},
                "Budget": {"number": project.get("budget", 0)},
                "Client": {"rich_text": [{"text": {"content": project.get("client", "")}}]}
            }
        }
        async with httpx.AsyncClient() as client:
            return await client.post(
                "https://api.notion.com/v1/pages",
                json=payload,
                headers=self.headers
            )
            
    async def update_task_status(self, task_id: str, status: str):
        """Update task status in Notion."""
        payload = {
            "properties": {
                "Status": {"select": {"name": status}}
            }
        }
        async with httpx.AsyncClient() as client:
            return await client.patch(
                f"https://api.notion.com/v1/pages/{task_id}",
                json=payload,
                headers=self.headers
            )
```

---

## Okta SSO Integration

### Features
- Enterprise single sign-on (SSO)
- User management
- Multi-factor authentication
- Role-based access control

### Implementation

```python
# app/integrations/okta.py
from okta import OktaClient
from fastapi import HTTPException

class OktaSSO:
    def __init__(self, domain: str, token: str):
        self.client = OktaClient(okta_api_key=token, base_url=f"https://{domain}")
        
    async def get_user(self, email: str):
        """Get user from Okta."""
        users, resp, err = await self.client.list_users(query_params={"filter": f'email eq "{email}"'})
        if err:
            raise HTTPException(400, f"Okta error: {err}")
        return users[0] if users else None
        
    async def assign_to_app(self, user_id: str, app_id: str):
        """Assign user to application."""
        return await self.client.create_application_user(
            app_id, 
            {"id": user_id, "scope": "USER"}
        )
        
    async def get_groups(self, user_id: str):
        """Get user's groups for RBAC."""
        return await self.client.list_user_groups(user_id)
```

---

## Integration Bundle Package

### "Business Automation Suite

| Integration | Retail Price | Bundle Price |
|-------------|-------------|--------------|
| Discord Alerts | $500 | |
| Slack Bot | $500 | |
| Telegram Bot | $300 | |
| Notion Sync | $500 | |
| **Bundle (All 4)** | **$1,800** | **$1,200** |

### "Enterprise Suite

| Integration | Retail Price | Bundle Price |
|-------------|-------------|--------------|
| All Business Automation | $1,200 | |
| Okta SSO | $2,000 | |
| OpenClaw Agent | $1,000 | |
| Priority Support | $500 | |
| **Enterprise Bundle** | **$4,700** | **$3,500** |

---

## Local Business Lead Generation

### Automated Lead Analysis

```python
class LocalLeadAnalyzer:
    """
    Analyze local business websites and suggest improvements.
    """
    
    def analyze_website(self, url: str) -> dict:
        """Analyze a business website."""
        return {
            "url": url,
            "needs_website": False,
            "needs_alt_text": False,
            "needs_seo": False,
            "needs_social": False,
            "potential_improvements": [
                {
                    "category": "alt_text",
                    "impact": "high",
                    "description": "Add alt text to images for accessibility + SEO",
                    "estimated_value": "+15% traffic"
                },
                {
                    "category": "mobile",
                    "impact": "high", 
                    "description": "Mobile optimization",
                    "estimated_value": "+25% mobile traffic"
                }
            ],
            "estimated_roi": "6-12 months",
            "priority": "high"
        }
        
    def generate_quote(self, improvements: list) -> dict:
        """Generate a quote based on needed improvements."""
        base_prices = {
            "alt_text": 500,      # Per-page optimization
            "website": 3000,       # Simple landing page
            "seo": 1500,          # Basic SEO
            "social": 800,        # Social setup
            "local_listing": 300  # Google My Business
        }
        
        total = sum(base_prices.get(i["category"], 500) for i in improvements)
        return {
            "subtotal": total,
            "margin": total * 0.30,
            "total": total * 1.30,
            "proposal_link": "https://..."
        }
```

### Local Business Categories

| Business Type | Common Issues | Quick Wins |
|---------------|--------------|------------|
| Restaurants | No alt text, stale info | Menu images, hours |
| Festivals | No website | Landing page |
| HVAC/Contractors | No online presence | Basic site, listings |
| Retail | No mobile optimization | Responsive, images |
| Medical | Accessibility issues | ADA compliance |

---

## Notes

- All integrations require API keys/tokens stored in environment variables
- Implement retry logic with exponential backoff
- Handle rate limits gracefully
- Log all integration errors for debugging
- Provide user-friendly error messages
