# MeiliSearch MCP Server

**Version:** 1.0.0
**Date:** April 29, 2026

---

## Overview

MeiliSearch MCP provides programmatic access to MeiliSearch for AI agents via Model Context Protocol.

## Quick Start

```bash
cd growlingeyes/meilisearch-mcp
pip install -e .

# Configure
export MEILI_HOST=http://localhost:7700
export MEILI_KEY=masterKey

# Run
python -m meilisearch_mcp.server
```

## Tools Available

| Tool | Description |
|------|-------------|
| `meili_index_create` | Create an index |
| `meili_index_list` | List all indexes |
| `meili_index_delete` | Delete an index |
| `meili_documents_add` | Add documents |
| `meili_documents_search` | Search documents |
| `meili_documents_get` | Get a document |
| `meili_settings_update` | Update search settings |
| `meili_health` | Check health |

## Configuration

Add to `.mcp.json`:

```json
{
  "mcpServers": {
    "meilisearch": {
      "command": "python",
      "args": ["-m", "meilisearch_mcp.server"],
      "env": {
        "MEILI_HOST": "${MEILI_HOST}",
        "MEILI_KEY": "${MEILI_KEY}"
      }
    }
  }
}
```

## Environment Variables

```bash
MEILI_HOST=http://localhost:7700
MEILI_KEY=yourMasterKey
```

---

## References

- [MeiliSearch Docs](https://www.meilisearch.com/docs)
- [revvel-standards MCP_STANDARD.md](../docs/Master_Inventory/MCP_STANDARD.md)
