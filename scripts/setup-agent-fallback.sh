#!/usr/bin/env bash
# setup-agent-fallback.sh
#
# Prepare the multi-agent fallback lane: ensure driver scripts are executable
# and report which lanes are configured based on the environment.
#
# See docs/AGENT_FALLBACK_QUICKSTART.md for the authoritative documentation.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Authoritative list of driver scripts that make up the current fallback lane.
# Keep this list in sync with docs/AGENT_FALLBACK_QUICKSTART.md.
AGENT_SCRIPTS=(
  "call-devin-api.sh"
  "call-cursor-api.sh"
)

# Legacy script names that have been removed from the fallback lane. If we
# still find any of these on disk or referenced by name, surface a helpful
# warning rather than silently ignoring them.
LEGACY_SCRIPTS=(
  "call-openhands-api.sh"
  "call-OpenHands-api.sh"
)

log()  { printf '[setup-agent-fallback] %s\n' "$*"; }
warn() { printf '[setup-agent-fallback] WARNING: %s\n' "$*" >&2; }

log "Repository root: ${REPO_ROOT}"

# 1. chmod +x the current driver scripts.
for script in "${AGENT_SCRIPTS[@]}"; do
  path="${SCRIPT_DIR}/${script}"
  if [[ -f "${path}" ]]; then
    chmod +x "${path}"
    log "Ensured executable: scripts/${script}"
  else
    warn "Expected driver script not found: scripts/${script}"
    warn "See docs/AGENT_FALLBACK_QUICKSTART.md for the current lane layout."
  fi
done

# 2. Detect legacy references and guide users to the migration docs.
for legacy in "${LEGACY_SCRIPTS[@]}"; do
  legacy_path="${SCRIPT_DIR}/${legacy}"
  if [[ -e "${legacy_path}" ]]; then
    warn "Legacy driver script present: scripts/${legacy}"
    warn "This script is no longer part of the fallback lane. See"
    warn "docs/AGENT_FALLBACK_QUICKSTART.md (Migrating from the OpenHands lane)."
  fi
done

if command -v grep >/dev/null 2>&1; then
  # Only scan tracked-ish locations to keep this fast; ignore this script and
  # the quickstart doc, which intentionally mention the legacy names.
  legacy_hits="$(
    grep -RIliE 'call-openhands-api\.sh' \
      --exclude-dir=.git \
      --exclude="setup-agent-fallback.sh" \
      --exclude="AGENT_FALLBACK_QUICKSTART.md" \
      "${REPO_ROOT}" 2>/dev/null || true
  )"
  if [[ -n "${legacy_hits}" ]]; then
    warn "Found references to the removed OpenHands driver in:"
    while IFS= read -r file; do
      [[ -n "${file}" ]] && warn "  - ${file}"
    done <<< "${legacy_hits}"
    warn "Update these to use scripts/call-devin-api.sh or scripts/call-cursor-api.sh."
  fi
fi

# 3. Report configured lanes based on environment variables.
report_lane() {
  local name="$1" var="$2"
  if [[ -n "${!var:-}" ]]; then
    log "Lane '${name}' is ENABLED (${var} is set)."
  else
    log "Lane '${name}' is disabled (${var} not set)."
  fi
}

report_lane "devin"  "DEVIN_API_KEY"
report_lane "cursor" "CURSOR_API_KEY"

log "Setup complete. See docs/AGENT_FALLBACK_QUICKSTART.md for usage."
