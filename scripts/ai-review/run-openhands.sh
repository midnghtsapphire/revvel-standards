#!/usr/bin/env bash
# TriageChief 2026-11-19. Advisory OpenHands review on CircleCI, OFFLINE: no GitHub token, no posting.
# Builds the diff from the CircleCI checkout, runs an OpenHands SDK agent on it (openhands_review.py), and writes
# markdown to the workspace folder. The post-review-comments job posts it. Always exits 0.
# Secrets: only OPENROUTER_API_KEY is used (as LLM_API_KEY). Values are never printed; logs pass through a redactor.
set -uo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GLUE="$HERE/../ai_review.py"
PY="${PYTHON:-python3}"
OUT="${AI_REVIEW_OUT_DIR:-/tmp/ai-review-out}"
SDK_VERSION="${OPENHANDS_SDK_VERSION:-1.63.0}"
TOOLS_VERSION="${OPENHANDS_TOOLS_VERSION:-1.63.0}"
UV_VERSION="${UV_VERSION:-0.13.9}"
# openhands-sdk 1.63.0 allows litellm up to 1.109.x, but 1.109.x lacks a module the SDK imports (checked 2026-11-19).
LITELLM_VERSION="${LITELLM_VERSION:-1.108.3}"
AI_REVIEW_MODEL="${AI_REVIEW_MODEL:-openrouter/deepseek/deepseek-v4.1-flash}"
TIMEOUT_SECS="${AI_REVIEW_TIMEOUT_SECS:-900}"
AI_REVIEW_MAX_ITERATIONS="${AI_REVIEW_MAX_ITERATIONS:-40}"
AI_REVIEW_MAX_BUDGET_USD="${AI_REVIEW_MAX_BUDGET_USD:-0.05}"
mkdir -p "$OUT" /tmp/ai-review

# This job never needs a GitHub write token. Drop any that the project env still injects.
"$PY" "$GLUE" prepare --reviewer openhands --out "$OUT"
unset ADMIN_GITHUB_TOKEN AI_REVIEW_GITHUB_TOKEN GITHUB_TOKEN GH_TOKEN GITHUB_READ_TOKEN NOTION_TOKEN
# shellcheck disable=SC1091
. /tmp/ai-review/openhands.env
if [ "${AI_REVIEW_RUN:-0}" != "1" ]; then
  echo "OpenHands skipped: $AI_REVIEW_REASON"
  exit 0
fi

if [ -z "${AI_REVIEW_TEST_PYTHON:-}" ] && ! "$PY" -m pip install -q --disable-pip-version-check --user "uv==$UV_VERSION" >/tmp/ai-review/pip.log 2>&1; then
  "$PY" "$GLUE" redact </tmp/ai-review/pip.log | tail -5
  "$PY" "$GLUE" record --reviewer openhands --out "$OUT" --result error --reason "could not install uv" --model "$AI_REVIEW_MODEL"
  exit 0
fi
export PATH="$HOME/.local/bin:$PATH"
UV_BIN="${UV_BIN:-uv}"

# Run from the PR checkout (the agent reads it) with a minimal environment: the OpenRouter key under the SDK's
# name, model settings, and caps. Nothing else is passed down.
EXTRA_ENV=()
# Test hook: lets the test suite use an already-installed SDK and a fake OpenRouter. Unset in CircleCI.
if [ -n "${AI_REVIEW_TEST_PYTHON:-}" ]; then RUNNER=("$AI_REVIEW_TEST_PYTHON"); else
  RUNNER=("$UV_BIN" run --no-project --with "openhands-sdk==$SDK_VERSION" --with "openhands-tools==$TOOLS_VERSION" --with "litellm==$LITELLM_VERSION" python)
  EXTRA_ENV+=("UV_PYTHON=3.12" "UV_CACHE_DIR=${UV_CACHE_DIR:-$HOME/.cache/uv}")
fi
echo "Running OpenHands offline on $AI_REVIEW_DIFF_FILE ($AI_REVIEW_FILES files, $AI_REVIEW_LINES lines) with $AI_REVIEW_MODEL," \
  "caps: $AI_REVIEW_MAX_ITERATIONS steps, \$$AI_REVIEW_MAX_BUDGET_USD, ${TIMEOUT_SECS}s"
(
  env -i PATH="$PATH" HOME="${HOME:-/tmp}" LANG=C.UTF-8 \
    LLM_API_KEY="$OPENROUTER_API_KEY" \
    LLM_BASE_URL="${AI_REVIEW_LLM_BASE_URL:-https://openrouter.ai/api/v1}" \
    LLM_MODEL="$AI_REVIEW_MODEL" \
    AI_REVIEW_DIFF_FILE="$AI_REVIEW_DIFF_FILE" AI_REVIEW_OUT_MD="$OUT/openhands.md" \
    AI_REVIEW_PR_TITLE="$AI_REVIEW_PR_TITLE" AI_REVIEW_BASE="$AI_REVIEW_BASE" \
    AI_REVIEW_FILES="$AI_REVIEW_FILES" AI_REVIEW_LINES="$AI_REVIEW_LINES" \
    AI_REVIEW_MAX_ITERATIONS="$AI_REVIEW_MAX_ITERATIONS" AI_REVIEW_MAX_BUDGET_USD="$AI_REVIEW_MAX_BUDGET_USD" \
    "${EXTRA_ENV[@]}" \
    timeout "$TIMEOUT_SECS" "${RUNNER[@]}" "$HERE/openhands_review.py" 2>&1 | "$PY" "$GLUE" redact >/tmp/ai-review/openhands.log
  exit "${PIPESTATUS[0]}"
)
rc=$?
tail -25 /tmp/ai-review/openhands.log
if [ "$rc" -eq 0 ] && [ -s "$OUT/openhands.md" ]; then
  "$PY" "$GLUE" record --reviewer openhands --out "$OUT" --result reviewed --model "$AI_REVIEW_MODEL"
else
  "$PY" "$GLUE" record --reviewer openhands --out "$OUT" --result error --reason "OpenHands exited $rc or wrote no output" --model "$AI_REVIEW_MODEL"
fi
exit 0
