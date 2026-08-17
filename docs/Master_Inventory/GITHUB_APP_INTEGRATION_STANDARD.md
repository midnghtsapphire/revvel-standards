# GitHub App & API Integration Standard

**Version:** 1.0.0
**Date:** April 14, 2026
**Status:** Mandatory Policy
**Author:** Audrey Evans (MIDNGHTSAPPHIRE)

---

## 1. Introduction

Every Revvel and MIDNGHTSAPPHIRE project that needs to receive external events, make authenticated GitHub API calls, manage tokens, or run automations across multiple repositories **must** use a **GitHub App** as the primary integration identity. Personal access tokens (PATs) and OAuth apps are acceptable only for personal use — they must never be used as the identity for a shared automation or service.

This standard covers:
- When to use a GitHub App vs. a PAT vs. an OAuth App vs. GitHub Actions GITHUB_TOKEN
- How to register, configure, and install a GitHub App
- How to authenticate as an App Installation (short-lived tokens)
- CLI tooling (`gh` CLI and Octokit.js)
- GitHub Enterprise Cloud / EMU considerations for the Freedom Angel Corps org

---

## 2. Integration Methods Comparison

| Method | Best For | Access Scope | Token Lifetime | Tied to a Human? |
|---|---|---|---|---|
| **GitHub App** | Long-lived automations, cross-repo bots, webhooks | Fine-grained, per-installation | 1 hour (auto-renewed) | No — standalone identity |
| **PAT (Classic)** | Quick personal scripts, local dev | Broad (repo, org, user) | Until manually revoked | Yes — your account |
| **Fine-Grained PAT** | Personal scripts with narrow scope | Per-repo, permission-level | Set expiry (max 1 year) | Yes — your account |
| **OAuth App** | Third-party apps acting on behalf of a user | Delegated user permissions | Until revoked | Yes — user who authorized |
| **Actions GITHUB_TOKEN** | Steps inside a GitHub Actions workflow | Scoped to that repo + workflow | Job lifetime only | No — but limited to one repo |
| **GitHub Enterprise Managed Tokens** | Enterprise-wide service accounts | Org/enterprise level | Configurable | No — enterprise identity |

**Rule:** For any automation that must survive past a single workflow run, access more than one repository, or receive webhooks from outside GitHub — always use a **GitHub App**.

---

## 3. GitHub App Setup (Step-by-Step)

### 3.1 Register the App

1. Go to **GitHub Settings → Developer Settings → GitHub Apps → New GitHub App**
   - For the Freedom Angel Corps org: `https://github.com/organizations/freedom-angel-corps/settings/apps/new`
   - For personal use under midnghtsapphire: `https://github.com/settings/apps/new`

2. Fill in the required fields:

   | Field | Recommended Value |
   |---|---|
   | **GitHub App name** | `revvel-automation` (or `fac-revvel-agent` for org) |
   | **Homepage URL** | `https://github.com/midnghtsapphire` |
   | **Webhook URL** | Your server URL, e.g., `https://your-agent.revvel.app/webhook` |
   | **Webhook secret** | Generate a strong random string — store in HashiCorp Vault |
   | **Callback URL** | Required only if implementing user OAuth flow |

3. **Select Permissions** under *Permissions & events*:

   | Permission | Level | Why |
   |---|---|---|
   | Repository: Contents | Read & write | Clone, commit, push |
   | Repository: Issues | Read & write | Create/manage issues |
   | Repository: Pull requests | Read & write | Open/merge PRs |
   | Repository: Metadata | Read | Always required |
   | Repository: Workflows | Read & write | Manage Actions workflows |
   | Repository: Secrets | Read & write | Manage GitHub Secrets |
   | Organization: Members | Read | Enumerate org members |
   | Organization: Administration | Read | Org-level settings (Enterprise only) |

4. **Subscribe to Events** (check all that apply):
   - `push`, `pull_request`, `issues`, `issue_comment`
   - `create`, `delete` (branches/tags)
   - `workflow_run`, `check_run`, `check_suite`
   - `installation`, `installation_repositories`

5. Set **"Where can this GitHub App be installed?"** to:
   - `Only on this account` — for personal projects
   - `Any account` — if the app needs to work across orgs (e.g., Freedom Angel Corps installs it too)

### 3.2 Generate a Private Key

After creating the app, scroll to the bottom of its settings page and click **"Generate a private key"**. A `.pem` file downloads automatically.

**IMPORTANT:** Store this key immediately in HashiCorp Vault:

```bash
vault kv put revvel/apps/github-app/prod \
  app_id="YOUR_APP_ID" \
  private_key_pem="$(cat /path/to/your-app.pem)" \
  webhook_secret="YOUR_WEBHOOK_SECRET"
```

Then delete the `.pem` file from disk. Never commit it to a repository.

### 3.3 Install the App

1. From the app's settings page, click **"Install App"**.
2. Select the account or organization to install it on.
3. Choose **"All repositories"** or select specific repos.
4. Note the **Installation ID** from the resulting URL (you'll need it for authentication).

---

## 4. Authentication: Acting as the App

GitHub Apps never use their private key directly for API calls. Instead, they:

1. Sign a short-lived **JWT** using the private key (valid 10 minutes max)
2. Exchange the JWT for an **installation access token** (valid 1 hour)
3. Use that token for all API calls within that installation

### 4.1 With Octokit.js (Node.js)

```javascript
import { App } from "@octokit/app";
import { createNodeMiddleware } from "@octokit/webhooks";

const app = new App({
  appId: process.env.GITHUB_APP_ID,
  privateKey: process.env.GITHUB_APP_PRIVATE_KEY,  // PEM string from Vault
  webhooks: {
    secret: process.env.GITHUB_WEBHOOK_SECRET,
  },
});

// Get installation access token for a specific installation
const octokit = await app.getInstallationOctokit(Number(process.env.GITHUB_INSTALLATION_ID));

// Make an API call
const { data } = await octokit.rest.issues.create({
  owner: "midnghtsapphire",
  repo: "revvel-standards",
  title: "Automated issue from GitHub App",
});
```

### 4.2 With GitHub Actions (Using the App Token)

Use the official `actions/create-github-app-token` action to generate an installation token inside a workflow:

```yaml
# .github/workflows/app-auth-example.yml
name: GitHub App Auth Example
on: [push]

jobs:
  api-call:
    runs-on: ubuntu-latest
    steps:
      - name: Generate App Token
        id: app-token
        uses: actions/create-github-app-token@v1
        with:
          app-id: ${{ secrets.APP_ID }}
          private-key: ${{ secrets.APP_PRIVATE_KEY }}

      - name: Use token to call API
        env:
          GH_TOKEN: ${{ steps.app-token.outputs.token }}
        run: |
          gh api /repos/midnghtsapphire/revvel-standards/issues \
            -f title="Automated issue" \
            -f body="Created by the GitHub App"
```

### 4.3 With `gh` CLI

```bash
# Authenticate with a token from your App
export GH_TOKEN="$(vault kv get -field=token revvel/apps/github-app/tokens/midnghtsapphire)"

# List issues
gh issue list --repo midnghtsapphire/revvel-standards

# Create an issue
gh issue create \
  --repo midnghtsapphire/revvel-standards \
  --title "New automated issue" \
  --label "New Project" \
  --body "Created via GitHub App token"

# Call raw API endpoint
gh api /repos/midnghtsapphire/revvel-standards/contents/README.md
```

---

## 5. Receiving External Requests (Webhooks)

### 5.1 Webhook Server Architecture

```text
External Source                GitHub                  Your Agent Server
─────────────────     ─────────────────────     ─────────────────────────
User pushes code  →   GitHub fires webhook  →   POST /webhook
API call made     →   GitHub fires webhook  →   Validate signature
Issue opened      →   GitHub fires webhook  →   Route to handler
                                                Process & respond
```

### 5.2 Webhook Signature Validation

**Always validate the HMAC-SHA256 signature** before processing any webhook payload:

```javascript
import { createHmac, timingSafeEqual } from "crypto";

function validateWebhookSignature(payload, signature, secret) {
  const expectedSig = "sha256=" + createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSig);
  if (sigBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(sigBuffer, expectedBuffer);
}
```

### 5.3 Minimal Webhook Server (Node.js + Octokit)

```javascript
import { App, createNodeMiddleware } from "@octokit/app";
import http from "http";

const app = new App({
  appId: process.env.GITHUB_APP_ID,
  privateKey: process.env.GITHUB_APP_PRIVATE_KEY,
  webhooks: { secret: process.env.GITHUB_WEBHOOK_SECRET },
});

app.webhooks.on("issues.opened", async ({ octokit, payload }) => {
  console.log(`New issue opened: #${payload.issue.number}`);
  await octokit.rest.issues.createComment({
    owner: payload.repository.owner.login,
    repo: payload.repository.name,
    issue_number: payload.issue.number,
    body: "👋 Hello from the Revvel automation agent!",
  });
});

app.webhooks.onError((error) => {
  console.error("Webhook error:", error);
});

const middleware = createNodeMiddleware(app.webhooks, { path: "/webhook" });
http.createServer(middleware).listen(3000);
console.log("Webhook server listening on port 3000");
```

---

## 6. Secret Management for App Credentials

All GitHub App credentials follow the Vault Agent Standard (`VAULT_AGENT_STANDARD.md`).

| Secret | Vault Path | Notes |
|---|---|---|
| App ID | `revvel/apps/github-app/prod/app_id` | Not sensitive but stored for consistency |
| Private Key (PEM) | `revvel/apps/github-app/prod/private_key_pem` | Highly sensitive — never log or expose |
| Webhook Secret | `revvel/apps/github-app/prod/webhook_secret` | Used for HMAC signature validation |
| Installation ID | `revvel/apps/github-app/prod/installation_id` | Per-account — may have multiple |

Reference them in GitHub Actions via repository secrets:
- `APP_ID` → store the numeric app ID
- `APP_PRIVATE_KEY` → store the full PEM string
- `APP_WEBHOOK_SECRET` → store the webhook secret

---

## 7. Required Environment Variables

```bash
# .env.example (commit this — no real values)
GITHUB_APP_ID=123456
GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
GITHUB_WEBHOOK_SECRET=your-webhook-secret-here
GITHUB_INSTALLATION_ID=12345678
```

---

## 8. CLI Reference (`gh` CLI)

The `gh` CLI is the official GitHub command-line tool. Install it with:

```bash
# macOS
brew install gh

# Linux (Debian/Ubuntu)
sudo apt install gh

# Windows
winget install --id GitHub.cli
```

### Common Commands for App-Level Automation

```bash
# Authenticate (interactive)
gh auth login

# Switch to App token
export GH_TOKEN="<installation-access-token>"

# Repository operations
gh repo list midnghtsapphire
gh repo clone midnghtsapphire/revvel-standards

# Issue management
gh issue create --repo ORG/REPO --title "..." --body "..." --label "New Project"
gh issue list --repo ORG/REPO --label "New Project"

# PR management
gh pr create --base main --head feature-branch --title "..." --body "..."
gh pr merge 42 --merge

# Raw API (when gh commands don't cover your use case)
gh api /orgs/midnghtsapphire/repos --paginate
gh api /repos/midnghtsapphire/revvel-standards/issues \
  --method POST \
  -f title="Test issue" \
  -f body="Test body"

# GraphQL API
gh api graphql -f query='{ viewer { login } }'
```

---

## 9. Freedom Angel Corps (Enterprise) vs. Personal Account

See `docs/GITHUB_ENTERPRISE_RESEARCH.md` for the full research comparison. Quick decision table:

| Scenario | Use Personal (midnghtsapphire) | Use Enterprise (FAC) |
|---|---|---|
| Personal side projects | ✅ | ❌ |
| Revvel products for clients | ✅ | Consider for billing |
| Team of 5+ developers | ❌ | ✅ |
| Needs SSO / SAML | ❌ | ✅ |
| Advanced audit logs | ❌ | ✅ |
| Cross-org app sharing | Limited | ✅ (Enterprise App) |
| midnghtsapphire needs access to FAC resources | Install FAC App on personal too | ✅ — install on both |

**Key point:** A GitHub App registered under Freedom Angel Corps can be installed on both the FAC org **and** the `midnghtsapphire` personal account. This is the recommended approach for maximum flexibility.

---

## 10. Compliance Checklist

Before deploying any GitHub App integration, verify:

- [ ] Private key stored in HashiCorp Vault — not in code or `.env`
- [ ] Webhook signature validation implemented with `timingSafeEqual`
- [ ] App permissions scoped to only what is needed (principle of least privilege)
- [ ] `APP_ID`, `APP_PRIVATE_KEY`, `APP_WEBHOOK_SECRET` stored as GitHub Secrets in all repos that use them
- [ ] Installation access tokens are never logged or written to disk
- [ ] Webhook server deployed behind HTTPS (TLS required by GitHub)
- [ ] Token renewal logic implemented (1-hour expiry on installation tokens)
- [ ] App installed on all required accounts/orgs

---

## 11. References

- GitHub Apps documentation: <https://docs.github.com/en/apps>
- Authenticating as a GitHub App: <https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/authenticating-as-a-github-app-installation>
- Octokit.js App SDK: <https://github.com/octokit/app.js>
- `actions/create-github-app-token`: <https://github.com/actions/create-github-app-token>
- `gh` CLI: <https://cli.github.com/>
- GitHub Enterprise Cloud: <https://docs.github.com/en/enterprise-cloud@latest>
- Related Revvel Standards:
  - `VAULT_AGENT_STANDARD.md` — secret management
  - `SECURITY_STANDARD.md` — overall security policy
  - `MCP_STANDARD.md` — MCP server integration
  - `docs/GITHUB_ENTERPRISE_RESEARCH.md` — Enterprise vs. personal deep dive
  - `AI_RESEARCH_MODULE_STANDARD.md` — how to use AI agents for research
