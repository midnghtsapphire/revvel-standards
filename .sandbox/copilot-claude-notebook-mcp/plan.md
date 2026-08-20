# claude-notebook-mcp (WR #17733)

## Goal
Ship MCP server for notebook inside Claude, inspired by jacob-bd/gemini-notebook-mcp-cli.

## Shape
- Local notebook engine (no Google auth) so purchase-validation can call every tool
- Cell CRUD, code execution (python + js), markdown, attachments, widgets
- Claude Desktop / .mcp.json wiring
- Also register vendored gemini-notebook-mcp-cli as Claude-linked optional server

## Files
mcp-servers/claude-notebook-mcp/
  claude_notebook_mcp/{__init__,__main__,engine,server}.py
  pyproject.toml README.md examples/example_call.py .mcp.snippet.json
tests/claude-notebook-mcp.test.js
.mcp.json + docs/MCP_REVVEL_CATALOG.md updates
