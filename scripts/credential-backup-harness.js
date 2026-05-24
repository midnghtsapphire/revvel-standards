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

const crypto = require('crypto');
const fs = require('fs');
const { spawnSync } = require('child_process');

const DEFAULT_CLI_TIMEOUT_MS = Number.parseInt(
  process.env.CREDENTIAL_BACKUP_CLI_TIMEOUT_MS || '15000',
  10
) || 15000;

const DEFAULT_KEYS = [
  'OPENROUTER_API_KEY',
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
  'POLAR_ACCESS_TOKEN',
  'GITHUB_TOKEN',
];

function usage(exitCode = 0) {
  const text = `
Credential Backup Harness

Usage:
  node scripts/credential-backup-harness.js --keys KEY1,KEY2 [--format json|env|github-actions|json-secrets]
  node scripts/credential-backup-harness.js --secrets KEY1,KEY2 --repo owner/repo [--json]
  node scripts/credential-backup-harness.js --report

Options:
  --keys <csv>        Resolve keys without writing GitHub secrets.
  --format <format>   Output format for --keys mode.
  --secrets <csv>     Legacy gatekeeper sync mode; resolves and writes repo secrets.
  --repo <owner/repo> Target GitHub repository for --secrets mode.
  --project <name>    Doppler project metadata in sync summaries.
  --config <name>     Doppler config metadata in sync summaries.
  --json              Emit a machine-readable sync summary.
  --dry-run           Do not call gh secret set.
  --catalog           Emit backup source catalog.
  --report            Emit source availability and key presence.
`;
  process.stdout.write(text.trimStart());
  process.exit(exitCode);
}

function parseArgs(argv) {
  const args = {
    keys: null,
    format: 'json',
    report: false,
    quiet: false,
    secretsCsv: '',
    repo: process.env.GITHUB_REPOSITORY || '',
    project: 'revvel-standards',
    config: 'prd',
    json: false,
    dryRun: /^(1|true|yes)$/i.test(process.env.DRY_RUN || ''),
    catalog: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '-h' || a === '--help') {
      usage(0);
    } else if (a === '--keys' && argv[i + 1]) {
      args.keys = argv[i + 1].split(',').map((k) => k.trim()).filter(Boolean);
      i += 1;
    } else if (a.startsWith('--keys=')) {
      args.keys = a.slice('--keys='.length).split(',').map((k) => k.trim()).filter(Boolean);
    } else if (a === '--format' && argv[i + 1]) {
      args.format = argv[i + 1];
      i += 1;
    } else if (a.startsWith('--format=')) {
      args.format = a.slice('--format='.length);
    } else if (a === '--secrets' && argv[i + 1]) {
      args.secretsCsv = argv[i + 1];
      i += 1;
    } else if (a.startsWith('--secrets=')) {
      args.secretsCsv = a.slice('--secrets='.length);
    } else if (a === '--repo' && argv[i + 1]) {
      args.repo = argv[i + 1];
      i += 1;
    } else if (a.startsWith('--repo=')) {
      args.repo = a.slice('--repo='.length);
    } else if (a === '--project' && argv[i + 1]) {
      args.project = argv[i + 1];
      i += 1;
    } else if (a.startsWith('--project=')) {
      args.project = a.slice('--project='.length);
    } else if (a === '--config' && argv[i + 1]) {
      args.config = argv[i + 1];
      i += 1;
    } else if (a.startsWith('--config=')) {
      args.config = a.slice('--config='.length);
    } else if (a === '--json') {
      args.json = true;
    } else if (a === '--dry-run') {
      args.dryRun = true;
    } else if (a === '--catalog') {
      args.catalog = true;
    } else if (a === '--report') {
      args.report = true;
    } else if (a === '--quiet') {
      args.quiet = true;
    } else {
      throw new Error(`unknown arg: ${a}`);
    }
  }
  return args;
}

function safeSpawn(cmd, args, opts = {}) {
  const allowedCommands = [
    'where',
    'sh',
    'bash',
    'node',
    'sops',
    'pass',
    'bw',
    'op',
    'infisical',
    'vault',
    'doppler',
    'gh',
    'git',
    'mkdir',
    'tar',
    'rm',
    process.execPath,
  ];
  if (!allowedCommands.includes(cmd)) {
    return { ok: false, error: 'Command not allowed' };
  }
  try {
    const { maxBuffer, stdio, timeout, ...rest } = opts;
    // nosemgrep: javascript.lang.security.detect-child-process.detect-child-process
    // Validate command against explicit allowlist before invoking spawnSync.
    const result = spawnSync(cmd, args, {
      encoding: 'utf8',
      maxBuffer: maxBuffer || 1024 * 1024,
      stdio: stdio || (Object.prototype.hasOwnProperty.call(rest, 'input')
        ? ['pipe', 'pipe', 'pipe']
        : ['ignore', 'pipe', 'pipe']),
      timeout: timeout ?? DEFAULT_CLI_TIMEOUT_MS,
      ...rest,
    });
    if (result.error) {
      if (result.error.code === 'ETIMEDOUT') {
        return { ok: false, error: `timeout after ${timeout ?? DEFAULT_CLI_TIMEOUT_MS}ms`, timedOut: true };
      }
      return { ok: false, error: result.error.message };
    }
    if (result.status !== 0) {
      return { ok: false, error: (result.stderr || '').trim() || `exit ${result.status}` };
    }
    return { ok: true, stdout: (result.stdout || '').replace(/\n$/, '') };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, "'\\''")}'`;
}

function hasBinary(bin) {
  const probe = process.platform === 'win32'
    ? safeSpawn('where', [bin])
    : safeSpawn('sh', ['-c', `command -v ${shellQuote(bin)}`]);
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

// Source 8: Infisical / Vault direct CLI lookups.
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

const SOURCE_CATALOG = [
  { id: 'github-secrets', description: 'Repo secrets already present in GitHub Actions.' },
  { id: 'env', description: 'Environment variables exported into the current process.' },
  { id: 'json-backup', description: 'CREDENTIAL_BACKUP_JSON or CREDENTIAL_BACKUP_JSON_FILE.' },
  { id: 'sops', description: 'SOPS/age file from CREDENTIAL_BACKUP_SOPS_FILE.' },
  { id: 'pass', description: 'UNIX pass entries under CREDENTIAL_BACKUP_PASS_PREFIX.' },
  { id: 'bitwarden', description: 'Bitwarden CLI with CREDENTIAL_BACKUP_BW_PREFIX and BW_SESSION.' },
  { id: '1password', description: '1Password CLI references from CREDENTIAL_BACKUP_1PASSWORD_TEMPLATE.' },
  { id: 'infisical', description: 'Infisical CLI with INFISICAL_TOKEN.' },
  { id: 'vault', description: 'Vault CLI with VAULT_ADDR and Vault authentication.' },
  { id: 'doppler', description: 'Optional Doppler CLI fallback.' },
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

function resetCaches() {
  jsonCache = null;
  sopsCache = null;
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

function githubEnvEntry(key, value) {
  const digest = crypto
    .createHash('sha256')
    .update(`${key}\0${value}`)
    .digest('hex')
    .slice(0, 16);
  let delimiter = `__CBH_${key}_${digest}__`;
  let counter = 0;
  while (String(value).split(/\r?\n/).includes(delimiter)) {
    counter += 1;
    delimiter = `__CBH_${key}_${digest}_${counter}__`;
  }
  return `${key}<<${delimiter}\n${value}\n${delimiter}`;
}

function formatOutput(resolved, format) {
  if (format === 'env') {
    return Object.entries(resolved)
      .filter(([, v]) => v.value)
      .map(([k, v]) => `${k}=${v.value}`)
      .join('\n');
  }
  if (format === 'github-actions') {
    // Emit only GITHUB_ENV-compatible heredocs. Workflow commands such as
    // ::add-mask:: belong on stdout, not inside the env file.
    return Object.entries(resolved)
      .filter(([, v]) => v.value)
      .map(([k, v]) => githubEnvEntry(k, v.value))
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

function normalizeSecrets(csv) {
  return [...new Set(String(csv || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean))];
}

function githubSecretSet(repo) {
  if (process.env.MOCK_GITHUB_SECRETS) {
    return new Set(process.env.MOCK_GITHUB_SECRETS
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean));
  }
  if (!repo || !hasBinary('gh')) return new Set();
  if (!process.env.GH_TOKEN && !process.env.GITHUB_TOKEN) return new Set();

  const result = safeSpawn('gh', ['secret', 'list', '--repo', repo, '--json', 'name']);
  if (!result.ok) return new Set();
  try {
    return new Set(JSON.parse(result.stdout).map((entry) => entry.name).filter(Boolean));
  } catch (_) {
    return new Set();
  }
}

function setGithubSecret(name, value, repo, dryRun) {
  if (dryRun) return { ok: true, dryRun: true };
  if (!hasBinary('gh')) return { ok: false, reason: 'gh CLI not found' };
  const result = safeSpawn('gh', ['secret', 'set', name, '--repo', repo], {
    input: String(value),
  });
  if (result.ok) return { ok: true };
  return { ok: false, reason: result.error || 'gh secret set failed' };
}

function syncSecrets(opts) {
  if (!opts.secretsCsv) {
    throw new Error('--secrets is required');
  }
  if (!opts.repo || !opts.repo.includes('/')) {
    throw new Error('--repo must be owner/repo');
  }

  const secrets = normalizeSecrets(opts.secretsCsv);
  if (secrets.length === 0) {
    throw new Error('no valid secret names parsed from --secrets');
  }

  const strictSourceCheck = /^(1|true|yes)$/i.test(process.env.STRICT_SOURCE_CHECK || '');
  const existingSecrets = githubSecretSet(opts.repo);
  const summary = {
    repo: opts.repo,
    project: opts.project,
    config: opts.config,
    dry_run: opts.dryRun,
    requested: secrets,
    synced: [],
    already_present: [],
    missing: [],
    missing_in_doppler: [],
    failed: [],
    sources: {},
    providers: sourcesAvailable(),
    source_catalog: SOURCE_CATALOG,
  };

  for (const name of secrets) {
    const resolved = resolveKey(name);
    if (resolved && resolved.value) {
      const written = setGithubSecret(name, resolved.value, opts.repo, opts.dryRun);
      if (written.ok) {
        summary.synced.push(name);
        summary.sources[name] = resolved.source;
      } else {
        summary.failed.push(name);
        summary.sources[name] = `${resolved.source}:write-failed:${written.reason}`;
      }
      continue;
    }

    if (existingSecrets.has(name)) {
      summary.already_present.push(name);
      summary.sources[name] = 'github-secrets';
      continue;
    }

    if (opts.dryRun && !strictSourceCheck) {
      summary.synced.push(name);
      summary.sources[name] = 'dry-run';
      continue;
    }

    summary.missing.push(name);
    summary.missing_in_doppler.push(name);
    summary.sources[name] = 'missing';
  }

  return summary;
}

function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (err) {
    process.stderr.write(`error: ${err.message}\n`);
    usage(2);
    return;
  }
  const keys = args.keys || DEFAULT_KEYS;

  if (args.catalog) {
    process.stdout.write(`${JSON.stringify(SOURCE_CATALOG, null, 2)}\n`);
    return;
  }

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

  if (args.secretsCsv) {
    try {
      const summary = syncSecrets(args);
      if (args.json) {
        process.stdout.write(`${JSON.stringify(summary)}\n`);
      } else {
        process.stdout.write(`Credential backup harness checked ${summary.requested.length} secret(s).\n`);
        process.stdout.write(`Synced: ${summary.synced.length}; already present: ${summary.already_present.length}; missing: ${summary.missing.length}; failed: ${summary.failed.length}\n`);
      }
    } catch (err) {
      process.stderr.write(`error: ${err.message}\n`);
      process.exit(2);
    }
    return;
  }

  const resolved = resolveAll(keys);
  process.stdout.write(`${formatOutput(resolved, args.format)}\n`);
}

module.exports = {
  resolveKey,
  resolveAll,
  sourcesAvailable,
  syncSecrets,
  formatOutput,
  normalizeSecrets,
  DEFAULT_KEYS,
  // exposed for tests
  _internal: {
    safeSpawn,
    resetCaches,
    githubEnvEntry,
    githubSecretSet,
    setGithubSecret,
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
