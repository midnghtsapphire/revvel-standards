#!/usr/bin/env bash
#
# scripts/secret-set.sh — set a GitHub repo secret in one command.
#
# Phase 1 of docs/CREDENTIAL_AUTOMATION_ROADMAP.md — wraps `gh secret set`
# so you don't have to click through Settings → Secrets → New → name → paste
# every time you generate a new key from a provider.
#
# Usage:
#   ./scripts/secret-set.sh NAME VALUE
#   ./scripts/secret-set.sh NAME           # reads VALUE from stdin
#   cat key.pem | ./scripts/secret-set.sh APP_PRIVATE_KEY    # multi-line keys
#   ./scripts/secret-set.sh NAME VALUE --backup PATH         # also write to backup JSON file
#
# Optional --backup updates a local JSON file (gitignored) so future
# auto-restore from CREDENTIAL_BACKUP_JSON has the new key too.
#
# Requires: gh CLI (`brew install gh`), authenticated (`gh auth status`).

set -euo pipefail

# ─── parse args ───────────────────────────────────────────────────────────
NAME="${1:-}"
VALUE="${2:-}"
BACKUP_PATH=""

# Strip optional --backup PATH from args
shift 2 2>/dev/null || shift 1 2>/dev/null || true
while [ $# -gt 0 ]; do
  case "$1" in
    --backup) BACKUP_PATH="$2"; shift 2 ;;
    *) shift ;;
  esac
done

if [ -z "$NAME" ]; then
  echo "Usage: $0 NAME [VALUE] [--backup PATH]" >&2
  echo "       cat key.pem | $0 NAME    # for multi-line values" >&2
  exit 1
fi

# Read VALUE from stdin if not provided as arg
if [ -z "$VALUE" ]; then
  if [ -t 0 ]; then
    echo "❌ No value provided and stdin is a terminal. Either pass VALUE as arg" >&2
    echo "   or pipe it: cat key.pem | $0 $NAME" >&2
    exit 1
  fi
  VALUE="$(cat)"
fi

REPO="${GH_REPO:-midnghtsapphire/revvel-standards}"

# ─── set the GitHub secret ────────────────────────────────────────────────
echo "→ setting GitHub secret: $NAME (repo: $REPO)"
printf '%s' "$VALUE" | gh secret set "$NAME" --repo "$REPO" --body -
echo "✅ GitHub secret $NAME set"

# ─── optional: update local backup JSON ───────────────────────────────────
if [ -n "$BACKUP_PATH" ]; then
  if [ -f "$BACKUP_PATH" ]; then
    UPDATED=$(jq --arg k "$NAME" --arg v "$VALUE" '. + {($k): $v}' "$BACKUP_PATH")
  else
    UPDATED=$(jq -n --arg k "$NAME" --arg v "$VALUE" '{($k): $v}')
    mkdir -p "$(dirname "$BACKUP_PATH")"
  fi
  printf '%s\n' "$UPDATED" > "$BACKUP_PATH"
  chmod 600 "$BACKUP_PATH"
  echo "✅ backup JSON updated: $BACKUP_PATH (chmod 600)"
  echo "   To sync this file to CREDENTIAL_BACKUP_JSON (the auto-restore secret):"
  echo "     gh secret set CREDENTIAL_BACKUP_JSON --repo $REPO < $BACKUP_PATH"
fi

echo "done."
