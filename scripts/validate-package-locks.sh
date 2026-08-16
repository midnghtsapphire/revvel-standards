#!/usr/bin/env bash
# Bash 3.2+ compatible (macOS ships 3.2). Avoid mapfile / associative arrays.
set -euo pipefail

BASE_SHA="${BASE_SHA:-}"
HEAD_SHA="${HEAD_SHA:-}"

if [ -z "$BASE_SHA" ] || [ "$BASE_SHA" = "0000000000000000000000000000000000000000" ]; then
  echo "No usable base SHA for diff; skipping lockfile gate."
  exit 0
fi

if [ -z "$HEAD_SHA" ] || [ "$HEAD_SHA" = "0000000000000000000000000000000000000000" ]; then
  echo "No usable head SHA for diff; skipping lockfile gate."
  exit 0
fi

# REVVEL-DISABLED | AGENT: claude-code | MODEL: claude-5 | WR: #17097 | DATE: 2026-08-08 | STATUS: REPLACED
# REASON: `|| true` made a failed diff (shallow clone, unknown SHA) look like "no
# changes", silently passing the gate. Exit codes must reflect the postcondition,
# not process completion (CLAUDE.md gotcha 6) — fail loud when we cannot verify.
# CHANGED="$(git diff --name-only "$BASE_SHA" "$HEAD_SHA" || true)"
# REVVEL-DISABLED-END
# core.quotepath=off keeps non-ASCII/space paths unquoted so the per-file
# existence checks below see literal paths.
if ! CHANGED="$(git -c core.quotepath=off diff --name-only "$BASE_SHA" "$HEAD_SHA")"; then
  echo "❌ git diff $BASE_SHA..$HEAD_SHA failed (shallow clone or unknown SHA)."
  echo "The lockfile gate cannot verify this change; failing loud instead of passing silently."
  echo "Ensure the checkout uses fetch-depth: 0 so both SHAs are present."
  exit 1
fi
echo "Changed files between $BASE_SHA and $HEAD_SHA:"
echo "$CHANGED"

# Validate every directory whose manifest OR lockfile changed. Deriving work
# only from changed package.json files let a PR that corrupts or deletes a
# nested package-lock.json (without touching its manifest) slip through
# (PR #17097 review finding).
# Use sort -u instead of Bash 4 associative arrays so macOS Bash 3.2 works.
# `|| true` keeps set -o pipefail from aborting when grep finds no matches.
CHANGED_PKG_PATHS="$(
  printf '%s\n' "$CHANGED" \
    | grep -E '(^|/)(package\.json|package-lock\.json)$' || true
)"

if [ -z "$CHANGED_PKG_PATHS" ]; then
  echo "✅ package-lock sync check passed (no manifest/lockfile changes)"
  exit 0
fi

PKG_DIRS="$(
  printf '%s\n' "$CHANGED_PKG_PATHS" \
    | while IFS= read -r p; do
        [ -n "$p" ] || continue
        dirname "$p"
      done \
    | sort -u
)"

if [ -z "$PKG_DIRS" ]; then
  echo "✅ package-lock sync check passed (no manifest/lockfile changes)"
  exit 0
fi

# Do not pipe into while (subshell would swallow exit codes). Use a here-doc
# so `exit 1` from inside the loop aborts the script as intended.
while IFS= read -r pkg_dir; do
  [ -n "$pkg_dir" ] || continue
  pkg="$pkg_dir/package.json"
  lockfile="$pkg_dir/package-lock.json"

  if [ ! -f "$pkg" ]; then
    if [ -f "$lockfile" ]; then
      echo "❌ $lockfile changed but $pkg does not exist — orphaned lockfile."
      echo "Remove the lockfile or restore the manifest."
      exit 1
    fi
    echo "Skipping removed package: $pkg_dir"
    continue
  fi

  if [ ! -f "$lockfile" ]; then
    # Manifests governed by a pnpm/yarn workspace have no same-directory
    # package-lock.json by design (e.g. docs/Governance-ape-ci-errors is a
    # pnpm workspace whose root preinstall rejects npm). This gate validates
    # npm-managed manifests only — skip when another manager's lockfile
    # governs this directory or any ancestor (PR #17097 review finding).
    d="$pkg_dir"
    skip_workspace=0
    while :; do
      if [ -f "$d/pnpm-lock.yaml" ] || [ -f "$d/yarn.lock" ]; then
        mgr="pnpm"
        if [ -f "$d/yarn.lock" ] && [ ! -f "$d/pnpm-lock.yaml" ]; then
          mgr="yarn"
        fi
        echo "Skipping $pkg — governed by a $mgr workspace at $d (npm-only gate)."
        skip_workspace=1
        break
      fi
      case "$d" in .|/) break ;; esac
      d="$(dirname "$d")"
    done
    if [ "$skip_workspace" -eq 1 ]; then
      continue
    fi
    echo "❌ $pkg changed but $lockfile is missing."
    echo "Generate and commit $lockfile before merging."
    exit 1
  fi

  ci_output=""
  if ! ci_output="$(cd "$pkg_dir" && npm ci --dry-run --ignore-scripts --audit=false --fund=false 2>&1)"; then
    echo "❌ $pkg and $lockfile are not synchronized."
    echo "Run npm install --package-lock-only in $pkg_dir and commit the result."
    echo "npm ci output:"
    echo "$ci_output"
    exit 1
  fi
done <<EOF_DIRS
$PKG_DIRS
EOF_DIRS

echo "✅ package-lock sync check passed"
exit 0
