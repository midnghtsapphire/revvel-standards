#!/usr/bin/env bash
# TriageChief 2026-11-19. Advisory Code Review Fleet (RVS-REVIEW-001) on CircleCI, OFFLINE: no GitHub token, no posting.
# Builds the diff from the CircleCI checkout, then runs one PR-Agent plain-diff review (--diff-file) per persona
# (default: security, workflow, no_delete_goals, syntax_final_gate last), through scripts/ai_review_fleet.py.
# Findings go to the workspace folder in the RVS-REVIEW-001 schema. The post-review-comments job posts ONE comment.
# Settings: AI_REVIEW_PERSONAS (or "all"), AI_REVIEW_MAX_PERSONA_RUNS (4), AI_REVIEW_MAX_FLEET_USD (0.03).
# Always exits 0.
# Secrets: only OPENROUTER_API_KEY is used. Values are never printed; logs pass through a redactor.
set -uo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GLUE="$HERE/../ai_review.py"
PY="${PYTHON:-python3}"
OUT="${AI_REVIEW_OUT_DIR:-/tmp/ai-review-out}"
PR_AGENT_VERSION="${PR_AGENT_VERSION:-0.50.0}"
# OpenRouter slug, checked to exist 2026-11-19: $0.0507/M input, $0.203/M output.
AI_REVIEW_MODEL="${AI_REVIEW_MODEL:-openrouter/deepseek/deepseek-v4.1-flash}"
# Spend cap: context sent per call is cut to this many tokens (about 0.2 cents at that price).
export AI_REVIEW_MAX_TOKENS="${AI_REVIEW_MAX_TOKENS:-32000}"
mkdir -p "$OUT" /tmp/ai-review

# This job never needs a GitHub write token. Drop any that the project env still injects.
"$PY" "$GLUE" prepare --reviewer pr-agent --out "$OUT"
unset ADMIN_GITHUB_TOKEN AI_REVIEW_GITHUB_TOKEN GITHUB_TOKEN GH_TOKEN GITHUB_READ_TOKEN NOTION_TOKEN
# shellcheck disable=SC1091
. /tmp/ai-review/pr-agent.env
if [ "${AI_REVIEW_RUN:-0}" != "1" ]; then
  echo "PR-Agent skipped: $AI_REVIEW_REASON"
  exit 0
fi

VENV=/tmp/pr-agent-venv
# Test hook: PR_AGENT_PYTHON points at an interpreter that already has pr-agent installed. Unset in CircleCI.
PR_AGENT_BIN="${PR_AGENT_PYTHON:-$VENV/bin/python}"
if [ -z "${PR_AGENT_PYTHON:-}" ] && ! { "$PY" -m venv "$VENV" && "$VENV/bin/pip" install -q --disable-pip-version-check "pr-agent==$PR_AGENT_VERSION"; } \
  >/tmp/ai-review/pip.log 2>&1; then
  "$PY" "$GLUE" redact </tmp/ai-review/pip.log | tail -5
  "$PY" "$GLUE" record --reviewer pr-agent --out "$OUT" --result error --reason "could not install pr-agent $PR_AGENT_VERSION" --model "$AI_REVIEW_MODEL"
  exit 0
fi

# The fleet runner starts one PR-Agent per persona from an empty folder (so a repo-local .pr_agent.toml in the PR
# cannot change its settings) with a minimal environment: the OpenRouter key and model settings, nothing else.
# Persona instructions reach PR-Agent as a generated TOML file, not as env vars (no quoting limits).
echo "Running the Code Review Fleet offline on $AI_REVIEW_DIFF_FILE ($AI_REVIEW_FILES files, $AI_REVIEW_LINES lines) with $AI_REVIEW_MODEL (max $AI_REVIEW_MAX_TOKENS tokens per call)"
export AI_REVIEW_DIFF_FILE AI_REVIEW_FILES_LIST AI_REVIEW_BASE AI_REVIEW_HEAD_SHA AI_REVIEW_PR_NUMBER OPENROUTER_API_KEY
"$PR_AGENT_BIN" "$HERE/../ai_review_fleet.py" --out "$OUT" --python "$PR_AGENT_BIN" --model "$AI_REVIEW_MODEL" 2>&1 \
  | "$PY" "$GLUE" redact | tail -40
# The runner records its own result. If it crashed before doing so, record an error here.
if [ ! -s "$OUT/pr-agent.meta.json" ]; then
  "$PY" "$GLUE" record --reviewer pr-agent --out "$OUT" --result error --reason "the fleet runner stopped early" --model "$AI_REVIEW_MODEL"
fi
exit 0
