#!/bin/bash
# setup-mcp-endpoints.sh — register the DigitalOcean Action Gateway MCP endpoint
# with local agent CLIs (Claude Code, Codex). Idempotent — safe to re-run.
# Closes WRs #18288 (Claude endpoint) and #18290 (Codex endpoint).
set -euo pipefail

GW_URL="https://actions.do-ai.run/mcp/endpoint/158ed24e-cf7e-4f82-b37b-74abd1c5691a"

if command -v claude &>/dev/null; then
  echo "▶ Registering action-gateway with Claude Code..."
  claude mcp add --transport http action-gateway "$GW_URL" || echo "  (already registered — ok)"
  echo "  Next: claude mcp login action-gateway   # opens OAuth flow"
else
  echo "· claude CLI not found — skipping"
fi

if command -v codex &>/dev/null; then
  echo "▶ Registering action-gateway with Codex..."
  codex mcp add action-gateway --url "$GW_URL" || echo "  (already registered — ok)"
else
  echo "· codex CLI not found — skipping"
fi

# --rotate-hook-secret: push a new GitHub webhook secret after rotating in DO console
if [[ "${1:-}" == "--rotate-hook-secret" ]]; then
  : "${GITHUB_PAT:?set GITHUB_PAT}"
  : "${NEW_HOOK_SECRET:?set NEW_HOOK_SECRET from the DigitalOcean console}"
  curl -sf -X PATCH \
    -H "Authorization: Bearer $GITHUB_PAT" \
    -H "Accept: application/vnd.github+json" \
    "https://api.github.com/repos/midnghtsapphire/revvel-standards/hooks/711002709" \
    -d "{\"config\": {\"secret\": \"$NEW_HOOK_SECRET\"}}" \
    && echo "✔ hook secret rotated" || echo "✘ rotation failed"
fi

echo "Done. Endpoint registry: config/mcp-endpoints.json"
