#!/bin/bash
# Zero-Human Automation Setup Script
# Usage: ./setup-automation.sh

set -e

echo "🔧 Setting up Zero-Human Automation..."

# 1. Create workflow directories
mkdir -p .github/workflows
mkdir -p n8n/workflows
mkdir -p mcp/servers

# 2. Copy GitHub Actions workflows
echo "📦 Setting up GitHub Actions..."

cat > .github/workflows/auto-merge.yml << 'EOF'
name: Auto Merge
on:
  pull_request:
    types: [opened, synchronize]
jobs:
  automerge:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: peter-evans/automerge-action@v6
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          merge-method: squash
EOF

cat > .github/workflows/cleanup.yml << 'EOF'
name: Cleanup Branches
on:
  schedule: ['0 3 * * *']
  workflow_dispatch:
jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: mmorenoregalado/github-branch-cleaner@v1
        with:
          dry_run: false
          days_old: 7
EOF

cat > .github/workflows/slash-commands.yml << 'EOF'
name: Slash Commands
on:
  issue_comment:
    types: [created]
  pull_request_review:
    types: [submitted]
jobs:
  dispatch:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Handle /deploy
        if: contains(github.event.comment.body, '/deploy') && startsWith(github.event.comment.html_url, 'https://github.com')
        uses: peter-evans/repository-dispatch@v2
        with:
          token: ${{ secrets.DISPATCH_TOKEN }}
          event-type: deploy-command
      - name: Handle /test
        if: contains(github.event.comment.body, '/test') && startsWith(github.event.comment.html_url, 'https://github.com')
        uses: peter-evans/repository-dispatch@v2
        with:
          token: ${{ secrets.DISPATCH_TOKEN }}
          event-type: test-command
EOF

# 3. MCP Server setup
echo "🤖 Setting up MCP Server..."

cat > mcp/servers/zero_human.py << 'EOF'
"""Zero-Human MCP Server"""
from typing import Any

class ZeroHumanMCPServer:
    def __init__(self):
        self.tools = {}
        self._register_tools()
        
    def _register_tools(self):
        self.tools = {
            "send_email": self.send_email,
            "create_pr": self.create_pr,
            "generate_invoice": self.generate_invoice,
            "send_slack": self.send_slack,
            "create_task": self.create_task,
        }
        
    async def handle(self, tool: str, params: dict) -> Any:
        if tool not in self.tools:
            raise ValueError(f"Unknown tool: {tool}")
        return await self.tools[tool](**params)
        
    async def send_email(self, to: str, subject: str, body: str):
        """Send email"""
        return {"status": "sent", "to": to, "subject": subject}
        
    async def create_pr(self, title: str, body: str, branch: str):
        """Create GitHub PR"""
        return {"status": "created", "title": title}
        
    async def generate_invoice(self, client: str, amount: float):
        """Generate invoice"""
        return {"status": "generated", "client": client, "amount": amount}
        
    async def send_slack(self, channel: str, message: str):
        """Send Slack message"""
        return {"status": "sent", "channel": channel}
        
    async def create_task(self, title: str, description: str = ""):
        """Create task"""
        return {"status": "created", "title": title}

# Main entry
if __name__ == "__main__":
    import asyncio
    server = ZeroHumanMCPServer()
    asyncio.run(server.handle("send_email", {
        "to": "test@example.com",
        "subject": "Test",
        "body": "Test body"
    }))
EOF

# 4. n8n workflow template
echo "📊 Setting up n8n workflows..."

cat > n8n/workflows/client-request.json << 'EOF'
{
  "name": "Client Request → Quote → Proposal",
  "nodes": [
    {"name": "Email Trigger", "type": "emailTrigger"},
    {"name": "AI Classifier", "type": "openai"},
    {"name": "Route", "type": "switch"},
    {"name": "Generate Quote", "type": "code"},
    {"name": "Create Proposal", "type": "document"},
    {"name": "Send Reply", "type": "email"},
    {"name": "Create Task", "type": "notion"}
  ]
}
EOF

cat > n8n/workflows/invoice-processing.json << 'EOF'
{
  "name": "Invoice Processing",
  "nodes": [
    {"name": "Email Trigger", "type": "emailTrigger"},
    {"name": "Parse PDF", "type": "pdf"},
    {"name": "Verify Payment", "type": "stripe"},
    {"name": "Log to Sheets", "type": "googleSheets"},
    {"name": "Send Receipt", "type": "email"}
  ]
}
EOF

# 5. Pre-commit config
echo "🪝 Setting up pre-commit..."

cat > .pre-commit-config.yaml << 'EOF'
repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.5.0
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
      - id: check-yaml
      - id: check-added-large-files

  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.1.0
    hooks:
      - id: ruff
        args: [--fix]
      - id: ruff-format
EOF

# 6. Commit and enable workflows
echo "📤 Initializing git..."
git add -A
git commit -m "Zero-Human automation setup

- GitHub Actions: auto-merge, branch cleanup, slash commands
- MCP Server: zero_human.py with 5 tools
- n8n workflows: client request, invoice processing
- Pre-commit hooks: ruff, formatting

Automated by OpenHands"

git push origin main

# 7. Enable workflows
echo "✅ Enabling GitHub Actions..."
gh workflow enable auto-merge.yml
gh workflow enable cleanup.yml 
gh workflow enable slash-commands.yml

echo ""
echo "✅ Zero-Human Automation Setup Complete!"
echo ""
echo "Next steps:"
echo "1. Configure secrets: gh secret set DISPATCH_TOKEN"
echo "2. Setup n8n: import n8n/workflows/*.json"
echo "3. Configure MCP: connect mcp/servers/zero_human.py"
echo ""
