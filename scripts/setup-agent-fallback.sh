#!/usr/bin/env bash
#
# setup-agent-fallback.sh
#
# Prepare the local checkout for the agent fallback lane.
# This helper is the canonical source of truth for which agent API
# wrappers ship with the repository. Keep it in sync with
# docs/AGENT_FALLBACK_QUICKSTART.md.
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Canonical list of agent API scripts. Update this array (and the docs)
# whenever an agent is added, removed, or renamed.
AGENT_SCRIPTS=(
  "call-devin-api.sh"
  "call-cursor-api.sh"
)

# Retired script names. If we see these referenced anywhere on disk or
# invoked directly, emit a helpful message instead of a silent failure.
RETIRED_SCRIPTS=(
  "call-openhands-api.sh"
  "call-OpenHands-api.sh"
)

info()  { printf '\033[1;34m[info]\033[0m  %s\n' "$*"; }
warn()  { printf '\033[1;33m[warn]\033[0m  %s\n' "$*" >&2; }
error() { printf '\033[1;31m[error]\033[0m %s\n' "$*" >&2; }

info "Configuring agent fallback lane in ${SCRIPT_DIR}"

# 1. chmod the supported scripts.
missing=0
for script in "${AGENT_SCRIPTS[@]}"; do
  path="${SCRIPT_DIR}/${script}"
  if [[ -f "${path}" ]]; then
    chmod +x "${path}"
    info "ready: ${script}"
  else
    error "missing required script: ${script}"
    missing=1
  fi
done

# 2. Warn on any retired scripts still present on disk.
for old in "${RETIRED_SCRIPTS[@]}"; do
  if [[ -e "${SCRIPT_DIR}/${old}" ]]; then
    warn "found retired script '${old}'. It is no longer part of the fallback lane; consider removing it."
  fi
done

# 3. Scan the repo for stale references to retired names so users get a
#    clear pointer instead of a silent "not found" at runtime.
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
if command -v grep >/dev/null 2>&1; then
  for old in "${RETIRED_SCRIPTS[@]}"; do
    # Case-insensitive, exclude .git and this setup script itself.
    if grep -RIli --exclude-dir=.git --exclude="setup-agent-fallback.sh" "${old%.sh}" "${REPO_ROOT}" >/dev/null 2>&1; then
      warn "repository still references '${old}'. Update callers to use one of: ${AGENT_SCRIPTS[*]}"
    fi
  done
fi

if [[ "${missing}" -ne 0 ]]; then
  error "setup incomplete: one or more required scripts are missing"
  exit 1
fi

info "agent fallback lane ready. See docs/AGENT_FALLBACK_QUICKSTART.md for usage."
