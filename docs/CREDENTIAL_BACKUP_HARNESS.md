# Credential Backup Harness

The Credential Backup Harness keeps WR and agent workflows moving when Doppler
is not configured or does not contain the needed secrets. Doppler remains
supported, but it is no longer the only path.

## What it does

`scripts/credential-backup-harness.js` accepts a comma-separated secret list,
checks every configured backup source, and syncs resolved values to GitHub
Actions secrets with `gh secret set`. It never prints secret values.

```bash
node scripts/credential-backup-harness.js \
  --secrets OPENROUTER_API_KEY,DIGITALOCEAN_API_TOKEN \
  --repo midnghtsapphire/revvel-standards \
  --json
```

`scripts/gatekeeper-sync.sh` now delegates to this harness, so existing
workflows keep working.

## Source order

| Source | Type | Cost / openness | Configuration |
|---|---|---|---|
| GitHub Actions secrets | GitHub app / connector | Included with GitHub | Already-present repo secrets count as ready |
| Direct environment | CLI / CI | Free / FOSS-compatible | Export `SECRET_NAME=value` in the runtime |
| JSON backup | Connector | Free / FOSS-compatible | `CREDENTIAL_BACKUP_JSON` or `CREDENTIAL_BACKUP_JSON_FILE` |
| SOPS + age/GPG | CLI | Free / FOSS | `CREDENTIAL_BACKUP_SOPS_FILE` |
| pass | CLI | Free / FOSS | `CREDENTIAL_BACKUP_PASS_PREFIX` |
| Bitwarden CLI | CLI / browser extension ecosystem | Free personal tier / FOSS clients | `BW_SESSION` + `CREDENTIAL_BACKUP_BW_PREFIX` |
| 1Password CLI | CLI / extension ecosystem | Free developer tooling / paid vault | `OP_SERVICE_ACCOUNT_TOKEN` + `CREDENTIAL_BACKUP_1PASSWORD_TEMPLATE` |
| Doppler | Connector | Optional vendor free/paid tier | `DOPPLER_TOKEN` or accepted aliases |
| Infisical | MCP / CLI / connector | Free cloud tier or self-hosted FOSS | Sync to env/SOPS, then run harness |
| HashiCorp Vault | MCP / CLI / connector | Self-hosted FOSS or cloud free tier | Sync to env/SOPS, then run harness |

## Safe backup patterns

### Direct GitHub secret

Use this when Doppler is unavailable:

```bash
gh secret set OPENROUTER_API_KEY --repo midnghtsapphire/revvel-standards
```

### Local encrypted SOPS file

Keep the encrypted file outside the repo or commit only encrypted content:

```bash
export CREDENTIAL_BACKUP_SOPS_FILE="$HOME/.revvel/secrets.enc.json"
node scripts/credential-backup-harness.js --secrets OPENROUTER_API_KEY --repo midnghtsapphire/revvel-standards
```

### pass

```bash
pass insert revvel/OPENROUTER_API_KEY
export CREDENTIAL_BACKUP_PASS_PREFIX=revvel
node scripts/credential-backup-harness.js --secrets OPENROUTER_API_KEY --repo midnghtsapphire/revvel-standards
```

### Bitwarden CLI

```bash
export BW_SESSION="$(bw unlock --raw)"
export CREDENTIAL_BACKUP_BW_PREFIX=revvel
node scripts/credential-backup-harness.js --secrets OPENROUTER_API_KEY --repo midnghtsapphire/revvel-standards
```

### 1Password CLI

```bash
export CREDENTIAL_BACKUP_1PASSWORD_TEMPLATE='op://Revvel/{secret}/credential'
node scripts/credential-backup-harness.js --secrets OPENROUTER_API_KEY --repo midnghtsapphire/revvel-standards
```

## Workflow behavior

`credential-gatekeeper.yml` now:

1. Generates the credential BOM.
2. Runs the backup harness even when no Doppler token exists.
3. Marks secrets already present in GitHub Actions as ready.
4. Resolves from configured backup sources where possible.
5. Leaves a table showing which secrets are ready, missing, or failed.

If every required secret is already present or resolved, the workflow removes
`credentials-missing` and applies `credentials-ready`.
