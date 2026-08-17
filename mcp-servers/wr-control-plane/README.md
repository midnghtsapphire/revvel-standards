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

- **Composio** as the GitHub / Firebase / 100+ tool router (per-user OAuth passthrough)
- **Firecrawl** as the deterministic research layer (crawl / scrape / PDF parse)
- **Tavily** as the LLM-optimized live web search and content extraction layer
- **Obot** as the governance plane (RBAC, DLP, drift detection, allow-list policy)
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

Optional (recommended whenever a WR carries URLs / docs / PDFs):

```bash
FIRECRAWL_API_KEY=
TAVILY_API_KEY=
CREWAI_API_KEY=
OBOT_ALLOWED_HOSTS=api.github.com,github.com,openrouter.ai,api.anthropic.com,api.firecrawl.dev,api.tavily.com
WR_DEFAULT_REPO=midnghtsapphire/revvel-standards
```

### Research provider matrix

| Provider | Strength | When the server selects it |
|---|---|---|
| **Jules** | Deep multi-step research inside the existing GitHub-native pipeline | Always (current research layer) |
| **Firecrawl** | Deterministic crawl / scrape / PDF / structured extraction | When the WR contains URLs, especially PDFs |
| **Tavily** | Fast LLM-optimized topical search and clean content extraction | When the WR contains URLs and Tavily is configured |

The `_control_plane_readiness` tool returns one of these `research_mode` values to make the routing explicit:

- `jules-only` (no URLs found, or no research credentials beyond Jules)
- `firecrawl-agent` (URLs + Firecrawl key)
- `tavily-search` (URLs + Tavily key, no Firecrawl)
- `jules-plus-firecrawl-and-tavily` (URLs + both keys)
- `jules-plus-firecrawl-pdf` (PDF URLs + Firecrawl key — Firecrawl wins on PDFs)

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
        "TAVILY_API_KEY": "${TAVILY_API_KEY}",
        "CREWAI_API_KEY": "${CREWAI_API_KEY}",
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
- **Composio** is the OAuth/tool router (and the path Firebase / Firestore / Functions / Auth wire in for per-app data layers).
- **Firecrawl** and **Tavily** complement Jules; neither replaces Jules in the current pipeline.
- Fully autonomous destructive actions should remain gated behind Obot policy and approval.

## Known v0.1.0 trade-offs

These are deliberate choices for the first slice. Each is tracked for the next iteration so consumers can plan around them:

| # | Behaviour | Why it's intentional | What replaces it |
|---|---|---|---|
| 1 | `_detect_requested_integrations` uses a permissive substring match (e.g. the literal string `github` matches in nearly every WR body since GitHub URLs are common). | `requested_integrations` is an *informational* hint that helps route research/orchestration. It does **not** flip `required` flags in the credential matrix — that signal comes from `Composio` scope, which is unconditionally required when Composio is in play. False positives are safe. | A stop-word / URL-host-aware tokenizer in v0.2.0. |
| 2 | `_github_get` does not paginate the GitHub REST API. The default page size of 30 comments is honoured. | At the WR intake stage almost all issues have far fewer than 30 comments. Pagination adds round-trips and is best implemented once Composio's GitHub toolkit handles auth + rate limiting in one place. | Composio GitHub toolkit pagination wired into the `build_wr_issue_packet` path. |
| 3 | `ControlPlaneConfig.from_env()` is called once per tool invocation rather than memoised at module load. | Each tool stays independently importable for the regression test suite, and per-call env reads are trivially auditable when running under Obot DLP. | A process-wide config cache shared with the OAuth refresh path when Composio wires in. |
| 4 | The control-plane MCP server is shipped `disabled: true` in `.mcp.json`. | Downstream clones must opt in *after* installing the local Python dependencies (`uv pip install -e .`) and provisioning their own credentials. Defaulting to enabled would break clones that don't yet have Composio / Firecrawl / Tavily / Obot keys. | The `disabled` flag flips to `false` in repos that pass the credential check inside `setup-mcp.sh`. |

*The `data://wr-control-plane/architecture` resource also exposes a machine-readable `v0_1_0_trade_offs` field so downstream agents can surface these in their own UIs.*
