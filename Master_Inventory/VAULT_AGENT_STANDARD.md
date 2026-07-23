# Vault Agent Standard

**Version:** 1.0.0  
**Date:** April 14, 2026  
**Status:** Mandatory Policy  
**Author:** Audrey Evans (MIDNGHTSAPPHIRE)

---

## 1. Purpose

The **Vault Agent** is a short-lived, ephemeral specialist agent that acts as the single gatekeeper for all secret provisioning across every Revvel project. Whenever a coding agent, CI pipeline, or project bootstrap needs an API key, OAuth token, database credential, MCP connection string, or any other secret, it must go through the Vault Agent — never source, hard-code, or handle credentials itself.

**The Vault Agent does three things:**
1. **Checks the vault first** — if the credential already exists, return the vault reference.
2. **Provisions new credentials** — if the credential is missing, register with the external service, obtain the credential, and store it in HashiCorp Vault immediately.
3. **Dies cleanly** — after provisioning it returns a vault path reference and terminates. It never lingers, never caches secrets in memory, and never writes secrets to disk or code.

---

## 2. When to Spawn the Vault Agent

Spawn the Vault Agent (do NOT handle credentials yourself) whenever any of the following are true:

| Trigger | Examples |
|---|---|
| A new external API needs to be connected | OpenAI, Stripe, Resend, Twilio, ElevenLabs |
| A new OAuth app or token must be registered | GitHub App, Google OAuth, Slack App |
| A new MCP server needs credentials | Any entry in `.mcp.json` that requires env vars |
| A database is being provisioned for the first time | DigitalOcean Managed Postgres, PlanetScale, Supabase |
| A CI/CD pipeline needs a service account | GitHub Actions secrets, DigitalOcean API token |
| An existing credential has expired or been rotated | Detected by Vault TTL, CI failure, or security scan |
| A new project is being bootstrapped | `bootstrap-new-project.sh` always invokes the Vault Agent |

---

## 3. Architecture

```text
┌─────────────────────────────────────────────────────────────────┐
│                        Coding Agent / CI                        │
│  (Claude Code, GitHub Copilot, Cursor, Cline, Windsurf, etc.)  │
└────────────────────────────┬────────────────────────────────────┘
                             │ needs credential
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                        VAULT AGENT                              │
│  1. vault.read(path)  ──►  exists? return vault path reference  │
│  2. vault.read(path)  ──►  missing?                             │
│     └─► register with external service (browser / API)         │
│     └─► vault.write(path, credential)                           │
│     └─► return vault path reference                             │
│  3. terminate — never keep secrets in memory                    │
└────────────────────────────┬────────────────────────────────────┘
                             │ vault path reference (not the secret)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    HashiCorp Vault (KV v2)                      │
│  Path: revvel/apps/{APP_NAME}/{env}/{service}                   │
│  Auth: AppRole (CI) + OIDC (human operators)                    │
└─────────────────────────────────────────────────────────────────┘
                             │ secret injected at runtime
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Running Application                           │
│  Reads: process.env.STRIPE_SECRET_KEY  (never the key itself)  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Vault Path Convention

Every secret stored by the Vault Agent must follow this path convention:

```text
revvel/apps/{APP_NAME}/{ENVIRONMENT}/{SERVICE}
```

| Segment | Values | Example |
|---|---|---|
| `{APP_NAME}` | kebab-case repo name | `mind-mappr`, `growlingeyes`, `openclaw` |
| `{ENVIRONMENT}` | `prod`, `staging`, `dev` | `prod` |
| `{SERVICE}` | kebab-case service name | `stripe`, `openai`, `database`, `github` |

**Examples:**
```text
revvel/apps/mind-mappr/prod/stripe
revvel/apps/openclaw/staging/openai
revvel/apps/growlingeyes/prod/database
revvel/apps/revvel-standards/prod/github
```

---

## 5. Credential Types and Provisioning Flows

### 5.1. API Keys (Stripe, OpenAI, Resend, Twilio, etc.)

**Check-first flow:**
```bash
# Step 1: Check vault
vault kv get revvel/apps/{APP}/prod/{SERVICE}
# If found → return the vault path; agent done.

# Step 2: If not found, provision:
# - Navigate to the service dashboard
# - Create a new API key with minimum required permissions
# - Name the key: "revvel-{APP_NAME}-{env}-{date}"
# - Copy the key immediately (shown only once)

# Step 3: Store in vault
vault kv put revvel/apps/{APP}/prod/{SERVICE} \
  api_key="<key>" \
  created_at="$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  created_by="vault-agent" \
  rotation_due="$(date -u -d '+90 days' +%Y-%m-%dT%H:%M:%SZ)"

# Step 4: Return vault reference: revvel/apps/{APP}/prod/{SERVICE}
# Step 5: Terminate.
```

### 5.2. OAuth Tokens (GitHub, Google, Slack)

```bash
# Step 1: Check vault
vault kv get revvel/apps/{APP}/prod/{SERVICE}
# If access_token present and not expired → return vault path.

# Step 2: Register OAuth app if needed:
# - Create OAuth app on provider dashboard
# - Configure callback URL: https://{domain}/api/auth/callback/{service}
# - Capture client_id and client_secret

# Step 3: Complete OAuth flow to obtain tokens

# Step 4: Store in vault
vault kv put revvel/apps/{APP}/prod/{SERVICE} \
  client_id="<id>" \
  client_secret="<secret>" \
  access_token="<token>" \
  refresh_token="<refresh>" \
  expires_at="<unix-timestamp>" \
  scope="<granted-scopes>"

# Step 5: Return vault reference; terminate.
```

### 5.3. Database Credentials

```bash
# Step 1: Check vault
vault kv get revvel/apps/{APP}/prod/database
# If DATABASE_URL present → return vault path.

# Step 2: Provision database via DigitalOcean / Supabase / PlanetScale
# - Create database with least-privilege user
# - Restrict user to only the necessary tables/operations

# Step 3: Store in vault
vault kv put revvel/apps/{APP}/prod/database \
  DATABASE_URL="postgresql://user:pass@host:5432/dbname?sslmode=require" \
  DB_HOST="<host>" \
  DB_PORT="5432" \
  DB_NAME="<name>" \
  DB_USER="<user>"
# NEVER store DB_PASSWORD as plaintext — it's embedded in DATABASE_URL only.

# Step 4: Return vault reference; terminate.
```

### 5.4. MCP Server Credentials

```bash
# Step 1: Check vault
vault kv get revvel/apps/{APP}/prod/mcp-{SERVER_NAME}

# Step 2: Provision any credentials required by the MCP server
#         (varies per server — see MCP_STANDARD.md Section 5)

# Step 3: Store in vault
vault kv put revvel/apps/{APP}/prod/mcp-{SERVER_NAME} \
  <key>="<value>"
  # ...

# Step 4: Update .env.example with the new variable name (no real value)
# Step 5: Return vault reference; terminate.
```

### 5.5. GitHub Actions Secrets (CI/CD)

Secrets needed by CI must be injected as GitHub Actions Secrets, not just stored in Vault:

```bash
# Step 1: Read from vault
SECRET_VALUE=$(vault kv get -field=api_key revvel/apps/{APP}/prod/{SERVICE})

# Step 2: Push to GitHub Actions Secrets
gh secret set {SECRET_NAME} --body "$SECRET_VALUE" --repo {OWNER}/{REPO}

# Step 3: Document in .env.example and README CI section.
# Step 4: Terminate.
```

---

## 6. Security Rules (Non-Negotiable)

| Rule | Enforcement |
|---|---|
| Secrets NEVER appear in code, commits, or logs | `check-compliance.js` + TruffleHog scan in CI |
| The Vault Agent NEVER writes secrets to disk | Enforced by agent guardrails (no file write for secret values) |
| All vault reads use AppRole auth in CI; OIDC for humans | Vault policy enforced |
| Minimum-privilege: request only the scopes actually needed | Vault Agent checklist gate |
| Credentials are rotated every 90 days | Vault TTL + rotation-due metadata field |
| Credentials are named with `revvel-{app}-{env}-{date}` | Vault Agent naming convention |
| All provisioned credentials are logged (without values) to the DARE Log | Mandatory step in agent flow |

---

## 7. Vault Agent Lifecycle

```text
1. SPAWN
   └─► Triggered by: project bootstrap, agent needing a credential, or vault-provisioning.yml workflow

2. LOAD CONTEXT
   └─► Read: app name, environment, required credentials list
   └─► Load skill: skills/vault-agent/SKILL.md

3. FOR EACH REQUIRED CREDENTIAL:
   a. Check vault (vault kv get <path>)
   b. If exists and not expired → return vault path reference → move to next
   c. If missing or expired:
      i.  Provision with external service
      ii. vault kv put <path> <key>=<value> ...
      iii.If CI needs it: gh secret set <NAME> --body <value> --repo <OWNER>/<REPO>
      iv. Log the provisioning event to DARE Log (credential name, path, rotation_due only — no values)
      v.  Add variable name to .env.example

4. OUTPUT: List of vault path references for each credential
   └─► Never output actual credential values

5. TERMINATE — clear all in-memory state
```

---

## 8. Error Handling and the Ralph Loop

When the Vault Agent fails to provision a credential (network error, service outage, 2FA block, quota exceeded, etc.), it must NOT silently fail. It triggers the **Ralph Loop**:

### What Is the Ralph Loop

The Ralph Loop is a self-healing CI/error retry mechanism that:
1. **Detects** a failure (Vault Agent failure, CI failure, or any non-zero exit).
2. **Creates a GitHub Issue** labeled `auto-fix` + `copilot`, tagged for `@copilot` to resolve.
3. **Waits** for @copilot to open and merge a fix PR.
4. **Re-runs** the original workflow after the fix PR is merged.
5. **Loops** until success, with a max retry count (`max_retries: 5`) before escalating to human.

**Ralph Loop triggers for the Vault Agent:**
- External service registration fails (rate limit, 2FA required, service down)
- Vault write fails (permissions error, Vault sealed, connectivity)
- GitHub Actions secret push fails
- Credential validation fails after provisioning

**GitHub Issue template (Vault Agent failure):**
```text
## Vault Agent Failure — Manual Intervention Required

**App:** {APP_NAME}
**Environment:** {ENVIRONMENT}
**Service:** {SERVICE}
**Vault Path:** revvel/apps/{APP}/{ENV}/{SERVICE}
**Failure Reason:** {ERROR_MESSAGE}
**Timestamp:** {ISO_TIMESTAMP}
**Retry Attempt:** {ATTEMPT} of 5

---

## What Copilot Must Do

1. Investigate the failure reason above.
2. Manually provision the credential for `{SERVICE}`:
   - Log in to the service dashboard
   - Create the API key / OAuth token / credential
   - Run: `vault kv put {VAULT_PATH} <key>=<value>`
   - If CI needs it: `gh secret set {SECRET_NAME} --body <value> --repo {OWNER}/{REPO}`
3. Add the variable name (not the value) to `.env.example`
4. Open a PR with the `.env.example` update referencing this issue.
5. This issue will be auto-closed when the fix PR is merged and CI passes.

---
_This issue was created automatically by the Ralph Loop (vault-provisioning.yml)._
```

See `templates/cicd/ralph-loop.yml` for the full implementation.

---

## 9. Integration with Project Bootstrap

Every new project created using `bootstrap-new-project.sh` must invoke the Vault Agent provisioning workflow:

```bash
# In bootstrap-new-project.sh — after repo creation
echo "📦 Triggering Vault Agent provisioning..."
gh workflow run vault-provisioning.yml \
  --repo "$REPO_OWNER/$REPO_NAME" \
  --field app_name="$APP_NAME" \
  --field environment="prod" \
  --field services="database,github,openai"
```

The workflow is defined in `templates/cicd/vault-provisioning.yml`.

---

## 10. MCP Credential Management

When adding a new MCP server entry to `.mcp.json`, the Vault Agent must provision any required credentials before the entry is activated:

```json
// .mcp.json (CORRECT — uses env var references only)
{
  "mcpServers": {
    "stripe": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-stripe"],
      "env": {
        "STRIPE_SECRET_KEY": "${STRIPE_SECRET_KEY}"
      }
    }
  }
}
```

The Vault Agent ensures `STRIPE_SECRET_KEY` exists in vault at `revvel/apps/{APP}/prod/stripe` before this entry is committed.

**Vault Agent MCP checklist:**
- [ ] All `${ENV_VAR}` references in `.mcp.json` have a corresponding vault path
- [ ] All vault paths are documented in `.env.example` (variable names only, no values)
- [ ] All GitHub Actions secrets for CI MCP usage are set via `gh secret set`
- [ ] Rotation schedule is recorded in the DARE Log

---

## 11. Rotation and Expiry

All credentials provisioned by the Vault Agent include a `rotation_due` metadata field (90 days from creation). A scheduled GitHub Actions workflow (`monitor.yml`) checks for credentials nearing expiry and triggers the Vault Agent to rotate them before they expire.

```bash
# Rotation check (runs daily via monitor.yml)
vault kv metadata get revvel/apps/{APP}/prod/{SERVICE} \
  | jq '.data.custom_metadata.rotation_due'
# If rotation_due < (now + 7 days) → trigger vault-provisioning.yml with action=rotate
```

---

## 12. References

- `skills/vault-agent/SKILL.md` — agent-readable instructions
- `templates/agent-factory/VAULT_AGENT_TEMPLATE.md` — drop-in agent template
- `templates/cicd/vault-provisioning.yml` — GitHub Actions workflow
- `templates/cicd/ralph-loop.yml` — error retry loop triggering @copilot
- `SECURITY_STANDARD.md` — broader secret management policy
- `MCP_STANDARD.md` — MCP credential requirements
- `AGENT_FACTORY_STANDARD.md` — agent factory and self-healing loop
