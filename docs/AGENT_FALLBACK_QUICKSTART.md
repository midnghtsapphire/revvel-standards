# Agent Fallback Quickstart

This guide explains how to configure the agent fallback lane used by the automated pipeline.

## Overview

The agent fallback system routes work between available AI coding agents. When a primary agent is unavailable or rate-limited, the system falls back to the next configured agent in the chain.

## Supported Agents

The following agents are currently wired into the fallback lane:

- **Devin** — invoked via `scripts/call-devin-api.sh`
- **Cursor** — invoked via `scripts/call-cursor-api.sh`

> **Note:** Earlier versions of this document referenced `call-openhands-api.sh` (also spelled `call-OpenHands-api.sh`). That script has been removed from the iteration loop. If you have local automation referencing the old filename, update it to use one of the supported scripts above.

## Setup

1. Run the setup helper from the repository root:

   ```bash
   ./scripts/setup-agent-fallback.sh
   ```

   This script will:
   - Ensure `scripts/call-devin-api.sh` and `scripts/call-cursor-api.sh` are executable
   - Verify required environment variables are present
   - Print a summary of the configured fallback chain

2. Export the required API credentials in your shell (or your CI secret store):

   ```bash
   export DEVIN_API_KEY="..."
   export CURSOR_API_KEY="..."
   ```

3. Confirm the lane is healthy:

   ```bash
   ./scripts/call-devin-api.sh --ping
   ./scripts/call-cursor-api.sh --ping
   ```

## Troubleshooting

### "call-openhands-api.sh: not found"

This warning indicates you (or a downstream script) are referencing the retired OpenHands script. Remove the reference or replace it with one of the currently supported scripts (`call-devin-api.sh` or `call-cursor-api.sh`).

### Setup script reports a missing file

Re-pull the latest `main`. The canonical list of scripts managed by the setup helper lives in `scripts/setup-agent-fallback.sh`; if a file is missing, either the checkout is incomplete or the script has been renamed upstream.

### Adding a new agent

To add a new agent to the fallback lane:

1. Add a `scripts/call-<agent>-api.sh` wrapper.
2. Append it to the `AGENT_SCRIPTS` array in `scripts/setup-agent-fallback.sh`.
3. Document the new agent in this file.
4. Open a PR that updates code and docs together — do not let them drift.

## Related

- `scripts/setup-agent-fallback.sh` — canonical source of the configured agent list
- PR #14375 — "Devin: wire the lane for real"
