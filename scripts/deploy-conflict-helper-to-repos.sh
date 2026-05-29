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
BRANCH_NAME="${BRANCH_NAME:-claude/import-conflict-helper}"

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

missing=()
for f in "${ARTIFACTS[@]}"; do
  src="$SOURCE_REPO_ROOT/$f"
  if [[ ! -f "$src" ]]; then
    # CONFLICT_RESOLUTION_STANDARD.md is optional (may not be merged yet).
    if [[ "$f" == "docs/CONFLICT_RESOLUTION_STANDARD.md" ]]; then
      echo "note: $f missing — will skip in copied set"
      continue
    fi
    missing+=("$f")
  fi
done

if (( ${#missing[@]} > 0 )); then
  echo "error: source artifacts missing in $SOURCE_REPO_ROOT:" >&2
  printf '  - %s\n' "${missing[@]}" >&2
  exit 2
fi

# ── Per-repo loop ───────────────────────────────────────────────────────────

opened_prs=()
skipped=()

for target in "${TARGETS[@]}"; do
  echo
  echo "==> $target"

  tmp="$(mktemp -d)"
  trap 'rm -rf "$tmp"' EXIT

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

  # Apply.
  for f in "${ARTIFACTS[@]}"; do
    src="$SOURCE_REPO_ROOT/$f"
    [[ -f "$src" ]] || continue
    mkdir -p "$(dirname "$f")"
    cp "$src" "$f"
    git add "$f"
    echo "  + $f"
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

  pr_url=$(gh pr create \
    --repo "$target" \
    --base "$(gh repo view "$target" --json defaultBranchRef --jq '.defaultBranchRef.name')" \
    --head "$BRANCH_NAME" \
    --title "Import conflict-helper + auto-resolve from revvel-standards" \
    --body "Imports the merge-conflict auto-resolver workflow + script from \`midnghtsapphire/revvel-standards\` so this repo benefits from the same auto-resolve + Jules-fallback flow.

Files:
- \`.github/workflows/conflict-helper.yml\`
- \`scripts/auto-resolve-mechanical-conflicts.js\`

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
