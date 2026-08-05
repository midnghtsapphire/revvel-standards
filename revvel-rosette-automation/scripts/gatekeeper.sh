#!/usr/bin/env bash
# Gatekeeper automation script
# Wraps the main gatekeeper-sync.sh from parent repo

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PARENT_SCRIPTS="${SCRIPT_DIR}/../../scripts"
GATEKEEPER_SCRIPT="${PARENT_SCRIPTS}/gatekeeper-sync.sh"

# Check if parent gatekeeper script exists
if [ ! -f "$GATEKEEPER_SCRIPT" ]; then
    echo "Error: gatekeeper-sync.sh not found at $GATEKEEPER_SCRIPT"
    echo "Make sure you're running from the revvel-rosette-automation directory"
    exit 1
fi

# Pass all arguments to the parent script
exec "$GATEKEEPER_SCRIPT" "$@"
