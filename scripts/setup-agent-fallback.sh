#!/usr/bin/env bash
#
# setup-agent-fallback.sh
#
# Prepares the agent fallback chain:
#   Devin → Cursor → OpenRouter → OpenHands (opt-in) → manual
#
# This script:
#   1. Verifies required tools (bash, curl, jq) are installed.
#   2. Marks the system-provided call-*-api.sh scripts as executable.
#   3. Reports which providers are configured via environment variables.
#
# OpenHands is opt-in: if scripts/call-openhands-api.sh exists locally, it
# will be made executable, but its absence is not an error.
#
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPTS_DIR="${REPO_ROOT}/scripts"

color() {
  # $1 = color code, $2 = message
  if [ -t 1 ]; then
    printf '\033[%sm%s\033[0m\n' "$1" "$2"
  else
    printf '%s\n' "$2"
  fi
}

info()  { color "1;34" "[info]  $*"; }
ok()    { color "1;32" "[ ok ]  $*"; }
warn()  { color "1;33" "[warn]  $*"; }
error() { color "1;31" "[fail]  $*" >&2; }

# ---------------------------------------------------------------------------
# 1. Verify prerequisites
# ---------------------------------------------------------------------------
info "Checking prerequisites..."
missing=0
for tool in bash curl jq; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    error "Required tool not found: $tool"
    missing=1
  fi
done
if [ "$missing" -ne 0 ]; then
  error "Please install the missing tools and re-run this script."
  exit 1
fi
ok "All prerequisites present."

# ---------------------------------------------------------------------------
# 2. chmod +x the system-provided adapter scripts
# ---------------------------------------------------------------------------
# System-provided (shipped in-repo) adapters — must exist.
SYSTEM_SCRIPTS=(
  "call-devin-api.sh"
  "call-cursor-api.sh"
  "call-openrouter-api.sh"
)

# Opt-in adapters — chmod if present, skip silently if not.
OPTIN_SCRIPTS=(
  "call-openhands-api.sh"
)

info "Marking system-provided adapter scripts executable..."
for s in "${SYSTEM_SCRIPTS[@]}"; do
  path="${SCRIPTS_DIR}/${s}"
  if [ -f "$path" ]; then
    chmod +x "$path"
    ok "chmod +x scripts/${s}"
  else
    warn "Expected system script missing: scripts/${s}"
  fi
done

info "Checking opt-in adapter scripts..."
for s in "${OPTIN_SCRIPTS[@]}"; do
  path="${SCRIPTS_DIR}/${s}"
  if [ -f "$path" ]; then
    chmod +x "$path"
    ok "chmod +x scripts/${s} (opt-in)"
  else
    info "Opt-in script not present (this is fine): scripts/${s}"
  fi
done

# ---------------------------------------------------------------------------
# 3. Report configured providers
# ---------------------------------------------------------------------------
info "Provider configuration:"

report_provider() {
  local name="$1"
  local env_var="$2"
  local script="$3"
  local required="$4" # "system" or "optin"

  local script_path="${SCRIPTS_DIR}/${script}"
  local has_key="no"
  local has_script="no"

  if [ -n "${!env_var:-}" ]; then has_key="yes"; fi
  if [ -x "$script_path" ]; then has_script="yes"; fi

  if [ "$has_key" = "yes" ] && [ "$has_script" = "yes" ]; then
    ok "${name}: enabled  (env ${env_var} set, ${script} executable)"
  elif [ "$required" = "optin" ] && [ "$has_script" = "no" ]; then
    info "${name}: not installed (opt-in; skipped in fallback chain)"
  elif [ "$has_key" = "no" ]; then
    warn "${name}: disabled (env ${env_var} not set)"
  else
    warn "${name}: disabled (${script} missing or not executable)"
  fi
}

report_provider "Devin"      "DEVIN_API_KEY"      "call-devin-api.sh"      "system"
report_provider "Cursor"     "CURSOR_API_KEY"     "call-cursor-api.sh"     "system"
report_provider "OpenRouter" "OPENROUTER_API_KEY" "call-openrouter-api.sh" "system"
report_provider "OpenHands"  "OPENHANDS_API_KEY"  "call-openhands-api.sh"  "optin"

echo
ok "Agent fallback setup complete."
info "See docs/AGENT_FALLBACK_QUICKSTART.md for usage details."
