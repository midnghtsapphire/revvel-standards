# StrongDM API Control Management — Evaluation & Standard

**Version:** 1.0.0
**Date:** 2026-04-30
**Status:** Active — Decision Recorded
**Category:** Security / API Control / Access Management
**Parent Standard:** [`API_GATEKEEPER_STANDARD.md`](API_GATEKEEPER_STANDARD.md)
**Related Standards:** [`SECRET_MANAGEMENT_STANDARD.md`](SECRET_MANAGEMENT_STANDARD.md), [`KONG_GATEWAY.md`](../../standards/KONG_GATEWAY.md)

---

## Executive Summary

**Issue:** `[WR] integrate strongdm for api control mgt`

**Decision:** **StrongDM is NOT integrated.** It is enterprise-proprietary software ($50–200/user/month) that violates the Revvel FOSS-first philosophy.

**Replacement Stack:**

| Layer | FOSS Tool | What It Replaces |
|-------|-----------|-----------------|
| API Gateway / Access Control | **Kong Gateway OSS** | StrongDM resource proxying, routing, zero-trust access |
| Secret & Key Management | **Infisical** (MIT) | StrongDM API key vault, SCIM provisioning |
| Audit Logging | **Kong file-log + Loki** | StrongDM session/query audit logs |
| Dynamic Secret Injection | **Infisical SDK / CLI** | StrongDM SDK (Python, Go, Java, Ruby) |
| Secret Rotation | **Gatekeeper CLI + Doppler** | StrongDM token lifecycle management |

All tools above are open-source, self-hostable, and already wired into the Revvel ecosystem.

---

## 1. StrongDM Capability Analysis

[StrongDM](https://www.strongdm.com/) is an enterprise access management platform. Its documented capabilities are assessed below against Revvel requirements.

### 1.1 What StrongDM Provides

| Capability | StrongDM Feature | Revvel FOSS Equivalent |
|-----------|-----------------|----------------------|
| **Programmatic Access** | REST API + SDKs (Go, Java, Python, Ruby) | Kong Admin API + Infisical SDK |
| **Infrastructure Management** | Proxy to databases, servers, K8s, web services | Kong Gateway OSS (proxy layer) |
| **CRUD Automation** | SDK-based Create/Read/Update/Delete for resources | Kong Admin API (`curl` / Python) |
| **Audit Logging** | Query-level session logs for compliance | Kong `file-log` plugin + Loki |
| **API Key Generation** | Admin UI → Principals → Tokens | Infisical service tokens + Doppler |
| **User Provisioning (SCIM)** | SCIM 2.0 API for IdP integration | Infisical user management + GitHub SSO/SAML |
| **Just-in-Time Access** | Dynamic approval workflows | Gatekeeper `credentials-ready` label workflow |
| **Zero-Trust Network Access** | mTLS proxy, never expose backend directly | Kong Gateway (never exposes backends directly) |

### 1.2 Why StrongDM is NOT Recommended for Revvel

| Criterion | StrongDM | Assessment |
|-----------|----------|-----------|
| **License** | Proprietary | ❌ Not FOSS — conflicts with Revvel FOSS-first mandate |
| **Cost** | $50–200/user/month | ❌ Enterprise pricing incompatible with lean, open projects |
| **Self-Hosted** | No (SaaS-only) | ❌ Vendor dependency; data leaves the network |
| **Vendor Lock-In** | Proprietary API/SDKs | ❌ SDK coupling prevents portability |
| **Scale Fit** | Designed for Fortune 500 infra teams | ❌ Overkill for Revvel's current project scale |
| **Open Community** | Closed roadmap | ❌ No community contribution model |

**Verdict:** StrongDM does not pass the FOSS-first gate. All functionality it offers is covered by the tools already deployed in the Revvel ecosystem.

---

## 2. Revvel API Control Management Architecture

The following architecture provides **equivalent or superior** control to StrongDM using FOSS tools.

```text
┌─────────────────────────────────────────────────────────────────────┐
│                     API Control Plane (Revvel)                       │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  Layer 1 — Network Edge                                      │    │
│  │  Caddy / Cloudflare (TLS, DDoS, IP allowlisting)            │    │
│  └──────────────────────────┬──────────────────────────────────┘    │
│                             │                                         │
│  ┌──────────────────────────▼──────────────────────────────────┐    │
│  │  Layer 2 — API Gateway (Kong Gateway OSS)                    │    │
│  │  • Routing           • Rate limiting       • key-auth / JWT  │    │
│  │  • CORS              • Request validation  • Bot detection    │    │
│  │  • RBAC (ACL plugin) • Audit log (file-log)• Health checks   │    │
│  │  Admin API: localhost:8001 (never exposed externally)        │    │
│  └──────────┬─────────────────────────────┬────────────────────┘    │
│             │                             │                           │
│  ┌──────────▼──────────┐   ┌─────────────▼──────────────────────┐  │
│  │  Layer 3 — Services │   │  Layer 4 — Secret / Key Mgmt       │  │
│  │  growlingeyes :3000 │   │  Infisical (MIT)                    │  │
│  │  neurooz     :5173  │   │  • API keys per service/consumer   │  │
│  │  oaudrey     :8080  │   │  • Secret versioning & rollback    │  │
│  │  ...               │   │  • Audit log of all secret access  │  │
│  └─────────────────────┘   │  • SCIM-compatible user mgmt       │  │
│                             │  Doppler (sync to GitHub Secrets)  │  │
│                             └────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. API Key Lifecycle Management

### 3.1 Generating API Keys (replaces StrongDM "Principals → Tokens")

**Via Infisical:**
```bash
# Create a service token scoped to a single environment
infisical service-token create \
  --name "growlingeyes-prod-readonly" \
  --environment production \
  --path "/" \
  --permissions "read" \
  --ttl 720h   # 30-day TTL

# Store the resulting token in Doppler
doppler secrets set INFISICAL_TOKEN_GE_PROD="st.abc123..." \
  --project growlingeyes --config prd
```

**Via Kong (consumer API keys):**
```bash
# Create a consumer (represents a service or agent)
curl -s -X POST http://localhost:8001/consumers \
  -d "username=agent-openrouter"

# Generate an API key for that consumer
API_KEY=$(openssl rand -hex 32)
curl -s -X POST http://localhost:8001/consumers/agent-openrouter/key-auth \
  -d "key=${API_KEY}"

# Store in Doppler
doppler secrets set KONG_API_KEY_OPENROUTER="${API_KEY}" \
  --project revvel-standards --config prd
```

### 3.2 SDK-Based Programmatic Access (replaces StrongDM SDKs)

**Python — Infisical SDK:**
```python
from infisical_sdk import InfisicalSDKClient

client = InfisicalSDKClient(host="https://app.infisical.com")
client.auth.universal_auth.login(
    client_id=os.environ["INFISICAL_CLIENT_ID"],
    client_secret=os.environ["INFISICAL_CLIENT_SECRET"],
)

# CRUD on secrets (equivalent to StrongDM SDK CRUD operations)
secret = client.secrets.get_secret_by_name(
    secret_name="OPENROUTER_API_KEY",
    project_id=os.environ["INFISICAL_PROJECT_ID"],
    environment_slug="production",
)

client.secrets.update_secret_by_name(
    current_secret_name="OPENROUTER_API_KEY",
    secret_value="sk-new-value-...",
    project_id=os.environ["INFISICAL_PROJECT_ID"],
    environment_slug="production",
)
```

**JavaScript / Node.js:**
```javascript
import InfisicalClient from "@infisical/sdk";

const client = new InfisicalClient({
  clientId: process.env.INFISICAL_CLIENT_ID,
  clientSecret: process.env.INFISICAL_CLIENT_SECRET,
});

// List all secrets (equivalent to StrongDM resource listing)
const { secrets } = await client.secrets.listSecrets({
  environment: "production",
  projectId: process.env.INFISICAL_PROJECT_ID,
});

secrets.forEach(({ secretKey, secretValue }) => {
  console.log(`${secretKey}: [redacted]`);
});
```

### 3.3 Secret Rotation (replaces StrongDM token lifecycle)

See [`SELF_HEALING_SECRET_ROTATION.md`](../SELF_HEALING_SECRET_ROTATION.md) for the full self-healing rotation system. Key script locations:

- `scripts/check-rotation-needed.py` — check TTL metadata
- `scripts/update-rotation-metadata.py` — record successful rotations
- `.github/workflows/secret-rotation-schedule.yml` — weekly rotation cron

```bash
# Manual rotation via Gatekeeper CLI
gk secrets rotate OPENROUTER_API_KEY

# Trigger via GitHub Actions
gh workflow run secret-rotation-schedule.yml \
  -f secret_name=OPENROUTER_API_KEY
```

---

## 4. Infrastructure Access Control (replaces StrongDM proxying)

StrongDM's core feature is acting as a proxy between users and backend infrastructure (databases, servers, Kubernetes). Kong Gateway OSS handles this for HTTP/HTTPS services. For SSH/database access, use the patterns below.

### 4.1 HTTP Service Access via Kong

```bash
# Register a service (equivalent to adding a StrongDM resource)
curl -s -X POST http://localhost:8001/services \
  -d name=postgres-api \
  -d url=http://localhost:5432

# Restrict access to named consumers only
curl -s -X POST http://localhost:8001/services/postgres-api/plugins \
  -d "name=acl" \
  -d "config.allow[]=db-admins" \
  -d "config.hide_groups_header=true"

# Add the consumer to the allowed group
curl -s -X POST http://localhost:8001/consumers/agent-OpenHands/acls \
  -d "group=db-admins"
```

### 4.2 Database Access (SSH Tunnel via DigitalOcean)

For direct database access (which StrongDM proxies natively), use SSH tunnels documented in [`docs/droplet_access.md`](../droplet_access.md):

```bash
# Create SSH tunnel to PostgreSQL on droplet
ssh -L 5432:localhost:5432 root@<DROPLET_IP> -N &

# Connect via tunnel
psql -h localhost -p 5432 -U appuser revvel_db
```

### 4.3 Kubernetes Access (replaces StrongDM K8s integration)

```yaml
# Infisical K8s Operator — injects secrets as K8s Secret objects
apiVersion: secrets.infisical.com/v1alpha1
kind: InfisicalSecret
metadata:
  name: revvel-app-secrets
  namespace: production
spec:
  authentication:
    universalAuth:
      credentialsRef:
        secretName: universal-auth-credentials
        secretNamespace: default
  managedSecretReference:
    secretName: revvel-app-secrets
    secretNamespace: production
    secretType: Opaque
  hostAPI: https://app.infisical.com
```

---

## 5. Audit Logging (replaces StrongDM audit trail)

### 5.1 Kong Request Logging

Every Revvel service behind Kong MUST have `file-log` enabled (see [`KONG_GATEWAY.md`](../../standards/KONG_GATEWAY.md)):

```bash
# Enable file-log on a service
curl -s -X POST http://localhost:8001/services/growlingeyes/plugins \
  -d "name=file-log" \
  -d "config.path=/var/log/kong/access.log" \
  -d "config.reopen=true"
```

Log format includes: `timestamp`, `client_ip`, `method`, `path`, `status`, `latency`, `consumer.username`.

### 5.2 Infisical Secret Access Logs

```python
# Query Infisical audit logs (equivalent to StrongDM audit export)
import requests

headers = {"Authorization": f"Bearer {os.environ['INFISICAL_TOKEN']}"}
response = requests.get(
    f"https://app.infisical.com/api/v1/audit-logs",
    headers=headers,
    params={
        "projectId": os.environ["INFISICAL_PROJECT_ID"],
        "startDate": "2026-04-01",
        "endDate": "2026-04-30",
    },
)
logs = response.json()["auditLogs"]

for log in logs:
    print(f"{log['createdAt']}  {log['actor']['email']}  {log['event']['type']}  {log['event']['metadata']}")
```

### 5.3 GitHub Actions Audit via Workflow Dispatch Logs

All automated secret operations triggered by GitHub Actions are audited in:
- `wr/memory/secret-rotations.md` — rotation history per secret
- GitHub Actions run logs — full execution history
- Doppler activity log — all set/get/delete operations

---

## 6. User Provisioning (replaces StrongDM SCIM)

StrongDM supports SCIM 2.0 for syncing users from identity providers (Okta, Azure AD, etc.). Revvel uses GitHub as the identity provider.

### 6.1 GitHub SSO / SAML (Team-Level Access)

See [`SSO_SAML_STANDARD.md`](SSO_SAML_STANDARD.md) for full SAML configuration.

GitHub team membership controls access to repos and secrets:
- `team/maintainers` → admin access to GitHub secrets and Actions
- `team/developers` → write access to repos, read-only Actions
- `team/readers` → read-only

### 6.2 Infisical User Management

```bash
# Add a user to Infisical project (equivalent to StrongDM user provisioning)
# Via Infisical web UI: Settings → Members → Invite

# Via API
curl -s -X POST "https://app.infisical.com/api/v2/workspace/${PROJECT_ID}/memberships" \
  -H "Authorization: Bearer ${INFISICAL_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newdev@midnghtsapphire.com",
    "role": "developer"
  }'
```

### 6.3 Kong Consumer Provisioning

```bash
# Automate consumer creation when a new service/agent is onboarded
#!/usr/bin/env bash
# scripts/provision-kong-consumer.sh

CONSUMER=$1
GROUP=$2   # e.g., "services", "agents", "ci-cd"

# Create consumer
curl -s -X POST http://localhost:8001/consumers -d "username=${CONSUMER}"

# Generate API key
KEY=$(openssl rand -hex 32)
curl -s -X POST "http://localhost:8001/consumers/${CONSUMER}/key-auth" -d "key=${KEY}"

# Assign to ACL group
curl -s -X POST "http://localhost:8001/consumers/${CONSUMER}/acls" -d "group=${GROUP}"

# Store key in Doppler
doppler secrets set "KONG_API_KEY_${CONSUMER^^}"="${KEY}" \
  --project revvel-standards --config prd

echo "✓ Provisioned consumer: ${CONSUMER} in group: ${GROUP}"
echo "  API key stored in Doppler as: KONG_API_KEY_${CONSUMER^^}"
```

---

## 7. Terraform Integration (mirrors StrongDM Terraform provider)

StrongDM has a [Terraform provider](https://github.com/strongdm/terraform-provider-sdm). The FOSS equivalent uses the Infisical Terraform provider.

```hcl
terraform {
  required_providers {
    infisical = {
      source  = "infisical/infisical"
      version = "~> 0.11"
    }
    kong = {
      source  = "kevholditch/kong"
      version = "~> 6.0"
    }
  }
}

provider "infisical" {
  host          = "https://app.infisical.com"
  client_id     = var.infisical_client_id
  client_secret = var.infisical_client_secret
}

# Manage secrets as code (equivalent to StrongDM resource management)
resource "infisical_secret" "openrouter_key" {
  name         = "OPENROUTER_API_KEY"
  value        = var.openrouter_api_key
  env_slug     = "production"
  workspace_id = var.infisical_workspace_id
  folder_path  = "/"
}

provider "kong" {
  kong_admin_uri = "http://localhost:8001"
}

# Manage Kong consumers as code (equivalent to StrongDM user provisioning)
resource "kong_consumer" "agent_openrouter" {
  username  = "agent-openrouter"
  custom_id = "openrouter-automation"
}

resource "kong_consumer_key_auth" "agent_openrouter_key" {
  consumer_id = kong_consumer.agent_openrouter.id
  key         = var.kong_openrouter_key
}
```

---

## 8. GitHub Actions Integration

### 8.1 Inject Secrets from Infisical into Workflows

```yaml
# .github/workflows/deploy.yml — replaces StrongDM API key injection
name: Deploy with Managed Secrets

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Inject secrets from Infisical
        uses: Infisical/secrets-action@v1.0.7
        with:
          method: "universal-auth"
          client-id: ${{ secrets.INFISICAL_CLIENT_ID }}
          client-secret: ${{ secrets.INFISICAL_CLIENT_SECRET }}
          project-id: ${{ secrets.INFISICAL_PROJECT_ID }}
          env-slug: "production"

      # Secrets from Infisical are now available as env vars
      - name: Deploy
        run: |
          echo "OpenRouter key configured: ${OPENROUTER_API_KEY:+yes}"
          npm run deploy
```

### 8.2 API Key Rotation Workflow

```yaml
# .github/workflows/api-key-rotation.yml
name: API Key Rotation

on:
  schedule:
    - cron: "0 2 * * 1"  # Weekly, Monday 02:00 UTC
  workflow_dispatch:
    inputs:
      consumer:
        description: "Kong consumer username to rotate key for"
        required: false
        type: string

jobs:
  rotate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install dependencies
        run: pip install requests doppler-sdk

      - name: Rotate Kong API keys
        env:
          DOPPLER_TOKEN: ${{ secrets.DOPPLER_TOKEN }}
          KONG_ADMIN_URL: http://localhost:8001
        run: |
          python scripts/rotate-kong-api-keys.py \
            --consumer "${{ github.event.inputs.consumer }}" \
            --metadata-file wr/memory/secret-rotations.md

      - name: Commit rotation log
        run: |
          git config user.name "gatekeeper-bot"
          git config user.email "gatekeeper-bot@revvel.dev"
          git add wr/memory/secret-rotations.md
          git diff --staged --quiet || git commit -m "chore: rotate API keys"
          git push
```

---

## 9. Credential Gatekeeper Integration

The existing [Credential Gatekeeper](../../standards/CREDENTIAL_AUDIT_SYSTEM.md) workflow detects when a new service requires StrongDM-equivalent access management. When an issue mentions `strongdm`, `api-control`, or `access-management`, the gatekeeper should automatically suggest this standard.

Add these keyword mappings to `.github/workflows/credential-gatekeeper.yml`:

```yaml
# In the keyword detection section, add:
keywords:
  strongdm:
    standard: "docs/Master_Inventory/STRONGDM_API_CONTROL_STANDARD.md"
    alternatives:
      - "Kong Gateway OSS (API routing/auth)"
      - "Infisical (secret management)"
      - "Doppler (CI/CD secret sync)"
  api-control:
    standard: "docs/Master_Inventory/API_GATEKEEPER_STANDARD.md"
  access-management:
    standard: "docs/Master_Inventory/SECRET_MANAGEMENT_STANDARD.md"
```

---

## 10. Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-29 | Evaluated StrongDM for Revvel | Issue `[WR] integrate strongdm for api control mgt` |
| 2026-04-29 | **Rejected StrongDM** | Proprietary, $50-200/user/mo, SaaS-only, vendor lock-in |
| 2026-04-29 | Selected Infisical (MIT) | FOSS, self-hostable, API-first, 15k+ GitHub stars |
| 2026-04-29 | Kong OSS as proxy layer | Already deployed, Apache 2.0, full Admin API |
| 2026-04-30 | This standard created | Formal documentation of WR decision |

---

## 11. Acceptance Criteria

- [x] Evaluate StrongDM capabilities for API control management
- [x] Document why StrongDM is NOT recommended (proprietary, cost, lock-in)
- [x] Map every StrongDM feature to a FOSS equivalent
- [x] Provide working code for API key generation (Infisical + Kong)
- [x] Provide working code for SDK-based programmatic access
- [x] Provide working code for audit log extraction
- [x] Provide working code for user/consumer provisioning
- [x] Provide GitHub Actions workflows for automated key rotation
- [x] Provide Terraform integration examples
- [x] Integrate with existing Revvel standards (Kong, Gatekeeper, Secret Management)

---

## 12. Related Standards

| Standard | Relationship |
|----------|-------------|
| [`API_GATEKEEPER_STANDARD.md`](API_GATEKEEPER_STANDARD.md) | Parent standard — overall API security architecture |
| [`SECRET_MANAGEMENT_STANDARD.md`](SECRET_MANAGEMENT_STANDARD.md) | Secret management tooling (Infisical, Vault/OpenBao, SOPS) |
| [`KONG_GATEWAY.md`](../../standards/KONG_GATEWAY.md) | Kong Gateway OSS — Layer 2 API proxy implementation |
| [`SSO_SAML_STANDARD.md`](SSO_SAML_STANDARD.md) | User provisioning via GitHub SSO/SAML |
| [`SELF_HEALING_SECRET_ROTATION.md`](../SELF_HEALING_SECRET_ROTATION.md) | Automated secret rotation with retry + escalation |
| [`VAULT_AGENT_STANDARD.md`](VAULT_AGENT_STANDARD.md) | HashiCorp Vault for enterprise secret management |
| [`SECURITY_STANDARD.md`](SECURITY_STANDARD.md) | Overall security posture and tooling |

---

## 13. References

- [StrongDM Documentation](https://docs.strongdm.com/references/api) — evaluated, not adopted
- [StrongDM SDK Python](https://github.com/strongdm/strongdm-sdk-python) — evaluated, not adopted
- [StrongDM Terraform Provider](https://github.com/strongdm/terraform-provider-sdm) — evaluated, not adopted
- [Infisical Documentation](https://infisical.com/docs) — **adopted**
- [Infisical GitHub](https://github.com/Infisical/infisical) — MIT license
- [Kong Gateway OSS](https://docs.konghq.com/gateway/latest/) — **adopted**
- [OpenBao (Vault fork)](https://github.com/openbao/openbao) — MPL 2.0, enterprise alternative
- [Mozilla SOPS](https://github.com/mozilla/sops) — GitOps secret encryption
