#!/usr/bin/env bash
# ADVISORY Semgrep CE scan. Never fails the build until Audrey says to gate.
# Free: Semgrep Community Edition, public p/default ruleset, no account, no
# token, metrics off. With a PR base it runs --baseline-commit so only findings
# introduced by the PR are reported. Artifacts: semgrep.sarif, semgrep.json,
# semgrep.txt in /tmp/advisory-artifacts/semgrep.
# WR #18490.
set -uo pipefail

OUT=/tmp/advisory-artifacts/semgrep
mkdir -p "$OUT"

BASE="$(bash .circleci/scripts/advisory-base-ref.sh)"
if [ -z "$BASE" ]; then
  echo "Semgrep advisory: no PR base found, skipping instead of scanning the whole repo."
  echo "skipped: no base commit" > "$OUT/semgrep.txt"
  exit 0
fi

args=(scan
  --config p/default
  --metrics=off
  --disable-version-check
  --baseline-commit "$BASE"
  --timeout 20
  --exclude node_modules --exclude '*.min.js' --exclude 'artifacts/revvel-finishers' --exclude imports
  --sarif-output "$OUT/semgrep.sarif"
  --json-output "$OUT/semgrep.json"
  --text-output "$OUT/semgrep.txt"
)

semgrep "${args[@]}"
rc=$?

if [ -s "$OUT/semgrep.json" ]; then
  n="$(python3 -c 'import json,sys; print(len(json.load(open(sys.argv[1]))["results"]))' "$OUT/semgrep.json" 2>/dev/null || echo "?")"
  echo "Semgrep advisory: $n new finding(s) since ${BASE:0:12}. Details are in the job artifacts (semgrep.txt, semgrep.sarif, semgrep.json)."
fi

if [ "$rc" -ne 0 ]; then
  echo "Semgrep advisory: semgrep exited $rc (scan did not complete). Not failing the build: this job is advisory."
fi
exit 0
