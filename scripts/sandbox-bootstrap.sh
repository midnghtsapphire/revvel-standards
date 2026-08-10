#!/usr/bin/env bash
#
# scripts/sandbox-bootstrap.sh — one-command sandbox setup for a visiting agent.
#
# Usage (from repo root):
#     bash scripts/sandbox-bootstrap.sh <agent-name>
#
# Example:
#     bash scripts/sandbox-bootstrap.sh cursor
#     bash scripts/sandbox-bootstrap.sh openhands
#     bash scripts/sandbox-bootstrap.sh copilot-swe-agent
#
# What it does:
#   1. Creates .sandbox/<agent-name>/ with the full canonical folder tree
#   2. Drops a starter AGENT.md if none exists
#   3. Opens a session log file stamped with today's UTC timestamp
#   4. Prints the exact next steps
#
# It is idempotent — safe to re-run. It NEVER overwrites an existing file.
#
# This script is the mechanical enforcement of
# `standards/VISITING_AGENT_SANDBOX_STANDARD.md`. If you are a new visiting
# agent and unsure whether to run this: yes, run it. It costs one second
# and never destroys data.

set -euo pipefail

AGENT_NAME="${1:-}"
if [[ -z "$AGENT_NAME" ]]; then
  cat >&2 <<EOF
Usage: bash scripts/sandbox-bootstrap.sh <agent-name>

<agent-name> must be a stable, lowercase, hyphenated identifier — e.g.
'openhands', 'cursor', 'jules', 'copilot-swe-agent', 'devin', 'roo',
'kilo'. Pick one and stick with it across every session.
EOF
  exit 2
fi

# Enforce naming rule: lowercase letters, digits, hyphens only.
if ! [[ "$AGENT_NAME" =~ ^[a-z][a-z0-9-]*$ ]]; then
  echo "ERROR: agent name '$AGENT_NAME' must be lowercase alphanumeric + hyphens, start with a letter" >&2
  exit 2
fi

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SANDBOX_DIR="$REPO_ROOT/.sandbox/$AGENT_NAME"
UTC_STAMP="$(date -u +'%Y-%m-%d-%H%M')"

# Canonical folder tree — must match .sandbox/README.md.
FOLDERS=(sessions memory thoughts scripts api-calls cli mcp tools skills artifacts)

created_folders=()
for folder in "${FOLDERS[@]}"; do
  target="$SANDBOX_DIR/$folder"
  if [[ ! -d "$target" ]]; then
    mkdir -p "$target"
    created_folders+=("$folder/")
  fi
done

# AGENT.md — starter identity file. Only written if it does not exist.
agent_md="$SANDBOX_DIR/AGENT.md"
created_agent_md=false
if [[ ! -f "$agent_md" ]]; then
  cat > "$agent_md" <<EOF
# Agent: $AGENT_NAME

## Identity

- **Name:** $AGENT_NAME
- **Vendor:** _fill in — the company or team that operates you_
- **Role in the fleet:** _visiting agent invoked by @midnghtsapphire for
  \`<what you were asked to do>\`_
- **Invocation surface:** _how the owner reaches you — browser, workflow,
  CLI, chat client_
- **Auth secrets used:** _which \`secrets.*\` GitHub Actions secrets you
  authenticate with, if any_

## How to resume this agent

1. Read \`.sandbox/$AGENT_NAME/sessions/\` newest-first — the top file is
   what $AGENT_NAME last worked on.
2. Read \`.sandbox/$AGENT_NAME/memory/\` for facts that persist across
   sessions.
3. Read \`.sandbox/$AGENT_NAME/thoughts/\` for pending brainstorm chains.
4. Then read the fleet-wide \`AGENTS.md\`, \`learnings.md\`, \`DECISIONS.md\`,
   \`standards/VISITING_AGENT_SANDBOX_STANDARD.md\`.

## What $AGENT_NAME is good at

_fill in as sessions accumulate_

## What $AGENT_NAME has gotten wrong before

_fill in as sessions accumulate — every failure mode is a training module_

## Standing owner preferences

- COMMENT-DONT-DELETE (RVS-PRESERVE-001) — never delete config, always
  archive in place with a dated comment
- Fail-loud over fail-silent for missing secrets/keys
- Fix what you find (open Triage WRs for out-of-scope bugs — see
  \`standards/OUT_OF_SCOPE_AUTO_WR_STANDARD.md\`)
- Save your work as you go — see \`.sandbox/README.md\`

## Historical session index

See \`sessions/\` for chronological session logs.
EOF
  created_agent_md=true
fi

# Session log — always create fresh with UTC timestamp.
session_file="$SANDBOX_DIR/sessions/$UTC_STAMP-session.md"
cat > "$session_file" <<EOF
# Session — $UTC_STAMP UTC — $AGENT_NAME

**Owner:** @midnghtsapphire
**Agent:** $AGENT_NAME
**Started:** $(date -u +'%Y-%m-%dT%H:%M:%SZ')

## The owner's asks — verbatim

_paste the owner's message that started this session, exactly as written_

## Plan

_short bullet list of what you intend to do this session_

## What was shipped

_fill in as you ship — commits, PRs, files, decisions. Update every time
you push something._

## Key discoveries

_bugs found, patterns spotted, misconfigurations. If a discovery is
out-of-scope for the current task, file a Triage-role WR immediately per
\`standards/OUT_OF_SCOPE_AUTO_WR_STANDARD.md\` and note the issue number
here._

## Triage-role WRs filed this session

_list every issue number filed under the Triage role, with a one-line
summary. Empty is fine._

## Pending / handed off

_what remains for the next session or the owner_
EOF

# Print the summary — friendly, actionable, exact next steps.
echo
echo "=== sandbox bootstrap complete ==="
echo "Agent name:  $AGENT_NAME"
echo "Sandbox dir: .sandbox/$AGENT_NAME/"
if [[ ${#created_folders[@]} -gt 0 ]]; then
  echo "Created folders: ${created_folders[*]}"
else
  echo "All folders already existed (no changes)."
fi
if [[ "$created_agent_md" == true ]]; then
  echo "Created AGENT.md   → $agent_md (fill in the placeholders)"
else
  echo "AGENT.md   already existed at $agent_md"
fi
echo "Created session log → $session_file"
echo
echo "=== next steps for $AGENT_NAME ==="
cat <<EOF
1. Open $session_file and paste the owner's original request under
   "The owner's asks — verbatim".
2. As you work, log actions to the matching folder:
     - shell commands you ran     → cli/
     - external API calls          → api-calls/
     - MCP tool invocations        → mcp/
     - scripts you wrote           → scripts/
     - reasoning / brainstorms     → thoughts/
     - facts to persist            → memory/
3. Read these three mandatory standards before your first write:
     standards/VISITING_AGENT_SANDBOX_STANDARD.md
     standards/OUT_OF_SCOPE_AUTO_WR_STANDARD.md
     standards/TRIAGE_ROLE_STANDARD.md
4. When you find a bug that is not part of your primary task, file a
   Triage-role WR — never say "out of scope" without one.
5. Before you stop, add a "session-end" note to $session_file describing
   what's finished, what's blocked, and what the next session should do.
EOF
