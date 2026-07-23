# SCIM Provisioning Configuration Template
##
## This template provides example configurations for SCIM (System for Cross-domain Identity Management)
## provisioning with Google Cloud Workforce Identity Federation
##
## Reference: docs/Master_Inventory/GOOGLE_CLOUD_IDENTITY_STANDARD.md
## Official Docs: <https://cloud.google.com/iam/docs/configure-scim-ms-entra>

---

## Microsoft Entra ID SCIM Configuration

### Prerequisites
- Workforce Identity Federation pool and provider already created
- Microsoft Entra ID tenant with appropriate admin access
- Users and groups already defined in Entra ID

### Step 1: Create SCIM Endpoint in Google Cloud

```bash
# Create SCIM endpoint for your workforce pool provider
gcloud iam workforce-pools providers create-oidc PROVIDER_ID \
  --workforce-pool=WORKFORCE_POOL_ID \
  --location=global \
  --issuer-uri=https://login.microsoftonline.com/TENANT_ID/v2.0 \
  --client-id=CLIENT_ID \
  --attribute-mapping="google.subject=assertion.email,google.groups=assertion.groups" \
  --scim-endpoint-uri=https://iam.googleapis.com/v1/locations/global/workforcePools/WORKFORCE_POOL_ID/providers/PROVIDER_ID/scim
```

**Output:**
- SCIM Endpoint URL: `https://iam.googleapis.com/v1/locations/global/workforcePools/WORKFORCE_POOL_ID/providers/PROVIDER_ID/scim`
- SCIM Bearer Token: Generated automatically (retrieve via console or gcloud)

### Step 2: Retrieve SCIM Bearer Token

```bash
# Get provider details including SCIM token
gcloud iam workforce-pools providers describe PROVIDER_ID \
  --workforce-pool=WORKFORCE_POOL_ID \
  --location=global \
  --format="value(scim.bearerToken)"
```

**Important:** Store this token securely. You'll need it for Entra ID configuration.

### Step 3: Configure SCIM in Microsoft Entra ID

1. **Navigate to Enterprise Applications:**
   - Open Microsoft Entra admin center
   - Go to **Enterprise applications** → Your application

2. **Enable Provisioning:**
   - Click **Provisioning** in left sidebar
   - Set **Provisioning Mode** to **Automatic**

3. **Configure Admin Credentials:**
   - **Tenant URL:** `https://iam.googleapis.com/v1/locations/global/workforcePools/WORKFORCE_POOL_ID/providers/PROVIDER_ID/scim`
   - **Secret Token:** (paste SCIM bearer token from Step 2)
   - Click **Test Connection** to verify
   - Click **Save**

4. **Configure Mappings:**
   - Click **Mappings**
   - Configure attribute mappings (see below)

5. **Enable Provisioning:**
   - Set **Provisioning Status** to **On**
   - Click **Save**

---

## SCIM Attribute Mappings

### User Attribute Mappings (Entra ID → Google Cloud)

| Source (Entra ID) | Target (SCIM) | Type | Required |
|---|---|---|---|
| `userPrincipalName` | `userName` | Direct | ✅ Yes |
| `mail` | `emails[type eq "work"].value` | Direct | ✅ Yes |
| `givenName` | `name.givenName` | Direct | Recommended |
| `surname` | `name.familyName` | Direct | Recommended |
| `displayName` | `displayName` | Direct | Recommended |
| `mailNickname` | `nickName` | Direct | Optional |
| `accountEnabled` | `active` | Direct | ✅ Yes |

**Expression Mappings:**
```json
{
  "userName": "userPrincipalName",
  "emails": [
    {
      "primary": true,
      "type": "work",
      "value": "mail"
    }
  ],
  "name": {
    "givenName": "givenName",
    "familyName": "surname",
    "formatted": "displayName"
  },
  "displayName": "displayName",
  "nickName": "mailNickname",
  "active": "accountEnabled"
}
```

### Group Attribute Mappings (Entra ID → Google Cloud)

| Source (Entra ID) | Target (SCIM) | Type | Required |
|---|---|---|---|
| `displayName` | `displayName` | Direct | ✅ Yes |
| `mailNickname` | `externalId` | Direct | ✅ Yes |
| `members` | `members` | Direct | ✅ Yes |

**Expression Mappings:**
```json
{
  "displayName": "displayName",
  "externalId": "mailNickname",
  "members": "members"
}
```

---

## SCIM Provisioning Scopes

### Option 1: Sync All Users and Groups
- **Scope:** All users and groups
- **Use case:** Full directory sync
- **Setting:** In Entra ID Provisioning → Settings → Scope → Select "Sync all users and groups"

### Option 2: Sync Assigned Users and Groups Only (Recommended)
- **Scope:** Only users/groups explicitly assigned to the application
- **Use case:** Controlled rollout, specific teams only
- **Setting:** In Entra ID Provisioning → Settings → Scope → Select "Sync only assigned users and groups"
- **Assign users/groups:** Enterprise Applications → Your app → Users and groups → Add user/group

---

## SCIM Provisioning Testing

### Test Provisioning with a Pilot User

**Step 1: Create a Test User in Entra ID**
```text
User Principal Name: testuser@yourdomain.com
Display Name: Test User
Email: testuser@yourdomain.com
```

**Step 2: Assign Test User to Application**
1. Go to Enterprise Applications → Your app → Users and groups
2. Click **Add user/group**
3. Select test user
4. Click **Assign**

**Step 3: Trigger Provisioning**
- Wait 40 minutes for automatic sync, OR
- Go to Provisioning → Click **Provision on demand** → Select test user → Click **Provision**

**Step 4: Verify in Google Cloud**
```bash
# List users in workforce pool
gcloud iam workforce-pools providers list-workforce-identities PROVIDER_ID \
  --workforce-pool=WORKFORCE_POOL_ID \
  --location=global \
  --filter="email:testuser@yourdomain.com"
```

**Expected Output:**
```text
name: locations/global/workforcePools/WORKFORCE_POOL_ID/subjects/testuser@yourdomain.com
subject: testuser@yourdomain.com
state: ACTIVE
```

### Test Deprovisioning

**Step 1: Unassign Test User**
1. Go to Enterprise Applications → Your app → Users and groups
2. Select test user
3. Click **Remove**

**Step 2: Wait for Deprovisioning**
- Automatic sync: Wait up to 40 minutes
- Manual sync: Provisioning → **Provision on demand**

**Step 3: Verify User Removed**
```bash
# Verify user no longer exists or is deactivated
gcloud iam workforce-pools providers list-workforce-identities PROVIDER_ID \
  --workforce-pool=WORKFORCE_POOL_ID \
  --location=global \
  --filter="email:testuser@yourdomain.com"
```

**Expected:** User not found or `state: SUSPENDED`

---

## SCIM Provisioning Logs and Monitoring

### View Provisioning Logs in Entra ID

1. Go to Enterprise Applications → Your app → Provisioning
2. Click **View provisioning logs**
3. Filter by:
   - **Action:** Create, Update, Delete, Disable
   - **Status:** Success, Failure, Skipped
   - **Date range**

### Common Log Messages

| Message | Meaning | Action |
|---|---|---|
| `User 'testuser@domain.com' was created in target system 'Google Cloud'` | Success | No action needed |
| `User 'testuser@domain.com' was updated in target system 'Google Cloud'` | Success | No action needed |
| `Failed to create user: 400 Bad Request` | Attribute mapping error | Check attribute mappings |
| `Failed to create user: 401 Unauthorized` | SCIM token expired | Regenerate and update token |
| `Skipped user as they are out of scope` | User not assigned to app | Assign user or change scope |

### Set Up Provisioning Alerts

1. Go to Enterprise Applications → Your app → Provisioning
2. Scroll to **Notification**
3. Enter email addresses for provisioning alerts
4. Check **Send an email notification when a failure occurs**
5. Click **Save**

---

## SCIM Security Best Practices

### Token Security
- ✅ Rotate SCIM bearer tokens every 90 days
- ✅ Store tokens in secure secret manager (Azure Key Vault, HashiCorp Vault)
- ✅ Use separate tokens for production and non-production environments
- ❌ Never commit SCIM tokens to source control
- ❌ Never share SCIM tokens via email or chat

### Access Control
- ✅ Restrict SCIM endpoint access by IP (use firewall rules)
- ✅ Enable Cloud Audit Logs for all SCIM operations
- ✅ Monitor provisioning logs for anomalies
- ✅ Set up alerts for provisioning failures

### Provisioning Scope
- ✅ Start with "Sync only assigned users and groups" for controlled rollout
- ✅ Test with a small pilot group before full deployment
- ✅ Document which groups have access to which resources
- ❌ Avoid "Sync all users and groups" unless you have strict IdP governance

---

## Large Groups Configuration (>150 groups)

If your organization has more than approximately 150 groups, use the scalable groups configuration:

### Prerequisites
- SCIM must be configured (required)
- Workforce Identity Federation provider created

### Attribute Mappings for Large Groups
```text
google.subject=user.emails[0].value.lowerAscii()
google.groups=group.externalId
```

**Note:** The `google.groups` attribute mapping is ignored when SCIM is enabled. Groups are synced via SCIM instead.

### Setup Steps
1. Follow standard SCIM setup (Steps 1-3 above)
2. In Entra ID, ensure all groups are assigned to the application
3. SCIM will sync groups automatically (no additional configuration needed)
4. Verify groups appear in Google Cloud Workforce Identity Pool

### Verify Group Sync
```bash
# List groups in workforce pool
gcloud iam workforce-pools providers list-workforce-group-memberships PROVIDER_ID \
  --workforce-pool=WORKFORCE_POOL_ID \
  --location=global
```

---

## Troubleshooting SCIM

### Issue: Test connection fails in Entra ID
**Possible Causes:**
- Incorrect SCIM endpoint URL
- Invalid or expired SCIM bearer token
- Firewall blocking Entra ID IP ranges
- Workforce pool or provider does not exist

**Solution:**
1. Verify SCIM endpoint URL format
2. Regenerate SCIM bearer token
3. Check firewall rules
4. Verify workforce pool exists: `gcloud iam workforce-pools describe WORKFORCE_POOL_ID --location=global`

### Issue: Users not appearing in Google Cloud
**Possible Causes:**
- Provisioning not started or still in progress
- Users not assigned to application
- Attribute mapping errors

**Solution:**
1. Check provisioning status in Entra ID
2. Verify users are assigned to the application
3. Review provisioning logs for errors
4. Manually trigger provisioning for a specific user

### Issue: Groups not syncing
**Possible Causes:**
- Group attribute mapping incorrect
- Groups not assigned to application
- SCIM group provisioning not enabled

**Solution:**
1. Verify group attribute mappings
2. Assign groups to application in Entra ID
3. Check provisioning logs for group operations
4. Ensure "Provision Azure Active Directory groups" is enabled

---

## Reference Links

- [Configure SCIM in Microsoft Entra ID](https://cloud.google.com/iam/docs/configure-scim-ms-entra)
- [Workforce Identity Federation SCIM](https://cloud.google.com/iam/docs/workforce-identity-federation-scim)
- [Microsoft Entra ID Automatic User Provisioning](https://learn.microsoft.com/en-us/azure/active-directory/app-provisioning/user-provisioning)
- [Google Cloud Identity Standard](../../docs/Master_Inventory/GOOGLE_CLOUD_IDENTITY_STANDARD.md)

---

*Part of the Revvel Standards Templates. See `templates/standards/` for more templates.*
