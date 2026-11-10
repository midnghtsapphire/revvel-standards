#!/usr/bin/env bash
# Manually run the agent-approval-check gate for one PR.
#   scripts/agent-approval-check-manual.sh <pr_number>          # dispatch in Actions (default)
#   scripts/agent-approval-check-manual.sh <pr_number> --local  # run pinned script locally
# --local uses your own `gh auth token` (never printed) and posts the real status.
set -euo pipefail
PR="${1:?usage: $0 <pr_number> [--local]}"
REPO="${REPO:-midnghtsapphire/revvel-standards}"
SHA=846d5d8993b09aeea48c5cdde44b7c68f0ba24bc
BOTS="claude[bot],claude-code[bot],devin-ai-integration[bot],devin-ai[bot],github-actions[bot],copilot[bot],dependabot[bot],jules[bot],jules-google[bot],cursor[bot],cursor-ai[bot],octopus-ai[bot],circleci[bot],bito-ai[bot],openhands-ai-integration[bot],openhands-agent[bot],renovate[bot]"
if [[ "${2:-}" != "--local" ]]; then
  gh workflow run agent-approval-check.yml --repo "$REPO" --ref main -f pr_number="$PR"
  echo "Dispatched. Watch: gh run list --repo $REPO --workflow agent-approval-check.yml"
  exit 0
fi
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
curl -fsSL "https://raw.githubusercontent.com/anthropics/claude-code-action/$SHA/agent-approval-check/agent_approval_check.py" -o "$TMP/aac.py"
python3 -m venv "$TMP/venv"
"$TMP/venv/bin/pip" install -q 'httpx==0.28.1' 'pyyaml==6.0.3' 'tenacity==9.1.4'
GH_TOKEN="$(gh auth token)" GH_REPOSITORY="$REPO" GH_PR_NUMBER="$PR" \
REQUIRED_APPROVALS=1 AGENT_EMAILS="noreply@anthropic.com" AGENT_LOGINS="$BOTS" \
EXCLUDED_APPROVERS="$BOTS" EXEMPT_HEAD_BRANCHES="" EXEMPT_PATH_PREFIXES="" PROTECTED_BASES=main \
CONFIG_FILE="" DOCS_URL="https://github.com/anthropics/claude-code-action/tree/$SHA/agent-approval-check" \
  "$TMP/venv/bin/python" "$TMP/aac.py"
