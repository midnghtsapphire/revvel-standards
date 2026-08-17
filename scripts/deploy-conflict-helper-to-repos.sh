#!/usr/bin/env bash
# Deploy the conflict-helper workflow + auto-resolver script to other repos
# under the same owner. Drops them in via a fresh branch + PR so the target
# repo's reviewers see exactly what's landing.
#
# Origin: the owner reported `datascope-standalone#4` (a non-revvel-standards
# repo) stuck on the same kind of conflicts the revvel-standards
# conflict-helper resolves automatically. Rather than copy/paste each time,
# this script propagates the standard across `midnghtsapphire/*` repos.
#
# Usage:
#   REPOS="midnghtsapphire/datascope-standalone midnghtsapphire/mind-mappr" \
#     scripts/deploy-conflict-helper-to-repos.sh
#
#   # or pass a file with one `owner/repo` per line
#   REPOS_FILE=/tmp/targets.txt scripts/deploy-conflict-helper-to-repos.sh
#
#   # dry-run (clone + commit but don't push or open PR)
#   DRY_RUN=true scripts/deploy-conflict-helper-to-repos.sh
#
# Files copied:
#   .github/workflows/conflict-helper.yml
#   scripts/auto-resolve-mechanical-conflicts.js
#   docs/CONFLICT_RESOLUTION_STANDARD.md           (if present)
#
# Requires: gh CLI authenticated, git, mktemp.
# Skips any repo where the file already exists at HEAD (idempotent).

set -euo pipefail

SOURCE_REPO_ROOT="${SOURCE_REPO_ROOT:-$(git rev-parse --show-toplevel)}"
DRY_RUN="${DRY_RUN:-false}"
# Suffix the branch name with a UTC timestamp so re-running this script
# never collides with a leftover branch from a previous attempt (e.g. a
# push that succeeded but the target repo never merged the resulting PR).
# Override with `BRANCH_NAME` to pin if you really want to.
BRANCH_NAME="${BRANCH_NAME:-claude/import-conflict-helper-$(date -u +%Y%m%dT%H%M%S)}"

ARTIFACTS=(
  ".github/workflows/conflict-helper.yml"
  "scripts/auto-resolve-mechanical-conflicts.js"
  "docs/CONFLICT_RESOLUTION_STANDARD.md"
)

# ── Resolve target list ─────────────────────────────────────────────────────

if [[ -n "${REPOS:-}" ]]; then
  read -r -a TARGETS <<< "$REPOS"
elif [[ -n "${REPOS_FILE:-}" ]]; then
  mapfile -t TARGETS < <(grep -v '^[[:space:]]*$' "$REPOS_FILE" | grep -v '^#')
else
  echo "error: set REPOS='owner/repo owner/repo' or REPOS_FILE=/path/to/list" >&2
  exit 1
fi

# ── Verify source artifacts exist ───────────────────────────────────────────
#
# Required: conflict-helper.yml (Phase 1 annotation — merged in #14072 to main).
# Optional: auto-resolve-mechanical-conflicts.js (Phase 2 + 3 — merged in
# #14092). Deploying without the resolver is still useful: target repos get
# the annotation comment; once #14092 lands and you re-run, the resolver
# layer goes with it.
# Optional: docs/CONFLICT_RESOLUTION_STANDARD.md (also in #14092).
#
# Anything else missing is a hard error.

OPTIONAL_FILES=(
  "scripts/auto-resolve-mechanical-conflicts.js"
  "docs/CONFLICT_RESOLUTION_STANDARD.md"
)

is_optional() {
  local f="$1" o
  for o in "${OPTIONAL_FILES[@]}"; do
    [[ "$f" == "$o" ]] && return 0
  done
  return 1
}

missing_required=()
missing_optional=()
for f in "${ARTIFACTS[@]}"; do
  src="$SOURCE_REPO_ROOT/$f"
  if [[ ! -f "$src" ]]; then
    if is_optional "$f"; then
      echo "note: $f missing — will skip in copied set (Phase 1 deploy only)"
      missing_optional+=("$f")
    else
      missing_required+=("$f")
    fi
  fi
done

if (( ${#missing_required[@]} > 0 )); then
  echo "error: required source artifacts missing in $SOURCE_REPO_ROOT:" >&2
  printf '  - %s\n' "${missing_required[@]}" >&2
  exit 2
fi

if (( ${#missing_optional[@]} > 0 )); then
  echo
  echo "warning: optional artifacts missing — Phase 2 (auto-resolve) + Phase 3"
  echo "(Jules dispatch) will not be deployed. Target repos will receive only"
  echo "the annotation phase. Re-run after #14092 lands to ship the resolver."
fi

# ── Per-repo loop ───────────────────────────────────────────────────────────

# Track every temp dir we create so we can clean them all up on exit
# (one trap, not one-per-iteration — earlier versions overwrote the trap
# inside the loop, leaking all but the last dir). Per-iteration cleanup
# happens explicitly at the end of each loop body for the success path.
TEMP_DIRS=()
cleanup_temp_dirs() {
  for d in "${TEMP_DIRS[@]:-}"; do
    [[ -n "$d" && -d "$d" ]] && rm -rf "$d"
  done
}
trap cleanup_temp_dirs EXIT

opened_prs=()
skipped=()

for target in "${TARGETS[@]}"; do
  echo
  echo "==> $target"

  tmp="$(mktemp -d)"
  TEMP_DIRS+=("$tmp")

  if ! gh repo clone "$target" "$tmp/repo" -- --depth=1 --no-tags >/dev/null 2>&1; then
    echo "  skip: clone failed (auth / permissions?)"
    skipped+=("$target (clone failed)")
    continue
  fi

  cd "$tmp/repo"

  # Idempotency check: skip if conflict-helper already exists on default branch.
  if [[ -f ".github/workflows/conflict-helper.yml" ]]; then
    echo "  skip: conflict-helper.yml already exists"
    skipped+=("$target (already deployed)")
    cd - >/dev/null
    continue
  fi

  # Apply. Track exactly which files were actually copied so the PR body
  # reflects reality (per Copilot review on #14099 — earlier versions
  # hard-coded a 2-file list while the script could copy 3).
  copied_files=()
  for f in "${ARTIFACTS[@]}"; do
    src="$SOURCE_REPO_ROOT/$f"
    [[ -f "$src" ]] || continue
    mkdir -p "$(dirname "$f")"
    cp "$src" "$f"
    git add "$f"
    echo "  + $f"
    copied_files+=("$f")
  done

  git config user.email "deploy-conflict-helper@github-actions"
  git config user.name "Conflict Helper Deployer"

  git checkout -b "$BRANCH_NAME" >/dev/null 2>&1

  commit_msg="Import revvel-standards conflict-helper (auto-resolve + Jules fallback)

Brings in the deterministic merge-conflict resolver from
midnghtsapphire/revvel-standards. Two patterns auto-fire on every PR
with conflicts:

  - VERSION_BUMP — same uses: owner/repo@ref both sides, newer ref wins
  - ADDITIVE — both sides added structurally additive rows, keep both

Anything ambiguous gets handed to Jules via the existing lane (NOT
Copilot, NOT Bito). See docs/CONFLICT_RESOLUTION_STANDARD.md (if
present) or the source repo for the standard.

Imported by scripts/deploy-conflict-helper-to-repos.sh.
"
  git commit -m "$commit_msg" >/dev/null

  if [[ "$DRY_RUN" == "true" ]]; then
    echo "  [dry-run] would push branch + open PR"
    cd - >/dev/null
    continue
  fi

  if ! git push -u origin "$BRANCH_NAME" >/dev/null 2>&1; then
    echo "  skip: push failed (branch protection? token scope?)"
    skipped+=("$target (push failed)")
    cd - >/dev/null
    continue
  fi

  # Build the file list for the PR body from what was actually copied,
  # not a hard-coded set. Keeps the description honest when the resolver
  # script is absent (Phase-1-only deploy) or when the standard doc is
  # missing.
  files_md=""
  for f in "${copied_files[@]:-}"; do
    files_md+="- \`$f\`"$'\n'
  done

  pr_url=$(gh pr create \
    --repo "$target" \
    --base "$(gh repo view "$target" --json defaultBranchRef --jq '.defaultBranchRef.name')" \
    --head "$BRANCH_NAME" \
    --title "Import conflict-helper + auto-resolve from revvel-standards" \
    --body "Imports the merge-conflict auto-resolver workflow + script from \`midnghtsapphire/revvel-standards\` so this repo benefits from the same auto-resolve + Jules-fallback flow.

Files copied:
${files_md}
Merge to enable.
" 2>/dev/null || true)

  if [[ -n "$pr_url" ]]; then
    echo "  → $pr_url"
    opened_prs+=("$pr_url")
  else
    echo "  skip: PR creation failed"
    skipped+=("$target (pr create failed)")
  fi

  cd - >/dev/null
done

# ── Summary ─────────────────────────────────────────────────────────────────

echo
echo "================================================================"
echo "Deployment summary"
echo "================================================================"
echo "Opened PRs: ${#opened_prs[@]}"
printf '  %s\n' "${opened_prs[@]:-(none)}"
echo
echo "Skipped: ${#skipped[@]}"
printf '  - %s\n' "${skipped[@]:-(none)}"
