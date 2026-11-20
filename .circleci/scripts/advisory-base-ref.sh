#!/usr/bin/env bash
# Print the commit SHA that advisory scanners (Semgrep CE, Qlty) compare
# against, so a PR only reports findings it introduced. Diagnostics go to
# stderr; stdout is exactly one SHA, or nothing when no base can be found.
#
# PRs here target the newest daily/YYYY-MM-DD branch, not main, so candidates
# are origin/main and the newest origin/daily/*. The candidate whose
# merge-base is closest to HEAD (fewest commits ahead) is the PR base.
# WR #18490.
set -uo pipefail

newest_daily="$(git ls-remote --heads origin 'daily/*' 2>/dev/null \
  | sed 's#.*refs/heads/##' | sort | tail -1)"

refs=(main)
[ -n "$newest_daily" ] && refs+=("$newest_daily")

best_sha=""
best_ahead=""
best_ref=""
for ref in "${refs[@]}"; do
  # Same depth the markdown gate uses; harmless when the clone is already deep.
  git fetch --quiet --no-tags --depth=200 origin "+refs/heads/$ref:refs/remotes/origin/$ref" 2>/dev/null || continue
  mb="$(git merge-base HEAD "origin/$ref" 2>/dev/null || true)"
  [ -z "$mb" ] && continue
  ahead="$(git rev-list --count "$mb..HEAD" 2>/dev/null || echo "")"
  [ -z "$ahead" ] && continue
  if [ -z "$best_ahead" ] || [ "$ahead" -lt "$best_ahead" ]; then
    best_sha="$mb"
    best_ahead="$ahead"
    best_ref="$ref"
  fi
done

if [ -z "$best_sha" ]; then
  echo "advisory-base-ref: no merge-base found with main or the newest daily branch." >&2
  exit 0
fi
echo "advisory-base-ref: base is origin/$best_ref at ${best_sha:0:12} ($best_ahead commit(s) ahead)." >&2
echo "$best_sha"
