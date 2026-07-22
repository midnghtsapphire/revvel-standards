# [APP_NAME] Custom MCP Server

Built with [FastMCP](https://gofastmcp.com) — the Pythonic way to build MCP servers.

See [MCP_STANDARD.md](../../../docs/Master_Inventory/MCP_STANDARD.md) Section 11 for the full FastMCP guide.

## Structure

```text
mcp_server/
  __init__.py
  server.py          # FastMCP entry point — all tools, resources, prompts
  tools/             # Optional: split large tool sets into modules
  resources/         # Optional: split large resource sets into modules
pyproject.toml       # Package metadata
```

## Quick Start

```bash
# Install dependencies
uv pip install -e .

# Run in dev mode (auto-reload)
fastmcp dev mcp_server/server.py

# Install into Claude Desktop
fastmcp install mcp_server/server.py --name "[APP_NAME] MCP" -e DATABASE_URL -e API_KEY
```

## Adding to .mcp.json

```json
{
  "mcpServers": {
    "[app_name]-custom": {
      "command": "uv",
      "args": ["run", "python", "mcp_server/server.py"],
      "env": {
        "DATABASE_URL": "${DATABASE_URL}",
        "API_KEY": "${API_KEY}"
      }
    }
  }
}
```

## Adding New Tools

1. Add a function to `mcp_server/server.py` decorated with `@mcp.tool`
2. Type-annotate all parameters and return values
3. Write a clear docstring — this is what the AI agent reads to decide whether to use the tool
4. Test it: `fastmcp dev mcp_server/server.py`, then call the tool from Claude or Cursor
