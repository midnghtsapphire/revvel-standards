# n8n Multi-Provider OAuth 2.0 Parameters

Configure n8n **OAuth2 API** credentials so workflows can ingest mail context
across Gmail, Outlook, and Yahoo. Values below are the public OAuth endpoints
and scopes — client id/secret stay in the n8n credential store (see
`docs/SECRETS_MAP.md` for secret **names**).

## 1. Google (Gmail, Drive, Docs)

| Field | Value |
| --- | --- |
| Credentials type | OAuth2 API |
| Authorization URL | `https://accounts.google.com/o/oauth2/v2/auth` |
| Access Token URL | `https://oauth2.googleapis.com/token` |
| Auth URI query parameters | `access_type=offline&prompt=consent` |
| Authentication | Header (Bearer) |

**Required scopes** (space-separated in n8n):

- `https://www.googleapis.com/auth/gmail.readonly`
- `https://www.googleapis.com/auth/drive.readonly`
- `https://www.googleapis.com/auth/documents.readonly`

`access_type=offline` + `prompt=consent` are mandatory so n8n receives a
refresh token and does not silently lose connectivity after the first hour.

**Secret names:** `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`

### Click-by-click (n8n UI)

1. Open n8n → **Credentials** → **Add credential** → search **OAuth2 API**.
2. Paste Authorization URL and Access Token URL from the table above.
3. Paste Client ID / Client Secret from Google Cloud Console.
4. Set **Auth URI Query Parameters** exactly to `access_type=offline&prompt=consent`.
5. Paste the scopes (one line, spaces between).
6. Click **Connect my account**, complete Google consent, confirm n8n shows a green check.

## 2. Microsoft (Outlook Mail, OneDrive)

| Field | Value |
| --- | --- |
| Credentials type | OAuth2 API |
| Authorization URL | `https://login.microsoftonline.com/common/oauth2/v2.0/authorize` |
| Access Token URL | `https://login.microsoftonline.com/common/oauth2/v2.0/token` |
| Authentication | Header (Bearer) |

**Required scopes:**

- `https://graph.microsoft.com/Mail.Read`
- `https://graph.microsoft.com/Files.Read`
- `offline_access`

Use a tenant-specific host (`/{tenant-id}/`) instead of `/common/` when the
app is single-tenant.

**Secret names:** `MICROSOFT_OAUTH_CLIENT_ID`, `MICROSOFT_OAUTH_CLIENT_SECRET`

### Click-by-click (n8n UI)

1. Azure Portal → **App registrations** → your app → **Certificates & secrets** → create a client secret.
2. Under **API permissions**, add Microsoft Graph delegated `Mail.Read`, `Files.Read`, and ensure offline access is allowed.
3. In n8n, create **OAuth2 API** credential with the URLs above and the Application (client) ID + secret.
4. Connect account and confirm token refresh works after ~1 hour.

## 3. Yahoo Mail

| Field | Value |
| --- | --- |
| Credentials type | OAuth2 API |
| Authorization URL | `https://api.login.yahoo.com/oauth2/request_auth` |
| Access Token URL | `https://api.login.yahoo.com/oauth2/get_token` |
| Required scope | `mail-r` |
| Authentication | Header (Bearer) |

**Secret names:** `YAHOO_OAUTH_CLIENT_ID`, `YAHOO_OAUTH_CLIENT_SECRET`

### Click-by-click (n8n UI)

1. Yahoo Developer Network → create an app with Mail read scope (`mail-r`).
2. Copy Client ID / Secret into a new n8n **OAuth2 API** credential.
3. Set Authorization + Token URLs from the table, scope `mail-r`, connect account.

## Related repo assets

- Workflow templates: `workflows/n8n/`
- Connections SSOT: `config/connections.yml`
- Orchestration console (interactive reference): `products/orchestration-console`
