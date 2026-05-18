#!/usr/bin/env bash
# Credential Gatekeeper Sync
#
# Previously this script wrapped `doppler` directly. It now delegates to the
# Credential Backup Harness so Doppler is optional and multiple secret sources
# (env, GitHub secrets, JSON, SOPS, pass, Bitwarden, 1Password, Infisical,
# Vault, Doppler) can satisfy required keys.
#
# Usage:
#   scripts/gatekeeper-sync.sh [--keys KEY1,KEY2] [--report]
#
# Environment:
#   CREDENTIAL_BACKUP_JSON / _FILE, CREDENTIAL_BACKUP_SOPS_FILE,
#   CREDENTIAL_BACKUP_PASS_PREFIX, CREDENTIAL_BACKUP_BW_PREFIX, BW_SESSION,
#   CREDENTIAL_BACKUP_1PASSWORD_TEMPLATE, OP_SERVICE_ACCOUNT_TOKEN,
#   INFISICAL_TOKEN, VAULT_ADDR, etc.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
HARNESS="${REPO_ROOT}/scripts/credential-backup-harness.js"

if ! command -v node >/dev/null 2>&1; then
  echo "[gatekeeper-sync] node is required" >&2
  exit 1
fi

if [[ ! -f "${HARNESS}" ]]; then
  echo "[gatekeeper-sync] missing harness at ${HARNESS}" >&2
  exit 1
fi

exec node "${HARNESS}" "$@"
