#!/usr/bin/env node
'use strict';

/**
 * Credential Backup Harness
 *
 * Resolves required secret names from multiple safe sources and syncs resolved
 * values into GitHub Actions secrets. Secret values are never printed.
 */

const fs = require('fs');
const https = require('https');
const path = require('path');
const { spawnSync } = require('child_process');

const PROVIDER_CATALOG = [
  {
    id: 'github-actions-secrets',
    type: 'github',
    cost: 'included with GitHub',
    foss: false,
    use: 'Detect already-provisioned repo secrets and write resolved backup values with gh secret set.',
  },
  {
    id: 'environment',
    type: 'cli',
    cost: 'free',
    foss: true,
    use: 'Read ephemeral CI/local environment variables named exactly like each required secret.',
  },
  {
    id: 'json-backup',
    type: 'connector',
    cost: 'free',
    foss: true,
    use: 'Read CREDENTIAL_BACKUP_JSON or CREDENTIAL_BACKUP_JSON_FILE from a local, ignored, or encrypted source.',
  },
  {
    id: 'sops-age',
    type: 'cli',
    cost: 'free',
    foss: true,
    use: 'Decrypt an age/GPG-backed SOPS JSON or dotenv file via CREDENTIAL_BACKUP_SOPS_FILE.',
  },
  {
    id: 'pass',
    type: 'cli',
    cost: 'free',
    foss: true,
    use: 'Read UNIX pass entries from CREDENTIAL_BACKUP_PASS_PREFIX/<SECRET_NAME>.',
  },
  {
    id: 'bitwarden-cli',
    type: 'cli-extension',
    cost: 'free personal tier',
    foss: true,
    use: 'Read Bitwarden CLI items with BW_SESSION and CREDENTIAL_BACKUP_BW_PREFIX.',
  },
  {
    id: 'onepassword-cli',
    type: 'cli-extension',
    cost: 'free developer tooling / paid vault',
    foss: false,
    use: 'Read op:// references using OP_SERVICE_ACCOUNT_TOKEN and CREDENTIAL_BACKUP_1PASSWORD_TEMPLATE.',
  },
  {
    id: 'doppler',
    type: 'connector',
    cost: 'optional paid/free vendor tier',
    foss: false,
    use: 'Read Doppler config secrets when a Doppler token is available; not required for success.',
  },
  {
    id: 'infisical',
    type: 'mcp-cli',
    cost: 'free cloud tier / self-hosted FOSS',
    foss: true,
    use: 'Recommended backup connector; expose values to this harness via env, SOPS, or CI after Infisical sync.',
  },
  {
    id: 'hashicorp-vault',
    type: 'mcp-cli',
    cost: 'self-hosted FOSS / cloud free tier',
    foss: true,
    use: 'Recommended production vault; expose short-lived values to this harness through CI env or SOPS export.',
  },
];

function usage(exitCode = 0) {
  const text = `
credential-backup-harness.js

Usage:
  node scripts/credential-backup-harness.js --secrets A,B --repo owner/repo [options]

Options:
  --secrets <csv>       Comma-separated secret names to resolve (required)
  --repo <owner/repo>   Target GitHub repository (default: GITHUB_REPOSITORY)
  --project <name>      Doppler project name (default: revvel-standards)
  --config <name>       Doppler config name (default: prd)
  --json                Print one machine-readable JSON summary
  --dry-run             Do not write GitHub secrets
  --catalog             Print provider catalog JSON and exit
  --help                Show this help

Environment-backed sources:
  SECRET_NAME                         Direct environment variable
  CREDENTIAL_BACKUP_JSON              JSON object with secret names as keys
  CREDENTIAL_BACKUP_JSON_FILE         JSON or dotenv file path
  CREDENTIAL_BACKUP_SOPS_FILE         SOPS-encrypted JSON or dotenv file path
  CREDENTIAL_BACKUP_PASS_PREFIX       pass path prefix
  CREDENTIAL_BACKUP_BW_PREFIX         Bitwarden item prefix
  CREDENTIAL_BACKUP_1PASSWORD_TEMPLATE  op://Vault/{secret}/field template
  DOPPLER_TOKEN or DOPPLER_* aliases  Optional Doppler source
`;
  process.stdout.write(text.trimStart());
  process.exit(exitCode);
}

function parseArgs(argv) {
  const opts = {
    secretsCsv: '',
    repo: process.env.GITHUB_REPOSITORY || '',
    project: 'revvel-standards',
    config: 'prd',
    json: false,
    dryRun: /^(1|true|yes)$/i.test(process.env.DRY_RUN || ''),
    catalog: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = () => {
      if (i + 1 >= argv.length) throw new Error(`${arg} requires a value`);
      return argv[++i];
    };

    if (arg === '--help' || arg === '-h') usage(0);
    else if (arg === '--catalog') opts.catalog = true;
    else if (arg === '--json') opts.json = true;
    else if (arg === '--dry-run') opts.dryRun = true;
    else if (arg === '--secrets') opts.secretsCsv = next();
    else if (arg.startsWith('--secrets=')) opts.secretsCsv = arg.slice('--secrets='.length);
    else if (arg === '--repo') opts.repo = next();
    else if (arg.startsWith('--repo=')) opts.repo = arg.slice('--repo='.length);
    else if (arg === '--project') opts.project = next();
    else if (arg.startsWith('--project=')) opts.project = arg.slice('--project='.length);
    else if (arg === '--config') opts.config = next();
    else if (arg.startsWith('--config=')) opts.config = arg.slice('--config='.length);
    else throw new Error(`unknown arg: ${arg}`);
  }

  return opts;
}

function normalizeSecrets(csv) {
  return [...new Set(String(csv || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean))];
}

function commandExists(command) {
  const result = spawnSync('bash', ['-lc', `command -v ${command}`], { encoding: 'utf8' });
  return result.status === 0;
}

function run(command, args, input) {
  return spawnSync(command, args, {
    encoding: 'utf8',
    input,
    maxBuffer: 1024 * 1024,
  });
}

function parseSecretText(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return {};

  if (trimmed.startsWith('{')) {
    const parsed = JSON.parse(trimmed);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  }

  const out = {};
  for (const line of trimmed.split(/\r?\n/)) {
    const clean = line.trim();
    if (!clean || clean.startsWith('#')) continue;
    const match = clean.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    out[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
  return out;
}

function readJsonBackup(name) {
  const sources = [];
  if (process.env.CREDENTIAL_BACKUP_JSON) {
    sources.push({ id: 'json-backup:env', text: process.env.CREDENTIAL_BACKUP_JSON });
  }
  if (process.env.CREDENTIAL_BACKUP_JSON_FILE) {
    const filePath = path.resolve(process.env.CREDENTIAL_BACKUP_JSON_FILE);
    if (fs.existsSync(filePath)) {
      sources.push({ id: 'json-backup:file', text: fs.readFileSync(filePath, 'utf8') });
    }
  }

  for (const source of sources) {
    const parsed = parseSecretText(source.text);
    if (Object.prototype.hasOwnProperty.call(parsed, name) && String(parsed[name])) {
      return { value: String(parsed[name]), provider: source.id };
    }
  }
  return null;
}

function readSopsBackup(name) {
  const file = process.env.CREDENTIAL_BACKUP_SOPS_FILE;
  if (!file || !commandExists('sops')) return null;
  const result = run('sops', ['--decrypt', file]);
  if (result.status !== 0) return null;
  const parsed = parseSecretText(result.stdout);
  if (Object.prototype.hasOwnProperty.call(parsed, name) && String(parsed[name])) {
    return { value: String(parsed[name]), provider: 'sops-age' };
  }
  return null;
}

function readPassBackup(name) {
  const prefix = process.env.CREDENTIAL_BACKUP_PASS_PREFIX;
  if (!prefix || !commandExists('pass')) return null;
  const result = run('pass', ['show', `${prefix.replace(/\/$/, '')}/${name}`]);
  if (result.status !== 0 || !result.stdout.trim()) return null;
  return { value: result.stdout.split(/\r?\n/)[0], provider: 'pass' };
}

function readBitwardenBackup(name) {
  const prefix = process.env.CREDENTIAL_BACKUP_BW_PREFIX;
  if (!process.env.BW_SESSION || !prefix || !commandExists('bw')) return null;
  const result = run('bw', ['get', 'password', `${prefix.replace(/\/$/, '')}/${name}`]);
  if (result.status !== 0 || !result.stdout.trim()) return null;
  return { value: result.stdout.trim(), provider: 'bitwarden-cli' };
}

function readOnePasswordBackup(name) {
  const template = process.env.CREDENTIAL_BACKUP_1PASSWORD_TEMPLATE;
  if (!process.env.OP_SERVICE_ACCOUNT_TOKEN || !template || !commandExists('op')) return null;
  const ref = template.replace(/\{secret\}/g, name).replace(/\{SECRET\}/g, name);
  const result = run('op', ['read', ref]);
  if (result.status !== 0 || !result.stdout.trim()) return null;
  return { value: result.stdout.trim(), provider: 'onepassword-cli' };
}

function dopplerTokens() {
  return [
    'DOPPLER_AGENT_TOKEN',
    'DOPPLER_TOKEN',
    'DOPPLER_LOCAL_TOKEN',
    'DOPPLER_API_KEY',
    'DOPPLER_AGENT_ODIC',
    'DOPPLER_CIRCLECI_OIDC',
  ].map((name) => process.env[name]).filter(Boolean);
}

function fetchDopplerValue(name, opts) {
  const tokens = dopplerTokens();
  if (tokens.length === 0) return Promise.resolve(null);

  const pathAndQuery = `/v3/configs/config/secret?project=${encodeURIComponent(opts.project)}&config=${encodeURIComponent(opts.config)}&name=${encodeURIComponent(name)}`;

  function attempt(index) {
    if (index >= tokens.length) return Promise.resolve(null);
    return new Promise((resolve) => {
      const req = https.request({
        hostname: 'api.doppler.com',
        path: pathAndQuery,
        method: 'GET',
        headers: {
          Authorization: `Bearer ${tokens[index]}`,
          Accept: 'application/json',
        },
        timeout: 15000,
      }, (res) => {
        let body = '';
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => {
          if (res.statusCode === 401 || res.statusCode === 403) {
            resolve(attempt(index + 1));
            return;
          }
          if (res.statusCode !== 200) {
            resolve(null);
            return;
          }
          try {
            const parsed = JSON.parse(body);
            const value = parsed && parsed.value && parsed.value.raw;
            resolve(value ? { value: String(value), provider: 'doppler' } : null);
          } catch (_) {
            resolve(null);
          }
        });
      });
      req.on('error', () => resolve(null));
      req.on('timeout', () => {
        req.destroy();
        resolve(null);
      });
      req.end();
    });
  }

  return attempt(0);
}

function githubSecretSet(repo) {
  if (process.env.MOCK_GITHUB_SECRETS) {
    return new Set(process.env.MOCK_GITHUB_SECRETS.split(',').map((s) => s.trim()).filter(Boolean));
  }
  if (!repo || !commandExists('gh')) return new Set();
  if (!process.env.GH_TOKEN && !process.env.GITHUB_TOKEN) return new Set();
  const result = run('gh', ['secret', 'list', '--repo', repo, '--json', 'name']);
  if (result.status !== 0) return new Set();
  try {
    return new Set(JSON.parse(result.stdout).map((entry) => entry.name).filter(Boolean));
  } catch (_) {
    return new Set();
  }
}

async function resolveSecret(name, opts) {
  const direct = process.env[name];
  if (direct) return { value: direct, provider: 'environment' };

  const localSources = [
    readJsonBackup,
    readSopsBackup,
    readPassBackup,
    readBitwardenBackup,
    readOnePasswordBackup,
  ];
  for (const source of localSources) {
    const hit = source(name);
    if (hit && hit.value) return hit;
  }

  const doppler = await fetchDopplerValue(name, opts);
  if (doppler && doppler.value) return doppler;
  return null;
}

function setGithubSecret(name, value, repo, dryRun) {
  if (dryRun) return { ok: true, dryRun: true };
  if (!commandExists('gh')) return { ok: false, reason: 'gh CLI not found' };
  const result = run('gh', ['secret', 'set', name, '--repo', repo], value);
  if (result.status === 0) return { ok: true };
  return { ok: false, reason: result.stderr.trim() || 'gh secret set failed' };
}

function providerStatus() {
  return PROVIDER_CATALOG.map((provider) => {
    let configured = false;
    if (provider.id === 'github-actions-secrets') configured = commandExists('gh');
    if (provider.id === 'environment') configured = true;
    if (provider.id === 'json-backup') configured = !!(process.env.CREDENTIAL_BACKUP_JSON || process.env.CREDENTIAL_BACKUP_JSON_FILE);
    if (provider.id === 'sops-age') configured = !!process.env.CREDENTIAL_BACKUP_SOPS_FILE && commandExists('sops');
    if (provider.id === 'pass') configured = !!process.env.CREDENTIAL_BACKUP_PASS_PREFIX && commandExists('pass');
    if (provider.id === 'bitwarden-cli') configured = !!process.env.BW_SESSION && !!process.env.CREDENTIAL_BACKUP_BW_PREFIX && commandExists('bw');
    if (provider.id === 'onepassword-cli') configured = !!process.env.OP_SERVICE_ACCOUNT_TOKEN && !!process.env.CREDENTIAL_BACKUP_1PASSWORD_TEMPLATE && commandExists('op');
    if (provider.id === 'doppler') configured = dopplerTokens().length > 0;
    if (provider.id === 'infisical') configured = !!process.env.INFISICAL_TOKEN || commandExists('infisical');
    if (provider.id === 'hashicorp-vault') configured = !!process.env.VAULT_ADDR || commandExists('vault');
    return { ...provider, configured };
  });
}

async function main() {
  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`error: ${error.message}\n`);
    usage(2);
  }

  if (opts.catalog) {
    process.stdout.write(`${JSON.stringify(PROVIDER_CATALOG, null, 2)}\n`);
    return;
  }

  if (!opts.secretsCsv) {
    process.stderr.write('error: --secrets is required\n');
    process.exit(2);
  }
  if (!opts.repo || !opts.repo.includes('/')) {
    process.stderr.write('error: --repo must be owner/repo\n');
    process.exit(2);
  }

  const secrets = normalizeSecrets(opts.secretsCsv);
  if (secrets.length === 0) {
    process.stderr.write('error: no valid secret names parsed from --secrets\n');
    process.exit(2);
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
    providers: providerStatus(),
    source_catalog: PROVIDER_CATALOG,
  };

  for (const name of secrets) {
    const resolved = await resolveSecret(name, opts);
    if (resolved && resolved.value) {
      const written = setGithubSecret(name, resolved.value, opts.repo, opts.dryRun);
      if (written.ok) {
        summary.synced.push(name);
        summary.sources[name] = resolved.provider;
      } else {
        summary.failed.push(name);
        summary.sources[name] = `${resolved.provider}:write-failed:${written.reason}`;
      }
      continue;
    }

    if (existingSecrets.has(name)) {
      summary.already_present.push(name);
      summary.sources[name] = 'github-actions-secrets';
      continue;
    }

    if (opts.dryRun && !strictSourceCheck) {
      summary.synced.push(name);
      summary.sources[name] = 'dry-run';
      continue;
    }

    summary.missing.push(name);
    summary.missing_in_doppler.push(name);
  }

  if (opts.json) {
    process.stdout.write(`${JSON.stringify(summary)}\n`);
  } else {
    process.stdout.write(`Credential backup harness checked ${secrets.length} secret(s).\n`);
    process.stdout.write(`Synced: ${summary.synced.length}; already present: ${summary.already_present.length}; missing: ${summary.missing.length}; failed: ${summary.failed.length}\n`);
  }
}

main().catch((error) => {
  process.stderr.write(`error: ${error.message}\n`);
  process.exit(1);
});
