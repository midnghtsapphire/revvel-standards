# Claude Notebook MCP

**WR:** [#17733](https://github.com/midnghtsapphire/revvel-standards/issues/17733)  
**Inspired by:** [jacob-bd/gemini-notebook-mcp-cli](https://github.com/jacob-bd/gemini-notebook-mcp-cli)  
**Status:** Ready for Claude Desktop / Claude Code  
**Auth:** None (local filesystem notebook runtime)

Local **notebook cell runtime** exposed as a Model Context Protocol server so
Claude can create notebooks, manage cells, execute code with persistent state,
render markdown, attach files, and drive simple interactive widgets — without
leaving the conversation.

The upstream Gemini Notebook MCP talks to Google NotebookLM and needs browser
auth. This package is the **Claude-native, keyless** companion: same notebook
workflow shape, fully offline, every tool callable for purchase validation.

The vendored upstream lives at
`mcp-servers/gemini-notebook-mcp-cli/` and is also registered in `.mcp.json`
(disabled until `nlm login`).

---

## Install

```bash
cd mcp-servers/claude-notebook-mcp
pip install -e .
# or: uv pip install -e .
```

FastMCP is required only to serve over stdio. The module ships a compatibility
shim so unit tests and the example caller import cleanly without FastMCP.

---

## Run the MCP server

```bash
# from repo root
PYTHONPATH=mcp-servers/claude-notebook-mcp python3 \
  mcp-servers/claude-notebook-mcp/claude_notebook_mcp/server.py

# after install
claude-notebook-mcp
# or
python3 -m claude_notebook_mcp
```

---

## Claude Desktop setup (click-by-click)

1. Install the package (see Install above).
2. Open **Claude Desktop**.
3. Open **Settings** → **Developer** → **Edit Config**
   (this opens `claude_desktop_config.json`).
4. Merge the `mcpServers` block below into the file (keep any servers you
   already have).
5. **Save** the file.
6. Fully quit Claude Desktop (macOS: Claude menu → Quit Claude) and reopen it.
7. Start a new chat. Open the **hammer / tools** icon and confirm
   `claude-notebook-mcp` tools are listed (`notebook_create`, `cell_execute`, …).
8. Success looks like: asking Claude “Create a notebook called demo and run
   `print(1+1)`” results in a tool call and the output `2`.

### Config snippet (Claude Desktop / `.mcp.json`)

```json
{
  "mcpServers": {
    "claude-notebook-mcp": {
      "command": "python3",
      "args": ["-m", "claude_notebook_mcp"],
      "env": {
        "CLAUDE_NOTEBOOK_DIR": "${HOME}/.claude-notebook-mcp/notebooks"
      }
    }
  }
}
```

Repo-relative form (Claude Code / Cursor from this monorepo):

```json
{
  "mcpServers": {
    "claude-notebook-mcp": {
      "command": "uv",
      "args": [
        "run",
        "python",
        "./mcp-servers/claude-notebook-mcp/claude_notebook_mcp/server.py"
      ],
      "env": {
        "CLAUDE_NOTEBOOK_DIR": "${CLAUDE_NOTEBOOK_DIR:-.claude-notebooks}"
      }
    }
  }
}
```

Also shipped as `mcp-servers/claude-notebook-mcp/.mcp.snippet.json`.

Claude Desktop config paths:

| OS | Path |
| --- | --- |
| macOS | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Windows | `%APPDATA%\Claude\claude_desktop_config.json` |
| Linux | `~/.config/Claude/claude_desktop_config.json` |

---

## Tools

| Tool | Description |
| --- | --- |
| `notebook_health` | Server health + capability summary |
| `notebook_list` | List notebooks |
| `notebook_create` | Create notebook (+ welcome markdown cell) |
| `notebook_get` | Full notebook document |
| `notebook_delete` | Delete notebook + attachments |
| `notebook_rename` | Rename notebook |
| `cell_list` | List cells with previews |
| `cell_add` | Add code / markdown / raw cell |
| `cell_get` | Get cell + outputs |
| `cell_update` | Update source / type / language |
| `cell_delete` | Delete cell |
| `cell_execute` | Execute one cell (Python kernel is persistent) |
| `cell_execute_all` | Run all cells in order |
| `kernel_variables` | Live Python variable names/types |
| `kernel_reset` | Reset Python kernel |
| `markdown_render` | Markdown → HTML |
| `attachment_add` | Attach text or base64 file |
| `attachment_list` | List attachments |
| `attachment_remove` | Remove attachment |
| `widget_create` | slider / text / dropdown / checkbox / button / progress |
| `widget_update` | Update widget value |
| `widget_list` | List widgets |
| `widget_delete` | Delete widget |
| `notebook_export` | Export ipynb / json / markdown |
| `notebook_import` | Import ipynb / native JSON |
| `notebook_save_session` | Save notebook + variable snapshot |
| `notebook_load_session` | Restore session file |
| `render_claude_notebook_mcp_entry` | Ready-to-paste MCP config |
| `list_server_tools` | Enumerate tools (purchase validation) |

### Resources

| Resource | Description |
| --- | --- |
| `data://claude-notebook/env-schema` | Env vars |
| `data://claude-notebook/architecture` | WR binding + capability list |

---

## One working example call

```bash
PYTHONPATH=mcp-servers/claude-notebook-mcp python3 \
  mcp-servers/claude-notebook-mcp/examples/example_call.py
```

Expected: prints the tool list, runs a demo notebook (`print('sum', 42)` →
stream + execute_result), then calls **every** registered tool successfully and
exits 0.

---

## Environment

| Variable | Purpose |
| --- | --- |
| `CLAUDE_NOTEBOOK_DIR` | Notebook JSON store (default `~/.claude-notebook-mcp/notebooks`) |

No API keys. JavaScript cells need a local `node` binary.

---

## Purchase validation

1. Wire the server from the exact snippet above.
2. List tools (`list_server_tools` or client `tools/list`).
3. Call each tool successfully — `examples/example_call.py` does this.

---

## Claude link to Gemini Notebook MCP (optional)

Upstream Gemini Notebook / NotebookLM MCP (needs Google login):

```bash
cd mcp-servers/gemini-notebook-mcp-cli
pip install -e .
nlm login
nlm setup add claude-desktop
```

Or enable the `gemini-notebook-mcp` entry in `.mcp.snippet.json` / root
`.mcp.json` after auth.

---

## Tests

From repo root:

```bash
node --test tests/claude-notebook-mcp.test.js
```

---

## References

- Issue: [#17733](https://github.com/midnghtsapphire/revvel-standards/issues/17733)
- Inspiration: [jacob-bd/gemini-notebook-mcp-cli](https://github.com/jacob-bd/gemini-notebook-mcp-cli)
- MCP standard: `docs/Master_Inventory/MCP_STANDARD.md`
- Catalog: `docs/MCP_REVVEL_CATALOG.md`
