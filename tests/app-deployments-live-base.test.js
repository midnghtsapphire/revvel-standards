'use strict';

/**
 * Regression: BIOME inspector marks apps unreachable when base_url points at a
 * disabled Vercel deployment (HTTP 402 DEPLOYMENT_DISABLED). The credit-free
 * live surface is GitHub Pages via static.yml — base_url must stay there unless
 * a Vercel production URL is proven live (see scripts/vercel_sync.url_is_live).
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const yaml = require('yaml');
const {
  deriveLiveUrl,
  isExternal,
  classifyApp,
  isIncomplete,
  summarize,
} = require('../scripts/biome/inspector');

const ROOT = path.join(__dirname, '..');
const MANIFEST = path.join(ROOT, 'docs', 'app-deployments.yml');
const PAGES_BASE = 'https://midnghtsapphire.github.io/revvel-standards';

test('manifest base_url is the GitHub Pages host', () => {
  const manifest = yaml.parse(fs.readFileSync(MANIFEST, 'utf8'));
  const base = ((manifest.deployment || {}).base_url || '').replace(/\/+$/, '');
  assert.equal(base, PAGES_BASE);
});

test('every internal app derives a Pages /docs/<app>/ live URL', () => {
  const manifest = yaml.parse(fs.readFileSync(MANIFEST, 'utf8'));
  const base = (manifest.deployment || {}).base_url || '';
  const apps = manifest.apps || {};
  const internal = Object.entries(apps).filter(([, meta]) => !isExternal(meta));
  assert.ok(internal.length >= 19, `expected >=19 internal apps, got ${internal.length}`);
  for (const [name, meta] of internal) {
    const url = deriveLiveUrl(name, meta, base);
    assert.equal(
      url,
      `${PAGES_BASE}/docs/${name}/`,
      `${name} should derive Pages docs URL`,
    );
    // Simulated inspector classify: if Pages returns 200, app is live.
    const app = classifyApp({ name, url, status: 200, external: false });
    assert.equal(app.state, 'live');
    assert.equal(isIncomplete(app), false);
  }
});

test('disabled Vercel hub URL would still classify as unreachable (guard)', () => {
  const dead = classifyApp({
    name: 'affiliate-hub',
    url: 'https://revvel-standards.vercel.app/docs/affiliate-hub/',
    status: 402,
  });
  assert.equal(dead.state, 'unreachable');
  assert.equal(isIncomplete(dead), true);
  const summary = summarize([dead]);
  assert.equal(summary.unreachable, 1);
  assert.equal(summary.live, 0);
});
