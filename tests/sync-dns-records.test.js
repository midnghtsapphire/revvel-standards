#!/usr/bin/env node
"use strict";

const assert = require("assert");
const {
  loadRecords,
  detectProvider,
  splitDomain,
  buildNamecheapRequest,
  buildGodaddyRequest,
  buildPorkbunCreateRequests,
  buildSyncRequests,
  redact,
  redactRequestForLog,
  SUPPORTED_PROVIDERS,
} = require("../scripts/sync-dns-records.js");

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ PASS: ${name}`);
    passed++;
  } catch (e) {
    console.log(`❌ FAIL: ${name}\n    ${e.message}`);
    failed++;
  }
}

const SAMPLE_YAML = `
domain: oaudrey.com
records:
  - host: "@"
    type: ALIAS
    value: "{{APP_TARGET}}"
    ttl: 300
  - host: fieldwork
    type: CNAME
    value: "{{APP_TARGET}}"
`;

// ─── loadRecords ────────────────────────────────────────────────────────

test("loadRecords interpolates {{APP_TARGET}} and applies default TTL", () => {
  const out = loadRecords(SAMPLE_YAML, { appTarget: "oaudrey-hub.ondigitalocean.app" });
  assert.strictEqual(out.domain, "oaudrey.com");
  assert.strictEqual(out.records.length, 2);
  assert.strictEqual(out.records[0].host, "@");
  assert.strictEqual(out.records[0].type, "ALIAS");
  assert.strictEqual(out.records[0].value, "oaudrey-hub.ondigitalocean.app");
  assert.strictEqual(out.records[0].ttl, 300);
  assert.strictEqual(out.records[1].ttl, 300, "missing ttl gets default");
});

test("loadRecords throws when {{APP_TARGET}} present but appTarget missing", () => {
  assert.throws(() => loadRecords(SAMPLE_YAML, {}), /APP_TARGET/);
});

test("loadRecords rejects empty input", () => {
  assert.throws(() => loadRecords(""), /non-empty string/);
});

test("loadRecords rejects YAML missing 'domain'", () => {
  assert.throws(() => loadRecords("records: []"), /domain/);
});

test("loadRecords rejects YAML with empty records", () => {
  assert.throws(() => loadRecords("domain: a.com\nrecords: []"), /non-empty array/);
});

// ─── detectProvider ─────────────────────────────────────────────────────

test("detectProvider returns null when no credentials are set", () => {
  assert.strictEqual(detectProvider({}), null);
});

test("detectProvider picks namecheap when its creds are present", () => {
  assert.strictEqual(
    detectProvider({ NAMECHEAP_API_KEY: "k", NAMECHEAP_API_USER: "u" }),
    "namecheap"
  );
});

test("detectProvider picks godaddy when its creds are present", () => {
  assert.strictEqual(
    detectProvider({ GODADDY_API_KEY: "k", GODADDY_API_SECRET: "s" }),
    "godaddy"
  );
});

test("detectProvider picks porkbun when its creds are present", () => {
  assert.strictEqual(
    detectProvider({ PORKBUN_API_KEY: "k", PORKBUN_SECRET_API_KEY: "s" }),
    "porkbun"
  );
});

test("detectProvider prefers namecheap over godaddy when both are set", () => {
  assert.strictEqual(
    detectProvider({
      NAMECHEAP_API_KEY: "k",
      NAMECHEAP_API_USER: "u",
      GODADDY_API_KEY: "k",
      GODADDY_API_SECRET: "s",
    }),
    "namecheap"
  );
});

// ─── splitDomain ────────────────────────────────────────────────────────

test("splitDomain handles a normal two-label domain", () => {
  assert.deepStrictEqual(splitDomain("oaudrey.com"), { sld: "oaudrey", tld: "com" });
});

test("splitDomain handles a multi-label TLD like .co.uk", () => {
  assert.deepStrictEqual(splitDomain("foo.co.uk"), { sld: "foo", tld: "co.uk" });
});

test("splitDomain throws on a single-label input", () => {
  assert.throws(() => splitDomain("nope"), /not a valid domain/);
});

// ─── buildNamecheapRequest ──────────────────────────────────────────────

test("buildNamecheapRequest builds a setHosts URL-encoded body", () => {
  const records = [{ host: "fieldwork", type: "CNAME", value: "x.example.com", ttl: 300 }];
  const req = buildNamecheapRequest({
    domain: "oaudrey.com",
    records,
    credentials: {
      apiUser: "uprisinghope",
      apiKey: "NCKEY",
      userName: "uprisinghope",
      clientIp: "1.2.3.4",
    },
  });
  assert.strictEqual(req.method, "POST");
  assert.match(req.url, /api\.namecheap\.com/);
  assert.match(req.body, /Command=namecheap\.domains\.dns\.setHosts/);
  assert.match(req.body, /SLD=oaudrey/);
  assert.match(req.body, /TLD=com/);
  assert.match(req.body, /HostName1=fieldwork/);
  assert.match(req.body, /RecordType1=CNAME/);
  assert.match(req.body, /TTL1=300/);
});

test("buildNamecheapRequest rejects ALIAS at the apex (unsupported by API)", () => {
  assert.throws(
    () =>
      buildNamecheapRequest({
        domain: "oaudrey.com",
        records: [{ host: "@", type: "ALIAS", value: "x.example.com", ttl: 300 }],
        credentials: { apiUser: "u", apiKey: "k", userName: "u" },
      }),
    /ALIAS at the apex/
  );
});

test("buildNamecheapRequest fails fast when credentials are missing", () => {
  assert.throws(
    () =>
      buildNamecheapRequest({
        domain: "oaudrey.com",
        records: [{ host: "x", type: "CNAME", value: "y", ttl: 300 }],
        credentials: {},
      }),
    /apiKey\/apiUser/
  );
});

// ─── buildGodaddyRequest ────────────────────────────────────────────────

test("buildGodaddyRequest builds a PUT with sso-key auth header", () => {
  const records = [{ host: "fieldwork", type: "CNAME", value: "x.example.com", ttl: 300 }];
  const req = buildGodaddyRequest({
    domain: "oaudrey.com",
    records,
    credentials: { apiKey: "GK", apiSecret: "GS" },
  });
  assert.strictEqual(req.method, "PUT");
  assert.match(req.url, /api\.godaddy\.com\/v1\/domains\/oaudrey\.com\/records/);
  assert.strictEqual(req.headers.Authorization, "sso-key GK:GS");
  const payload = JSON.parse(req.body);
  assert.strictEqual(payload.length, 1);
  assert.deepStrictEqual(payload[0], {
    type: "CNAME",
    name: "fieldwork",
    data: "x.example.com",
    ttl: 300,
  });
});

test("buildGodaddyRequest translates ALIAS→A only when value is an IP", () => {
  const ok = buildGodaddyRequest({
    domain: "oaudrey.com",
    records: [{ host: "@", type: "ALIAS", value: "203.0.113.10", ttl: 300 }],
    credentials: { apiKey: "GK", apiSecret: "GS" },
  });
  const payload = JSON.parse(ok.body);
  assert.strictEqual(payload[0].type, "A");
  assert.strictEqual(payload[0].data, "203.0.113.10");

  assert.throws(
    () =>
      buildGodaddyRequest({
        domain: "oaudrey.com",
        records: [{ host: "@", type: "ALIAS", value: "x.example.com", ttl: 300 }],
        credentials: { apiKey: "GK", apiSecret: "GS" },
      }),
    /does not support ALIAS/
  );
});

// ─── buildPorkbunCreateRequests ─────────────────────────────────────────

test("buildPorkbunCreateRequests emits one POST per record with auth in body", () => {
  const records = [
    { host: "@", type: "ALIAS", value: "x.example.com", ttl: 300 },
    { host: "fieldwork", type: "CNAME", value: "x.example.com", ttl: 600 },
  ];
  const reqs = buildPorkbunCreateRequests({
    domain: "oaudrey.com",
    records,
    credentials: { apiKey: "PK", secretApiKey: "PS" },
  });
  assert.strictEqual(reqs.length, 2);
  assert.match(reqs[0].url, /api\.porkbun\.com\/api\/json\/v3\/dns\/create\/oaudrey\.com/);
  const body0 = JSON.parse(reqs[0].body);
  assert.strictEqual(body0.apikey, "PK");
  assert.strictEqual(body0.secretapikey, "PS");
  assert.strictEqual(body0.name, "", "apex host should be empty string for Porkbun");
  assert.strictEqual(body0.type, "ALIAS");
  assert.strictEqual(body0.ttl, "300");
  const body1 = JSON.parse(reqs[1].body);
  assert.strictEqual(body1.name, "fieldwork");
  assert.strictEqual(body1.ttl, "600");
});

// ─── buildSyncRequests dispatch ─────────────────────────────────────────

test("buildSyncRequests rejects unsupported providers", () => {
  assert.throws(
    () =>
      buildSyncRequests({
        provider: "route53",
        domain: "oaudrey.com",
        records: [],
        env: {},
      }),
    /unsupported provider/
  );
});

test("buildSyncRequests dispatches to porkbun when asked", () => {
  const reqs = buildSyncRequests({
    provider: "porkbun",
    domain: "oaudrey.com",
    records: [{ host: "fieldwork", type: "CNAME", value: "x", ttl: 300 }],
    env: { PORKBUN_API_KEY: "k", PORKBUN_SECRET_API_KEY: "s" },
  });
  assert.strictEqual(reqs.length, 1);
  assert.match(reqs[0].url, /porkbun\.com/);
});

test("SUPPORTED_PROVIDERS lists all three registrars", () => {
  assert.deepStrictEqual(SUPPORTED_PROVIDERS.slice().sort(), ["godaddy", "namecheap", "porkbun"]);
});

// ─── redaction ──────────────────────────────────────────────────────────

test("redact strips Namecheap ApiKey/ApiUser from URL-encoded bodies", () => {
  const dirty = "ApiUser=u&ApiKey=SUPERSECRET&UserName=u&Command=foo";
  assert.match(redact(dirty), /ApiKey=<redacted>/);
  assert.match(redact(dirty), /ApiUser=<redacted>/);
  assert.doesNotMatch(redact(dirty), /SUPERSECRET/);
});

test("redact strips Porkbun secrets from JSON bodies", () => {
  const dirty = JSON.stringify({ apikey: "PK", secretapikey: "PS", name: "x" });
  const clean = redact(dirty);
  assert.doesNotMatch(clean, /PK"/);
  assert.doesNotMatch(clean, /PS"/);
  assert.match(clean, /<redacted>/);
});

test("redactRequestForLog redacts Authorization header (GoDaddy)", () => {
  const safe = redactRequestForLog({
    method: "PUT",
    url: "https://api.godaddy.com/v1/domains/oaudrey.com/records",
    headers: { Authorization: "sso-key GK:GS", "Content-Type": "application/json" },
    body: "[]",
  });
  assert.strictEqual(safe.headers.Authorization, "<redacted>");
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
