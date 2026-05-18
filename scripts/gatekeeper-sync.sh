#!/usr/bin/env bash
# gatekeeper-sync.sh — Auto-provision GitHub Actions secrets from backup sources.
#
# This is the "POST half" of the Credential Gatekeeper: given a list of
# required secret names (the BOM produced by credential-gatekeeper.yml),
# resolve each value from the credential backup harness and PUT it into the
# target repo's Actions secrets via `gh secret set`. Doppler is one optional
# source, not a hard dependency.
#
# Inputs:
#   --secrets   Comma-separated list of secret names to sync (required).
#   --repo      owner/repo target for `gh secret set` (default: $GITHUB_REPOSITORY).
#   --project   Doppler project if Doppler is available (default: revvel-standards).
#   --config    Doppler config if Doppler is available (default: prd).
#   --json      Emit a JSON summary on stdout (machine-readable).
#
# Environment:
#   DOPPLER_TOKEN  Optional service token with read access to the project/config.
#   GITHUB_TOKEN   Token used by `gh` (already set on Actions runners).
#   DRY_RUN=1      Print actions; do not call `gh secret set`.
#
# Backup sources:
#   SECRET_NAME environment variables, CREDENTIAL_BACKUP_JSON(_FILE),
#   CREDENTIAL_BACKUP_SOPS_FILE, pass, Bitwarden CLI, 1Password CLI,
#   GitHub Actions secrets already present in the target repo, and Doppler.
#
# Exits non-zero only on a hard failure (malformed args or harness failure).
# Per-secret misses are reported in JSON but do not abort the run so a partial
# sync is still useful.

set -euo pipefail

usage() {
  sed -n '2,25p' "$0" | sed 's/^# \{0,1\}//'
  exit "${1:-0}"
}

SECRETS_CSV=""
REPO="${GITHUB_REPOSITORY:-}"
PROJECT="revvel-standards"
CONFIG="prd"
JSON_OUT=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help) usage 0 ;;
    --secrets)
      [[ $# -ge 2 ]] || { echo "error: --secrets requires a value" >&2; exit 2; }
      SECRETS_CSV="$2"
      shift 2
      ;;
    --secrets=*) SECRETS_CSV="${1#--secrets=}"; shift ;;
    --repo)
      [[ $# -ge 2 ]] || { echo "error: --repo requires a value" >&2; exit 2; }
      REPO="$2"
      shift 2
      ;;
    --repo=*) REPO="${1#--repo=}"; shift ;;
    --project)
      [[ $# -ge 2 ]] || { echo "error: --project requires a value" >&2; exit 2; }
      PROJECT="$2"
      shift 2
      ;;
    --project=*) PROJECT="${1#--project=}"; shift ;;
    --config)
      [[ $# -ge 2 ]] || { echo "error: --config requires a value" >&2; exit 2; }
      CONFIG="$2"
      shift 2
      ;;
    --config=*) CONFIG="${1#--config=}"; shift ;;
    --json) JSON_OUT=1; shift ;;
    *) echo "error: unknown arg: $1" >&2; usage 2 ;;
  esac
done

[[ -z "$SECRETS_CSV" ]] && { echo "error: --secrets is required" >&2; exit 2; }
[[ -z "$REPO" ]] && { echo "error: --repo (or \$GITHUB_REPOSITORY) is required" >&2; exit 2; }
[[ "$REPO" == */* ]] || { echo "error: --repo must be owner/repo" >&2; exit 2; }

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
HARNESS_ARGS=(
  "$SCRIPT_DIR/credential-backup-harness.js"
  --secrets "$SECRETS_CSV"
  --repo "$REPO"
  --project "$PROJECT"
  --config "$CONFIG"
)
if [[ "$JSON_OUT" -eq 1 ]]; then
  HARNESS_ARGS+=(--json)
fi

node "${HARNESS_ARGS[@]}"
