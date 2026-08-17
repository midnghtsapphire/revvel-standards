#!/usr/bin/env bash
# on-failure-append-learning.sh
#
# Auto-appends a failure entry to agent-factory/learnings.md whenever a
# command exits with a non-zero status.
#
# Usage (wire from your hooks config or call directly):
#   AGENT_NAME="Goap" TASK_ATTEMPTED="n8n parse email" EXIT_CODE=1 \
#     LOG_TAIL="connection timed out" \
#     bash agent-factory/hooks/on-failure-append-learning.sh
#
# All variables have safe defaults so the script never fails silently.

set -euo pipefail

LEARNINGS_FILE="$(dirname "$0")/../learnings.md"

TIMESTAMP="${TIMESTAMP:-$(date -u '+%Y-%m-%dT%H:%M:%SZ')}"
AGENT_NAME="${AGENT_NAME:-unknown-agent}"
TASK_ATTEMPTED="${TASK_ATTEMPTED:-unspecified task}"
EXIT_CODE="${EXIT_CODE:-1}"
LOG_TAIL="${LOG_TAIL:-}"
DEFAULT_ROOT_CAUSE="Exit code ${EXIT_CODE}."
if [[ -n "$LOG_TAIL" ]]; then
  DEFAULT_ROOT_CAUSE="${DEFAULT_ROOT_CAUSE} See LOG_TAIL for details."
fi
ROOT_CAUSE="${ROOT_CAUSE:-$DEFAULT_ROOT_CAUSE}"
SELF_HEALING_FIX="${SELF_HEALING_FIX:-Pending — agent must fill in after diagnosis.}"
NEXT_ACTION="${NEXT_ACTION:-Run /diagnose then /patch; update this entry with locked-in fix.}"

# Resolve path relative to the repo root if needed
if [[ ! -f "$LEARNINGS_FILE" ]]; then
  REPO_ROOT="$(git -C "$(dirname "$0")" rev-parse --show-toplevel 2>/dev/null || echo '.')"
  LEARNINGS_FILE="${REPO_ROOT}/agent-factory/learnings.md"
fi

if [[ ! -f "$LEARNINGS_FILE" ]]; then
  echo "ERROR: learnings.md not found at $LEARNINGS_FILE" >&2
  exit 1
fi

ENTRY="
**Date/Time:** ${TIMESTAMP}
**Agent:** ${AGENT_NAME}
**Task Attempted:** ${TASK_ATTEMPTED}
**Outcome:** Failed (exit code ${EXIT_CODE})
**Root Cause of Failure (If any):** ${ROOT_CAUSE}"

if [[ -n "$LOG_TAIL" ]]; then
  ENTRY="${ENTRY}
**Log Tail:**
\`\`\`
${LOG_TAIL}
\`\`\`"
fi

ENTRY="${ENTRY}
**Self-Healing Fix / Learned Lesson:** ${SELF_HEALING_FIX}
**Next Action:** ${NEXT_ACTION}
---"

echo "$ENTRY" >> "$LEARNINGS_FILE"
echo "✅  Failure entry appended to learnings.md (agent: ${AGENT_NAME}, task: ${TASK_ATTEMPTED})"
