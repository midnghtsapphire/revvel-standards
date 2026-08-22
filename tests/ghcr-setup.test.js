'use strict';

/**
 * Regression tests for GitHub Container Registry setup (WR #17695).
 * Would have failed before the GHCR surfaces landed.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ghcr = require('../scripts/ghcr-setup');

test('auditWiring on the real repo reports fully wired after ship', () => {
  const report = ghcr.auditWiring();
  assert.equal(typeof report.wired, 'boolean');
  assert.equal(report.total, ghcr.REQUIRED_SURFACES.length);
  assert.equal(report.passed, report.surfaces.filter((s) => s.ok).length);
  assert.ok(report.score.includes('/'));
  assert.match(report.summary, /GitHub Container Registry/i);
  assert.equal(
    report.wired,
    true,
    `expected full wiring, missing: ${report.surfaces
      .filter((s) => !s.ok)
      .map((s) => s.id)
      .join(', ')}`
  );
  assert.match(report.image, /^ghcr\.io\//);
});

test('auditWiring fails closed on an empty temp tree', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ghcr-setup-'));
  try {
    const report = ghcr.auditWiring(tmp);
    assert.equal(report.wired, false);
    assert.equal(report.passed, 0);
    assert.ok(report.surfaces.every((s) => s.ok === false));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test('toGhcrSlug lowercases and sanitizes image path segments', () => {
  assert.equal(ghcr.toGhcrSlug('MIDNGHTSAPPHIRE'), 'midnghtsapphire');
  assert.equal(ghcr.toGhcrSlug('Revvel Standards'), 'revvel-standards');
  assert.equal(ghcr.toGhcrSlug('ghcr-console'), 'ghcr-console');
});

test('buildImageRefs produces lowercase ghcr.io refs and pull/run commands', () => {
  const refs = ghcr.buildImageRefs({
    owner: 'MIDNGHTSAPPHIRE',
    repo: 'revvel-standards',
    packageName: 'ghcr-console',
    tag: 'sha-deadbeef',
  });
  assert.equal(refs.registry, 'ghcr.io');
  assert.equal(refs.image, 'ghcr.io/midnghtsapphire/revvel-standards/ghcr-console');
  assert.equal(refs.tagged, 'ghcr.io/midnghtsapphire/revvel-standards/ghcr-console:sha-deadbeef');
  assert.match(refs.pull, /^docker pull /);
  assert.match(refs.run, / -p 3012:3012 /);
  assert.match(refs.packageUrl, /github\.com\/midnghtsapphire\/revvel-standards\/pkgs\/container\/ghcr-console/);
});

test('buildImageRefs rejects empty package or whitespace tags', () => {
  assert.throws(() => ghcr.buildImageRefs({ packageName: '' }), /required/i);
  assert.throws(() => ghcr.buildImageRefs({ tag: 'bad tag' }), /whitespace/i);
});

test('composePublishTags includes latest and sha tags', () => {
  const tags = ghcr.composePublishTags({
    sha: 'abcdef0123456789abcdef0123456789abcdef01',
    refName: 'refs/heads/main',
  });
  assert.ok(tags.some((t) => t.endsWith(':latest')));
  assert.ok(tags.some((t) => t.includes(':sha-abcdef012345')));
  assert.ok(tags.some((t) => t.endsWith(':main')));
});

test('renderMarkdownReport includes answer line and surface table', () => {
  const report = ghcr.auditWiring();
  const md = ghcr.renderMarkdownReport(report);
  assert.match(md, /GitHub Container Registry setup status/);
  assert.match(md, /Answer:/);
  assert.match(md, /ghcr\.io/);
  assert.match(md, /GHCR publish workflow/);
});

test('externalSetupSteps are non-empty actionable URLs', () => {
  const steps = ghcr.externalSetupSteps();
  assert.ok(steps.length >= 5);
  for (const step of steps) {
    assert.ok(step.id && step.title && step.href && step.detail);
    assert.match(step.href, /^https:\/\//);
  }
});

test('ghcr-publish workflow is valid YAML-shaped Actions file with packages:write', () => {
  const wf = fs.readFileSync(
    path.join(__dirname, '../.github/workflows/ghcr-publish.yml'),
    'utf8'
  );
  assert.match(wf, /^name:\s+/m);
  assert.match(wf, /^on:/m);
  assert.match(wf, /packages:\s*write/);
  assert.match(wf, /ghcr\.io/);
  assert.match(wf, /docker\/login-action@[a-f0-9]{40}/);
  assert.match(wf, /docker\/build-push-action@[a-f0-9]{40}/);
  assert.match(wf, /workflow_dispatch/);
});

test('secrets map documents GHCR_READ_TOKEN by name only', () => {
  const text = fs.readFileSync(path.join(__dirname, '../docs/SECRETS_MAP.md'), 'utf8');
  assert.match(text, /GHCR_READ_TOKEN/);
  assert.match(text, /ghcr|container registry/i);
  // Never document a fake token value pattern in the map.
  assert.doesNotMatch(text, /ghp_[A-Za-z0-9]{20,}/);
});

test('product Dockerfile has HEALTHCHECK and non-root-friendly defaults', () => {
  const df = fs.readFileSync(
    path.join(__dirname, '../products/ghcr-console/Dockerfile'),
    'utf8'
  );
  assert.match(df, /FROM\s+/i);
  assert.match(df, /HEALTHCHECK/i);
  assert.match(df, /3012/);
});
