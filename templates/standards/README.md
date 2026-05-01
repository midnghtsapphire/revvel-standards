# Standards Templates

Copy this entire `standards/` folder into the root of every new app repo. Fill in all `[PLACEHOLDER]` values before the first coding session.

---

## Session & Workflow Templates

| File | Purpose | Copy To |
|---|---|---|
| `01_SYSTEM_STATE.md` | Current system status — what is actually working in production | `SYSTEM_STATE.md` (repo root) |
| `02_MVI_CONTRACT_TEMPLATE.md` | Blank MVI Contract — fill in at the start of every coding session | Use as session notes, not committed to repo |
| `03_CONTEXT_PRIMER.md` | Tech stack and architecture reference for new agents | `CONTEXT_PRIMER.md` (repo root) |

## Identity & Authentication Templates

| File | Description |
|---|---|
| [`google-cloud-identity-setup.sh`](google-cloud-identity-setup.sh) | Automated setup script for Google Cloud Workforce Identity Federation |
| [`google-cloud-scim-config.md`](google-cloud-scim-config.md) | Complete SCIM provisioning configuration template for Microsoft Entra ID |
| [`google-cloud-identity-quick-ref.md`](google-cloud-identity-quick-ref.md) | Quick reference card for Google Cloud identity configuration |

**Related Standards:**
- [Google Cloud Identity & Workforce Identity Federation Standard](../../docs/Master_Inventory/GOOGLE_CLOUD_IDENTITY_STANDARD.md)
- [SSO & SAML Identity Standard](../../docs/Master_Inventory/SSO_SAML_STANDARD.md)

**Related Workflows:**
- [google-cloud-identity-verify.yml](../cicd/google-cloud-identity-verify.yml) - CI/CD verification workflow

## Analytics & Telemetry Templates

| File | Description |
|---|---|
| [`mixpanel-init.ts`](mixpanel-init.ts) | Drop-in Mixpanel SDK initialization (Next.js, React, Node) |
| [`mixpanel-events.md`](mixpanel-events.md) | Standard Mixpanel event catalog and naming conventions |
| [`posthog-init.ts`](posthog-init.ts) | Drop-in PostHog SDK initialization (Next.js, React, Node) |
| [`posthog-events.md`](posthog-events.md) | Standard PostHog event catalog and naming conventions |

---

## Usage

```bash
# From your new app repo root:
cp -r path/to/revvel-standards/templates/standards/* .

# Then fill in all [PLACEHOLDER] values in SYSTEM_STATE.md and CONTEXT_PRIMER.md
# before your first coding session.
```

---

## Workflow

1. **On repo creation:** Copy all three files and fill in placeholders
2. **Before each session:** Read `SYSTEM_STATE.md` fully; copy and fill `02_MVI_CONTRACT_TEMPLATE.md`
3. **After each session:** Update `SYSTEM_STATE.md` with session results
4. **When onboarding a new agent:** Hand off `SYSTEM_STATE.md` + `CONTEXT_PRIMER.md` as the first two reads

See `standards/SYSTEM_STATE_STANDARD.md` and `standards/MVI_CONTRACT_STANDARD.md` in `revvel-standards` for the full rules.
