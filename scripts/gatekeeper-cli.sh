#!/usr/bin/env bash
# gatekeeper-cli.sh — CLI for managing the Gatekeeper registry.
#
# Commands:
#   add        Add a new entry to the registry
#   list       List registry entries (optionally filtered)
#   remove     Remove an entry from the registry by ID
#   validate   Validate a product BOM.md against the registry
#   rotate     Wrapper around gatekeeper-rotate.sh (--check / --execute)
#   sync       Trigger Doppler → GitHub Secrets sync via gatekeeper-sync.sh
#
# Usage:
#   bash scripts/gatekeeper-cli.sh add --id <id> --name <name> --type <type> \
#     --provider <provider> --env-var <ENV_VAR> --doppler-path <project/config/NAME> \
#     [--used-by <repo,...>] [--rotation-days <n>] [--kong]
#   bash scripts/gatekeeper-cli.sh list [--used-by <repo>] [--type <type>]
#   bash scripts/gatekeeper-cli.sh remove --id <id>
#   bash scripts/gatekeeper-cli.sh validate --bom <path/to/BOM.md>
#   bash scripts/gatekeeper-cli.sh rotate --check
#   bash scripts/gatekeeper-cli.sh rotate --execute
#   bash scripts/gatekeeper-cli.sh sync
#
# Environment:
#   GITHUB_TOKEN    Required for issue creation in rotate --execute
#   DOPPLER_TOKEN   Required for sync

set -euo pipefail

REGISTRY_FILE="docs/_GATEKEEPER_REGISTRY.json"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
die() { echo "error: $*" >&2; exit 1; }

require_jq() {
  command -v jq >/dev/null || die "jq is required but not installed"
}

require_registry() {
  [[ -f "$REGISTRY_FILE" ]] || die "registry not found: $REGISTRY_FILE"
  jq empty "$REGISTRY_FILE" 2>/dev/null || die "$REGISTRY_FILE is not valid JSON"
}

# Atomically update the registry by writing to a temp file then moving it.
write_registry() {
  local tmp
  tmp=$(mktemp)
  cat > "$tmp"
  mv "$tmp" "$REGISTRY_FILE"
}

today_iso() { date -u +"%Y-%m-%dT%H:%M:%SZ"; }

next_rotation_date() {
  local days="$1"
  date -u -d "+${days} days" +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null \
    || python3 -c "from datetime import datetime, timezone, timedelta; print((datetime.now(timezone.utc)+timedelta(days=${days})).strftime('%Y-%m-%dT%H:%M:%SZ'))"
}

# ---------------------------------------------------------------------------
# Commands
# ---------------------------------------------------------------------------

cmd_add() {
  require_jq
  require_registry

  local id="" name="" type="" provider="" env_var="" doppler_path=""
  local used_by="[]" rotation_days=90 kong=false

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --id)           id="$2";           shift 2 ;;
      --name)         name="$2";         shift 2 ;;
      --type)         type="$2";         shift 2 ;;
      --provider)     provider="$2";     shift 2 ;;
      --env-var)      env_var="$2";      shift 2 ;;
      --doppler-path) doppler_path="$2"; shift 2 ;;
      --used-by)
        # Accept comma-separated repos: "repo1,repo2"
        IFS=',' read -ra arr <<< "$2"
        used_by=$(printf '%s\n' "${arr[@]}" | jq -Rsc 'split("\n")[:-1]')
        shift 2 ;;
      --rotation-days) rotation_days="$2"; shift 2 ;;
      --kong) kong=true; shift ;;
      *) die "add: unknown argument: $1" ;;
    esac
  done

  [[ -n "$id" ]]           || die "add: --id is required"
  [[ -n "$name" ]]         || die "add: --name is required"
  [[ -n "$type" ]]         || die "add: --type is required"
  [[ -n "$provider" ]]     || die "add: --provider is required"
  [[ -n "$env_var" ]]      || die "add: --env-var is required"
  [[ -n "$doppler_path" ]] || die "add: --doppler-path is required"
  [[ "$rotation_days" =~ ^[0-9]+$ ]] || die "add: --rotation-days must be a non-negative integer"

  # Check for duplicate ID
  local existing
  existing=$(jq -r --arg id "$id" '.entries[] | select(.id == $id) | .id' "$REGISTRY_FILE")
  [[ -z "$existing" ]] || die "add: entry with id '$id' already exists. Use 'list' to inspect."

  local now next_rot kong_service
  now=$(today_iso)
  next_rot=$(next_rotation_date "$rotation_days")
  kong_service="null"

  local new_entry
  new_entry=$(jq -n \
    --arg id "$id" \
    --arg name "$name" \
    --arg type "$type" \
    --arg provider "$provider" \
    --arg env_var "$env_var" \
    --arg doppler_path "$doppler_path" \
    --argjson used_by "$used_by" \
    --argjson rotation_days "$rotation_days" \
    --arg now "$now" \
    --arg next_rot "$next_rot" \
    --argjson kong_service "$kong_service" \
    '{
      id: $id,
      name: $name,
      type: $type,
      provider: $provider,
      env_var: $env_var,
      doppler_path: $doppler_path,
      used_by: $used_by,
      kong_service: $kong_service,
      rate_limit: "unknown",
      cost: "unknown",
      provisioned_at: $now,
      last_rotated: $now,
      rotation_days: $rotation_days,
      next_rotation: $next_rot,
      status: "active",
      docs_url: null
    }')

  jq --argjson entry "$new_entry" '.entries += [$entry]' "$REGISTRY_FILE" | write_registry
  echo "✅ Added '$id' to the Gatekeeper registry."

  if [[ "$kong" == "true" ]]; then
    echo "ℹ️  --kong flag set: register this service in Kong manually or via gatekeeper-sync.sh."
  fi
}

cmd_list() {
  require_jq
  require_registry

  local filter_used_by="" filter_type=""
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --used-by) filter_used_by="$2"; shift 2 ;;
      --type)    filter_type="$2";    shift 2 ;;
      *) die "list: unknown argument: $1" ;;
    esac
  done

  local query='.entries[]'
  if [[ -n "$filter_type" ]]; then
    query="${query} | select(.type == \"$filter_type\")"
  fi
  if [[ -n "$filter_used_by" ]]; then
    query="${query} | select(.used_by[] == \"$filter_used_by\")"
  fi

  jq -r "[$query] | .[] | \"\(.id)\t\(.name)\t\(.type)\t\(.status)\t\(.next_rotation // \"—\")\"" \
    "$REGISTRY_FILE" \
    | column -t -s $'\t' \
    || jq -r "[$query] | .[] | \"\(.id) | \(.name) | \(.type) | \(.status)\"" "$REGISTRY_FILE"
}

cmd_remove() {
  require_jq
  require_registry

  local id=""
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --id) id="$2"; shift 2 ;;
      *) die "remove: unknown argument: $1" ;;
    esac
  done
  [[ -n "$id" ]] || die "remove: --id is required"

  # Guard: do not remove if used_by is non-empty
  local used_by_count
  used_by_count=$(jq -r --arg id "$id" \
    '.entries[] | select(.id == $id) | .used_by | length' "$REGISTRY_FILE" 2>/dev/null || echo "")
  [[ -n "$used_by_count" ]] || die "remove: id '$id' not found in registry"
  if [[ "$used_by_count" -gt 0 ]]; then
    die "remove: '$id' is still used by ${used_by_count} product(s). Remove all 'used_by' references first."
  fi

  jq --arg id "$id" 'del(.entries[] | select(.id == $id))' "$REGISTRY_FILE" | write_registry
  echo "✅ Removed '$id' from the Gatekeeper registry."
}

cmd_validate() {
  require_jq
  require_registry

  local bom=""
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --bom) bom="$2"; shift 2 ;;
      *) die "validate: unknown argument: $1" ;;
    esac
  done
  [[ -n "$bom" ]] || die "validate: --bom <path/to/BOM.md> is required"
  [[ -f "$bom" ]] || die "validate: BOM file not found: $bom"

  echo "=== Gatekeeper BOM Validator ==="
  echo "BOM: $bom"
  echo ""

  local errors=0 warnings=0

  # Extract env vars from BOM table rows (column 4 in the pipe-delimited table)
  while IFS='|' read -ra cols; do
    # Skip header and separator rows
    local env_col
    env_col="${cols[4]:-}"
    # Trim leading and trailing whitespace
    env_col="${env_col#"${env_col%%[![:space:]]*}"}"
    env_col="${env_col%"${env_col##*[![:space:]]}"}"
    [[ -z "$env_col" || "$env_col" == "Env Var" || "$env_col" =~ ^[-]+$ ]] && continue
    [[ "$env_col" == "—" || "$env_col" == "-" ]] && continue

    # Check if env var is present in registry
    local in_registry
    in_registry=$(jq -r --arg v "$env_col" \
      '.entries[] | select(.env_var == $v) | .id' "$REGISTRY_FILE" 2>/dev/null | head -1)

    if [[ -n "$in_registry" ]]; then
      echo "✅ $env_col — registered as '$in_registry'"
    else
      echo "❌ $env_col — NOT found in Gatekeeper registry"
      errors=$((errors + 1))
    fi
  done < "$bom"

  echo ""
  echo "Validation complete: $errors error(s), $warnings warning(s)"
  if [[ "$errors" -gt 0 ]]; then
    echo "BOM is NOT ready. Resolve all errors before proceeding."
    exit 1
  fi
  echo "BOM is ready ✅"
}

cmd_rotate() {
  local rotate_script="$SCRIPT_DIR/gatekeeper-rotate.sh"
  [[ -f "$rotate_script" ]] || die "rotate: gatekeeper-rotate.sh not found at $rotate_script"
  bash "$rotate_script" "$@"
}

cmd_sync() {
  local sync_script="$SCRIPT_DIR/gatekeeper-sync.sh"
  [[ -f "$sync_script" ]] || die "sync: gatekeeper-sync.sh not found at $sync_script"
  bash "$sync_script" "$@"
}

# ---------------------------------------------------------------------------
# Dispatch
# ---------------------------------------------------------------------------
COMMAND="${1:-}"
shift || true

case "$COMMAND" in
  add)      cmd_add      "$@" ;;
  list)     cmd_list     "$@" ;;
  remove)   cmd_remove   "$@" ;;
  validate) cmd_validate "$@" ;;
  rotate)   cmd_rotate   "$@" ;;
  sync)     cmd_sync     "$@" ;;
  -h|--help|"")
    sed -n '2,30p' "$0" | sed 's/^# \{0,1\}//'
    exit 0 ;;
  *) die "unknown command: $COMMAND. Run with --help for usage." ;;
esac
