#!/usr/bin/env node
/**
 * Credential Backup Harness
 *
 * Resolves credentials from multiple sources in priority order:
 *   1. GitHub Actions secrets (already in env)
 *   2. Process environment variables
 *   3. JSON backup file (CREDENTIAL_BACKUP_JSON / _FILE)
 *   4. SOPS/age encrypted file (CREDENTIAL_BACKUP_SOPS_FILE)
 *   5. pass (password-store) with CREDENTIAL_BACKUP_PASS_PREFIX
 *   6. Bitwarden CLI (bw) with CREDENTIAL_BACKUP_BW_PREFIX and BW_SESSION
 *   7. 1Password CLI (op) via CREDENTIAL_BACKUP_1PASSWORD_TEMPLATE
 *   8. Infisical (INFISICAL_TOKEN) / Vault (VAULT_ADDR) indicators
 *   9. Doppler CLI (optional)
 *
 * Designed so Doppler is no longer required for credential sync.
 *
 * Usage:
 *   node scripts/credential-backup-harness.js --keys KEY1,KEY2
 *   node scripts/credential-backup-harness.js --keys KEY1 --format env
 *   node scripts/credential-backup-harness.js --report
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const DEFAULT_KEYS = [
  'OPENROUTER_API_KEY',
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
  'POLAR_ACCESS_TOKEN',
  'GITHUB_TOKEN',
];

function parseArgs(argv) {
  const args = { keys: null, format: 'json', report: false, quiet: false };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--keys' && argv[i + 1]) {
      args.keys = argv[i + 1].split(',').map((k) => k.trim()).filter(Boolean);
      i += 1;
    } else if (a === '--format' && argv[i + 1]) {
      args.format = argv[i + 1];
      i += 1;
    } else if (a === '--report') {
      args.report = true;
    } else if (a === '--quiet') {
      args.quiet = true;
    }
  }
  return args;
}

function safeSpawn(cmd, args, opts = {}) {
  try {
    const result = spawnSync(cmd, args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      ...opts,
    });
    if (result.error) return { ok: false, error: result.error.message };
    if (result.status !== 0) {
      return { ok: false, error: (result.stderr || '').trim() || `exit ${result.status}` };
    }
    return { ok: true, stdout: (result.stdout || '').replace(/\n$/, '') };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

function hasBinary(bin) {
  const probe = process.platform === 'win32'
    ? safeSpawn('where', [bin])
    : safeSpawn('command', ['-v', bin], { shell: true });
  return probe.ok && Boolean(probe.stdout);
}

// Source 1+2: GitHub Actions secrets are exported as env, so env covers both.
function fromEnv(key) {
  const v = process.env[key];
  if (typeof v === 'string' && v.length > 0) {
    return { value: v, source: process.env.GITHUB_ACTIONS ? 'github-secrets' : 'env' };
  }
  return null;
}

// Source 3: JSON backup
let jsonCache = null;
function loadJsonBackup() {
  if (jsonCache !== null) return jsonCache;
  jsonCache = {};
  const inline = process.env.CREDENTIAL_BACKUP_JSON;
  if (inline) {
    try { Object.assign(jsonCache, JSON.parse(inline)); } catch (_) { /* ignore */ }
  }
  const file = process.env.CREDENTIAL_BACKUP_JSON_FILE;
  if (file && fs.existsSync(file)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
      Object.assign(jsonCache, parsed);
    } catch (_) { /* ignore */ }
  }
  return jsonCache;
}

function fromJsonBackup(key) {
  const data = loadJsonBackup();
  if (data && typeof data[key] === 'string' && data[key].length > 0) {
    return { value: data[key], source: 'json-backup' };
  }
  return null;
}

// Source 4: SOPS
let sopsCache = null;
function loadSopsBackup() {
  if (sopsCache !== null) return sopsCache;
  sopsCache = {};
  const file = process.env.CREDENTIAL_BACKUP_SOPS_FILE;
  if (!file || !fs.existsSync(file) || !hasBinary('sops')) return sopsCache;
  const out = safeSpawn('sops', ['-d', file]);
  if (!out.ok) return sopsCache;
  try {
    sopsCache = JSON.parse(out.stdout);
  } catch (_) {
    // try simple KEY=VALUE format
    out.stdout.split(/\r?\n/).forEach((line) => {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m) sopsCache[m[1]] = m[2];
    });
  }
  return sopsCache;
}

function fromSops(key) {
  const data = loadSopsBackup();
  if (data && typeof data[key] === 'string' && data[key].length > 0) {
    return { value: data[key], source: 'sops' };
  }
  return null;
}

// Source 5: pass
function fromPass(key) {
  const prefix = process.env.CREDENTIAL_BACKUP_PASS_PREFIX;
  if (!prefix || !hasBinary('pass')) return null;
  const entry = `${prefix.replace(/\/$/, '')}/${key}`;
  const out = safeSpawn('pass', ['show', entry]);
  if (out.ok && out.stdout) return { value: out.stdout.split(/\r?\n/)[0], source: 'pass' };
  return null;
}

// Source 6: Bitwarden CLI
function fromBitwarden(key) {
  const prefix = process.env.CREDENTIAL_BACKUP_BW_PREFIX;
  if (!prefix || !process.env.BW_SESSION || !hasBinary('bw')) return null;
  const item = `${prefix}${key}`;
  const out = safeSpawn('bw', ['get', 'password', item, '--session', process.env.BW_SESSION]);
  if (out.ok && out.stdout) return { value: out.stdout, source: 'bitwarden' };
  return null;
}

// Source 7: 1Password CLI
function from1Password(key) {
  const template = process.env.CREDENTIAL_BACKUP_1PASSWORD_TEMPLATE;
  if (!template || !hasBinary('op')) return null;
  const ref = template.replace(/\{KEY\}/g, key);
  const args = ['read', ref];
  const env = { ...process.env };
  if (process.env.OP_SERVICE_ACCOUNT_TOKEN) env.OP_SERVICE_ACCOUNT_TOKEN = process.env.OP_SERVICE_ACCOUNT_TOKEN;
  const out = safeSpawn('op', args, { env });
  if (out.ok && out.stdout) return { value: out.stdout, source: '1password' };
  return null;
}

// Source 8: Infisical / Vault indicators (presence only — actual fetch handled by their CLIs which export to env)
function fromInfisical(key) {
  if (!process.env.INFISICAL_TOKEN || !hasBinary('infisical')) return null;
  const out = safeSpawn('infisical', ['secrets', 'get', key, '--plain']);
  if (out.ok && out.stdout) return { value: out.stdout, source: 'infisical' };
  return null;
}

function fromVault(key) {
  if (!process.env.VAULT_ADDR || !hasBinary('vault')) return null;
  const pathRef = process.env.CREDENTIAL_BACKUP_VAULT_PATH || 'secret/data/credentials';
  const out = safeSpawn('vault', ['kv', 'get', '-field', key, pathRef]);
  if (out.ok && out.stdout) return { value: out.stdout, source: 'vault' };
  return null;
}

// Source 9: Doppler (optional)
function fromDoppler(key) {
  if (!hasBinary('doppler')) return null;
  const out = safeSpawn('doppler', ['secrets', 'get', key, '--plain']);
  if (out.ok && out.stdout) return { value: out.stdout, source: 'doppler' };
  return null;
}

const RESOLVERS = [
  fromEnv,
  fromJsonBackup,
  fromSops,
  fromPass,
  fromBitwarden,
  from1Password,
  fromInfisical,
  fromVault,
  fromDoppler,
];

function resolveKey(key, resolvers = RESOLVERS) {
  for (const fn of resolvers) {
    try {
      const hit = fn(key);
      if (hit && hit.value) return hit;
    } catch (_) { /* keep going */ }
  }
  return { value: null, source: 'missing' };
}

function resolveAll(keys, resolvers = RESOLVERS) {
  const out = {};
  for (const k of keys) out[k] = resolveKey(k, resolvers);
  return out;
}

function sourcesAvailable() {
  return {
    env: true,
    jsonBackup: Boolean(process.env.CREDENTIAL_BACKUP_JSON || process.env.CREDENTIAL_BACKUP_JSON_FILE),
    sops: Boolean(process.env.CREDENTIAL_BACKUP_SOPS_FILE) && hasBinary('sops'),
    pass: Boolean(process.env.CREDENTIAL_BACKUP_PASS_PREFIX) && hasBinary('pass'),
    bitwarden: Boolean(process.env.CREDENTIAL_BACKUP_BW_PREFIX && process.env.BW_SESSION) && hasBinary('bw'),
    onePassword: Boolean(process.env.CREDENTIAL_BACKUP_1PASSWORD_TEMPLATE) && hasBinary('op'),
    infisical: Boolean(process.env.INFISICAL_TOKEN) && hasBinary('infisical'),
    vault: Boolean(process.env.VAULT_ADDR) && hasBinary('vault'),
    doppler: hasBinary('doppler'),
  };
}

function formatOutput(resolved, format) {
  if (format === 'env') {
    return Object.entries(resolved)
      .filter(([, v]) => v.value)
      .map(([k, v]) => `${k}=${v.value}`)
      .join('\n');
  }
  if (format === 'github-actions') {
    // Emit ::add-mask:: and KEY=VALUE for GITHUB_ENV consumption
    return Object.entries(resolved)
      .filter(([, v]) => v.value)
      .map(([k, v]) => `::add-mask::${v.value}\n${k}=${v.value}`)
      .join('\n');
  }
  // default: json with metadata, values redacted unless explicitly requested via --format json-secrets
  if (format === 'json-secrets') {
    return JSON.stringify(resolved, null, 2);
  }
  const redacted = {};
  for (const [k, v] of Object.entries(resolved)) {
    redacted[k] = { source: v.source, present: Boolean(v.value) };
  }
  return JSON.stringify(redacted, null, 2);
}

function main() {
  const args = parseArgs(process.argv);
  const keys = args.keys || DEFAULT_KEYS;

  if (args.report) {
    const report = {
      sources: sourcesAvailable(),
      keys: {},
    };
    for (const k of keys) {
      const r = resolveKey(k);
      report.keys[k] = { source: r.source, present: Boolean(r.value) };
    }
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    return;
  }

  const resolved = resolveAll(keys);
  process.stdout.write(`${formatOutput(resolved, args.format)}\n`);
}

module.exports = {
  resolveKey,
  resolveAll,
  sourcesAvailable,
  DEFAULT_KEYS,
  // exposed for tests
  _internal: {
    fromEnv,
    fromJsonBackup,
    fromSops,
    fromPass,
    fromBitwarden,
    from1Password,
    fromInfisical,
    fromVault,
    fromDoppler,
  },
};

if (require.main === module) {
  main();
}
