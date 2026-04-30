# GitHub Issues Enhanced MCP Server

Enhanced Model Context Protocol (MCP) server for GitHub Issues automation and management.

## Features

- **create_issue_with_automation**: Create issues with automated workflow triggers (branch creation, PR creation, project board addition, Slack notifications)
- **bulk_label_issues**: Apply labels to multiple issues at once
- **smart_issue_search**: AI-powered semantic search across issues
- **issue_timeline_summary**: Generate AI summary of issue activity
- **auto_triage_issue**: Automatically triage issues with appropriate labels
- **issue_metrics**: Get repository issue metrics and statistics

## Installation

```bash
cd mcp-servers/github-issues
npm install
```

## Configuration

Create a `.env` file:

```env
GITHUB_TOKEN=your_github_personal_access_token
```

Or export the environment variable:

```bash
export GITHUB_TOKEN=your_github_personal_access_token
```

## Usage

### Running the Server

```bash
npm start
```

### Adding to MCP Configuration

Add to your `.mcp.json`:

```json
{
  "mcpServers": {
    "github-issues-enhanced": {
      "command": "node",
      "args": ["/absolute/path/to/revvel-standards/mcp-servers/github-issues/index.js"],
      "env": {
        "GITHUB_TOKEN": "${GITHUB_TOKEN}"
      }
    }
  }
}
```

### Tool Examples

#### Create Issue with Automation

```javascript
{
  "tool": "create_issue_with_automation",
  "arguments": {
    "owner": "midnghtsapphire",
    "repo": "revvel-standards",
    "title": "[Enhancement] Add new feature",
    "body": "Description of the feature",
    "labels": ["enhancement", "needs-review"],
    "assignees": ["copilot"],
    "automation": {
      "createBranch": true,
      "createPR": false,
      "addToProject": true,
      "notifySlack": false
    }
  }
}
```

#### Bulk Label Issues

```javascript
{
  "tool": "bulk_label_issues",
  "arguments": {
    "owner": "midnghtsapphire",
    "repo": "revvel-standards",
    "issueNumbers": [123, 456, 789],
    "labels": ["priority:high", "bug"]
  }
}
```

#### Smart Search

```javascript
{
  "tool": "smart_issue_search",
  "arguments": {
    "owner": "midnghtsapphire",
    "repo": "revvel-standards",
    "query": "authentication error",
    "includeComments": true
  }
}
```

#### Auto-Triage Issue

```javascript
{
  "tool": "auto_triage_issue",
  "arguments": {
    "owner": "midnghtsapphire",
    "repo": "revvel-standards",
    "issueNumber": 123
  }
}
```

#### Get Issue Metrics

```javascript
{
  "tool": "issue_metrics",
  "arguments": {
    "owner": "midnghtsapphire",
    "repo": "revvel-standards"
  }
}
```

## Integration with Existing Systems

### OpenRouter

Issues labeled with `openrouter` are automatically routed to OpenRouter agents via the `openrouter-assignee.yml` workflow.

### Make.com / n8n

This MCP server can be called from Make.com scenarios or n8n workflows using webhooks or direct Node.js invocation.

### GitHub Actions

The MCP server functions can be invoked from GitHub Actions using `actions/github-script` and similar patterns.

## Development

```bash
npm run dev  # Run with auto-reload
```

## Security

**Important Security Updates:**
- Uses `@modelcontextprotocol/sdk` version 1.25.2+ which includes:
  - Fix for ReDoS vulnerability (CVE affecting versions < 1.25.2)
  - DNS rebinding protection enabled by default (fixed in 1.24.0+)

**Security Best Practices:**
- Never commit your `GITHUB_TOKEN` to source control
- Use GitHub Actions secrets for CI/CD
- Prefer GitHub Apps over personal access tokens for production
- Follow the vault provisioning guidelines in `docs/SECRETS_MANAGEMENT.md`
- Keep dependencies updated regularly with `npm audit` and `npm update`

## License

MIT

## References

- [MCP Protocol Specification](https://spec.modelcontextprotocol.io/)
- [GitHub REST API](https://docs.github.com/en/rest)
- [Octokit.js Documentation](https://octokit.github.io/rest.js/)
