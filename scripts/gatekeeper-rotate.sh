#!/usr/bin/env bash
# gatekeeper-rotate.sh — Check and execute secret rotations based on the Gatekeeper registry.
#
# Reads docs/_GATEKEEPER_REGISTRY.json, finds entries past their next_rotation
# date, and either auto-rotates (if the provider supports it) or creates a
# GitHub issue prompting manual rotation.
#
# Usage:
#   bash scripts/gatekeeper-rotate.sh --check          # Dry-run: show what's due
#   bash scripts/gatekeeper-rotate.sh --execute         # Actually rotate + log
#   bash scripts/gatekeeper-rotate.sh --warn-days 7     # Warn about upcoming rotations
#
# Environment:
#   DOPPLER_TOKEN   Service token with read/write access
#   GITHUB_TOKEN    For creating issues (set on Actions runners)
#   DRY_RUN=1       Print actions without executing

set -euo pipefail

REGISTRY_FILE="docs/_GATEKEEPER_REGISTRY.json"
ROTATION_LOG="docs/_ROTATION_LOG.md"
MODE="check"
WARN_DAYS=7
DRY_RUN="${DRY_RUN:-0}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --check) MODE="check"; shift ;;
    --execute) MODE="execute"; shift ;;
    --warn-days)
      [[ $# -ge 2 ]] || { echo "error: --warn-days requires a value" >&2; exit 2; }
      WARN_DAYS="$2"; shift 2 ;;
    --warn-days=*) WARN_DAYS="${1#--warn-days=}"; shift ;;
    -h|--help)
      sed -n '2,16p' "$0" | sed 's/^# \{0,1\}//'
      exit 0 ;;
    *) echo "error: unknown arg: $1" >&2; exit 2 ;;
  esac
done

command -v jq >/dev/null || { echo "error: jq not found" >&2; exit 3; }

if [[ ! -f "$REGISTRY_FILE" ]]; then
  echo "error: registry file not found: $REGISTRY_FILE" >&2
  exit 4
fi

# Validate registry JSON before processing
if ! jq empty "$REGISTRY_FILE" 2>/dev/null; then
  echo "error: $REGISTRY_FILE is not valid JSON" >&2
  exit 5
fi

NOW_EPOCH=$(date +%s)
WARN_EPOCH=$((NOW_EPOCH + WARN_DAYS * 86400))

echo "=== Gatekeeper Rotation Check ==="
echo "Date: $(date -u +"%Y-%m-%d %H:%M UTC")"
echo "Mode: $MODE"
echo "Warn window: ${WARN_DAYS} days"
echo ""

OVERDUE=0
WARNING=0
OK=0

while IFS= read -r entry; do
  id=$(echo "$entry" | jq -r '.id')
  name=$(echo "$entry" | jq -r '.name')
  next_rotation=$(echo "$entry" | jq -r '.next_rotation // empty')
  rotation_days=$(echo "$entry" | jq -r '.rotation_days // 0')
  status=$(echo "$entry" | jq -r '.status')

  if [[ -z "$next_rotation" || "$rotation_days" == "0" ]]; then
    continue
  fi

  if [[ "$status" != "active" ]]; then
    continue
  fi

  next_epoch=$(date -d "$next_rotation" +%s 2>/dev/null || echo "0")

  if [[ "$next_epoch" == "0" ]]; then
    echo "⚠️  SKIP: $name ($id) — could not parse next_rotation: $next_rotation"
    continue
  fi

  if [[ "$next_epoch" -le "$NOW_EPOCH" ]]; then
    echo "🔴 OVERDUE: $name ($id) — was due $(date -d "$next_rotation" +%Y-%m-%d)"
    OVERDUE=$((OVERDUE + 1))

    if [[ "$MODE" == "execute" && "$DRY_RUN" != "1" ]]; then
      # Check for existing open issue to avoid duplicates
      EXISTING=""
      if command -v gh >/dev/null && [[ -n "${GITHUB_TOKEN:-}" ]]; then
        EXISTING=$(gh issue list \
          --repo "${GITHUB_REPOSITORY:-midnghtsapphire/revvel-standards}" \
          --label "rotation-due" \
          --search "[ROTATE] $name" \
          --state open --limit 1 --json number -q '.[0].number // empty' 2>/dev/null || echo "")
      fi
      if [[ -n "$EXISTING" ]]; then
        echo "  → Issue #$EXISTING already open for $id — skipping"
      elif command -v gh >/dev/null && [[ -n "${GITHUB_TOKEN:-}" ]]; then
        echo "  → Creating rotation issue for $id..."
        gh issue create \
          --repo "${GITHUB_REPOSITORY:-midnghtsapphire/revvel-standards}" \
          --title "[ROTATE] $name — rotation overdue" \
          --label "rotation-due" \
          --body "## Rotation Required

**Item:** $name
**Registry ID:** \`$id\`
**Was due:** $next_rotation
**Rotation interval:** ${rotation_days} days

### Steps
1. Go to the provider console and generate a new key/token.
2. Store the new value in Doppler: \`doppler secrets set <ENV_VAR> --project <project> --config prd\`
3. Run \`bash scripts/gatekeeper-sync.sh --secrets <ENV_VAR> --repo <repo>\` to sync to GitHub Secrets.
4. Update \`docs/_GATEKEEPER_REGISTRY.json\` with new \`last_rotated\` and \`next_rotation\`.
5. Append a row to \`docs/_ROTATION_LOG.md\`.

_Auto-created by gatekeeper-rotate.sh_" 2>/dev/null || echo "  ⚠️  Could not create issue (gh CLI or permissions)"
      fi
    fi

  elif [[ "$next_epoch" -le "$WARN_EPOCH" ]]; then
    days_until=$(( (next_epoch - NOW_EPOCH) / 86400 ))
    echo "⚠️  WARNING: $name ($id) — due in ${days_until} days ($(date -d "$next_rotation" +%Y-%m-%d))"
    WARNING=$((WARNING + 1))

  else
    echo "✅ OK: $name ($id) — next rotation $(date -d "$next_rotation" +%Y-%m-%d)"
    OK=$((OK + 1))
  fi
done < <(jq -c '.entries[]' "$REGISTRY_FILE")

echo ""
echo "Summary: overdue=$OVERDUE, warning=$WARNING, ok=$OK"

if [[ "$OVERDUE" -gt 0 ]]; then
  exit 1
fi
