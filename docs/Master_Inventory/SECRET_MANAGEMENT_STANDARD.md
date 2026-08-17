# Secret Management & Access Automation Standard

**Version:** 1.0.0  
**Date:** 2026-04-29  
**Status:** Active  
**Category:** Security & Compliance  
**Parent Standard:** AUDREY_AUTONOMOUS_AGENT_STANDARD.md  

---

## Purpose

This standard defines the **automated secret management and access control** strategy for all Revvel projects. It provides guidance on selecting tools, implementing API-automated access, and maintaining security compliance while maximizing automation.

---

## Executive Summary

**Issue Context:** [WR] Evaluate <https://github.com/strongdm> or others then implement automated API key and secret management.

**Recommendation:** Use **Infisical** (MIT license) for FOSS projects, with HashiCorp Vault/OpenBao as enterprise alternative. StrongDM is enterprise-focused ($$$) and not suitable for FOSS-first Revvel standards.

---

## Evaluation Results

### StrongDM Analysis

**What it is:** Enterprise access management platform for databases, servers, Kubernetes, cloud resources.

**Key Features:**
- Programmatic access management via REST API
- SDKs in Python, Go, Java, Ruby
- Dynamic approval workflows
- Comprehensive audit logging
- Just-in-time access provisioning
- Zero-trust network access

**GitHub Repos:**
- [strongdm/strongdm-sdk-python](https://github.com/strongdm/strongdm-sdk-python)
- [strongdm/strongdm-sdk-java](https://github.com/strongdm/strongdm-sdk-java)
- [strongdm/terraform-provider-sdm](https://github.com/strongdm/terraform-provider-sdm)

**Why NOT Recommended for Revvel:**
- ❌ **Proprietary/Paid** — Requires enterprise license, not FOSS
- ❌ **Overkill** — Designed for large enterprises with complex infrastructure
- ❌ **Vendor Lock-in** — Proprietary API and SDKs
- ❌ **Cost** — Enterprise pricing model incompatible with Revvel FOSS-first philosophy

---

## Recommended Solutions

### 1. **Infisical** (PRIMARY RECOMMENDATION)

**Why Infisical:**
- ✅ **MIT License** — True open source, self-hostable
- ✅ **Modern Developer Experience** — CLI, web UI, API, SDKs
- ✅ **API-First Design** — Full automation support
- ✅ **Environment-Based** — Dev/Staging/Prod secret management
- ✅ **Secret Versioning** — Audit trail and rollback
- ✅ **Secret Scanning** — Detects exposed secrets in repos
- ✅ **CI/CD Integration** — GitHub Actions, GitLab CI, CircleCI
- ✅ **Kubernetes Native** — Operator for K8s secret injection
- ✅ **Active Community** — 15k+ GitHub stars, regular updates

**GitHub:** [Infisical/infisical](https://github.com/Infisical/infisical)

**Use Cases:**
- Environment variable management across projects
- API key rotation and distribution
- Secret sharing between team members
- CI/CD secret injection
- Kubernetes secret management
- Development to production secret promotion

**Quick Start:**
```bash
# Install Infisical CLI
curl -1sLf 'https://dl.cloudsmith.io/public/infisical/infisical-cli/setup.deb.sh' | sudo -E bash
sudo apt-get update && sudo apt-get install -y infisical

# Login
infisical login

# Initialize project
infisical init

# Set secrets
infisical secrets set API_KEY="sk-..."
infisical secrets set DATABASE_URL="postgresql://..."

# Run app with secrets injected
infisical run -- npm start
```

**API Automation Example:**
```python
# Python SDK
from infisical import InfisicalClient

client = InfisicalClient(token="your-service-token")

# Get secret
secret = client.get_secret("API_KEY", environment="production")
print(secret.value)

# Update secret
client.update_secret("API_KEY", "new-value", environment="production")

# List all secrets
secrets = client.list_secrets(environment="production")
for secret in secrets:
    print(f"{secret.key}: {secret.value}")
```

**Self-Hosting:**
```bash
# Docker Compose
curl -o docker-compose.yml https://raw.githubusercontent.com/Infisical/infisical/main/docker-compose.yml
docker-compose up -d
```

### 2. **HashiCorp Vault / OpenBao** (ENTERPRISE ALTERNATIVE)

**Why Vault/OpenBao:**
- ✅ **Industry Standard** — Most mature secret management solution
- ✅ **Extensive Integrations** — AWS, GCP, Azure, databases, SSH, PKI
- ✅ **Dynamic Secrets** — Generate temporary credentials on-demand
- ✅ **Encryption as a Service** — Encrypt/decrypt data without storing
- ✅ **OpenBao Fork** — Maintains true open source (MPL 2.0) after HashiCorp license change

**GitHub:** 
- [hashicorp/vault](https://github.com/hashicorp/vault) (BSL license on newer versions)
- [openbao/openbao](https://github.com/openbao/openbao) (MPL 2.0 fork)

**When to Use:** Large-scale deployments, enterprise compliance requirements, need for dynamic secrets.

**API Example:**
```python
import hvac

client = hvac.Client(url='http://localhost:8200', token='your-token')

# Write secret
client.secrets.kv.v2.create_or_update_secret(
    path='myapp/config',
    secret=dict(api_key='sk-...'),
)

# Read secret
secret = client.secrets.kv.v2.read_secret_version(path='myapp/config')
print(secret['data']['data']['api_key'])
```

### 3. **Mozilla SOPS** (GITOPS FOCUSED)

**Why SOPS:**
- ✅ **File-Based Encryption** — Encrypt specific keys in YAML/JSON/ENV files
- ✅ **GitOps Friendly** — Commit encrypted secrets to Git
- ✅ **Cloud KMS Integration** — AWS KMS, GCP KMS, Azure Key Vault, PGP
- ✅ **Simple CLI** — Easy to use and automate

**GitHub:** [mozilla/sops](https://github.com/mozilla/sops)

**When to Use:** Infrastructure as Code, GitOps workflows, Kubernetes secrets management.

**Example:**
```bash
# Encrypt a file
sops -e secrets.yaml > secrets.enc.yaml

# Decrypt and use
sops -d secrets.enc.yaml | kubectl apply -f -

# Edit encrypted file
sops secrets.enc.yaml
```

---

## Implementation Guide

### Phase 1: Tool Selection (COMPLETE)

**Decision:** Use **Infisical** as the primary secret management tool for Revvel projects.

**Rationale:**
- MIT license aligns with FOSS-first philosophy
- Modern API and developer experience
- Self-hostable for production workloads
- Active development and community support

### Phase 2: Infisical Deployment

**Option A: Cloud Hosted** (Fastest start)
```bash
# Sign up at https://app.infisical.com
# Create organization: MIDNGHTSAPPHIRE
# Create projects: revvel-standards, mind-mappr, etc.
```

**Option B: Self-Hosted** (Production recommended)
```bash
# Deploy to DigitalOcean droplet or Kubernetes cluster
git clone https://github.com/Infisical/infisical
cd infisical
docker-compose -f docker-compose.prod.yml up -d
```

### Phase 3: Migration Plan

**Step 1:** Inventory all secrets across projects
```bash
# Find all .env files
find . -name ".env*" -not -path "*/node_modules/*"

# Find hardcoded secrets (use truffleHog or gitleaks)
trufflehog git file://. --only-verified
```

**Step 2:** Migrate to Infisical
```bash
# For each project
cd /path/to/project
infisical init
infisical secrets set $(cat .env | xargs)
```

**Step 3:** Update CI/CD workflows
```yaml
# .github/workflows/deploy.yml
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: infisical/secrets-action@v1
        with:
          infisical-token: ${{ secrets.INFISICAL_TOKEN }}
      - run: npm run deploy
```

**Step 4:** Update application code
```javascript
// Before
const apiKey = process.env.API_KEY;

// After (with Infisical SDK)
import { InfisicalClient } from '@infisical/sdk';

const client = new InfisicalClient({
  token: process.env.INFISICAL_TOKEN,
});

const secrets = await client.listSecrets({
  environment: process.env.NODE_ENV || 'development',
  projectId: process.env.INFISICAL_PROJECT_ID,
});

const apiKey = secrets.find(s => s.secretKey === 'API_KEY').secretValue;
```

### Phase 4: Automation Integration

**OpenRouter API Key Management:**
```python
# scripts/openrouter-with-infisical.py
from infisical import InfisicalClient
import os

# Initialize Infisical
client = InfisicalClient(token=os.environ['INFISICAL_TOKEN'])

# Get OpenRouter key
openrouter_key = client.get_secret(
    "OPENROUTER_API_KEY",
    environment="production"
)

# Auto-rotate if needed
if is_key_expiring(openrouter_key.value):
    new_key = generate_new_openrouter_key()
    client.update_secret(
        "OPENROUTER_API_KEY",
        new_key,
        environment="production"
    )
    notify_rotation_complete()
```

**GitHub Actions Integration:**
```yaml
# .github/workflows/infisical-sync.yml
name: Sync Infisical Secrets

on:
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours
  workflow_dispatch:

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Install Infisical CLI
        run: |
          curl -1sLf 'https://dl.cloudsmith.io/public/infisical/infisical-cli/setup.deb.sh' | sudo -E bash
          sudo apt-get update && sudo apt-get install -y infisical

      - name: Sync secrets to GitHub Actions
        env:
          INFISICAL_TOKEN: ${{ secrets.INFISICAL_TOKEN }}
        run: |
          # Export secrets from Infisical
          infisical export --format dotenv > .env
          
          # Update GitHub secrets via API
          gh secret set OPENROUTER_API_KEY < .env
```

---

## API Automation Patterns

### 1. Dynamic Secret Injection

```bash
# Run any command with secrets injected
infisical run --env=production -- node server.js
infisical run --env=staging -- npm test
```

### 2. CI/CD Secret Management

```yaml
# GitHub Actions with Infisical
- uses: infisical/secrets-action@v1
  with:
    infisical-token: ${{ secrets.INFISICAL_TOKEN }}
    environment: production

# Now all Infisical secrets are available as env vars
- run: echo $OPENROUTER_API_KEY
```

### 3. Kubernetes Secret Operator

```yaml
apiVersion: secrets.infisical.com/v1alpha1
kind: InfisicalSecret
metadata:
  name: app-secrets
spec:
  authentication:
    serviceToken:
      secretsScope:
        envSlug: production
        secretsPath: /
      secretName: service-token
  managedSecretReference:
    secretName: app-secrets
    secretType: Opaque
```

### 4. Terraform Integration

```hcl
provider "infisical" {
  host          = "https://app.infisical.com"
  client_id     = var.infisical_client_id
  client_secret = var.infisical_client_secret
}

data "infisical_secrets" "app" {
  env_slug     = "production"
  workspace_id = var.workspace_id
}

resource "aws_instance" "app" {
  # Use secrets from Infisical
  user_data = data.infisical_secrets.app.secrets["INIT_SCRIPT"]
}
```

---

## Security Best Practices

### 1. Principle of Least Privilege

```bash
# Create service tokens with minimal scope
infisical service-token create \
  --name "github-actions-ci" \
  --environment production \
  --path "/" \
  --permissions "read"
```

### 2. Secret Rotation

```python
# Auto-rotate secrets every 90 days
from infisical import InfisicalClient
from datetime import datetime, timedelta

def rotate_secrets_if_needed():
    client = InfisicalClient(token=os.environ['INFISICAL_TOKEN'])
    
    secrets = client.list_secrets(environment="production")
    
    for secret in secrets:
        if secret.updated_at < datetime.now() - timedelta(days=90):
            new_value = generate_new_secret_value(secret.key)
            client.update_secret(secret.key, new_value, environment="production")
            notify_secret_rotated(secret.key)
```

### 3. Audit Logging

```python
# Query Infisical audit logs
logs = client.get_audit_logs(
    project_id="project-123",
    start_date="2026-04-01",
    end_date="2026-04-29"
)

for log in logs:
    print(f"{log.timestamp}: {log.user} {log.action} {log.resource}")
```

### 4. Secret Scanning

```bash
# Add to pre-commit hook
- repo: https://github.com/Infisical/infisical
  rev: v0.8.0
  hooks:
    - id: infisical-scan
```

---

## Integration with Revvel Standards

### Agent Factory Integration

Agents should retrieve secrets from Infisical, not from environment variables directly:

```yaml
# templates/agent-factory/AGENT_TEMPLATE.md
settings_profile: "production"
secret_management:
  provider: "infisical"
  environment: "{{ ENV }}"
  auto_refresh: true
  cache_ttl: 300  # 5 minutes
```

### MCP Server Integration

```json
{
  "mcpServers": {
    "infisical": {
      "command": "infisical",
      "args": ["mcp"],
      "env": {
        "INFISICAL_TOKEN": "${INFISICAL_TOKEN}"
      }
    }
  }
}
```

### Ralph Loop Integration

When Ralph detects missing secrets, auto-create Infisical entry:

```yaml
# templates/cicd/ralph-loop.yml
- name: Check for missing secrets
  run: |
    if [ -z "$OPENROUTER_API_KEY" ]; then
      infisical secrets set OPENROUTER_API_KEY "PLACEHOLDER" --env=dev
      echo "Created placeholder secret in Infisical"
      gh issue create --title "Secret needed: OPENROUTER_API_KEY" \
        --label "needs-secret,ralph-loop"
    fi
```

---

## Monitoring & Alerting

### 1. Secret Expiration Alerts

```yaml
# .github/workflows/secret-expiration-check.yml
name: Check Secret Expiration

on:
  schedule:
    - cron: '0 0 * * *'  # Daily

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - name: Check expiring secrets
        run: |
          expiring=$(infisical secrets list --env=production --format=json | \
            jq '.[] | select(.expiresAt != null and .expiresAt < (now + 604800))')
          
          if [ -n "$expiring" ]; then
            gh issue create \
              --title "Secrets expiring soon" \
              --body "$expiring" \
              --label "security,auto-alert"
          fi
```

### 2. Unauthorized Access Detection

```python
# Monitor Infisical audit logs for anomalies
def detect_anomalies():
    logs = client.get_audit_logs(project_id=PROJECT_ID, limit=100)
    
    # Check for unusual access patterns
    access_by_user = {}
    for log in logs:
        access_by_user[log.user] = access_by_user.get(log.user, 0) + 1
    
    for user, count in access_by_user.items():
        if count > THRESHOLD:
            create_security_alert(
                f"Unusual access pattern: {user} accessed secrets {count} times"
            )
```

---

## Cost Analysis

| Solution | License | Self-Hosted Cost | Cloud Cost | Recommendation |
|----------|---------|------------------|------------|----------------|
| Infisical | MIT | $5/mo (DigitalOcean) | Free tier, then $10/user/mo | ✅ Best for Revvel |
| Vault/OpenBao | MPL/BSL | $10/mo | $0.03/hr on AWS | Enterprise alternative |
| SOPS | MPL | $0 | $0 (uses cloud KMS) | GitOps workflows |
| strongDM | Proprietary | N/A | $50-200/user/mo | ❌ Not recommended |

---

## Acceptance Criteria

- [x] Evaluate strongDM and identify FOSS alternatives
- [x] Select recommended solution (Infisical)
- [x] Document implementation guide
- [x] Provide API automation examples
- [x] Define migration plan from .env files
- [x] Create CI/CD integration patterns
- [x] Establish security best practices
- [x] Integrate with Revvel agent standards

---

## Next Steps

1. **Immediate:** Deploy Infisical to DigitalOcean or use cloud hosted version
2. **Week 1:** Migrate revvel-standards secrets to Infisical
3. **Week 2:** Update all GitHub Actions workflows to use Infisical
4. **Week 3:** Migrate remaining projects (mind-mappr, oaudrey, etc.)
5. **Week 4:** Enable audit logging and monitoring
6. **Ongoing:** Auto-rotate secrets every 90 days

---

## References

- [Infisical Documentation](https://infisical.com/docs)
- [Infisical GitHub](https://github.com/Infisical/infisical)
- [OpenBao GitHub](https://github.com/openbao/openbao)
- [Mozilla SOPS](https://github.com/mozilla/sops)
- [strongDM Docs](https://docs.strongdm.com/references/api)
- [AGENT_FACTORY_STANDARD.md](./AGENT_FACTORY_STANDARD.md)
- [GOAP_AGENT_STANDARD.md](./GOAP_AGENT_STANDARD.md)
