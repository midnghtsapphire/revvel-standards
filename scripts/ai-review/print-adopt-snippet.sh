#!/usr/bin/env bash
# TriageChief 2026-11-19. Prints the CircleCI config another repo needs to adopt the AI reviewers.
# It is this repo's .circleci/ai-review.yml with one change: the analysis step fetches the scripts from
# revvel-standards at a PINNED commit (bootstrap.sh) instead of expecting them in the other repo.
# Usage: print-adopt-snippet.sh [commit-sha]   (defaults to this checkout's HEAD)
set -uo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SHA="${1:-$(git -C "$HERE" rev-parse HEAD 2>/dev/null || echo REPLACE_WITH_40_CHAR_COMMIT_SHA)}"
python3 - "$HERE/../../.circleci/ai-review.yml" "$SHA" <<'PY'
import sys

path, sha = sys.argv[1], sys.argv[2]
text = open(path, encoding="utf-8").read()
old = "          command: bash scripts/ai-review/run-<< parameters.reviewer >>.sh || true\n"
new = (
    "          environment:\n"
    '            REVVEL_STANDARDS_SHA: "%s"\n'
    "          command: |\n"
    '            curl -fsSL "https://raw.githubusercontent.com/midnghtsapphire/revvel-standards/'
    '$REVVEL_STANDARDS_SHA/scripts/ai-review/bootstrap.sh" | bash -s << parameters.reviewer >> || true\n' % sha
)
if old not in text:
    sys.exit("print-adopt-snippet: could not find the analysis command in ai-review.yml")
print("# Save as .circleci/ai-review.yml in the other repo. Then follow docs/REVIEWERS.md (contexts, pipeline, triggers).")
sys.stdout.write(text.replace(old, new))
PY
