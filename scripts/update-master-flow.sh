#!/usr/bin/env bash
# =============================================================================
# update-master-flow.sh
#
# Auto-updater for docs/Master Revvel-Standards Flow Charts/README.md
#
# What it does:
#   1. Detects the current repo name from git remote
#   2. Detects the docs path (handles renames / moves gracefully)
#   3. Updates LAST_UPDATED, REPO_NAME, and DOCS_PATH metadata in:
#        docs/Master Revvel-Standards Flow Charts/README.md
#        docs/Master Revvel-Standards Flow Charts/TOOLS_INVENTORY.md
#   4. Re-scans the repo for new workflow files and scripts and appends
#      any NEW ones to TOOLS_INVENTORY.md (idempotent — no duplicates)
#   5. Exits cleanly if nothing changed (no empty commits)
#
# Usage:
#   bash scripts/update-master-flow.sh
#
# Environment variables (optional overrides):
#   REPO_ROOT   — path to repository root (default: git rev-parse --show-toplevel)
#   DRY_RUN     — set to "1" to preview changes without writing files
#
# Called by:
#   .github/workflows/update-master-flow.yml  (on push to main + weekly cron)
# =============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

REPO_ROOT="${REPO_ROOT:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
FLOW_DIR="docs/Master Revvel-Standards Flow Charts"
README_PATH="${REPO_ROOT}/${FLOW_DIR}/README.md"
INVENTORY_MD_PATH="${REPO_ROOT}/${FLOW_DIR}/TOOLS_INVENTORY.md"
DRY_RUN="${DRY_RUN:-0}"

NOW="$(date -u '+%Y-%m-%d %H:%M UTC')"

# Detect sed flavor: GNU (Linux) vs BSD (macOS)
# GNU sed: sed -i 's/.../.../g' FILE
# BSD sed: sed -i '' 's/.../.../g' FILE
SED_INPLACE=(-i)
if sed --version >/dev/null 2>&1; then
  : # GNU sed — no backup extension needed
else
  SED_INPLACE=(-i '')  # BSD/macOS sed requires empty backup extension
fi

# ---------------------------------------------------------------------------
# 1. Detect repo name from git remote
# ---------------------------------------------------------------------------

REMOTE_URL="$(git -C "${REPO_ROOT}" remote get-url origin 2>/dev/null || echo '')"

if [[ -n "${REMOTE_URL}" ]]; then
  # Works for both HTTPS (https://github.com/owner/repo.git) and SSH (git@github.com:owner/repo.git)
  REPO_NAME="$(echo "${REMOTE_URL}" | sed -E 's|.*[:/]([^/]+/[^/]+)(\.git)?$|\1|')"
else
  # Fallback: use the directory name
  REPO_NAME="$(basename "${REPO_ROOT}")"
fi

echo "📦 Repository: ${REPO_NAME}"
echo "📁 Repo root:  ${REPO_ROOT}"
echo "📅 Timestamp:  ${NOW}"

# ---------------------------------------------------------------------------
# 2. Detect docs path (handles repo renames / doc folder moves)
# ---------------------------------------------------------------------------

# Find the flow chart directory relative to repo root
FOUND_FLOW_DIR="$(find "${REPO_ROOT}" -type d -name "Master Revvel-Standards Flow Charts" 2>/dev/null | head -1 || true)"

if [[ -z "${FOUND_FLOW_DIR}" ]]; then
  echo "⚠️  Flow chart directory not found. Creating it..."
  mkdir -p "${REPO_ROOT}/${FLOW_DIR}"
  FOUND_FLOW_DIR="${REPO_ROOT}/${FLOW_DIR}"
fi

DOCS_PATH="${FOUND_FLOW_DIR#${REPO_ROOT}/}"
echo "📂 Docs path:  ${DOCS_PATH}"

# ---------------------------------------------------------------------------
# 3. Update metadata in README.md
# ---------------------------------------------------------------------------

update_metadata() {
  local file="$1"

  if [[ ! -f "${file}" ]]; then
    echo "⏭️  Skipping (not found): ${file}"
    return
  fi

  echo "✏️  Updating metadata in: $(basename "${file}")"

  # Use sed to replace the placeholder/current values in-place
  # Handles both initial placeholders and previously-set values
  sed "${SED_INPLACE[@]}" \
    -e "s|<!-- LAST_UPDATED -->.*|<!-- LAST_UPDATED --> ${NOW}|g" \
    -e "s|<!-- REPO_NAME -->.*|<!-- REPO_NAME --> ${REPO_NAME}|g" \
    -e "s|<!-- DOCS_PATH -->.*|<!-- DOCS_PATH --> ${DOCS_PATH}|g" \
    "${file}"

  # If placeholders were already replaced in a previous run, the sed above
  # targets the inline comment style. Catch the plain-value style too:
  # (handles "Last updated: 2026-01-01" → "Last updated: 2026-01-01")
  sed "${SED_INPLACE[@]}" \
    -e "s|\*\*Last updated:\*\* .*|\*\*Last updated:\*\* ${NOW}|g" \
    -e "s|\*\*Repository:\*\* .*|\*\*Repository:\*\* ${REPO_NAME}|g" \
    -e "s|\*\*Docs location:\*\* .*|\*\*Docs location:\*\* ${DOCS_PATH}|g" \
    "${file}"
}

if [[ "${DRY_RUN}" == "1" ]]; then
  echo "🔍 DRY RUN — metadata that would be written:"
  echo "   LAST_UPDATED = ${NOW}"
  echo "   REPO_NAME    = ${REPO_NAME}"
  echo "   DOCS_PATH    = ${DOCS_PATH}"
else
  update_metadata "${README_PATH}"
  update_metadata "${INVENTORY_MD_PATH}"
fi

# ---------------------------------------------------------------------------
# 4. Scan for new workflow files and scripts → append to TOOLS_INVENTORY.md
# ---------------------------------------------------------------------------

append_if_missing() {
  local file="$1"
  local line="$2"

  # Only append if the file name isn't already mentioned in the inventory
  local basename_only
  basename_only="$(basename "${file}")"

  if ! grep -qF "${basename_only}" "${INVENTORY_MD_PATH}" 2>/dev/null; then
    if [[ "${DRY_RUN}" == "1" ]]; then
      echo "  + Would add to inventory: ${basename_only}"
    else
      echo "  + Adding to inventory: ${basename_only}"
      echo "${line}" >> "${INVENTORY_MD_PATH}"
    fi
  fi
}

# CSV-safe quoting: wrap a value in double-quotes, escaping any internal quotes
csv_quote() {
  local val="$1"
  # Escape existing double-quotes by doubling them, then wrap in double-quotes
  printf '"%s"' "${val//\"/\"\"}"
}

echo ""
echo "🔍 Scanning for new workflow files..."

# Scan .github/workflows/
while IFS= read -r -d '' wf; do
  BASENAME="$(basename "${wf}")"
  RELPATH="${wf#${REPO_ROOT}/}"
  CSV_LINE="$(csv_quote "Workflow Files"),$(csv_quote "${BASENAME}"),$(csv_quote "GitHub Workflow"),$(csv_quote "${RELPATH}"),$(csv_quote "Auto-detected workflow — see file for details."),$(csv_quote "GITHUB_TOKEN")"
  append_if_missing "${wf}" "${CSV_LINE}"
done < <(find "${REPO_ROOT}/.github/workflows" -name "*.yml" -print0 2>/dev/null || true)

echo "🔍 Scanning for new scripts..."

# Scan scripts/
while IFS= read -r -d '' sc; do
  BASENAME="$(basename "${sc}")"
  RELPATH="${sc#${REPO_ROOT}/}"
  EXT="${BASENAME##*.}"
  LANG="Bash Script"
  [[ "${EXT}" == "js" ]] && LANG="Node.js Script"
  [[ "${EXT}" == "py" ]] && LANG="Python Script"
  CSV_LINE="$(csv_quote "Scripts"),$(csv_quote "${BASENAME}"),$(csv_quote "${LANG}"),$(csv_quote "${RELPATH}"),$(csv_quote "Auto-detected script — see file for details."),$(csv_quote "None")"
  append_if_missing "${sc}" "${CSV_LINE}"
done < <(find "${REPO_ROOT}/scripts" -type f \( -name "*.sh" -o -name "*.js" -o -name "*.py" \) -print0 2>/dev/null || true)

# ---------------------------------------------------------------------------
# 5. Summary
# ---------------------------------------------------------------------------

echo ""
if [[ "${DRY_RUN}" == "1" ]]; then
  echo "✅ Dry run complete. No files were modified."
else
  echo "✅ Master flow chart metadata updated successfully."
  echo "   README.md      → ${README_PATH}"
  echo "   TOOLS_INVENTORY.md → ${INVENTORY_MD_PATH}"
fi
