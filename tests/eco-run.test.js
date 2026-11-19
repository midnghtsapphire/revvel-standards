'use strict';

/**
 * Guards for the eco run (WR eco-run-20261119): scripts/eco/*, the two CircleCI
 * jobs, and the "never delete" rule for the old GitHub Actions eco workflows.
 * Offline: no network, no Eco CI download.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const yaml = require('yaml');

const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const { resolveAssetUrls, run } = require('../scripts/eco/website-carbon.js');

test('resolveAssetUrls finds scripts, styles, images; skips data:, anchors, mailto', () => {
  const html = `<link rel="stylesheet" href="/a.css"><link rel="icon" href="f.ico">
    <script src="https://cdn.example/x.js"></script><img src="img/p.png"><img src="data:image/png;base64,AAA">
    <a href="#top">t</a><link rel="canonical" href="/c">`;
  const urls = resolveAssetUrls(html, 'https://site.test/dir/');
  assert.deepEqual(urls.sort(), [
    'https://cdn.example/x.js',
    'https://site.test/a.css',
    'https://site.test/dir/f.ico',
    'https://site.test/dir/img/p.png',
  ].sort());
});

test('run() sums page + asset bytes, passes the green flag, writes carbon.json', async () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'eco-test-'));
  const calls = [];
  const curl = async (url, file) => {
    calls.push(url);
    if (file) fs.writeFileSync(file, '<link rel="stylesheet" href="/a.css"><img src="/missing.png">');
    if (url.endsWith('/missing.png')) return { status: 404, bytes: 0 };
    return { status: 200, bytes: url.endsWith('/a.css') ? 400 : 600 };
  };
  const json = async (url) => {
    if (url.includes('greencheck')) return { green: true };
    assert.match(url, /\/data\?bytes=1000&green=1$/);
    return { gco2e: 0.5, rating: 'B', cleanerThan: 0.8, statistics: {} };
  };
  const r = await run({ url: 'https://site.test/', outDir: out, curl, json, now: () => new Date('2026-01-02T03:04:05Z') });
  assert.equal(r.bytes, 1000);
  assert.equal(r.asset_failures.length, 1);
  assert.equal(r.green, 1);
  const written = JSON.parse(fs.readFileSync(path.join(out, 'carbon.json'), 'utf8'));
  assert.equal(written.cleanerThan, 0.8);
  assert.equal(written.measured_at, '2026-01-02T03:04:05.000Z');
});

test('run() refuses to invent a number: unreachable page and non-numeric API both throw', async () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'eco-test-'));
  await assert.rejects(run({ url: 'https://x.test/', outDir: out, curl: async () => ({ status: 404, bytes: 0 }), json: async () => ({}) }), /HTTP 404/);
  const curl = async (u, f) => { if (f) fs.writeFileSync(f, '<p>hi</p>'); return { status: 200, bytes: 9 }; };
  await assert.rejects(run({ url: 'https://x.test/', outDir: out, curl, json: async (u) => (u.includes('greencheck') ? { green: false } : { error: 'Unauthorised.' }) }), /gco2e/);
  assert.equal(fs.existsSync(path.join(out, 'carbon.json')), false);
});

test('website-carbon.js CLI exits 2 with no URL and has no baked-in default site', () => {
  const r = spawnSync(process.execPath, [path.join(root, 'scripts/eco/website-carbon.js')], { env: { PATH: process.env.PATH }, encoding: 'utf8' });
  assert.equal(r.status, 2);
  assert.match(r.stderr, /GREEN_WEBSITE_URL/);
});

test('eco-ci-run.sh parses, pins Eco CI v5.3.0 by full SHA, and never sends data', () => {
  const sh = read('scripts/eco/eco-ci-run.sh');
  assert.equal(spawnSync('bash', ['-n', path.join(root, 'scripts/eco/eco-ci-run.sh')]).status, 0);
  assert.match(sh, /^ECO_CI_REF="782dd4a31bc426a6ae26a7b08d89af454b10ffc0"/m);
  // positional args: ... source=local send-data=false filter-type ...
  assert.match(sh, /"local" "false" "machine\.ci"/);
  assert.doesNotMatch(sh, /send-data.*true|"local" "true"/);
  assert.doesNotMatch(sh, /\bcurl\b.*\|\s*(ba)?sh/);
});

test('summary labels the figure as a model estimate, not a meter reading', () => {
  const sh = read('scripts/eco/eco-ci-run.sh');
  assert.match(sh, /NOT a power-meter reading/);
  assert.match(sh, /embodied_carbon_in_operational_figure: false/);
});

const cfg = yaml.parse(read('.circleci/config.yml'));

test('CircleCI eco jobs: machine executor for energy, no secrets or contexts, PR + main', () => {
  const e = cfg.jobs['eco-energy'];
  assert.ok(e.machine && /^ubuntu-2404:\d{4}\.\d{2}\.\d+$/.test(e.machine.image), 'machine image pinned to an exact tag');
  assert.equal(cfg.jobs['eco-website-carbon'].executor, 'node-executor');
  const text = JSON.stringify([e, cfg.jobs['eco-website-carbon']]);
  assert.doesNotMatch(text, /TOKEN|API_KEY|SECRET|context/i);
  const inWf = (wf, job) => cfg.workflows[wf].jobs.some((j) => j === job || (typeof j === 'object' && j[job]));
  assert.ok(inWf('pr-workflow', 'eco-energy'));
  assert.ok(inWf('main-workflow', 'eco-energy'));
  assert.ok(inWf('main-workflow', 'eco-website-carbon'));
  assert.ok(!inWf('pr-workflow', 'eco-website-carbon'), 'website carbon hits an external API; main only');
});

test('policy-check keeps its steps (regression for the huge-delete-guard splice, 88d862206)', () => {
  assert.ok(Array.isArray(cfg.jobs['policy-check'].steps) && cfg.jobs['policy-check'].steps.length >= 2);
  assert.ok(cfg.jobs['huge-delete-guard'].steps.every((s) => !(s.run && /security completion/i.test(s.run.name))));
});

test('old GitHub Actions eco workflows are kept (never delete) and say where they moved', () => {
  for (const f of ['.github/workflows/eco-github-extensions.yml', '.github/workflows/green-website.yml']) {
    const t = read(f);
    assert.match(t, /ECO-RUN 2026-11-19/, `${f} should carry the migration note`);
    assert.match(t, /docs\/ECO_RUN\.md/);
  }
  assert.match(read('.github/workflows/eco-github-extensions.yml'), /green-coding-solutions\/eco-ci-energy-estimation@v5\.3\.0/);
});
