# SSO & SAML Identity Standard

**Version:** 1.0.0
**Date:** April 15, 2026
**Status:** Mandatory Policy
**Author:** Audrey Evans (MIDNGHTSAPPHIRE)

---

## 1. Introduction

Single Sign-On (SSO) via SAML 2.0 is the **required** login method for all Revvel and MIDNGHTSAPPHIRE applications that serve internal users or operate under a GitHub organization with SSO enabled. SSO must be offered as a login option in every app and used wherever a user's corporate identity needs to be resolved.

This standard covers:
- When and how to offer SSO login in applications
- How to resolve a GitHub username to its SAML/SSO email identity in CI/CD
- GitHub organization SSO enforcement requirements
- Secrets and configuration management for SSO

---

## 2. SSO Login in Applications

### 2.1. Clerk (Recommended)

Clerk supports SAML SSO natively for enterprise plans. Enable it in every app:

1. **Dashboard:** Settings → SSO Connections → Add a SAML connection
2. Configure your identity provider (IdP): Google Workspace, Okta, Azure AD, etc.
3. Supply the IdP metadata URL or XML to Clerk
4. Map IdP attributes to Clerk user fields:

   | IdP Attribute | Clerk Field |
   |---|---|
   | `email` | `emailAddress` |
   | `firstName` | `firstName` |
   | `lastName` | `lastName` |
   | `groups` | `organizationMemberships` |

5. Set SSO as the **default** login method for organization members.

```ts
// Next.js — enforce SSO on protected routes via Clerk middleware
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isProtected = createRouteMatcher(['/dashboard(.*)', '/admin(.*)']);

export default clerkMiddleware((auth, req) => {
  if (isProtected(req)) {
    auth().protect();
  }
});

export const config = { matcher: ['/((?!.*\\..*|_next).*)', '/'] };
```

### 2.2. Offering SSO as a Login Option

Every app that has a login page must present SSO alongside other methods:

```tsx
// components/LoginPage.tsx (example pattern)
import { SignIn } from '@clerk/nextjs';

export default function LoginPage() {
  return (
    <SignIn
      appearance={{
        elements: {
          socialButtonsBlockButton: 'sso-button',
        },
      }}
    />
  );
}
```

**Rules:**
- SSO must appear as the **first** login option for users accessing from an organization domain.
- Password-only login is **forbidden** for admin accounts — SSO or MFA is required.
- SSO session tokens must be stored in `httpOnly` cookies, not `localStorage`.

---

## 3. Resolving GitHub SAML Identity in CI/CD

When a workflow needs to map a GitHub username (e.g., a PR author) to their corporate SSO email, query GitHub's GraphQL SAML identity mapping directly with `actions/github-script`. (Do **not** use the third-party `gagoar/get-saml-identity-action` — its only published tag never shipped its compiled `dist/` bundle and fails every run with `File not found: .../dist/index.js`.)

### 3.1. Why This Is Needed

GitHub Actions exposes `github.actor` (the GitHub username), but not the user's corporate email. In organizations with SAML SSO enforced, each GitHub user has an associated SAML identity (their corporate email). This action queries that mapping so workflows can:

- Send notifications to corporate email addresses
- Enforce that all PR authors have active SSO sessions
- Log identity-mapped audit events

### 3.2. Required GitHub Token Permissions

The token used to query SAML identities **must** have the `admin:org` scope. This is not available via the default `GITHUB_TOKEN` — it requires a dedicated secret.

| Secret | Description |
|---|---|
| `ORG_ADMIN_TOKEN` | A GitHub PAT or App installation token with `admin:org` scope |

Store this secret in GitHub → Settings → Secrets → Actions → `ORG_ADMIN_TOKEN`.

### 3.3. Workflow Usage

```yaml
# Copy to .github/workflows/ or reference as a called workflow
name: Resolve SAML Identity

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  resolve-identity:
    name: Resolve PR Author SAML Identity
    runs-on: ubuntu-latest

    permissions:
      contents: read

    steps:
      - name: Get SAML identity for PR author
        id: saml
        uses: actions/github-script@v8
        env:
          TARGET_USERNAME: ${{ github.actor }}
        with:
          github-token: ${{ secrets.ORG_ADMIN_TOKEN }}
          script: |
            const result = await github.graphql(
              `query($org: String!, $login: String!) {
                organization(login: $org) {
                  samlIdentityProvider {
                    externalIdentities(first: 1, login: $login) {
                      nodes { samlIdentity { nameId } }
                    }
                  }
                }
              }`,
              { org: context.repo.owner, login: process.env.TARGET_USERNAME }
            );
            const provider = result.organization && result.organization.samlIdentityProvider;
            const node = provider && provider.externalIdentities.nodes[0];
            core.setOutput('identity', (node && node.samlIdentity && node.samlIdentity.nameId) || '');

      - name: Print resolved identity
        env:
          IDENTITY: ${{ steps.saml.outputs.identity }}
        run: |
          echo "GitHub user : ${{ github.actor }}"
          echo "SSO email   : ${IDENTITY}"
```

For the full reusable template, see `templates/cicd/get-saml-identity.yml`.

### 3.4. Handling Missing SAML Identity

Not every GitHub user in an organization will have a linked SAML identity (e.g., bot accounts, external collaborators without SSO). Always guard against an empty output:

```yaml
      - name: Fail if no SSO identity found
        if: ${{ steps.saml.outputs.identity == '' }}
        run: |
          echo "::error::No SAML/SSO identity found for ${{ github.actor }}. Ensure SSO is configured."
          exit 1
```

---

## 4. GitHub Organization SSO Enforcement

For the `midnghtsapphire` and `freedom-angel-corps` organizations:

1. **Require SAML SSO** — GitHub → Org Settings → Security → SAML single sign-on → Require.
2. **Revoke sessions** for members who do not re-authenticate via SSO within 24 hours of enforcement.
3. **Authorized OAuth Apps** — Only apps that have been SSO-authorized can access organization resources.

```bash
# Verify SAML is enabled for your org (requires admin:org token)
gh api graphql -f query='
{
  organization(login: "midnghtsapphire") {
    samlIdentityProvider {
      issuer
      ssoUrl
      digestMethod
      signatureMethod
    }
  }
}'
```

---

## 5. Secret Management for SSO Credentials

| Secret | Vault Path | GitHub Secret Name |
|---|---|---|
| SAML IdP metadata URL | `revvel/sso/prod/idp_metadata_url` | `SAML_IDP_METADATA_URL` |
| SAML certificate | `revvel/sso/prod/saml_certificate` | `SAML_CERTIFICATE` |
| Org admin token (for SAML queries) | `revvel/sso/prod/org_admin_token` | `ORG_ADMIN_TOKEN` |
| Clerk SAML connection ID | `revvel/sso/prod/clerk_saml_connection_id` | `CLERK_SAML_CONNECTION_ID` |

All secrets follow the Vault Agent Standard (`VAULT_AGENT_STANDARD.md`).

---

## 6. SSO Checklist for Every New App

Before launching any application that serves internal users:

- [ ] SSO login option is presented on the login page
- [ ] SSO is configured as the default for organization members
- [ ] Admin accounts require SSO (password-only login is disabled for admins)
- [ ] SAML identity resolution workflow is in place for CI/CD (if org uses GitHub SSO)
- [ ] `ORG_ADMIN_TOKEN` secret is provisioned with `admin:org` scope
- [ ] Session tokens stored in `httpOnly` cookies
- [ ] SAML IdP metadata and certificate stored in Vault
- [ ] SSO enforcement is enabled at the GitHub organization level
