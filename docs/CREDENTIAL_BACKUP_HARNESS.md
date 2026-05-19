# Credential Backup Harness

Doppler is no longer required. The Credential Gatekeeper now resolves secrets
from multiple sources via `scripts/credential-backup-harness.js`. The legacy
`scripts/gatekeeper-sync.sh` delegates to the harness so existing CI calls keep
working.

## Resolution Order

1. **GitHub Actions secrets / environment** — anything already exported.
2. **JSON backup** — `CREDENTIAL_BACKUP_JSON` (inline) or `CREDENTIAL_BACKUP_JSON_FILE`.
3. **SOPS/age** — `CREDENTIAL_BACKUP_SOPS_FILE` (requires `sops` on PATH).
4. **pass** — `CREDENTIAL_BACKUP_PASS_PREFIX` (requires `pass`).
5. **Bitwarden CLI** — `CREDENTIAL_BACKUP_BW_PREFIX` + `BW_SESSION`.
6. **1Password CLI** — `CREDENTIAL_BACKUP_1PASSWORD_TEMPLATE` (e.g. `op://vault/{KEY}/credential`).
7. **Infisical** — `INFISICAL_TOKEN` (requires `infisical`).
8. **Vault** — `VAULT_ADDR` plus authentication (`VAULT_TOKEN`, a
   pre-authenticated Vault CLI session, or another Vault-supported auth method)
   and optional `CREDENTIAL_BACKUP_VAULT_PATH`.
9. **Doppler** — optional fallback when `doppler` is available.

The first source returning a non-empty value wins. Missing keys are reported as
`missing` so the Gatekeeper can flag what still needs to be provisioned.

## Usage

```bash
# Report which sources are configured and which keys are resolvable
node scripts/credential-backup-harness.js --report

# Resolve specific keys, output redacted JSON
node scripts/credential-backup-harness.js --keys OPENROUTER_API_KEY,POLAR_ACCESS_TOKEN

# Emit multiline-safe GITHUB_ENV entries
node scripts/credential-backup-harness.js --keys OPENROUTER_API_KEY --format github-actions
```

External CLI providers are bounded by `CREDENTIAL_BACKUP_CLI_TIMEOUT_MS`
(default `15000`) so one hung provider cannot block credential sync forever.

## Migration

- If GitHub Actions secrets are already set, nothing changes.
- To enable a backup source, set the relevant env vars above.
- Remove any `doppler login` / `doppler setup` gating from custom scripts; the
  harness will use Doppler only if its CLI is present.

## Self-Heal Integration

Agents that fail (e.g., OpenRouter triage in `weekly-research.yml`) invoke
`scripts/agent-self-heal.js` to emit fallback routing labels and a recovery
packet, ensuring WR issues keep moving even when a single credential source or
agent is unavailable.
