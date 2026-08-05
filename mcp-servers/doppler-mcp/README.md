# DoppleMCP - Doppler Secrets MCP Server

**Version:** 1.0.0
**Date:** April 29, 2026
**Status:** Active
**Author:** Audrey Evans (MIDNGHTSAPPHIRE)

---

## Overview

DoppleMCP provides programmatic access to Doppler secrets management via the Model Context Protocol (MCP). This enables AI agents to request, create, rotate, and manage secrets without manual intervention.

---

## Quick Start

```bash
# Install
cd growlingeyes/doppemcp
pip install -e .

# Configure
cp .env.example .env
# Add DOPPLER_TOKEN=doppler_pt_xxx

# Run
python -m doppemcp.server
```

---

## Architecture

```text
┌─────────────┐     MCP      ┌─────────────┐
│ AI Agent    │◄────────────►│ DoppleMCP   │
│ (Claude,    │              │             │
│  Cursor,    │              │  - secrets  │
│  OpenHands) │              │  - projects │
│             │              │  - tokens   │
└─────────────┘              └──────┬──────┘
                                    │
                              ┌─────▼─────┐
                              │ Doppler   │
                              │ API       │
                              └───────────┘
```

---

## Tools Available

### Secrets Management

| Tool | Description |
|------|-------------|
| `doppler_secrets_list` | List all secrets in a config |
| `doppler_secrets_get` | Get a specific secret |
| `doppler_secrets_set` | Set or update a secret |
| `doppler_secrets_delete` | Delete a secret |
| `doppler_secrets_clone` | Clone secrets between configs |

### Project Management

| Tool | Description |
|------|-------------|
| `doppler_projects_list` | List all projects |
| `doppler_projects_get` | Get project details |
| `doppler_configs_list` | List configs in a project |
| `doppler_environments_list` | List environments |

### Service Tokens

| Tool | Description |
|------|-------------|
| `doppler_tokens_list` | List service tokens |
| `doppler_tokens_create` | Create service token |
| `doppler_tokens_revoke` | Revoke service token |
| `doppler_tokens_rotate` | Rotate service token |

### Health & Info

| Tool | Description |
|------|-------------|
| `doppler_health` | Check API health |
| `doppler_me` | Get current user |
| `doppler_whoami` | Get account info |

---

## Environment Variables

```bash
# Required
DOPPLER_TOKEN=doppler_pt_xxx

# Optional
DOPPLER_PROJECT=revvel-standards
DOPPLER_CONFIG=prd
```

---

## Integration with Agents

Add to `.mcp.json`:

```json
{
  "mcpServers": {
    "doppler": {
      "command": "python",
      "args": ["-m", "doppemcp.server"],
      "env": {
        "DOPPLER_TOKEN": "${DOPPLER_TOKEN}"
      }
    }
  }
}
```

---

## Self-Healing

The server implements automatic retry with exponential backoff:

- 3 attempts per request
- Backoff: 1s, 2s, 4s
- On failure: logs to `wr/memory/mcp-errors.md`
- After 3 failures: raises error with full context for agent to handle

---

## Error Response Format

All errors include:

```json
{
  "error": true,
  "code": "DOPPLER_API_ERROR",
  "message": "Failed to get secret",
  "details": {
    "status_code": 401,
    "endpoint": "/v3/secrets/STRIPE_KEY"
  },
  "recovery": "Check DOPPLER_TOKEN is valid and not expired. Regenerate at dashboard.doppler.com"
}
```

---

## References

- [Doppler API Docs](https://docs.doppler.com/docs/api)
- [MCP Protocol](https://modelcontextprotocol.io)
- [revvel-standards MCP_STANDARD.md](../docs/Master_Inventory/MCP_STANDARD.md)
