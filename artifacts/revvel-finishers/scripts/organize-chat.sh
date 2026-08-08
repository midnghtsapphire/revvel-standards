#!/usr/bin/env bash
# organize-chat.sh — thin wrapper around the monorepo chat deployment organizer.
# Prefer this from finishers workers so the pipeline stays script-first.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# When seeded inside revvel-standards checkout:
STANDARDS_ROOT="$(cd "${ROOT}/../.." && pwd)"
ENGINE="${STANDARDS_ROOT}/scripts/chat-deployment-organizer.js"

if [[ ! -f "${ENGINE}" ]]; then
  echo "organize-chat: engine not found at ${ENGINE}" >&2
  echo "Run from a revvel-standards checkout or copy scripts/chat-deployment-organizer.js alongside." >&2
  exit 2
fi

INPUT="${1:-}"
FORMAT="${2:-markdown}"

if [[ -z "${INPUT}" ]]; then
  echo "Usage: $0 <chat-file> [json|markdown|wr-pack]" >&2
  exit 2
fi

exec node "${ENGINE}" --input "${INPUT}" --format "${FORMAT}"
