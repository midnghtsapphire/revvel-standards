/**
 * n8n multi-provider OAuth 2.0 parameter catalog (public endpoints only).
 * Secret values never live here — only secret *names* for ops wiring.
 */

export interface OAuthProvider {
  id: string;
  name: string;
  ecosystem: string;
  authorizationUrl: string;
  accessTokenUrl: string;
  scopes: string[];
  authUriQueryParameters?: string;
  secretNames: { clientId: string; clientSecret: string };
  notes: string[];
}

export const OAUTH_PROVIDERS: OAuthProvider[] = [
  {
    id: "google",
    name: "Google (Gmail, Drive, Docs)",
    ecosystem: "Google",
    authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    accessTokenUrl: "https://oauth2.googleapis.com/token",
    scopes: [
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/drive.readonly",
      "https://www.googleapis.com/auth/documents.readonly",
    ],
    authUriQueryParameters: "access_type=offline&prompt=consent",
    secretNames: {
      clientId: "GOOGLE_OAUTH_CLIENT_ID",
      clientSecret: "GOOGLE_OAUTH_CLIENT_SECRET",
    },
    notes: [
      "access_type=offline + prompt=consent are mandatory so n8n keeps a refresh token.",
      "Create the OAuth client in Google Cloud Console → APIs & Services → Credentials.",
    ],
  },
  {
    id: "microsoft",
    name: "Microsoft (Outlook, OneDrive)",
    ecosystem: "Microsoft",
    authorizationUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    accessTokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    scopes: [
      "https://graph.microsoft.com/Mail.Read",
      "https://graph.microsoft.com/Files.Read",
      "offline_access",
    ],
    secretNames: {
      clientId: "MICROSOFT_OAUTH_CLIENT_ID",
      clientSecret: "MICROSOFT_OAUTH_CLIENT_SECRET",
    },
    notes: [
      "Replace /common/ with your tenant id for single-tenant apps.",
      "Register the app in Azure Portal → App registrations.",
    ],
  },
  {
    id: "yahoo",
    name: "Yahoo Mail",
    ecosystem: "Yahoo",
    authorizationUrl: "https://api.login.yahoo.com/oauth2/request_auth",
    accessTokenUrl: "https://api.login.yahoo.com/oauth2/get_token",
    scopes: ["mail-r"],
    secretNames: {
      clientId: "YAHOO_OAUTH_CLIENT_ID",
      clientSecret: "YAHOO_OAUTH_CLIENT_SECRET",
    },
    notes: ["Create an app in the Yahoo Developer Network with mail-r scope."],
  },
];

export function getProvider(id: string): OAuthProvider | undefined {
  return OAUTH_PROVIDERS.find((p) => p.id === id);
}

export function listSecretNames(): string[] {
  const names = new Set<string>();
  for (const p of OAUTH_PROVIDERS) {
    names.add(p.secretNames.clientId);
    names.add(p.secretNames.clientSecret);
  }
  return Array.from(names).sort();
}
