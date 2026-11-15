#!/usr/bin/env bash
# AGENTS.md S7: a PR that changes a bot's work needs a handoff for that bot dated
# within the last day (America/Denver): handoffs/<bot>/YYYY-MM-DD.md for today or
# yesterday. Fails only for branches with a known bot prefix (handoffs/bots.conf).
# Any other branch gets a warning and exits 0. A PR that changes only handoffs/
# is exempt. main and daily/* branches are skipped.
#
# Overrides (used by tests/check-handoff.test.js; CircleCI sets only CIRCLE_BRANCH):
#   HANDOFF_ROOT           repo root to check (default: parent of scripts/)
#   HANDOFF_BRANCH         branch name (default: CIRCLE_BRANCH, else the current branch)
#   HANDOFF_TODAY          YYYY-MM-DD "today" (default: today in America/Denver)
#   HANDOFF_CHANGED_FILES  file with one changed path per line (skips git)
#   HANDOFF_BASE_BRANCH    branch the PR targets (default: daily/<today>, else newest origin/daily/*)
set -euo pipefail

ROOT="${HANDOFF_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"
CONF="$ROOT/handoffs/bots.conf"

BRANCH="${HANDOFF_BRANCH:-${CIRCLE_BRANCH:-}}"
if [[ -z "$BRANCH" ]]; then
  BRANCH="$(git -C "$ROOT" rev-parse --abbrev-ref HEAD 2>/dev/null || true)"
fi
TODAY="${HANDOFF_TODAY:-$(TZ=America/Denver date +%F)}"
YESTERDAY="$(date -u -d "$TODAY -1 day" +%F)"

warn() { echo "WARN: $*" >&2; }
fail() { echo "FAIL: $*" >&2; exit 1; }

if [[ -z "$BRANCH" || "$BRANCH" == "HEAD" ]]; then
  warn "no branch name; skipping the handoff check."
  exit 0
fi
if [[ "$BRANCH" == "main" || "$BRANCH" == daily/* ]]; then
  echo "SKIP: $BRANCH is not a PR branch."
  exit 0
fi

# 1. Which files does this PR change?
CHANGED=""
if [[ -n "${HANDOFF_CHANGED_FILES:-}" ]]; then
  CHANGED="$(cat "$HANDOFF_CHANGED_FILES")"
else
  base="${HANDOFF_BASE_BRANCH:-daily/$TODAY}"
  if ! git -C "$ROOT" rev-parse --verify --quiet "refs/remotes/origin/$base" >/dev/null; then
    git -C "$ROOT" fetch --quiet --no-tags origin "$base:refs/remotes/origin/$base" 2>/dev/null || true
  fi
  if ! git -C "$ROOT" rev-parse --verify --quiet "refs/remotes/origin/$base" >/dev/null; then
    newest="$(git -C "$ROOT" for-each-ref --sort=-refname --count=1 --format='%(refname:strip=3)' 'refs/remotes/origin/daily/*' 2>/dev/null || true)"
    if [[ -n "$newest" ]]; then base="$newest"; fi
  fi
  if ! git -C "$ROOT" rev-parse --verify --quiet "refs/remotes/origin/$base" >/dev/null; then
    warn "cannot find the base branch (origin/$base); cannot list changed files, so the handoff check cannot run."
    exit 0
  fi
  mb="$(git -C "$ROOT" merge-base HEAD "origin/$base" 2>/dev/null || true)"
  if [[ -z "$mb" ]]; then
    warn "no merge base with origin/$base (shallow clone?); cannot list changed files, so the handoff check cannot run."
    exit 0
  fi
  if ! CHANGED="$(git -C "$ROOT" diff --name-only "$mb" HEAD)"; then
    warn "git diff against origin/$base failed; cannot list changed files, so the handoff check cannot run."
    exit 0
  fi
fi

other="$(printf '%s\n' "$CHANGED" | grep -v '^$' | grep -v '^handoffs/' || true)"
if [[ -z "$other" ]]; then
  echo "OK: this PR changes only handoffs/ (or nothing); no handoff needed."
  exit 0
fi

# 2. Which bot is this? Longest known prefix wins.
BOT=""
best=0
if [[ -f "$CONF" ]]; then
  while read -r prefix bot _; do
    [[ -z "${prefix:-}" || "$prefix" == \#* || -z "${bot:-}" ]] && continue
    if [[ "$BRANCH" == "$prefix"* && ${#prefix} -gt $best ]]; then
      BOT="$bot"
      best=${#prefix}
    fi
  done < "$CONF"
fi

# 3. A handoff dated today or yesterday (file name date, America/Denver).
fresh_in() { # <dir>
  local dir="$1" d
  for d in "$TODAY" "$YESTERDAY"; do
    [[ -f "$dir/$d.md" ]] && { echo "handoffs/${dir##*/}/$d.md"; return 0; }
  done
  return 1
}

if [[ -n "$BOT" ]]; then
  if found="$(fresh_in "$ROOT/handoffs/$BOT")"; then
    echo "OK: $BRANCH ($BOT) has a handoff within the last day: $found"
    exit 0
  fi
  fail "$BRANCH changes bot work ($BOT) but handoffs/$BOT/ has no file dated $TODAY or $YESTERDAY (America/Denver). Per AGENTS.md S2, copy handoffs/TEMPLATE.md to handoffs/$BOT/$TODAY.md, fill it in, and add it to this PR."
fi

for dir in "$ROOT"/handoffs/*/; do
  [[ -d "$dir" ]] || continue
  if found="$(fresh_in "${dir%/}")"; then
    echo "OK: $BRANCH has no known bot prefix; a recent handoff exists: $found"
    exit 0
  fi
done
warn "$BRANCH has no known bot prefix (handoffs/bots.conf) and no handoff dated $TODAY or $YESTERDAY exists. Per AGENTS.md S2 the bot should write handoffs/<bot>/$TODAY.md. Not failing: the bot is unknown."
exit 0
