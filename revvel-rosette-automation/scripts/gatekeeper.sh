#!/usr/bin/env bash
# Gatekeeper automation script
# Wraps the main gatekeeper-sync.sh from parent repo

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PARENT_SCRIPTS="${SCRIPT_DIR}/../../scripts"
GATEKEEPER_SCRIPT="${PARENT_SCRIPTS}/gatekeeper-sync.sh"

# 2026-11-19 Secret: this wrapper exec'd gatekeeper-sync.sh, which copied
# Doppler onto GitHub with no freshness check (docs/tool-history/doppler.md).
# Disabled. The guarded writer is scripts/zero_touch_secrets.py.
echo "gatekeeper.sh writes are disabled (Secret 2026-11-19). Use scripts/zero_touch_secrets.py" >&2
exit 2

# Previous body, kept:
# if [ ! -f "$GATEKEEPER_SCRIPT" ]; then
#     echo "Error: gatekeeper-sync.sh not found at $GATEKEEPER_SCRIPT"
#     echo "Make sure you're running from the revvel-rosette-automation directory"
#     exit 1
# fi
# exec "$GATEKEEPER_SCRIPT" "$@"
