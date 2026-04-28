#!/usr/bin/env node
"use strict";

/**
 * sync-dns-records.js
 *
 * Multi-registrar DNS sync for oaudrey.com (and any other Freedom Angel
 * Corp domain that follows the same declarative-records pattern).
 *
 * Supported providers:
 *   - namecheap  — XML API (api.namecheap.com), domains.dns.setHosts
 *   - godaddy    — REST API (api.godaddy.com), PUT /v1/domains/{d}/records
 *   - porkbun    — JSON API (api.porkbun.com), /api/json/v3/dns/*
 *
 * The active provider is auto-selected based on which credential set is
 * present in the environment. This matches the Credential Gatekeeper
 * convention — operators provision whichever registrar the domain lives
 * on, and the workflow picks it up automatically.
 *
 * Provider env vars:
 *   namecheap : NAMECHEAP_API_USER, NAMECHEAP_API_KEY, NAMECHEAP_USERNAME,
 *               NAMECHEAP_CLIENT_IP
 *   godaddy   : GODADDY_API_KEY, GODADDY_API_SECRET
 *   porkbun   : PORKBUN_API_KEY, PORKBUN_SECRET_API_KEY
 *
 * Other env vars:
 *   DNS_RECORDS_FILE  Path to the YAML records file (default
 *                     oaudrey/dns-records.yml relative to repo root)
 *   APP_TARGET        Hostname to substitute for {{APP_TARGET}} in the
 *                     records file (e.g. the DO App Platform ingress)
 *   DRY_RUN           If "true", build and print the request payloads
 *                     without calling any registrar API
 *
 * The functions below are exported so they can be unit-tested without
 * touching the network. The CLI entry point at the bottom is only
 * executed when this file is run directly (require.main === module).
 */

const fs = require("fs");
const path = require("path");
const https = require("https");
const yaml = require("yaml");

// ─── Constants ──────────────────────────────────────────────────────────

const SUPPORTED_PROVIDERS = ["namecheap", "godaddy", "porkbun"];

const DEFAULT_TTL = 300;

// ─── Records file loading + interpolation ───────────────────────────────

/**
 * Parse a records YAML payload and substitute {{APP_TARGET}} placeholders.
 *
 * Pure function — accepts the raw YAML text and the substitution context
 * so it is trivially testable.
 */
function loadRecords(yamlText, { appTarget } = {}) {
  if (!yamlText || typeof yamlText !== "string") {
    throw new Error("loadRecords: yamlText must be a non-empty string");
  }
  const parsed = yaml.parse(yamlText);
  if (!parsed || typeof parsed !== "object") {
    throw new Error("loadRecords: parsed YAML is not an object");
  }
  if (!parsed.domain || typeof parsed.domain !== "string") {
    throw new Error("loadRecords: missing required 'domain' field");
  }
  if (!Array.isArray(parsed.records) || parsed.records.length === 0) {
    throw new Error("loadRecords: 'records' must be a non-empty array");
  }

  const interpolate = (val) => {
    if (typeof val !== "string") return val;
    if (!val.includes("{{APP_TARGET}}")) return val;
    if (!appTarget) {
      throw new Error(
        "loadRecords: record references {{APP_TARGET}} but no appTarget was provided"
      );
    }
    return val.replace(/\{\{APP_TARGET\}\}/g, appTarget);
  };

  const records = parsed.records.map((r, i) => {
    if (!r || typeof r !== "object") {
      throw new Error(`loadRecords: records[${i}] is not an object`);
    }
    if (!r.host) throw new Error(`loadRecords: records[${i}] missing 'host'`);
    if (!r.type) throw new Error(`loadRecords: records[${i}] missing 'type'`);
    if (r.value === undefined || r.value === null) {
      throw new Error(`loadRecords: records[${i}] missing 'value'`);
    }
    return {
      host: String(r.host),
      type: String(r.type).toUpperCase(),
      value: interpolate(r.value),
      ttl: Number.isFinite(r.ttl) ? r.ttl : DEFAULT_TTL,
    };
  });

  return { domain: parsed.domain, records };
}

// ─── Provider auto-detection ────────────────────────────────────────────

/**
 * Inspect an environment object and return the name of the first registrar
 * with a complete credential set, or null if none match.
 */
function detectProvider(env = process.env) {
  if (env.NAMECHEAP_API_KEY && (env.NAMECHEAP_API_USER || env.NAMECHEAP_USERNAME)) {
    return "namecheap";
  }
  if (env.GODADDY_API_KEY && env.GODADDY_API_SECRET) {
    return "godaddy";
  }
  if (env.PORKBUN_API_KEY && env.PORKBUN_SECRET_API_KEY) {
    return "porkbun";
  }
  return null;
}

// ─── Domain helpers ─────────────────────────────────────────────────────

/**
 * Split a fully-qualified zone like "oaudrey.com" into { sld, tld }
 * (second-level domain + top-level domain). Used by the Namecheap API.
 */
function splitDomain(domain) {
  const parts = String(domain || "").split(".");
  if (parts.length < 2) {
    throw new Error(`splitDomain: '${domain}' is not a valid domain`);
  }
  const tld = parts.slice(1).join(".");
  const sld = parts[0];
  return { sld, tld };
}

// ─── Provider: Namecheap ────────────────────────────────────────────────

/**
 * Build the full Namecheap setHosts request — query string body + endpoint.
 *
 * Namecheap's setHosts call replaces ALL records for the domain in a single
 * atomic call, which is exactly what we want for declarative sync.
 *
 * Note: Namecheap does not support ALIAS at the apex via the public API.
 * Non-apex ALIAS records may be represented as CNAMEs, but apex ALIAS is
 * not translated by this script; unsupported combinations are preserved so
 * validation/build logic can surface an explicit error rather than silently
 * producing a broken zone. For oAudrey we keep the apex on a registrar that
 * supports ALIAS (Porkbun) or move the apex to DigitalOcean nameservers.
 */
function buildNamecheapRequest({ domain, records, credentials }) {
  if (!credentials || !credentials.apiKey || !credentials.apiUser) {
    throw new Error("buildNamecheapRequest: missing apiKey/apiUser");
  }
  const { sld, tld } = splitDomain(domain);

  const params = new URLSearchParams();
  params.set("ApiUser", credentials.apiUser);
  params.set("ApiKey", credentials.apiKey);
  params.set("UserName", credentials.userName || credentials.apiUser);
  if (credentials.clientIp) params.set("ClientIp", credentials.clientIp);
  params.set("Command", "namecheap.domains.dns.setHosts");
  params.set("SLD", sld);
  params.set("TLD", tld);

  records.forEach((r, i) => {
    const idx = i + 1;
    // Namecheap accepts "@" as the apex host name.
    params.set(`HostName${idx}`, r.host);
    // ALIAS at the apex is not supported via the Namecheap API; surface it
    // explicitly so the operator chooses a different registrar for the apex.
    if (r.type === "ALIAS" && r.host === "@") {
      throw new Error(
        "buildNamecheapRequest: Namecheap API does not support ALIAS at the apex; " +
          "host the apex on Porkbun or use DigitalOcean nameservers instead."
      );
    }
    const recordType = r.type === "ALIAS" ? "CNAME" : r.type;
    params.set(`RecordType${idx}`, recordType);
    params.set(`Address${idx}`, r.value);
    params.set(`TTL${idx}`, String(r.ttl || DEFAULT_TTL));
  });

  return {
    method: "POST",
    url: "https://api.namecheap.com/xml.response",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  };
}

// ─── Provider: GoDaddy ──────────────────────────────────────────────────

/**
 * GoDaddy uses PUT /v1/domains/{domain}/records to replace ALL records.
 * Returns { method, url, headers, body } for a single replace-all call.
 *
 * GoDaddy does not support ALIAS records — apex routing must use A records.
 * We translate ALIAS → A here only when the value is already an IP address;
 * otherwise we throw, so the operator knows to set APP_TARGET_IP (resolved
 * by the workflow via dig) before running the sync against GoDaddy.
 */
function buildGodaddyRequest({ domain, records, credentials }) {
  if (!credentials || !credentials.apiKey || !credentials.apiSecret) {
    throw new Error("buildGodaddyRequest: missing apiKey/apiSecret");
  }

  const isIp = (v) => /^\d{1,3}(\.\d{1,3}){3}$/.test(String(v || ""));

  const payload = records.map((r) => {
    if (r.type === "ALIAS") {
      if (!isIp(r.value)) {
        throw new Error(
          "buildGodaddyRequest: GoDaddy does not support ALIAS; resolve " +
            `APP_TARGET to an IP before syncing (got value='${r.value}' for host='${r.host}')`
        );
      }
      return { type: "A", name: r.host, data: r.value, ttl: r.ttl || DEFAULT_TTL };
    }
    return {
      type: r.type,
      name: r.host,
      data: r.value,
      ttl: r.ttl || DEFAULT_TTL,
    };
  });

  return {
    method: "PUT",
    url: `https://api.godaddy.com/v1/domains/${encodeURIComponent(domain)}/records`,
    headers: {
      Authorization: `sso-key ${credentials.apiKey}:${credentials.apiSecret}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  };
}

// ─── Provider: Porkbun ──────────────────────────────────────────────────

/**
 * Porkbun's API does not have a single "replace all records" call — instead
 * we retrieve the current records, delete the managed ones, and create the
 * declarative set. The builder returns primitive operations the caller can
 * execute in order.
 *
 * If `existingRecords` is not provided, the first operation is a
 * `dns/retrieve` request so the caller can fetch the current zone and call
 * this builder again with the returned records. If `existingRecords` is
 * provided, this function emits a full sync plan:
 *
 *   [
 *     { method: 'POST', url: '.../dns/delete/<domain>/<id>', body: '{...}' },
 *     { method: 'POST', url: '.../dns/create/<domain>', body: '{...}' },
 *   ]
 *
 * Porkbun supports ALIAS at the apex natively, so apex CNAME inputs are
 * translated to ALIAS for comparison and creation.
 */
function buildPorkbunCreateRequests({ domain, records, credentials, existingRecords }) {
  if (!credentials || !credentials.apiKey || !credentials.secretApiKey) {
    throw new Error("buildPorkbunCreateRequests: missing apiKey/secretApiKey");
  }

  const authBody = {
    apikey: credentials.apiKey,
    secretapikey: credentials.secretApiKey,
  };

  const retrieveRequest = {
    method: "POST",
    url: `https://api.porkbun.com/api/json/v3/dns/retrieve/${encodeURIComponent(domain)}`,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(authBody),
  };

  const normalizeDesiredRecord = (r) => {
    const host = r.host === "@" ? "@" : r.host;
    const type = r.type === "CNAME" && host === "@" ? "ALIAS" : r.type;

    return {
      host,
      type,
      value: r.value,
      ttl: String(r.ttl || DEFAULT_TTL),
      body: {
        apikey: credentials.apiKey,
        secretapikey: credentials.secretApiKey,
        name: host === "@" ? "" : host,
        type,
        content: r.value,
        ttl: String(r.ttl || DEFAULT_TTL),
      },
    };
  };

  const normalizeExistingHost = (name) => {
    if (!name || name === domain) {
      return "@";
    }

    const suffix = `.${domain}`;
    if (typeof name === "string" && name.endsWith(suffix)) {
      return name.slice(0, -suffix.length) || "@";
    }

    return name;
  };

  const recordKey = ({ host, type }) => `${host}::${type}`;

  const desiredRecords = records.map(normalizeDesiredRecord);
  const managedKeys = new Set(desiredRecords.map(recordKey));

  const createRequests = desiredRecords.map((r) => {
    return {
      method: "POST",
      url: `https://api.porkbun.com/api/json/v3/dns/create/${encodeURIComponent(domain)}`,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(r.body),
      // record metadata for diffing / logging — never sent over the wire
      _record: { host: r.host, type: r.type, value: r.value },
    };
  });

  if (!Array.isArray(existingRecords)) {
    return createRequests;
  }

  const deleteRequests = existingRecords
    .filter((record) => record && record.id != null)
    .map((record) => {
      const host = normalizeExistingHost(record.name);
      const type = record.type === "CNAME" && host === "@" ? "ALIAS" : record.type;
      return {
        id: record.id,
        host,
        type,
      };
    })
    .filter((record) => managedKeys.has(recordKey(record)))
    .map((record) => {
      return {
        method: "POST",
        url: `https://api.porkbun.com/api/json/v3/dns/delete/${encodeURIComponent(domain)}/${encodeURIComponent(String(record.id))}`,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(authBody),
        _record: { host: record.host, type: record.type },
      };
    });

  return [...deleteRequests, ...createRequests];
}

// ─── Dispatch ───────────────────────────────────────────────────────────

/**
 * Build whatever request(s) are needed to sync the given records against
 * the named provider. Returns an array so callers can iterate uniformly.
 */
function buildSyncRequests({ provider, domain, records, env = process.env }) {
  if (!SUPPORTED_PROVIDERS.includes(provider)) {
    throw new Error(
      `buildSyncRequests: unsupported provider '${provider}' (supported: ${SUPPORTED_PROVIDERS.join(", ")})`
    );
  }

  if (provider === "namecheap") {
    return [
      buildNamecheapRequest({
        domain,
        records,
        credentials: {
          apiUser: env.NAMECHEAP_API_USER || env.NAMECHEAP_USERNAME,
          apiKey: env.NAMECHEAP_API_KEY,
          userName: env.NAMECHEAP_USERNAME,
          clientIp: env.NAMECHEAP_CLIENT_IP,
        },
      }),
    ];
  }

  if (provider === "godaddy") {
    return [
      buildGodaddyRequest({
        domain,
        records,
        credentials: {
          apiKey: env.GODADDY_API_KEY,
          apiSecret: env.GODADDY_API_SECRET,
        },
      }),
    ];
  }

  if (provider === "porkbun") {
    return buildPorkbunCreateRequests({
      domain,
      records,
      credentials: {
        apiKey: env.PORKBUN_API_KEY,
        secretApiKey: env.PORKBUN_SECRET_API_KEY,
      },
    });
  }

  // unreachable
  throw new Error(`buildSyncRequests: provider '${provider}' not implemented`);
}

// ─── Network execution (only used by the CLI) ───────────────────────────

function executeRequest(req) {
  return new Promise((resolve, reject) => {
    let url;
    try {
      url = new URL(req.url);
    } catch (e) {
      return reject(new Error(`executeRequest: invalid url '${req.url}': ${e.message}`));
    }

    const options = {
      method: req.method,
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      headers: req.headers || {},
    };

    const r = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () =>
        resolve({ statusCode: res.statusCode, body: data })
      );
    });
    r.on("error", reject);
    if (req.body) r.write(req.body);
    r.end();
  });
}

// ─── Redaction (logs must never echo secrets) ───────────────────────────

const SECRET_KEYS = [
  "ApiKey",
  "ApiUser",
  "UserName",
  "apikey",
  "secretapikey",
  "Authorization",
];

function redact(value) {
  if (typeof value !== "string") return value;
  let out = value;
  for (const k of SECRET_KEYS) {
    const re = new RegExp(`(${k}=)[^&]+`, "g");
    out = out.replace(re, `$1<redacted>`);
    const reJson = new RegExp(`("${k}"\\s*:\\s*")[^"]+"`, "g");
    out = out.replace(reJson, `$1<redacted>"`);
  }
  return out;
}

function redactRequestForLog(req) {
  const headers = { ...(req.headers || {}) };
  if (headers.Authorization) headers.Authorization = "<redacted>";
  return {
    method: req.method,
    url: req.url,
    headers,
    body: redact(req.body || ""),
  };
}

// ─── CLI entry point ────────────────────────────────────────────────────

async function main() {
  const env = process.env;
  const provider = env.DNS_PROVIDER || detectProvider(env);
  if (!provider) {
    console.error(
      "::error::No registrar credentials detected. Provision NAMECHEAP_*, GODADDY_*, or PORKBUN_* secrets via the Credential Gatekeeper."
    );
    process.exit(2);
  }
  if (!SUPPORTED_PROVIDERS.includes(provider)) {
    console.error(`::error::Unsupported provider '${provider}'`);
    process.exit(2);
  }

  const recordsPath =
    env.DNS_RECORDS_FILE ||
    path.resolve(__dirname, "..", "oaudrey", "dns-records.yml");
  const yamlText = fs.readFileSync(recordsPath, "utf8");
  const { domain, records } = loadRecords(yamlText, {
    appTarget: env.APP_TARGET,
  });

  console.log(
    `Syncing ${records.length} record(s) for ${domain} via ${provider}` +
      (env.DRY_RUN === "true" ? " (DRY RUN)" : "")
  );

  const requests = buildSyncRequests({ provider, domain, records, env });

  for (const req of requests) {
    const safe = redactRequestForLog(req);
    console.log(`→ ${safe.method} ${safe.url}`);
    if (env.DRY_RUN === "true") {
      console.log(`  body: ${safe.body}`);
      continue;
    }
    const res = await executeRequest(req);
    if (res.statusCode >= 200 && res.statusCode < 300) {
      console.log(`  ← ${res.statusCode} OK`);
    } else {
      console.error(`  ← ${res.statusCode} ${res.body}`);
      process.exit(1);
    }
  }

  console.log(`✅ DNS sync for ${domain} via ${provider} complete.`);
}

if (require.main === module) {
  main().catch((err) => {
    console.error(`::error::${err.message}`);
    process.exit(1);
  });
}

module.exports = {
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
  DEFAULT_TTL,
};
