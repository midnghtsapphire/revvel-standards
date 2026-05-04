# WR / PR Control Plane MCP Server

Built for `revvel-standards` to give the 2026 WR→PR blueprint a concrete, repo-native control plane.

## What it does

This server bridges the gap between the current GitHub Actions pipeline and the future blueprint stack:

- Reads WR issue context from GitHub
- Detects URLs, PDF attachments, and requested SaaS integrations in the issue thread
- Reports which credentials are still missing for Composio / Firecrawl / Obot adoption
- Renders a ready-to-paste `.mcp.json` entry for downstream repos
- Documents the canonical Revvel architecture for WR → research → code → PR

## Why this exists

`revvel-standards` already has:

- `[WR]` issue intake
- Jules research
- OpenRouter coding orchestration
- BITO PR review
- MCP standards and templates

What was missing was a **control-plane home** for:

- **Composio** as the GitHub/OAuth router
- **Firecrawl** as the deterministic research layer
- **Obot** as the governance plane
- **FastMCP** as the custom tool framework

This server is the first implementation slice for that architecture.

## Install

```bash
cd mcp-servers/wr-control-plane
uv pip install -e .
```

## Environment variables

Required:

```bash
GITHUB_TOKEN=
OPENROUTER_API_KEY=
ANTHROPIC_API_KEY=
JULES_API_KEY=
COMPOSIO_API_KEY=
OBOT_BASE_URL=
OBOT_IDP_CONFIG=
```

Optional:

```bash
FIRECRAWL_API_KEY=
OBOT_ALLOWED_HOSTS=api.github.com,github.com,openrouter.ai,api.anthropic.com,api.firecrawl.dev
WR_DEFAULT_REPO=midnghtsapphire/revvel-standards
```

## Add to `.mcp.json`

```json
{
  "mcpServers": {
    "wr-pr-control-plane": {
      "command": "uv",
      "args": [
        "run",
        "python",
        "./mcp-servers/wr-control-plane/wr_control_plane/server.py"
      ],
      "env": {
        "GITHUB_TOKEN": "${GITHUB_TOKEN}",
        "OPENROUTER_API_KEY": "${OPENROUTER_API_KEY}",
        "ANTHROPIC_API_KEY": "${ANTHROPIC_API_KEY}",
        "JULES_API_KEY": "${JULES_API_KEY}",
        "COMPOSIO_API_KEY": "${COMPOSIO_API_KEY}",
        "FIRECRAWL_API_KEY": "${FIRECRAWL_API_KEY}",
        "OBOT_BASE_URL": "${OBOT_BASE_URL}",
        "OBOT_IDP_CONFIG": "${OBOT_IDP_CONFIG}",
        "OBOT_ALLOWED_HOSTS": "${OBOT_ALLOWED_HOSTS}",
        "WR_DEFAULT_REPO": "${WR_DEFAULT_REPO}"
      }
    }
  }
}
```

## Tools

| Tool | Description |
|---|---|
| `control_plane_status` | Show which providers and credentials are configured |
| `build_wr_issue_packet` | Fetch a WR issue and produce a structured research/orchestration packet |
| `detect_wr_credential_requirements` | Identify missing credentials for a specific WR |
| `render_control_plane_mcp_entry` | Generate a ready-to-paste MCP config snippet |

## Resources

| Resource | Description |
|---|---|
| `data://wr-control-plane/env-schema` | Required/optional env vars |
| `data://wr-control-plane/architecture` | Canonical Revvel interpretation of the blueprint |

## Smoke test without FastMCP

The server includes a lightweight compatibility shim so local code/tests can import it even before `fastmcp` is installed.

```bash
python - <<'PY'
import os
os.environ['WR_DEFAULT_REPO'] = 'midnghtsapphire/revvel-standards'
from wr_control_plane.server import control_plane_status
print(control_plane_status()['server'])
PY
```

## Governance notes

- **FastMCP** is the server framework, not the security gateway.
- **Obot** is the governance plane.
- **Composio** is the OAuth/tool router.
- **Firecrawl** complements Jules; it does not replace Jules in the current pipeline.
- Fully autonomous destructive actions should remain gated behind Obot policy and approval.
