#!/usr/bin/env bash
# run-all.sh — run every Proofy security gate in the repo you are standing in.
# docs/security-gates/PLAN.md. Runs ALL gates (does not stop at the first red one),
# prints a one-screen summary, and exits 1 if any gate failed.
#
#   huge-delete        blocks   mass line/file/directory deletion (label override)
#   prompt-injection   blocks   text aimed at an AI agent in added files
#   trivy              blocks   secrets in changed files (vuln/misconfig: report)
#   clamav             blocks   malware detections in changed files
#   code-review        never blocks   API review notes (needs spend gate + key)
#
# SECURITY_GATES_SKIP="clamav,trivy"  skips named gates, and says so in the summary.
# GATES_DIR  where the gate scripts are (default: this script's directory).
# A missing gate script is a FAILURE, never a silent pass.
set -uo pipefail

dir="${GATES_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)}"
skip=",${SECURITY_GATES_SKIP:-},"

names=(huge-delete prompt-injection trivy clamav code-review)
cmds=(
  "node $dir/huge-delete-guard.js"
  "node $dir/prompt-injection-scan.js --llm"
  "bash $dir/trivy-scan.sh"
  "bash $dir/clamav-scan.sh"
  "node $dir/api-code-review.js"
)
files=(huge-delete-guard.js prompt-injection-scan.js trivy-scan.sh clamav-scan.sh api-code-review.js)

failed=0
summary=()
for i in "${!names[@]}"; do
  n="${names[$i]}"
  if [[ "$skip" == *",$n,"* ]]; then
    summary+=("SKIPPED  $n (SECURITY_GATES_SKIP)")
    continue
  fi
  echo
  echo "=============== gate: $n ==============="
  if [ ! -f "$dir/${files[$i]}" ]; then
    echo "missing gate script $dir/${files[$i]} (pinned SHA too old?)" >&2
    summary+=("FAILED   $n (script missing)")
    failed=1
    continue
  fi
  # shellcheck disable=SC2086
  ${cmds[$i]}
  rc=$?
  if [ "$rc" -eq 0 ]; then
    summary+=("passed   $n")
  else
    summary+=("FAILED   $n (exit $rc)")
    failed=1
  fi
done

echo
echo "=============== security gates summary ==============="
printf '%s\n' "${summary[@]}"
exit "$failed"
