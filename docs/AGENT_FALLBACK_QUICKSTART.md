# Agent Fallback Quickstart

This guide describes how to set up the agent fallback chain used by the automated
coding pipeline. The chain is designed to keep automation running even when a
primary provider (Devin) is unavailable or over budget, by falling back through
free/lower-cost providers.

## Fallback Chain

```text
Devin  →  Cursor  →  OpenRouter  →  OpenHands (opt-in)  →  manual
```

- **Devin** — primary paid agent (highest quality, rate-limited by budget)
- **Cursor** — secondary paid agent
- **OpenRouter** — free-tier LLM router (default free fallback)
- **OpenHands** — opt-in community/self-hosted agent (only if configured)
- **manual** — human intervention required

## Prerequisites

- `bash` (>= 4.0)
- `curl`
- `jq`
- A GitHub token with `repo` scope exported as `GITHUB_TOKEN`
- Provider API keys (only the ones you intend to use):
  - `DEVIN_API_KEY`
  - `CURSOR_API_KEY`
  - `OPENROUTER_API_KEY`

## Setup

Run the setup script from the repository root:

```bash
./scripts/setup-agent-fallback.sh
```

The script will:

1. Verify prerequisites are installed.
2. `chmod +x` the following system-provided scripts if present:
   - `scripts/call-devin-api.sh`
   - `scripts/call-cursor-api.sh`
   - `scripts/call-openrouter-api.sh`
3. Print a summary of which providers are configured based on environment
   variables.

> **Note:** The OpenHands API script (`call-openhands-api.sh`) is no longer
> shipped as a system-provided file and is **not** managed by
> `setup-agent-fallback.sh`. OpenHands is now an opt-in fallback: if you want
> to use it, drop your own `scripts/call-openhands-api.sh` implementation into
> the repository and make it executable manually:
>
> ```bash
> chmod +x scripts/call-openhands-api.sh
> ```
>
> If the script is not present, the fallback chain will simply skip OpenHands
> and continue to the next stage (manual).

## Verifying the Setup

After running the setup script, verify each configured provider:

```bash
# Devin
DEVIN_API_KEY=... ./scripts/call-devin-api.sh --dry-run

# Cursor
CURSOR_API_KEY=... ./scripts/call-cursor-api.sh --dry-run

# OpenRouter
OPENROUTER_API_KEY=... ./scripts/call-openrouter-api.sh --dry-run
```

## Troubleshooting

### "call-openhands-api.sh: not found" during setup

This warning is expected if you have not opted into OpenHands. The setup
script no longer references this file. If you see this message, it is coming
from an older cached script — pull the latest `main` and re-run
`./scripts/setup-agent-fallback.sh`.

### "call-OpenHands-api.sh: not found

The file was previously referenced with mixed casing. The canonical name is
now the lowercase `call-openhands-api.sh` (opt-in only). Remove any references
to the mixed-case variant from your local scripts or CI config.

### Fallback chain skips a provider

Providers are skipped when their API key environment variable is unset, or
when their `call-*-api.sh` script is missing or not executable. Check the
setup script's output for a per-provider status line.

## Related

- `scripts/setup-agent-fallback.sh` — setup entry point
- `scripts/call-devin-api.sh` — Devin adapter
- `scripts/call-cursor-api.sh` — Cursor adapter
- `scripts/call-openrouter-api.sh` — OpenRouter adapter
- PR #14375 — "Devin: wire the lane for real"
