# gatekeeper-cli

Command-line interface for Doppler and GitHub secrets management.

## Installation

```bash
cd gatekeeper-cli
pip install -e .
```

## Configuration

```bash
# Set environment variables
export DOPPLER_TOKEN=doppler_pt_xxx
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

# Rotate secret
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
gk sync --project revvel-standards

# Health check
gk health
```