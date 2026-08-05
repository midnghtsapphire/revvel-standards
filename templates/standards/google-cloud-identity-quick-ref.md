# Google Cloud Identity & Workforce Identity Federation — Quick Reference

**Cheat sheet for Google Cloud identity configuration**

---

## Decision Tree: Which Authentication Framework

```text
Do you use Google Workspace or Cloud Identity?
├─ YES → Use Cloud Identity (Case 1)
│         ✓ All identities managed in Google
│         ✓ No external IdP needed
│
└─ NO → Do you want to sync identities into Cloud Identity?
    ├─ YES → Use Cloud Identity with Sync (Case 2 or 3)
    │        Case 2: Authenticate with Cloud Identity
    │        Case 3: Authenticate with external IdP (SSO)
    │
    └─ NO → Use Workforce Identity Federation
             ✓ No identity sync required
             ✓ Federated authentication
             ✓ Supports: Entra ID, Ping, OIDC, SAML 2.0
```

---

## Attribute Mapping Quick Reference

### Microsoft Entra ID

| Protocol | google.subject | google.groups |
|---|---|---|
| **OIDC** | `assertion.email` | `assertion.groups` |
| **SAML** | `assertion.attributes['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'][0]` | `assertion.attributes['http://schemas.microsoft.com/ws/2008/06/identity/claims/groups']` |
| **Large Groups (>150)** | `user.emails[0].value.lowerAscii()` | `group.externalId` (via SCIM) |

---

## Required APIs

```bash
gcloud services enable \
  iam.googleapis.com \
  cloudidentity.googleapis.com \
  iamcredentials.googleapis.com \
  sts.googleapis.com
```

---

## Quick Setup Commands

### Create Workforce Pool
```bash
gcloud iam workforce-pools create POOL_ID \
  --location=global \
  --description="Workforce Identity Pool" \
  --display-name="POOL_ID"
```

### Create OIDC Provider
```bash
gcloud iam workforce-pools providers create-oidc PROVIDER_ID \
  --workforce-pool=POOL_ID \
  --location=global \
  --issuer-uri="https://login.microsoftonline.com/TENANT_ID/v2.0" \
  --client-id="CLIENT_ID" \
  --attribute-mapping="google.subject=assertion.email,google.groups=assertion.groups"
```

### Create SAML Provider (Microsoft Entra ID)
```bash
gcloud iam workforce-pools providers create-saml PROVIDER_ID \
  --workforce-pool=POOL_ID \
  --location=global \
  --idp-metadata-url="https://login.microsoftonline.com/TENANT_ID/federationmetadata/2007-06/federationmetadata.xml" \
  --attribute-mapping="google.subject=assertion.attributes['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'][0],google.groups=assertion.attributes['http://schemas.microsoft.com/ws/2008/06/identity/claims/groups']"
```

---

## SCIM Setup (Entra ID Only)

### Prerequisites
- ✅ Workforce pool and provider created
- ✅ OIDC or SAML configured
- ✅ More than ~150 groups OR need autocomplete

### Configuration Steps

1. **Get SCIM Endpoint URL:**
   ```text
   https://iam.googleapis.com/v1/locations/global/workforcePools/POOL_ID/providers/PROVIDER_ID/scim
   ```

2. **Get SCIM Bearer Token:**
   ```bash
   gcloud iam workforce-pools providers describe PROVIDER_ID \
     --workforce-pool=POOL_ID \
     --location=global \
     --format="value(scim.bearerToken)"
   ```

3. **Configure in Entra ID:**
   - Enterprise Applications → Your app → Provisioning
   - Set Mode to "Automatic"
   - Tenant URL: (SCIM endpoint from step 1)
   - Secret Token: (bearer token from step 2)
   - Test connection → Save

4. **Map Attributes:**
   - `userPrincipalName` → `userName`
   - `mail` → `emails[type eq "work"].value`
   - `givenName` → `name.givenName`
   - `surname` → `name.familyName`

5. **Enable Provisioning:**
   - Set Status to "On"
   - Save

---

## Common Issues & Solutions

| Issue | Solution |
|---|---|
| `google.subject` is empty | Check IdP sends email claim; verify attribute mapping syntax |
| Groups not syncing | For >150 groups, enable SCIM; for fewer, check group claim in IdP |
| Authentication fails | Verify workforce pool/provider config; check IdP metadata URL |
| SCIM test fails | Verify SCIM endpoint URL format; regenerate bearer token |
| User not in Google Cloud | Check user provisioned in workforce pool; verify group membership |

---

## Debugging Commands

```bash
# List workforce pools
gcloud iam workforce-pools list --location=global

# Describe a pool
gcloud iam workforce-pools describe POOL_ID --location=global

# List providers
gcloud iam workforce-pools providers list \
  --workforce-pool=POOL_ID \
  --location=global

# Describe a provider
gcloud iam workforce-pools providers describe PROVIDER_ID \
  --workforce-pool=POOL_ID \
  --location=global

# List workforce identities (users)
gcloud iam workforce-pools providers list-workforce-identities PROVIDER_ID \
  --workforce-pool=POOL_ID \
  --location=global

# View audit logs
gcloud logging read "protoPayload.serviceName=\"iam.googleapis.com\"" \
  --limit=50 \
  --format=json
```

---

## Security Checklist

- [ ] Enforce MFA at IdP level
- [ ] Use conditional access policies (location, device, risk)
- [ ] Session timeout ≤ 8 hours
- [ ] Enable Cloud Audit Logs for all identity operations
- [ ] Rotate SCIM bearer tokens every 90 days
- [ ] Restrict SCIM endpoint by IP (firewall rules)
- [ ] Monitor provisioning logs for anomalies
- [ ] Use least privilege for IdP permissions

---

## One IdP Per Project Rule

**Important:** You can only have **ONE** IdP per Google Cloud project.

**Cannot mix:**
- ❌ Multiple Workforce Identity Federation pools with different IdPs

**Workaround:** Create separate Google Cloud projects for each IdP.

---

## NotebookLM Enterprise Integration

### Enable Data Source Access Control
1. Complete identity setup (Cloud Identity or Workforce Identity Federation)
2. Ensure `google.groups` attribute mapped and syncing
3. In NotebookLM Enterprise admin console, enable access control
4. Configure data source permissions using Cloud Identity groups
5. Test with pilot users

### Autocomplete Requirements
- **Cloud Identity:** ✅ Works automatically
- **Workforce Identity Federation:** ✅ Requires SCIM (Entra ID only)

---

## Resources

- **Full Standard:** [docs/Master_Inventory/GOOGLE_CLOUD_IDENTITY_STANDARD.md](../../docs/Master_Inventory/GOOGLE_CLOUD_IDENTITY_STANDARD.md)
- **Setup Script:** [templates/standards/google-cloud-identity-setup.sh](google-cloud-identity-setup.sh)
- **SCIM Config:** [templates/standards/google-cloud-scim-config.md](google-cloud-scim-config.md)
- **Official Docs:**
  - [Workforce Identity Federation](https://cloud.google.com/iam/docs/workforce-identity-federation)
  - [Configure with Entra ID](https://cloud.google.com/iam/docs/workforce-sign-in-microsoft-entra-id)
  - [Configure SCIM](https://cloud.google.com/iam/docs/configure-scim-ms-entra)

---

*Part of Revvel Standards. Keep this card handy during Google Cloud identity setup.*
