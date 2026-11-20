#!/usr/bin/env bash
# TriageChief 2026-11-19. Reuse the AI reviewers from another repo without copying code.
# Fetches scripts/ai_review.py, scripts/ai_review_fleet.py and scripts/ai-review/ from revvel-standards at a PINNED commit,
# then runs one reviewer. Usage: bootstrap.sh pr-agent|openhands
# Set REVVEL_STANDARDS_SHA to a full 40-character commit SHA. A moving ref is refused.
set -uo pipefail
REVIEWER="${1:-}"
case "$REVIEWER" in pr-agent|openhands) ;; *) echo "usage: bootstrap.sh pr-agent|openhands"; exit 0 ;; esac
SHA="${REVVEL_STANDARDS_SHA:-}"
if ! printf '%s' "$SHA" | grep -Eq '^[0-9a-f]{40}$'; then
  echo "REVVEL_STANDARDS_SHA must be a full 40-character commit SHA (got: '${SHA:-empty}'). Skipping AI review."
  exit 0
fi
SRC="${REVVEL_STANDARDS_REPO:-https://github.com/midnghtsapphire/revvel-standards.git}"
DEST=/tmp/revvel-ai-review
rm -rf "$DEST"
git init -q "$DEST" || exit 0
cd "$DEST" || exit 0
if ! { git remote add origin "$SRC" && git config core.sparseCheckout true \
  && printf 'scripts/ai_review.py\nscripts/ai_review_fleet.py\nscripts/ai-review/\n' > .git/info/sparse-checkout \
  && git fetch -q --depth 1 origin "$SHA" && git checkout -q FETCH_HEAD; } 2>/tmp/revvel-ai-review.err; then
  echo "could not fetch revvel-standards at $SHA (private repo needs a token in the URL). Skipping AI review."
  exit 0
fi
cd - >/dev/null || exit 0
exec bash "$DEST/scripts/ai-review/run-${REVIEWER}.sh"
