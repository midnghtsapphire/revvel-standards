#!/usr/bin/env bash
# WR #18335. Runs the paid same-task judge. Does not print OPENROUTER_API_KEY.
# The key has to be a CircleCI project environment variable. This config
# attaches no context, so a context-only secret is invisible to the job.
set -euo pipefail

if [ -z "${OPENROUTER_API_KEY:-}" ]; then
  echo "OPENROUTER_API_KEY is not set."
  echo "Add it as a CircleCI project environment variable for gh/midnghtsapphire/revvel-standards."
  echo "Project Settings -> Environment Variables -> name: OPENROUTER_API_KEY"
  echo "Do not put it only in a context. This job does not attach a context."
  exit 1
fi

echo "OPENROUTER_API_KEY is set. Value not printed."
export REVVEL_LLM_ALLOW_CLOUD=1

python3 scripts/prompt_compression_accuracy.py --execute-paid-judge \
  | tee /tmp/llmlingua2-judge-result.json
