import assert from "node:assert/strict";
import { getProvider, listSecretNames, OAUTH_PROVIDERS } from "../lib/oauth";

assert.equal(OAUTH_PROVIDERS.length, 3);
assert.ok(getProvider("google")?.authorizationUrl.includes("accounts.google.com"));
assert.ok(getProvider("microsoft")?.scopes.includes("offline_access"));
assert.equal(getProvider("yahoo")?.scopes[0], "mail-r");

const secrets = listSecretNames();
assert.ok(secrets.includes("GOOGLE_OAUTH_CLIENT_ID"));
assert.ok(secrets.includes("YAHOO_OAUTH_CLIENT_SECRET"));
// No secret values — names only
for (const s of secrets) {
  assert.match(s, /^[A-Z0-9_]+$/);
}

console.log("oauth.test.ts: ok");
