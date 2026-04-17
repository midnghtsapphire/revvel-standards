#!/usr/bin/env bash
# provision-repo-secrets.sh — (Re-)provision GitHub Actions secrets across repos.
#
# This script ONLY CALLS `gh secret set`. It never deletes or removes any
# secret. See docs/SECRETS_MANAGEMENT.md for the full context on why this
# helper exists.
#
# Usage:
#   # Provision a single secret (OPENROUTER_API_KEY is the default):
#   OPENROUTER_API_KEY=sk-or-... scripts/provision-repo-secrets.sh owner/repo [owner/repo ...]
#
#   # Provision multiple secrets in one pass:
#   OPENROUTER_API_KEY=... OPENAI_API_KEY=... \
#     scripts/provision-repo-secrets.sh --secrets OPENROUTER_API_KEY,OPENAI_API_KEY owner/repo ...
#
#   # Dry-run — print what would happen without calling gh:
#   DRY_RUN=1 scripts/provision-repo-secrets.sh owner/repo
#
# Environment variables:
#   <SECRET_NAME>    Value for each secret listed in --secrets (required).
#   DRY_RUN          If set to "1"/"true", print actions without executing.
#
# Requirements: `gh` CLI authenticated as a user with admin rights on the
# target repos (`gh auth status` should show `repo` and `admin:repo_hook`).

set -euo pipefail

DEFAULT_SECRETS="OPENROUTER_API_KEY"

usage() {
  sed -n '2,25p' "$0" | sed 's/^# \{0,1\}//'
  exit "${1:-0}"
}

# ─── Parse args ──────────────────────────────────────────────────────────────
SECRETS_CSV="$DEFAULT_SECRETS"
REPOS=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help)
      usage 0
      ;;
    --secrets)
      [[ $# -ge 2 ]] || { echo "error: --secrets requires a value" >&2; exit 2; }
      SECRETS_CSV="$2"
      shift 2
      ;;
    --secrets=*)
      SECRETS_CSV="${1#--secrets=}"
      shift
      ;;
    --)
      shift
      while [[ $# -gt 0 ]]; do REPOS+=("$1"); shift; done
      ;;
    -*)
      echo "error: unknown flag: $1" >&2
      usage 2
      ;;
    *)
      REPOS+=("$1")
      shift
      ;;
  esac
done

if [[ ${#REPOS[@]} -eq 0 ]]; then
  echo "error: no repos specified" >&2
  usage 2
fi

# ─── Validate tooling ────────────────────────────────────────────────────────
if ! command -v gh >/dev/null 2>&1; then
  echo "error: gh (GitHub CLI) is required. Install: https://cli.github.com/" >&2
  exit 3
fi

DRY_RUN="${DRY_RUN:-0}"
case "$DRY_RUN" in
  1|true|TRUE|yes|YES) DRY_RUN=1 ;;
  *) DRY_RUN=0 ;;
esac

# Split the CSV list of secret names.
IFS=',' read -r -a SECRET_NAMES <<<"$SECRETS_CSV"

# Validate that every named secret has a value in the environment BEFORE we
# start mutating any repo — fail fast on misconfiguration.
MISSING=()
for name in "${SECRET_NAMES[@]}"; do
  # Trim whitespace.
  name="${name// /}"
  [[ -z "$name" ]] && continue
  if [[ -z "${!name:-}" ]]; then
    MISSING+=("$name")
  fi
done
if [[ ${#MISSING[@]} -gt 0 ]]; then
  echo "error: the following secret values are not set in the environment:" >&2
  for n in "${MISSING[@]}"; do echo "  - $n" >&2; done
  echo "Export each one (e.g. from Vault) before re-running." >&2
  exit 4
fi

# ─── Main loop ───────────────────────────────────────────────────────────────
failures=0
for repo in "${REPOS[@]}"; do
  if [[ "$repo" != */* ]]; then
    echo "⚠️  skipping '$repo' — expected owner/repo format" >&2
    failures=$((failures + 1))
    continue
  fi

  echo "── $repo ──"
  for name in "${SECRET_NAMES[@]}"; do
    name="${name// /}"
    [[ -z "$name" ]] && continue

    if [[ "$DRY_RUN" -eq 1 ]]; then
      echo "  [dry-run] gh secret set $name --repo $repo  (value read from \$$name, redacted)"
      continue
    fi

    # `gh secret set` reads the value from stdin by default when --body is
    # omitted, which avoids ever placing the plaintext on a command line
    # visible to `ps` or shell history. It always creates-or-updates —
    # never deletes.
    if printf '%s' "${!name}" | gh secret set "$name" --repo "$repo"; then
      echo "  ✅ $name set on $repo"
    else
      echo "  ❌ failed to set $name on $repo" >&2
      failures=$((failures + 1))
    fi
  done
done

if [[ "$failures" -gt 0 ]]; then
  echo "Completed with $failures failure(s)." >&2
  exit 1
fi

echo "Done. No secrets were deleted (this script never calls 'gh secret delete')."
