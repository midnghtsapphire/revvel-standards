# gatekeeper-cli

Command-line interface for Doppler and GitHub secrets management.

## Installation

```bash
cd gatekeeper-cli
pip install -e .
```

## Configuration

Create `~/.gatekeeper/config.yaml`:

```yaml
doppler:
  token: doppler_pt_xxx
  project: revvel-standards
  config: prd

github:
  token: ghp_xxx
  owner: midnghtsapphire
  repo: revvel-standards
```

Or use environment variables:

```bash
export DOPPLER_TOKEN=doppler_pt_xxx
export DOPPLER_PROJECT=revvel-standards
export DOPPLER_CONFIG=prd
export GITHUB_TOKEN=ghp_xxx
```

## Commands

### Secrets

```bash
# List secrets
gk secrets list --project revvel-standards --config prd

# Get secret
gk secrets get STRIPE_SECRET_KEY --project revvel-standards

# Set secret
gk secrets set STRIPE_SECRET_KEY --value "sk_xxx" --project revvel-standards

# Delete secret
gk secrets delete STRIPE_SECRET_KEY --project revvel-standards

# Rotate secret (generates new value and updates)
gk secrets rotate STRIPE_SECRET_KEY --project revvel-standards
```

### Projects

```bash
# List projects
gk projects list

# List configs
gk configs list --project revvel-standards
```

### Tokens

```bash
# Create service token
gk tokens create --name "ci-runner" --project revvel-standards

# List tokens
gk tokens list --project revvel-standards

# Revoke token
gk tokens revoke dp.sk.xxx --project revvel-standards
```

### Gatekeeper

```bash
# Check status
gk status

# Sync to GitHub
gk sync --project revvel-standards --repo midnghtsapphire/revvel-standards

# Health check
gk health

# Audit secret usage
gk audit --secret STRIPE_SECRET_KEY
```

## Examples

```bash
# Quick start: list all secrets in production
gk secrets list

# Set a new secret
gk secrets set NEW_API_KEY --value "abc123"

# Sync secrets from Doppler to GitHub repo
gk sync --secrets "OPENROUTER_API_KEY,STRIPE_SECRET_KEY" --repo midnghtsapphire/mind-mappr

# Check system health
gk health
```

## Architecture

The CLI tool integrates with:
- **Doppler API** for secret management
- **GitHub API** for repo secret syncing
- **MCP Server** (optional) for programmatic access
- **n8n workflows** (optional) for automation

See [../docs/SECRETS_MANAGEMENT.md](../docs/SECRETS_MANAGEMENT.md) for the full architecture.
