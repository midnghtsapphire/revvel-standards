#!/usr/bin/env bash
# init-product.sh — scaffold a new agent-generated product folder.
#
# Implements the canonical layout defined in
# standards/AUTOMATED_PRODUCT_PIPELINE.md and the template in
# templates/agent-generated-product/.
#
# Usage:
#   scripts/init-product.sh <slug> [--shape pdf|app|extension|skill|api|cli|mcp|booklet|full-app|excel|token]
#
# Examples:
#   scripts/init-product.sh cpap-mask-leak-finder --shape app
#   scripts/init-product.sh etsy-shipping-pdf --shape pdf

set -euo pipefail

usage() {
  sed -n 's/^# \{0,1\}//p' "$0" | sed -n '2,12p'
  exit "${1:-1}"
}

if [ $# -lt 1 ]; then
  usage 1
fi

SLUG=""
SHAPE="app"

while [ $# -gt 0 ]; do
  case "$1" in
    -h|--help)
      usage 0
      ;;
    --shape)
      SHAPE="${2:-}"
      shift 2
      ;;
    --shape=*)
      SHAPE="${1#--shape=}"
      shift
      ;;
    -*)
      echo "error: unknown flag: $1" >&2
      usage 1
      ;;
    *)
      if [ -z "$SLUG" ]; then
        SLUG="$1"
      else
        echo "error: unexpected positional arg: $1" >&2
        usage 1
      fi
      shift
      ;;
  esac
done

if [ -z "$SLUG" ]; then
  echo "error: <slug> is required" >&2
  usage 1
fi

case "$SHAPE" in
  pdf|app|extension|skill|api|cli|mcp|booklet|full-app|excel|token) ;;
  *)
    echo "error: invalid --shape '$SHAPE' (expected one of: pdf, app, extension, skill, api, cli, mcp, booklet, full-app, excel, token)" >&2
    exit 1
    ;;
esac

# Slug must be kebab-case (lowercase letters, digits, single dashes).
case "$SLUG" in
  *[!a-z0-9-]*|-*|*-)
    echo "error: <slug> must be lowercase kebab-case (e.g. 'cpap-mask-leak-finder')" >&2
    exit 1
    ;;
esac

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TEMPLATE="$REPO_ROOT/templates/agent-generated-product"
DEST_PARENT="$REPO_ROOT/projects/agent-generated"
DEST="$DEST_PARENT/$SLUG"

if [ ! -d "$TEMPLATE" ]; then
  echo "error: template not found at $TEMPLATE" >&2
  exit 1
fi

if [ -e "$DEST" ]; then
  echo "error: $DEST already exists; refusing to overwrite" >&2
  exit 1
fi

mkdir -p "$DEST_PARENT"
cp -R "$TEMPLATE" "$DEST"

NOW="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

# Stamp state.json with the slug, shape, and timestamps. We avoid a jq
# dependency so this script runs on a bare runner.
python3 - "$DEST/state.json" "$SLUG" "$SHAPE" "$NOW" <<'PY'
import json, sys
path, slug, shape, now = sys.argv[1:5]
with open(path, "r", encoding="utf-8") as f:
    state = json.load(f)
state["product_slug"] = slug
state["shape"] = shape
state["created_at"] = now
state["last_updated_at"] = now
with open(path, "w", encoding="utf-8") as f:
    json.dump(state, f, indent=2)
    f.write("\n")
PY

# Replace the BOM.md template placeholder with the real slug.
sed -i.bak "s/<product_slug>/$SLUG/g" "$DEST/BOM.md"
rm -f "$DEST/BOM.md.bak"

echo "✅ Scaffolded product '$SLUG' (shape=$SHAPE)"
echo "   Location: $DEST"
echo ""
echo "Next steps:"
echo "  1. Fill out $DEST/research/brief.md (pipeline step 3)"
echo "  2. Resolve every row in $DEST/BOM.md (pipeline step 6)"
echo "  3. See standards/AUTOMATED_PRODUCT_PIPELINE.md for the full flow"
