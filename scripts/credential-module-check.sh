#!/usr/bin/env bash
# credential-module-check.sh — workflow gate.
#
# Reads config/credential-modules.yml and exits 0 if the module is
# enabled (workflow may proceed), 78 if disabled (workflow should
# skip gracefully), 2 on usage/parse error.
#
# Usage in a workflow step:
#   - name: Skip if doppler-recover module is disabled
#     id: gate
#     run: |
#       if ! bash scripts/credential-module-check.sh doppler-recover; then
#         echo "::notice::doppler-recover module is disabled; skipping."
#         echo "skip=true" >> "$GITHUB_OUTPUT"
#         exit 0
#       fi
#       echo "skip=false" >> "$GITHUB_OUTPUT"
#
# No yq / no jq required — pure POSIX awk over the YAML.

set -euo pipefail

MODULE_ID="${1:-}"
if [[ -z "$MODULE_ID" ]]; then
  echo "usage: $0 <module-id>" >&2
  echo "  module-id: credential-gate | doppler-recover | credential-backup-harness" >&2
  exit 2
fi

CONFIG="${CREDENTIAL_MODULES_CONFIG:-config/credential-modules.yml}"
if [[ ! -f "$CONFIG" ]]; then
  echo "credential-module-check: $CONFIG not found; treating $MODULE_ID as ENABLED (fail-open)" >&2
  exit 0
fi

# Find the module's `enabled:` value with awk:
#   - look for `  - id: <module-id>`
#   - then within that record (until the next `  - id:` or EOF),
#     pick up the first `    enabled: true|false`.
ENABLED=$(awk -v want="$MODULE_ID" '
  BEGIN { inblock = 0 }
  /^  - id:[[:space:]]+/ {
    sub(/^  - id:[[:space:]]+/, "", $0)
    inblock = ($0 == want) ? 1 : 0
    next
  }
  inblock && /^    enabled:[[:space:]]+/ {
    sub(/^    enabled:[[:space:]]+/, "", $0)
    print $0
    exit
  }
' "$CONFIG")

case "${ENABLED:-}" in
  true)
    exit 0
    ;;
  false)
    exit 78
    ;;
  "")
    echo "credential-module-check: module '$MODULE_ID' not found in $CONFIG; fail-open (ENABLED)" >&2
    exit 0
    ;;
  *)
    echo "credential-module-check: unexpected 'enabled' value '$ENABLED' for '$MODULE_ID'; fail-open" >&2
    exit 0
    ;;
esac
