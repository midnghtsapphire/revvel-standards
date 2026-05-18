#!/usr/bin/env node
'use strict';

const { execFileSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const HARNESS = path.join(REPO_ROOT, 'scripts', 'credential-backup-harness.js');
const GATEKEEPER = path.join(REPO_ROOT, '.github', 'workflows', 'credential-gatekeeper.yml');
const DOC = path.join(REPO_ROOT, 'docs', 'CREDENTIAL_BACKUP_HARNESS.md');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`PASS: ${name}`);
    passed++;
  } catch (e) {
    console.log(`FAIL: ${name}\n    ${e.stack || e.message}`);
    failed++;
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'assertion failed');
}

function assertEq(a, b, msg) {
  if (JSON.stringify(a) !== JSON.stringify(b)) {
    throw new Error(`${msg || 'mismatch'}: expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
  }
}

test('credential backup harness exists and is executable', () => {
  const stat = fs.statSync(HARNESS);
  assert(stat.isFile(), 'harness is not a file');
  if (process.platform !== 'win32') {
    assert((stat.mode & 0o111) !== 0, 'harness is not executable');
  }
});

test('--catalog lists FOSS/free backup providers', () => {
  const out = execFileSync(HARNESS, ['--catalog'], { encoding: 'utf8' });
  const catalog = JSON.parse(out);
  const ids = catalog.map((entry) => entry.id);
  for (const id of ['github-actions-secrets', 'sops-age', 'pass', 'bitwarden-cli', 'infisical', 'hashicorp-vault', 'doppler']) {
    assert(ids.includes(id), `catalog missing ${id}`);
  }
  assert(catalog.some((entry) => entry.foss === true), 'catalog should include FOSS providers');
});

test('strict dry-run resolves env/json backups, existing GitHub secrets, and missing secrets', () => {
  const result = spawnSync(HARNESS, [
    '--secrets',
    'OPENROUTER_API_KEY,DIGITALOCEAN_API_TOKEN,STRIPE_SECRET_KEY',
    '--repo',
    'midnghtsapphire/revvel-standards',
    '--json',
    '--dry-run',
  ], {
    encoding: 'utf8',
    env: {
      ...process.env,
      STRICT_SOURCE_CHECK: '1',
      CREDENTIAL_BACKUP_JSON: JSON.stringify({ OPENROUTER_API_KEY: 'test-openrouter-value' }),
      MOCK_GITHUB_SECRETS: 'DIGITALOCEAN_API_TOKEN',
    },
  });

  assert(result.status === 0, `exit ${result.status}: ${result.stderr}`);
  const summary = JSON.parse(result.stdout.trim().split('\n').filter(Boolean).pop());
  assertEq(summary.synced, ['OPENROUTER_API_KEY'], 'synced from JSON backup');
  assertEq(summary.already_present, ['DIGITALOCEAN_API_TOKEN'], 'already present GitHub secret');
  assertEq(summary.missing, ['STRIPE_SECRET_KEY'], 'missing secret');
  assertEq(summary.sources.OPENROUTER_API_KEY, 'json-backup:env', 'source label');
  assertEq(summary.sources.DIGITALOCEAN_API_TOKEN, 'github-actions-secrets', 'existing source label');
});

test('credential-gatekeeper uses backup harness and does not skip when Doppler is absent', () => {
  const wf = fs.readFileSync(GATEKEEPER, 'utf8');
  assert(wf.includes('credential-backup-harness'), 'workflow should mention backup harness');
  assert(wf.includes('Doppler is not configured. Use GitHub Actions secrets directly'), 'BOM should document no-Doppler path');
  assert(!wf.includes('No Doppler token configured — skipping auto-provision'), 'workflow must not skip auto-provision just because Doppler is absent');
  assert(wf.includes('CREDENTIAL_BACKUP_JSON'), 'workflow should expose JSON backup source');
  assert(wf.includes('CREDENTIAL_BACKUP_SOPS_FILE'), 'workflow should expose SOPS backup source');
});

test('credential backup harness documentation covers CLI, MCP, connectors, and free options', () => {
  const doc = fs.readFileSync(DOC, 'utf8');
  for (const phrase of ['CLI', 'MCP', 'Connector', 'Free', 'GitHub Actions secrets', 'Bitwarden CLI', 'SOPS']) {
    assert(doc.toLowerCase().includes(phrase.toLowerCase()), `doc missing ${phrase}`);
  }
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
