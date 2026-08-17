# GitHub Issues UI Enhancements

**Version:** 1.0.0  
**Date:** April 30, 2026  
**Status:** Active  
**Author:** MIDNGHTSAPPHIRE  
**Scope:** All Revvel/MIDNGHTSAPPHIRE repositories

---

## 1. Overview

This document describes comprehensive enhancements to the GitHub Issues UI using marketplace extensions, MCP servers, GitHub CLI, and automation tools. The enhancements follow design principles from the GitHub redesign research while maintaining practicality and automation-first approach.

### Design Principles

Based on [Niki Tonsky's GitHub Redesign](https://tonsky.me/blog/github-redesign/), we apply these principles:

1. **Flatten hierarchies** — Reduce nested structures, make actions immediately accessible
2. **Remove visual noise** — Eliminate redundant icons and decorative elements
3. **Maximize content space** — Minimize chrome, maximize useful information
4. **Contextual actions** — Place buttons near the content they operate on
5. **One vanity metric** — Focus on the most important signal
6. **Clear status indicators** — Make current state obvious
7. **Self-documenting** — Actions should be discoverable without documentation

---

## 2. Enhanced Issue Template System

### 2.1. Multi-Button Issue Forms

GitHub's `config.yml` allows custom buttons. We enhance this with:

```yaml
# .github/ISSUE_TEMPLATE/config.yml
blank_issues_enabled: false
contact_links:
  - name: 🤖 AI-Powered Triage
    url: https://github.com/midnghtsapphire/revvel-standards/actions/workflows/triage-cron.yml
    about: Let AI analyze and label your issue automatically
  
  - name: 🔍 Search Similar Issues
    url: https://github.com/midnghtsapphire/revvel-standards/issues?q=is%3Aissue
    about: Check if your issue already exists
  
  - name: 📊 Issues Dashboard
    url: https://midnghtsapphire.github.io/revvel-standards/ui/issues-board/
    about: Interactive issues management dashboard
  
  - name: 🎯 Quick Actions CLI
    url: https://github.com/midnghtsapphire/revvel-standards/wiki/Issues-CLI-Guide
    about: Use GitHub CLI for faster issue management
```

### 2.2. Enhanced Issue Form Fields

```yaml
# .github/ISSUE_TEMPLATE/issue.yml
name: Issue Report
description: Report a bug, request a feature, or suggest an improvement
title: "[TYPE] "
labels: ["needs-triage"]
body:
  - type: dropdown
    id: issue-type
    attributes:
      label: Issue Type
      description: What type of issue is this?
      options:
        - Bug
        - Feature Request
        - Enhancement
        - Documentation
        - Research
        - Question
    validations:
      required: true
  
  - type: dropdown
    id: priority
    attributes:
      label: Priority
      description: How urgent is this?
      options:
        - 🔴 Critical - Blocking production
        - 🟠 High - Needs quick attention
        - 🟡 Medium - Normal priority
        - 🟢 Low - Can wait
        - 🔵 Nice to have
    validations:
      required: true
  
  - type: dropdown
    id: assign-to
    attributes:
      label: Assign To
      description: Who should handle this?
      options:
        - "@copilot (AI Agent)"
        - "@openrouter (OpenRouter Agent)"
        - "Jules (Owner)"
        - "Team member"
        - "Let triage decide"
      default: 4
  
  - type: checkboxes
    id: automation
    attributes:
      label: Automation Options
      description: Select automation features
      options:
        - label: Auto-assign based on labels
        - label: Create linked PR automatically
        - label: Add to project board
        - label: Send Slack notification
        - label: Run automated tests
  
  - type: textarea
    id: description
    attributes:
      label: Description
      description: Describe the issue in detail
    validations:
      required: true
  
  - type: textarea
    id: context
    attributes:
      label: Current Context
      description: What's the current state? Include error logs, screenshots, etc.
  
  - type: textarea
    id: expected
    attributes:
      label: Expected Behavior
      description: What should happen instead?
  
  - type: input
    id: ai-hint
    attributes:
      label: AI Agent Hint
      description: Optional hint for AI agents handling this issue
      placeholder: "Check the auth module, might be related to #123"
```

---

## 3. MCP Server Integration

### 3.1. GitHub Issues MCP Server

Extend the GitHub MCP Server capabilities for enhanced issue management:

```typescript
// mcp-servers/github-issues/index.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { Octokit } from "@octokit/rest";

const server = new Server({
  name: "github-issues-enhanced",
  version: "1.0.0",
}, {
  capabilities: {
    tools: {},
  },
});

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

// Enhanced issue tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "create_issue_with_automation",
        description: "Create issue with automated workflow triggers",
        inputSchema: {
          type: "object",
          properties: {
            owner: { type: "string" },
            repo: { type: "string" },
            title: { type: "string" },
            body: { type: "string" },
            labels: { type: "array", items: { type: "string" } },
            assignees: { type: "array", items: { type: "string" } },
            automation: {
              type: "object",
              properties: {
                createBranch: { type: "boolean" },
                createPR: { type: "boolean" },
                addToProject: { type: "boolean" },
                notifySlack: { type: "boolean" },
              },
            },
          },
          required: ["owner", "repo", "title", "body"],
        },
      },
      {
        name: "bulk_label_issues",
        description: "Apply labels to multiple issues at once",
        inputSchema: {
          type: "object",
          properties: {
            owner: { type: "string" },
            repo: { type: "string" },
            issueNumbers: { type: "array", items: { type: "number" } },
            labels: { type: "array", items: { type: "string" } },
          },
          required: ["owner", "repo", "issueNumbers", "labels"],
        },
      },
      {
        name: "smart_issue_search",
        description: "AI-powered semantic search across issues",
        inputSchema: {
          type: "object",
          properties: {
            owner: { type: "string" },
            repo: { type: "string" },
            query: { type: "string" },
            includeComments: { type: "boolean" },
          },
          required: ["owner", "repo", "query"],
        },
      },
      {
        name: "issue_timeline_summary",
        description: "Generate AI summary of issue activity",
        inputSchema: {
          type: "object",
          properties: {
            owner: { type: "string" },
            repo: { type: "string" },
            issueNumber: { type: "number" },
          },
          required: ["owner", "repo", "issueNumber"],
        },
      },
      {
        name: "auto_triage_issue",
        description: "Automatically triage issue with labels, assignee, priority",
        inputSchema: {
          type: "object",
          properties: {
            owner: { type: "string" },
            repo: { type: "string" },
            issueNumber: { type: "number" },
          },
          required: ["owner", "repo", "issueNumber"],
        },
      },
    ],
  };
});

// Implement tool handlers
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  switch (name) {
    case "create_issue_with_automation": {
      const issue = await octokit.issues.create({
        owner: args.owner,
        repo: args.repo,
        title: args.title,
        body: args.body,
        labels: args.labels,
        assignees: args.assignees,
      });
      
      // Trigger automation workflows
      if (args.automation?.createBranch) {
        await octokit.git.createRef({
          owner: args.owner,
          repo: args.repo,
          ref: `refs/heads/issue-${issue.data.number}`,
          sha: (await octokit.repos.getBranch({
            owner: args.owner,
            repo: args.repo,
            branch: "main",
          })).data.commit.sha,
        });
      }
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(issue.data, null, 2),
          },
        ],
      };
    }
    
    case "bulk_label_issues": {
      const results = await Promise.all(
        args.issueNumbers.map((num: number) =>
          octokit.issues.addLabels({
            owner: args.owner,
            repo: args.repo,
            issue_number: num,
            labels: args.labels,
          })
        )
      );
      
      return {
        content: [
          {
            type: "text",
            text: `Successfully labeled ${results.length} issues`,
          },
        ],
      };
    }
    
    case "smart_issue_search": {
      const issues = await octokit.issues.listForRepo({
        owner: args.owner,
        repo: args.repo,
        state: "all",
      });
      
      // Simple semantic matching (in production, use vector embeddings)
      const queryLower = args.query.toLowerCase();
      const matches = issues.data.filter((issue) => {
        const titleMatch = issue.title.toLowerCase().includes(queryLower);
        const bodyMatch = issue.body?.toLowerCase().includes(queryLower) || false;
        return titleMatch || bodyMatch;
      });
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(matches.slice(0, 10), null, 2),
          },
        ],
      };
    }
    
    case "issue_timeline_summary": {
      const timeline = await octokit.issues.listEvents({
        owner: args.owner,
        repo: args.repo,
        issue_number: args.issueNumber,
      });
      
      const summary = timeline.data.map((event) => ({
        type: event.event,
        actor: event.actor?.login,
        created: event.created_at,
      }));
      
      return {
        content: [
          {
            type: "text",
            text: `Timeline summary:\n${JSON.stringify(summary, null, 2)}`,
          },
        ],
      };
    }
    
    case "auto_triage_issue": {
      const issue = await octokit.issues.get({
        owner: args.owner,
        repo: args.repo,
        issue_number: args.issueNumber,
      });
      
      // Simple triage logic (in production, use AI)
      const labels: string[] = [];
      const title = issue.data.title.toLowerCase();
      const body = issue.data.body?.toLowerCase() || "";
      
      if (title.includes("bug") || body.includes("error")) {
        labels.push("bug");
      }
      if (title.includes("feature") || title.includes("add")) {
        labels.push("enhancement");
      }
      if (title.includes("doc")) {
        labels.push("documentation");
      }
      
      await octokit.issues.addLabels({
        owner: args.owner,
        repo: args.repo,
        issue_number: args.issueNumber,
        labels,
      });
      
      return {
        content: [
          {
            type: "text",
            text: `Triaged issue #${args.issueNumber} with labels: ${labels.join(", ")}`,
          },
        ],
      };
    }
    
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
```

### 3.2. MCP Server Configuration

```json
// .mcp.json (add to existing config)
{
  "mcpServers": {
    "github-issues-enhanced": {
      "command": "node",
      "args": ["mcp-servers/github-issues/index.js"],
      "env": {
        "GITHUB_TOKEN": "${GITHUB_TOKEN}"
      }
    }
  }
}
```

---

## 4. GitHub CLI Workflows

### 4.1. Quick Action Commands

```bash
#!/bin/bash
# scripts/issue-quick-actions.sh

# Quick issue creation with AI triage
gh issue create \
  --title "[$1] $2" \
  --body "$3" \
  --label "needs-triage" \
  --assignee "@me"

# Bulk operations
gh issue list --state open --json number,title | \
  jq -r '.[] | select(.title | contains("bug")) | .number' | \
  xargs -I {} gh issue edit {} --add-label "bug"

# Create issue with linked branch and PR
create_issue_with_pr() {
  ISSUE=$(gh issue create --title "$1" --body "$2" --label "enhancement" --json number --jq .number)
  BRANCH="issue-$ISSUE-$(echo $1 | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | cut -c1-40)"
  git checkout -b "$BRANCH"
  echo "Created issue #$ISSUE and branch $BRANCH"
}

# AI-powered issue search
search_issues() {
  gh issue list --state all --limit 100 --json number,title,body | \
    jq -r --arg query "$1" '.[] | select(.title + .body | ascii_downcase | contains($query | ascii_downcase)) | "#\(.number): \(.title)"'
}

# Batch label application
batch_label() {
  local label="$1"
  shift
  for issue in "$@"; do
    gh issue edit "$issue" --add-label "$label"
  done
}

# Issue metrics
issue_metrics() {
  echo "📊 Issue Metrics for $(gh repo view --json nameWithOwner -q .nameWithOwner)"
  echo ""
  echo "Total Open: $(gh issue list --state open --json number | jq length)"
  echo "Total Closed: $(gh issue list --state closed --limit 1000 --json number | jq length)"
  echo "With PRs: $(gh issue list --state all --json number --limit 1000 | jq length)"
  echo ""
  echo "By Label:"
  gh label list --json name | jq -r '.[].name' | while read label; do
    count=$(gh issue list --label "$label" --json number | jq length)
    echo "  $label: $count"
  done
}
```

### 4.2. Automation Aliases

Add to `.bashrc` or `.zshrc`:

```bash
# GitHub Issues UI enhancements
alias issue='gh issue'
alias icreate='gh issue create'
alias ilist='gh issue list'
alias iview='gh issue view'
alias iedit='gh issue edit'
alias iclose='gh issue close'
alias isearch='gh issue list --state all --search'

# Smart aliases
alias ibug='gh issue create --label bug --template bug_report.md'
alias ifeat='gh issue create --label enhancement --template feature_request.md'
alias idoc='gh issue create --label documentation'
alias iai='gh issue create --assignee @copilot'

# Bulk operations
alias ilabel-bugs='gh issue list --json number,title | jq -r ".[] | select(.title | contains(\"bug\") or contains(\"error\")) | .number" | xargs -I {} gh issue edit {} --add-label bug'
alias iassign-me='gh issue list --assignee @me'
alias iopen-today='gh issue list --json createdAt,number,title --jq ".[] | select(.createdAt | startswith(\"$(date +%Y-%m-%d)\")) | \"#\(.number): \(.title)\""'
```

---

## 5. Interactive Issues Dashboard

Create a web-based dashboard for enhanced issue management (similar to ops-board).

```html
<!-- ui/issues-board/index.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Revvel Issues Dashboard</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap');
    body { font-family: 'Space Mono', monospace; background: #0a0a0f; color: #e0e0e0; }
    .card { background: linear-gradient(145deg, #12121a, #0f0f14); border: 1px solid #1f1f2e; }
    .issue-card { transition: all 0.2s; cursor: pointer; }
    .issue-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3); }
    .label-badge { display: inline-block; padding: 0.125rem 0.5rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; margin-right: 0.25rem; }
  </style>
</head>
<body class="min-h-screen p-8">
  <div class="max-w-7xl mx-auto">
    <div class="text-center mb-12">
      <h1 class="text-4xl font-bold text-purple-400 mb-2">🎯 ISSUES COMMAND CENTER</h1>
      <p class="text-gray-500">Enhanced GitHub Issues UI with automation</p>
    </div>

    <!-- Quick Stats -->
    <div class="grid grid-cols-5 gap-4 mb-8">
      <div class="card rounded-xl p-6 text-center">
        <div class="text-3xl font-bold text-red-400" id="stat-open">0</div>
        <div class="text-sm text-gray-500">Open</div>
      </div>
      <div class="card rounded-xl p-6 text-center">
        <div class="text-3xl font-bold text-green-400" id="stat-closed">0</div>
        <div class="text-sm text-gray-500">Closed</div>
      </div>
      <div class="card rounded-xl p-6 text-center">
        <div class="text-3xl font-bold text-yellow-400" id="stat-in-progress">0</div>
        <div class="text-sm text-gray-500">In Progress</div>
      </div>
      <div class="card rounded-xl p-6 text-center">
        <div class="text-3xl font-bold text-blue-400" id="stat-needs-triage">0</div>
        <div class="text-sm text-gray-500">Needs Triage</div>
      </div>
      <div class="card rounded-xl p-6 text-center">
        <div class="text-3xl font-bold text-purple-400" id="stat-ai-assigned">0</div>
        <div class="text-sm text-gray-500">AI Assigned</div>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="card rounded-xl p-6 mb-8">
      <h2 class="text-xl font-bold text-purple-400 mb-4">⚡ Quick Actions</h2>
      <div class="grid grid-cols-4 gap-3">
        <button onclick="createIssue()" class="bg-purple-600 hover:bg-purple-700 rounded-lg p-3 text-center transition">
          <div class="font-bold">➕ New Issue</div>
        </button>
        <button onclick="bulkLabel()" class="bg-cyan-600 hover:bg-cyan-700 rounded-lg p-3 text-center transition">
          <div class="font-bold">🏷️ Bulk Label</div>
        </button>
        <button onclick="aiTriage()" class="bg-green-600 hover:bg-green-700 rounded-lg p-3 text-center transition">
          <div class="font-bold">🤖 AI Triage</div>
        </button>
        <button onclick="exportIssues()" class="bg-yellow-600 hover:bg-yellow-700 rounded-lg p-3 text-center transition">
          <div class="font-bold">📥 Export</div>
        </button>
      </div>
    </div>

    <!-- Filters -->
    <div class="card rounded-xl p-6 mb-8">
      <h2 class="text-xl font-bold text-cyan-400 mb-4">🔍 Filters</h2>
      <div class="grid grid-cols-4 gap-4">
        <div>
          <label class="text-sm text-gray-400">State</label>
          <select id="filter-state" class="w-full bg-gray-800 rounded p-2 mt-1" onchange="applyFilters()">
            <option value="all">All</option>
            <option value="open" selected>Open</option>
            <option value="closed">Closed</option>
          </select>
        </div>
        <div>
          <label class="text-sm text-gray-400">Label</label>
          <select id="filter-label" class="w-full bg-gray-800 rounded p-2 mt-1" onchange="applyFilters()">
            <option value="">All Labels</option>
            <option value="bug">Bug</option>
            <option value="enhancement">Enhancement</option>
            <option value="documentation">Documentation</option>
            <option value="needs-triage">Needs Triage</option>
          </select>
        </div>
        <div>
          <label class="text-sm text-gray-400">Assignee</label>
          <select id="filter-assignee" class="w-full bg-gray-800 rounded p-2 mt-1" onchange="applyFilters()">
            <option value="">All Assignees</option>
            <option value="copilot">@copilot</option>
            <option value="openrouter">@openrouter</option>
            <option value="none">Unassigned</option>
          </select>
        </div>
        <div>
          <label class="text-sm text-gray-400">Sort</label>
          <select id="filter-sort" class="w-full bg-gray-800 rounded p-2 mt-1" onchange="applyFilters()">
            <option value="created">Created</option>
            <option value="updated">Updated</option>
            <option value="comments">Comments</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Issues List -->
    <div class="card rounded-xl p-6">
      <h2 class="text-xl font-bold text-green-400 mb-4">📋 Issues</h2>
      <div id="issues-container" class="space-y-3">
        <!-- Issues will be loaded here -->
        <div class="text-center text-gray-500 py-8">Loading issues...</div>
      </div>
    </div>
  </div>

  <script>
    const GITHUB_API = 'https://api.github.com';
    const REPO_OWNER = 'midnghtsapphire';
    const REPO_NAME = 'revvel-standards';
    let allIssues = [];

    async function loadIssues() {
      try {
        const response = await fetch(`${GITHUB_API}/repos/${REPO_OWNER}/${REPO_NAME}/issues?state=all&per_page=100`);
        allIssues = await response.json();
        updateStats();
        applyFilters();
      } catch (error) {
        document.getElementById('issues-container').innerHTML = '<div class="text-red-400">Error loading issues</div>';
      }
    }

    function updateStats() {
      const open = allIssues.filter(i => i.state === 'open').length;
      const closed = allIssues.filter(i => i.state === 'closed').length;
      const inProgress = allIssues.filter(i => i.labels.some(l => l.name === 'in-progress')).length;
      const needsTriage = allIssues.filter(i => i.labels.some(l => l.name === 'needs-triage')).length;
      const aiAssigned = allIssues.filter(i => i.assignees.some(a => a.login === 'copilot')).length;

      document.getElementById('stat-open').textContent = open;
      document.getElementById('stat-closed').textContent = closed;
      document.getElementById('stat-in-progress').textContent = inProgress;
      document.getElementById('stat-needs-triage').textContent = needsTriage;
      document.getElementById('stat-ai-assigned').textContent = aiAssigned;
    }

    function applyFilters() {
      const state = document.getElementById('filter-state').value;
      const label = document.getElementById('filter-label').value;
      const assignee = document.getElementById('filter-assignee').value;
      const sort = document.getElementById('filter-sort').value;

      let filtered = allIssues.filter(issue => {
        if (state !== 'all' && issue.state !== state) return false;
        if (label && !issue.labels.some(l => l.name === label)) return false;
        if (assignee === 'none' && issue.assignees.length > 0) return false;
        if (assignee && assignee !== 'none' && !issue.assignees.some(a => a.login === assignee)) return false;
        return true;
      });

      // Sort
      filtered.sort((a, b) => {
        if (sort === 'created') return new Date(b.created_at) - new Date(a.created_at);
        if (sort === 'updated') return new Date(b.updated_at) - new Date(a.updated_at);
        if (sort === 'comments') return b.comments - a.comments;
        return 0;
      });

      renderIssues(filtered);
    }

    function renderIssues(issues) {
      const container = document.getElementById('issues-container');
      
      if (issues.length === 0) {
        container.innerHTML = '<div class="text-center text-gray-500 py-8">No issues found</div>';
        return;
      }

      container.innerHTML = issues.map(issue => {
        const labels = issue.labels.map(l => 
          `<span class="label-badge" style="background: #${l.color}; color: #000;">${l.name}</span>`
        ).join('');
        
        const assignees = issue.assignees.map(a => a.login).join(', ') || 'Unassigned';
        const stateColor = issue.state === 'open' ? 'text-green-400' : 'text-purple-400';
        const stateIcon = issue.state === 'open' ? '🟢' : '🟣';

        return `
          <div class="issue-card bg-gray-900 rounded-lg p-4" onclick="window.open('${issue.html_url}', '_blank')">
            <div class="flex justify-between items-start mb-2">
              <div class="flex-1">
                <div class="flex items-center gap-2 mb-1">
                  <span class="${stateColor} font-bold">${stateIcon} #${issue.number}</span>
                  <span class="text-white font-bold">${issue.title}</span>
                </div>
                <div class="text-gray-400 text-sm mb-2">${labels}</div>
              </div>
              <div class="text-right">
                <div class="text-sm text-gray-400">💬 ${issue.comments}</div>
              </div>
            </div>
            <div class="flex justify-between items-center text-sm text-gray-500">
              <div>👤 ${assignees}</div>
              <div>🕐 ${new Date(issue.updated_at).toLocaleDateString()}</div>
            </div>
          </div>
        `;
      }).join('');
    }

    function createIssue() {
      window.open(`https://github.com/${REPO_OWNER}/${REPO_NAME}/issues/new/choose`, '_blank');
    }

    function bulkLabel() {
      alert('Bulk label functionality requires GitHub CLI or API token. See docs/GITHUB_ISSUES_UI_ENHANCEMENTS.md');
    }

    function aiTriage() {
      window.open(`https://github.com/${REPO_OWNER}/${REPO_NAME}/actions/workflows/triage-cron.yml`, '_blank');
    }

    function exportIssues() {
      const csv = 'Number,Title,State,Labels,Assignees,Comments,Created,Updated\n' + 
        allIssues.map(i => 
          `${i.number},"${i.title}",${i.state},"${i.labels.map(l => l.name).join(';')}","${i.assignees.map(a => a.login).join(';')}",${i.comments},${i.created_at},${i.updated_at}`
        ).join('\n');
      
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `issues-${REPO_NAME}-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    }

    // Load issues on page load
    loadIssues();
    // Refresh every 60 seconds to respect GitHub API rate limits
    setInterval(loadIssues, 60000);
  </script>
</body>
</html>
```

---

## 6. GitHub Actions Automation

### 6.1. Auto-Triage Workflow

```yaml
# .github/workflows/issue-auto-triage.yml
name: Auto-Triage Issues

on:
  issues:
    types: [opened]

jobs:
  triage:
    runs-on: ubuntu-latest
    steps:
      - name: Auto-label based on title and body
        uses: actions/github-script@v7
        with:
          script: |
            const issue = context.payload.issue;
            const title = issue.title.toLowerCase();
            const body = (issue.body || '').toLowerCase();
            const labels = [];

            // Type detection
            if (title.includes('bug') || body.includes('error') || body.includes('crash')) {
              labels.push('bug');
            }
            if (title.includes('feature') || title.includes('add') || title.includes('implement')) {
              labels.push('enhancement');
            }
            if (title.includes('doc') || body.includes('documentation')) {
              labels.push('documentation');
            }
            if (title.includes('question') || title.includes('how to')) {
              labels.push('question');
            }

            // Priority detection
            if (title.includes('critical') || title.includes('urgent') || body.includes('production')) {
              labels.push('priority:high');
            }

            // Component detection
            if (body.includes('ui') || body.includes('interface')) {
              labels.push('area:ui');
            }
            if (body.includes('api') || body.includes('backend')) {
              labels.push('area:api');
            }
            if (body.includes('automation') || body.includes('workflow')) {
              labels.push('area:automation');
            }

            if (labels.length === 0) {
              labels.push('needs-triage');
            }

            await github.rest.issues.addLabels({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: issue.number,
              labels: labels
            });

      - name: Auto-assign to AI agent
        uses: actions/github-script@v7
        if: contains(github.event.issue.body, '@copilot')
        with:
          script: |
            await github.rest.issues.addAssignees({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.payload.issue.number,
              assignees: ['copilot']
            });

      - name: Create linked branch
        uses: actions/github-script@v7
        if: contains(github.event.issue.labels.*.name, 'enhancement')
        with:
          script: |
            const issue = context.payload.issue;
            const branchName = `issue-${issue.number}-${issue.title.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 40)}`;
            
            const mainBranch = await github.rest.repos.getBranch({
              owner: context.repo.owner,
              repo: context.repo.repo,
              branch: 'main'
            });

            try {
              await github.rest.git.createRef({
                owner: context.repo.owner,
                repo: context.repo.repo,
                ref: `refs/heads/${branchName}`,
                sha: mainBranch.data.commit.sha
              });

              await github.rest.issues.createComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: issue.number,
                body: `🌿 Branch created: \`${branchName}\`\n\nYou can start working on this issue!`
              });
            } catch (error) {
              console.log('Branch may already exist:', error.message);
            }
```

### 6.2. Issue Metrics Workflow

```yaml
# .github/workflows/issue-metrics.yml
name: Issue Metrics

on:
  schedule:
    - cron: '0 0 * * *' # Daily at midnight
  workflow_dispatch:

jobs:
  metrics:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Generate metrics
        uses: actions/github-script@v7
        with:
          script: |
            const issues = await github.paginate(github.rest.issues.listForRepo, {
              owner: context.repo.owner,
              repo: context.repo.repo,
              state: 'all',
              per_page: 100
            });

            const open = issues.filter(i => i.state === 'open').length;
            const closed = issues.filter(i => i.state === 'closed').length;
            const avgCloseDays = issues
              .filter(i => i.state === 'closed' && i.closed_at)
              .map(i => (new Date(i.closed_at) - new Date(i.created_at)) / (1000 * 60 * 60 * 24))
              .reduce((a, b) => a + b, 0) / closed || 0;

            const labelCounts = {};
            issues.forEach(issue => {
              issue.labels.forEach(label => {
                labelCounts[label.name] = (labelCounts[label.name] || 0) + 1;
              });
            });

            const report = `
            # Issue Metrics Report
            
            **Generated:** ${new Date().toISOString()}
            
            ## Summary
            - Open Issues: ${open}
            - Closed Issues: ${closed}
            - Average Days to Close: ${avgCloseDays.toFixed(1)}
            - Total Issues: ${issues.length}
            
            ## Labels
            ${Object.entries(labelCounts)
              .sort((a, b) => b[1] - a[1])
              .map(([label, count]) => `- ${label}: ${count}`)
              .join('\n')}
            `;

            await github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: `[Metrics] Daily Issue Report - ${new Date().toISOString().split('T')[0]}`,
              body: report,
              labels: ['metrics', 'auto-generated']
            });
```

---

## 7. GitHub Marketplace Extensions

### Recommended Extensions

| Extension | Purpose | Cost | Link |
|-----------|---------|------|------|
| **GitHub CLI** | Command-line issues management | Free | [cli.github.com](https://cli.github.com) |
| **Probot** | GitHub Apps for automation | Free (OSS) | [probot.github.io](https://probot.github.io) |
| **Refined GitHub** | Browser extension for enhanced UI | Free | [github.com/refined-github](https://github.com/refined-github/refined-github) |
| **OctoLinker** | Navigate code like an IDE | Free | [octolinker.now.sh](https://octolinker.now.sh) |
| **ZenHub** | Project management inside GitHub | Free tier | [zenhub.com](https://www.zenhub.com) |
| **GitKraken Launchpad** | Visual issue management | Free | [gitkraken.com](https://www.gitkraken.com) |

---

## 8. Integration with Existing Systems

### 8.1. OpenRouter Integration

Issues can be automatically assigned to OpenRouter agents:

```yaml
# .github/workflows/openrouter-issue-handler.yml
name: OpenRouter Issue Handler

on:
  issues:
    types: [labeled]

jobs:
  handle:
    if: contains(github.event.issue.labels.*.name, 'openrouter')
    runs-on: ubuntu-latest
    steps:
      - name: Trigger OpenRouter
        run: |
          curl -X POST "${{ secrets.OPENROUTER_WEBHOOK_URL }}" \
            -H "Content-Type: application/json" \
            -d '{
              "issue_number": "${{ github.event.issue.number }}",
              "title": "${{ github.event.issue.title }}",
              "body": "${{ github.event.issue.body }}",
              "labels": ${{ toJSON(github.event.issue.labels) }}
            }'
```

### 8.2. Make.com / n8n Integration

Create scenarios that trigger on issue events. See [`docs/AUTOMATION_EXTENSIONS_INTEGRATION.md`](./AUTOMATION_EXTENSIONS_INTEGRATION.md) for details.

---

## 9. Acceptance Criteria

- [x] Enhanced issue templates with more fields and automation options
- [x] MCP server integration for programmatic issue management
- [x] GitHub CLI workflows and aliases for power users
- [x] Interactive web dashboard for visual issue management
- [x] GitHub Actions for auto-triage and metrics
- [x] Documentation of marketplace extensions
- [x] Integration with existing OpenRouter/automation systems

---

## 10. Maintenance

- Review and update issue templates quarterly
- Monitor MCP server performance and update as needed
- Keep GitHub CLI scripts in sync with `gh` updates
- Update dashboard UI based on user feedback
- Track automation effectiveness through metrics

---

## References

- [GitHub Issues API](https://docs.github.com/en/rest/issues)
- [GitHub CLI Manual](https://cli.github.com/manual/)
- [MCP Protocol Specification](https://spec.modelcontextprotocol.io/)
- [GitHub Redesign Blog Post](https://tonsky.me/blog/github-redesign/)
- [`docs/AUTOMATION_EXTENSIONS_INTEGRATION.md`](./AUTOMATION_EXTENSIONS_INTEGRATION.md)
- [`standards/CLI_MCP_AUTOMATION.md`](../standards/CLI_MCP_AUTOMATION.md)

---

## 11. Technical Notes

### Branch Naming Pattern

The branch name sanitization logic is intentionally duplicated across three files for operational reasons:

1. `scripts/issues/quick-actions.sh` (line 49) - Bash context
2. `mcp-servers/github-issues/index.js` (line 198-202) - Node.js context
3. `.github/workflows/issue-auto-triage.yml` (line 73-77) - GitHub Actions context

**Standard Pattern:**
```text
issue-{number}-{title-lowercase-alphanumeric-only-40-chars-no-trailing-hyphens}
```

**Implementation:**
```javascript
// JavaScript/Node.js
const branchName = `issue-${issueNumber}-${title
  .toLowerCase()
  .replace(/[^a-z0-9]/g, '-')
  .substring(0, 40)
  .replace(/-+$/, '')}`;
```

```bash
# Bash
BRANCH="issue-$ISSUE-$(echo "$title" | tr '[:upper:]' '[:lower:]' | tr -cd '[:alnum:]-' | cut -c1-40 | sed 's/-$//')"
```

**Rationale for Duplication:**
- Each file operates in a different runtime environment
- Extracting to a shared function would require additional infrastructure
- Pattern is simple (4 lines) and stable
- Runtime-specific optimizations are appropriate

**Maintenance:**
If the pattern changes, update all three locations to maintain consistency.

---

## 9. Batch Close Operations

Bulk-close functionality for the GitHub Issues assigned view (`https://github.com/issues/assigned`).
Two CLI functions in `scripts/issues/quick-actions.sh` support "select all → close" workflows:

### 9.1. `issue_batch_close` — Close Specific Issues

Close a list of issue numbers with a chosen reason.

```bash
# Close as "not needed right now"
issue_batch_close not_planned 100 101 102
```

**Supported reasons:**
| Reason | GitHub state_reason | When to use |
|--------|-------------------|-------------|
| `not_planned` | not_planned | Issue is not needed right now |

A confirmation prompt is shown before any issues are closed.

### 9.2. `issue_close_all_assigned` — Select All Assigned Issues and Close

Fetches all open issues assigned to you, displays them, and closes them
after confirmation.

```bash
# Close all assigned issues as "not needed right now"
issue_close_all_assigned not_planned
```

### 9.3. Step-by-Step: Batch Close from the Assigned View

1. **Open your terminal.**
2. **Source the quick-actions script** (or add to your shell profile):
   ```bash
   source scripts/issues/quick-actions.sh
   ```
3. **To close specific issues** — run `issue_batch_close` with the reason and
   issue numbers:
   ```bash
   issue_batch_close not_planned 16100 16101 16102
   ```
4. **To select all and close** — run `issue_close_all_assigned`:
   ```bash
   issue_close_all_assigned not_planned
   ```
5. **Confirm** when prompted — type `y` and press Enter.
6. **Check results** — each closed issue prints a ✓ or ✗ status line.

---
