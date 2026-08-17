# Google Cloud Identity & Workforce Identity Federation Standard

**Version:** 1.0.0  
**Date:** April 30, 2026  
**Status:** Mandatory Policy  
**Author:** Audrey Evans (MIDNGHTSAPPHIRE)

---

## 1. Introduction

This standard defines how to configure identity management for Google Cloud services (including NotebookLM Enterprise) using either **Cloud Identity** or **Workforce Identity Federation**. Proper identity configuration is required for:

- Data source access control
- User and group management
- Single Sign-On (SSO) integration
- Autocomplete of user emails and group names
- Secure authentication to Google resources

This standard covers:
- Authentication framework selection criteria
- Cloud Identity configuration (3 cases)
- Workforce Identity Federation setup
- Attribute mapping for Microsoft Entra ID
- SCIM provisioning
- Prerequisites and best practices

---

## 2. Supported Authentication Frameworks

Google Cloud supports two primary authentication frameworks for enterprise identity management:

### 2.1. Cloud Identity

Use Cloud Identity when:
- You already use Google Workspace or Cloud Identity as your primary IdP
- You want to sync identities from a third-party IdP into Cloud Identity
- You need centralized user and group management through Google Cloud

**Three Cloud Identity Cases:**

#### Case 1: Native Cloud Identity / Google Workspace
- All user identities and groups are created and managed directly in Cloud Identity or Google Workspace
- No external IdP required
- Users authenticate directly with Google
- **Best for:** Organizations already using Google Workspace

**Resources:**
- [Cloud Identity Documentation](https://cloud.google.com/identity/docs)

#### Case 2: Synced Identities with Cloud Identity Authentication
- You sync identities from a third-party IdP (e.g., Active Directory) into Cloud Identity
- Users authenticate using Cloud Identity credentials
- Identity sync keeps user/group data in sync
- **Best for:** Organizations wanting Google as the authentication authority with directory sync

#### Case 3: Synced Identities with Third-Party IdP Authentication (SSO)
- You sync identities from a third-party IdP into Cloud Identity
- Users authenticate using your existing third-party IdP (SSO configured)
- Sign-in flow: User starts at Cloud Identity → redirected to third-party IdP → returns to Google
- **Best for:** Organizations wanting to keep their existing IdP for authentication while using Cloud Identity features

### 2.2. Workforce Identity Federation

Use Workforce Identity Federation when:
- You use an external IdP (Microsoft Entra ID, Ping, PingFederate, or any OIDC/SAML 2.0 IdP)
- You **do NOT** want to sync identities into Cloud Identity
- You want federated authentication without directory replication
- **Best for:** Organizations with established external IdP that don't want to maintain duplicate identity stores

**Supported External IdPs:**
- Microsoft Entra ID (formerly Azure AD)
- Ping Identity
- PingFederate
- Any OIDC-compliant IdP
- Any SAML 2.0-compliant IdP

**Required Configuration:**
- [Workforce Identity Federation](https://cloud.google.com/iam/docs/workforce-identity-federation) must be set up in Google Cloud
- The `google.subject` attribute **must** map to the email address field in the external IdP
- Only **one IdP per Google Cloud project**

---

## 3. Attribute Mapping for Workforce Identity Federation

When using Workforce Identity Federation, you must configure attribute mappings to translate IdP claims into Google Cloud attributes.

### 3.1. Critical Attribute Requirements

| Google Cloud Attribute | Requirement | Description |
|---|---|---|
| `google.subject` | **MANDATORY** | Must map to user's email address in the IdP |
| `google.groups` | Recommended | Maps to user's group memberships (required for group-based access control) |

### 3.2. Microsoft Entra ID Attribute Mappings

#### Microsoft Entra ID with OIDC Protocol

**Setup:** [Configure OIDC provider with Microsoft Entra ID](https://cloud.google.com/iam/docs/workforce-sign-in-microsoft-entra-id#create-oidc-provider)

**Attribute Mappings:**
```text
google.subject=assertion.email
google.groups=assertion.groups
```

**Prerequisites:**
- Add group claim to Entra ID application
- Select "All groups" (required for NotebookLM Enterprise)
- See: [Create a Microsoft Entra ID application](https://cloud.google.com/iam/docs/workforce-sign-in-microsoft-entra-id#create_a_microsoft_entra_id_application)

#### Microsoft Entra ID with SAML Protocol

**Setup:** [Configure SAML provider with Microsoft Entra ID](https://cloud.google.com/iam/docs/workforce-sign-in-microsoft-entra-id#create-saml-provider)

**Attribute Mappings:**
```text
google.subject=assertion.attributes['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'][0]
google.groups=assertion.attributes['http://schemas.microsoft.com/ws/2008/06/identity/claims/groups']
```

#### Microsoft Entra ID with Large Number of Groups (>150)

**Setup:** [Configure for large number of groups](https://cloud.google.com/iam/docs/workforce-sign-in-microsoft-entra-id-scalable-groups)

**When to Use:**
- Your organization has more than approximately 150 groups
- Standard group claim would exceed token size limits

**Attribute Mappings:**
```text
google.subject=user.emails[0].value.lowerAscii()
google.groups=group.externalId
```

**Required:**
- SCIM provisioning **must** be configured
- See Section 5 for SCIM setup

**Note:** When using [SCIM](https://cloud.google.com/iam/docs/workforce-identity-federation-scim) or extended attributes, the `google.groups` attribute mapping is ignored (groups are synced via SCIM instead).

### 3.3. Other OIDC/SAML 2.0 IdPs

For other identity providers:

1. Ensure the IdP supports OIDC 1.0 or SAML 2.0
2. Configure `google.subject` to map to the user's email address claim
3. Configure `google.groups` to map to the group membership claim (if available)
4. Test with a small pilot group before full rollout

---

## 4. Prerequisites and Setup Requirements

### 4.1. Before You Begin

Ensure **one** of the following is true before proceeding:

**Option A: Cloud Identity (No Workforce Identity Federation)**
- [ ] You use Cloud Identity or Google Workspace as your IdP, OR
- [ ] You use a third-party IdP and have configured SSO with Cloud Identity

**Option B: Workforce Identity Federation**
- [ ] You have set up [Workforce Identity Federation](https://cloud.google.com/iam/docs/workforce-identity-federation)
- [ ] You have followed setup instructions:
  - Standard setup: [Configure with Microsoft Entra ID](https://cloud.google.com/iam/docs/workforce-sign-in-microsoft-entra-id)
  - Large groups (>150): [Configure with large number of groups](https://cloud.google.com/iam/docs/workforce-sign-in-microsoft-entra-id-scalable-groups)
- [ ] You have added group claim and selected "All groups" (required for NotebookLM Enterprise)
- [ ] You have set up SCIM provisioning (see Section 5)

### 4.2. Google Cloud Project Setup

#### Step 1: Create or Select a Project

If you already have a Google Cloud project, skip to Step 2.

1. Navigate to Google Cloud Console
2. Go to project selector page
3. Select existing project or create new project
4. Note the Project ID (required for configuration)

**Required Roles:**
- `resourcemanager.projectCreator` (to create projects)
- `serviceusage.serviceUsageAdmin` (to enable APIs)

#### Step 2: Enable Required APIs

Enable the following APIs for your project:

```bash
gcloud services enable \
  iam.googleapis.com \
  cloudidentity.googleapis.com \
  iamcredentials.googleapis.com \
  sts.googleapis.com
```

**Required APIs:**
- **IAM API** (`iam.googleapis.com`) - Identity and Access Management
- **Cloud Identity API** (`cloudidentity.googleapis.com`) - User and group management
- **IAM Credentials API** (`iamcredentials.googleapis.com`) - Token generation
- **Security Token Service API** (`sts.googleapis.com`) - Workforce Identity Federation

### 4.3. Network and Security Requirements

- **Firewall Rules:** Allow outbound HTTPS (443) to `*.googleapis.com`
- **DNS:** Ensure your network can resolve `googleapis.com` domains
- **TLS:** TLS 1.2 or higher required for all connections
- **Certificates:** Trust Google's root CA certificates

---

## 5. SCIM Provisioning

### 5.1. What is SCIM

SCIM (System for Cross-domain Identity Management) is an open standard for automating user and group provisioning between identity systems.

**When SCIM is Required:**
- ✅ Microsoft Entra ID with >150 groups
- ✅ Autocomplete of user emails and group names in NotebookLM Enterprise
- ✅ Automatic user provisioning and deprovisioning

### 5.2. SCIM Setup with Microsoft Entra ID

**Setup Guide:** [Configure SCIM in Microsoft Entra ID](https://cloud.google.com/iam/docs/configure-scim-ms-entra)

**Steps:**
1. Create a Workforce Identity Federation SCIM endpoint in Google Cloud
2. Note the SCIM endpoint URL and bearer token
3. In Microsoft Entra ID admin center:
   - Navigate to Enterprise Applications
   - Select your application
   - Go to Provisioning section
   - Set Provisioning Mode to "Automatic"
   - Enter SCIM endpoint URL as Tenant URL
   - Enter bearer token as Secret Token
4. Configure attribute mappings
5. Test provisioning with a pilot user group
6. Enable automatic provisioning

**Benefits:**
- Automatic user creation when assigned to app
- Automatic user deactivation when removed from app
- Real-time group membership updates
- Email autocomplete in NotebookLM Enterprise

### 5.3. SCIM Attribute Mappings

**Recommended Mappings:**

| Entra ID Attribute | SCIM Attribute | Required |
|---|---|---|
| `userPrincipalName` | `userName` | ✅ Yes |
| `mail` | `emails[type eq "work"].value` | ✅ Yes |
| `givenName` | `name.givenName` | Recommended |
| `surname` | `name.familyName` | Recommended |
| `displayName` | `displayName` | Recommended |
| Group memberships | `groups` | ✅ Yes (for access control) |

### 5.4. Testing SCIM Provisioning

**Validation Steps:**
1. Assign a test user to the application in Entra ID
2. Wait 5-10 minutes for initial sync (or trigger manual sync)
3. Verify user appears in Google Cloud Workforce Identity Pool
4. Verify user can authenticate to Google Cloud resources
5. Remove user from app and verify deprovisioning
6. Test group membership changes and verify sync

---

## 6. Security Best Practices

### 6.1. Identity Security

- **Enforce MFA:** Require multi-factor authentication at the IdP level
- **Conditional Access:** Use IdP conditional access policies to restrict access by location, device, risk level
- **Session Limits:** Configure reasonable session timeouts (recommended: 8 hours for workforce users)
- **Audit Logging:** Enable Cloud Audit Logs for all identity operations

### 6.2. Attribute Mapping Security

- **Validate Email Format:** Ensure `google.subject` always contains a valid email address
- **Group Claim Security:** Restrict group claims to prevent token bloat (use SCIM for large group sets)
- **Token Expiry:** Keep OIDC/SAML token lifetimes short (recommended: 1 hour or less)

### 6.3. SCIM Security

- **Rotate SCIM Tokens:** Rotate SCIM bearer tokens every 90 days
- **Restrict SCIM Endpoint:** Use IP allowlisting to restrict access to SCIM endpoint
- **Monitor Provisioning:** Set up alerts for provisioning failures or unusual activity

### 6.4. One IdP Per Project Rule

**Important:** You can select only **one IdP per Google Cloud project**.

**Implications:**
- Cannot use multiple Workforce Identity Federation pools for different IdPs
- Plan your identity architecture before deployment

**Workaround:** If you need multiple IdPs, create separate Google Cloud projects for each IdP.

---

## 7. NotebookLM Enterprise Integration

### 7.1. Data Source Access Control

To enable data source access control in NotebookLM Enterprise:

1. Complete identity setup (Cloud Identity or Workforce Identity Federation)
2. Ensure `google.groups` attribute is mapped and syncing correctly
3. In NotebookLM Enterprise admin console, enable data source access control
4. Configure data source permissions using Cloud Identity groups
5. Test access with pilot users

### 7.2. Autocomplete Requirements

For autocomplete of user emails and group names:

**Cloud Identity:**
- ✅ Autocomplete works automatically

**Workforce Identity Federation:**
- ✅ Requires SCIM provisioning (Microsoft Entra ID only)

### 7.3. Group-Based Access Control

**Setup:**
1. Create groups in your IdP (e.g., "Engineering", "Finance", "Marketing")
2. Assign users to groups
3. Ensure groups sync to Google Cloud (via SCIM or Cloud Identity sync)
4. In NotebookLM Enterprise, grant data source access to groups
5. Users inherit permissions from their group memberships

**Benefits:**
- Centralized access management in your IdP
- Automatic permission updates when users join/leave groups
- Reduced administrative overhead
- Audit trail of access changes

---

## 8. Troubleshooting

### 8.1. Common Issues

#### Issue: `google.subject` is empty or incorrect
**Cause:** Attribute mapping is incorrect or email claim is missing from IdP token

**Solution:**
1. Verify IdP is sending email claim in token
2. Check attribute mapping syntax (case-sensitive)
3. Test with a debug tool (e.g., jwt.io for OIDC tokens)
4. Update attribute mapping and retest

#### Issue: Groups not syncing
**Cause:** Group claim not configured in IdP or SCIM not set up

**Solution:**
1. For OIDC/SAML: Verify group claim is enabled in IdP app
2. For large groups (>150): Enable SCIM provisioning
3. Check SCIM provisioning logs for errors
4. Verify SCIM token is valid and not expired

#### Issue: Authentication fails for federated users
**Cause:** Workforce Identity Federation pool misconfigured or IdP certificate issues

**Solution:**
1. Verify workforce pool and provider are created correctly
2. Check IdP metadata URL is accessible
3. Verify certificate trust chain
4. Check Cloud Audit Logs for specific error messages

#### Issue: User cannot access NotebookLM Enterprise
**Cause:** User not provisioned or missing group membership

**Solution:**
1. Verify user exists in Workforce Identity Pool (or Cloud Identity)
2. Check user's group memberships
3. Verify data source permissions are granted to user's groups
4. Check NotebookLM Enterprise audit logs

### 8.2. Debugging Tools

**Google Cloud Console:**
- IAM & Admin → Workforce Identity Federation → View provider details
- Cloud Identity → Users → Search and view user details
- Logging → Logs Explorer → Filter by `protoPayload.serviceName="iam.googleapis.com"`

**Command-Line Tools:**
```bash
# Test Workforce Identity Federation
gcloud iam workforce-pools providers describe PROVIDER_ID \
  --workforce-pool=WORKFORCE_POOL_ID \
  --location=global

# View SCIM provisioning status
gcloud iam workforce-pools providers describe PROVIDER_ID \
  --workforce-pool=WORKFORCE_POOL_ID \
  --location=global \
  --format="value(scim.status)"
```

**Third-Party Tools:**
- [jwt.io](https://jwt.io) - Decode and inspect OIDC tokens
- [SAML-tracer](https://addons.mozilla.org/en-US/firefox/addon/saml-tracer/) - Browser extension to debug SAML flows

---

## 9. Implementation Checklist

### Phase 1: Planning and Design
- [ ] Determine authentication framework (Cloud Identity vs. Workforce Identity Federation)
- [ ] Select IdP (if using Workforce Identity Federation)
- [ ] Count groups (if >150, plan for SCIM with Entra ID)
- [ ] Review security requirements and compliance needs
- [ ] Create Google Cloud project (or select existing)

### Phase 2: Initial Configuration
- [ ] Enable required APIs in Google Cloud project
- [ ] Configure Workforce Identity Federation pool and provider (if applicable)
- [ ] Set up attribute mappings (`google.subject`, `google.groups`)
- [ ] Configure IdP application and enable group claims
- [ ] Test authentication with pilot user

### Phase 3: SCIM Setup (If Required)
- [ ] Create SCIM endpoint in Google Cloud
- [ ] Configure SCIM provisioning in IdP (Entra ID only)
- [ ] Map SCIM attributes
- [ ] Test provisioning with pilot group
- [ ] Verify deprovisioning works correctly

### Phase 4: NotebookLM Enterprise Integration
- [ ] Enable data source access control in NotebookLM Enterprise
- [ ] Create initial data source permission groups
- [ ] Grant permissions to pilot groups
- [ ] Test autocomplete functionality
- [ ] Verify group-based access works as expected

### Phase 5: Rollout and Monitoring
- [ ] Expand to additional user groups
- [ ] Train administrators on identity management
- [ ] Set up monitoring and alerting for auth failures
- [ ] Document custom procedures and runbooks
- [ ] Schedule regular access reviews

---

## 10. References

### Official Documentation
- [Cloud Identity Documentation](https://cloud.google.com/identity/docs)
- [Workforce Identity Federation](https://cloud.google.com/iam/docs/workforce-identity-federation)
- [Configure Workforce Identity Federation with Microsoft Entra ID](https://cloud.google.com/iam/docs/workforce-sign-in-microsoft-entra-id)
- [Configure Workforce Identity Federation with Microsoft Entra ID with Large Groups](https://cloud.google.com/iam/docs/workforce-sign-in-microsoft-entra-id-scalable-groups)
- [Configure SCIM in Microsoft Entra ID](https://cloud.google.com/iam/docs/configure-scim-ms-entra)
- [Workforce Identity Federation SCIM](https://cloud.google.com/iam/docs/workforce-identity-federation-scim)

### Related Revvel Standards
- [SSO & SAML Identity Standard](SSO_SAML_STANDARD.md) - GitHub organization SSO and SAML identity resolution
- [Public Identity Standard](PUBLIC_IDENTITY_STANDARD.md) - GitHub profile and public identity management
- [Security Standard](SECURITY_STANDARD.md) - General security requirements including authentication
- [Secret Management Standard](SECRET_MANAGEMENT_STANDARD.md) - Managing IdP credentials and SCIM tokens

---

*Part of the Revvel Master Standards. See [`README.md`](README.md) for the full inventory.*
