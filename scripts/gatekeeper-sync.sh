#!/usr/bin/env bash
# gatekeeper-sync.sh — Auto-provision GitHub Actions secrets from Doppler.
#
# This is the "POST half" of the Credential Gatekeeper: given a list of
# required secret names (the BOM produced by credential-gatekeeper.yml),
# fetch each value from the Doppler API and PUT it into the target repo's
# Actions secrets via `gh secret set`. The intent is to remove the manual
# step of provisioning credentials whenever a new automation lands.
#
# Inputs:
#   --secrets   Comma-separated list of secret names to sync (required).
#   --repo      owner/repo target for `gh secret set` (default: $GITHUB_REPOSITORY).
#   --project   Doppler project (default: revvel-standards).
#   --config    Doppler config (default: prd).
#   --json      Emit a JSON summary on stdout (machine-readable).
#
# Environment:
#   DOPPLER_TOKEN  Service token with read access to the project/config.
#   GITHUB_TOKEN   Token used by `gh` (already set on Actions runners).
#   DRY_RUN=1      Print actions; do not call `gh secret set`.
#
# Exits non-zero only on a hard failure (missing tooling, no DOPPLER_TOKEN,
# malformed args). Per-secret failures are reported but do not abort the run
# so a partial sync is still useful.

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

DRY_RUN="${DRY_RUN:-0}"
case "$DRY_RUN" in 1|true|TRUE|yes|YES) DRY_RUN=1 ;; *) DRY_RUN=0 ;; esac

# Accept DOPPLER_LOCAL_TOKEN, DOPPLER_API_KEY, DOPPLER_AGENT_ODIC, or
# DOPPLER_CIRCLECI_OIDC as fallbacks when DOPPLER_TOKEN is not set.  Workflows
# may store the Doppler CLI token under any of these names; normalise to
# DOPPLER_TOKEN here so the rest of the script only needs to check one variable.
DOPPLER_TOKEN="${DOPPLER_TOKEN:-${DOPPLER_LOCAL_TOKEN:-${DOPPLER_API_KEY:-${DOPPLER_AGENT_ODIC:-${DOPPLER_CIRCLECI_OIDC:-}}}}}"

if [[ "$JSON_OUT" -eq 1 || "$DRY_RUN" -ne 1 ]]; then
  command -v jq >/dev/null || { echo "error: jq not found" >&2; exit 3; }
fi

if [[ "$DRY_RUN" -ne 1 ]]; then
  command -v jq   >/dev/null || { echo "error: jq not found" >&2; exit 3; }
  command -v gh   >/dev/null || { echo "error: gh CLI not found" >&2; exit 3; }
  command -v curl >/dev/null || { echo "error: curl not found" >&2; exit 3; }
  [[ -n "${DOPPLER_TOKEN:-}" ]] || { echo "error: DOPPLER_TOKEN not set" >&2; exit 4; }
fi

# Normalize the comma-separated list, deduplicate, drop empties.
IFS=',' read -r -a RAW <<<"$SECRETS_CSV"
declare -A SEEN=()
SECRETS=()
for n in "${RAW[@]}"; do
  n="${n//[[:space:]]/}"
  [[ -z "$n" ]] && continue
  if [[ -z "${SEEN[$n]:-}" ]]; then
    SEEN[$n]=1
    SECRETS+=("$n")
  fi
done
[[ ${#SECRETS[@]} -gt 0 ]] || { echo "error: no valid secret names parsed from --secrets" >&2; exit 2; }

DOPPLER_API="https://api.doppler.com/v3/configs/config/secret"

synced=()
missing_in_doppler=()
failed=()

fetch_doppler_value() {
  # POST/GET to Doppler — returns the secret's raw value on stdout, or
  # empty string if not found / not readable. Never echoes the value to
  # the workflow log; the caller pipes it straight into `gh secret set`.
  local name="$1"
  local resp http_code body
  resp="$(curl -sS -w '\n%{http_code}' \
    --get "$DOPPLER_API" \
    --data-urlencode "project=$PROJECT" \
    --data-urlencode "config=$CONFIG" \
    --data-urlencode "name=$name" \
    -H "Authorization: Bearer $DOPPLER_TOKEN" \
    -H "Accept: application/json" || true)"
  http_code="${resp##*$'\n'}"
  body="${resp%$'\n'*}"
  if [[ "$http_code" != "200" ]]; then
    return 1
  fi
  jq -r '.value.raw // empty' <<<"$body"
}

for name in "${SECRETS[@]}"; do
  if [[ "$DRY_RUN" -eq 1 ]]; then
    echo "  [dry-run] would fetch $name from Doppler($PROJECT/$CONFIG) and set on $REPO"
    synced+=("$name")
    continue
  fi

  value="$(fetch_doppler_value "$name" || true)"
  if [[ -z "$value" ]]; then
    echo "  ⚠️  $name — not present in Doppler $PROJECT/$CONFIG" >&2
    missing_in_doppler+=("$name")
    continue
  fi

  if printf '%s' "$value" | gh secret set "$name" --repo "$REPO" >/dev/null 2>&1; then
    echo "  ✅ $name — synced to $REPO" >&2
    synced+=("$name")
  else
    echo "  ❌ $name — gh secret set failed" >&2
    failed+=("$name")
  fi
  unset value
done

if [[ "$JSON_OUT" -eq 1 ]]; then
  jq -nc \
    --argjson synced "$(printf '%s\n' "${synced[@]:-}"             | jq -R . | jq -s 'map(select(length>0))')" \
    --argjson missing "$(printf '%s\n' "${missing_in_doppler[@]:-}" | jq -R . | jq -s 'map(select(length>0))')" \
    --argjson failed "$(printf '%s\n' "${failed[@]:-}"             | jq -R . | jq -s 'map(select(length>0))')" \
    --arg repo "$REPO" --arg project "$PROJECT" --arg config "$CONFIG" \
    '{repo:$repo, project:$project, config:$config, synced:$synced, missing_in_doppler:$missing, failed:$failed}'
fi

# Exit zero even with per-secret misses — the caller (workflow) decides how
# strict to be and uses the JSON summary to surface the state on the issue.
exit 0
