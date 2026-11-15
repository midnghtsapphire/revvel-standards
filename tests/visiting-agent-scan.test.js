'use strict';

// Guards the visiting-agent rule (VISITING_AGENTS.md section 1b).
// The scanner must pass on the repo as it is, flag a new tracker or brand
// string, and let an allowlisted path through.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const SCAN = path.join(ROOT, 'scripts', 'visiting-agent-scan.js');
const { loadConfig, scanFile, classify, inScope, toRepoPath } = require(SCAN);

test('the repo has no new tracker or branding hits', () => {
  const out = execFileSync('node', [SCAN], { cwd: ROOT }).toString();
  assert.match(out, /0 new/);
});

test('every spec pattern from the rule is present', () => {
  const ids = loadConfig().patterns.map((p) => p.regex).join('\n');
  for (const needle of ['manus', 'built with', 'gtag', 'googletagmanager', 'fbq', 'utm_source', 'affiliate', 'mixpanel', 'segment', 'hotjar']) {
    assert.ok(ids.toLowerCase().includes(needle), `missing pattern for ${needle}`);
  }
});

test('flags each common tracker and brand string in a new file', () => {
  const cfg = loadConfig();
  const samples = [
    "gtag('config', 'G-1')",
    '<script src="https://www.googletagmanager.com/gtm.js">',
    "fbq('track', 'PageView')",
    '<a href="/x?utm_source=foo">',
    'const mixpanel = require("mixpanel")',
    '<script src="https://cdn.segment.com/analytics.js">',
    'hotjar.init(1)',
    '<footer>Built with Manus</footer>',
  ];
  for (const text of samples) {
    const hits = scanFile(cfg, 'products/new-app/index.html', text);
    assert.ok(hits.length > 0, `not flagged: ${text}`);
    assert.ok(hits.every((h) => classify(cfg, h) === 'new'), `should be new: ${text}`);
  }
});

test('affiliate code in affiliate-hub is allowlisted, and elsewhere it is new', () => {
  const cfg = loadConfig();
  const text = 'const link = affiliateLink(id)';
  const ok = scanFile(cfg, 'products/affiliate-hub/app/x.mjs', text);
  assert.ok(ok.length > 0 && ok.every((h) => classify(cfg, h) === 'allowlisted'));
  const bad = scanFile(cfg, 'products/some-other-app/app/x.mjs', text);
  assert.ok(bad.every((h) => classify(cfg, h) === 'new'));
});

test('docs, tests and scripts are out of scope', () => {
  const cfg = loadConfig();
  assert.equal(inScope(cfg, 'docs/x.html'), false);
  assert.equal(inScope(cfg, 'scripts/x.js'), false);
  assert.equal(inScope(cfg, 'products/app/node_modules/x.js'), false);
  assert.equal(inScope(cfg, 'products/app/index.html'), true);
});

test('the scanner exits 1 on a new hit when given a file', () => {
  const dir = fs.mkdtempSync(path.join(ROOT, 'products', '.vas-test-'));
  try {
    const rel = path.relative(ROOT, path.join(dir, 'index.html'));
    fs.writeFileSync(path.join(ROOT, rel), "<script>gtag('js', new Date())</script>\n");
    const r = spawnSync('node', [SCAN, rel], { cwd: ROOT });
    assert.equal(r.status, 1);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// The test above only fails on Windows, because path.relative() is the only
// thing producing a non-POSIX separator and it does that only there. It passed
// in CI over a scanner that could not see a file handed to it by hand.
//
// An absolute path is the platform-independent control: inScope does
// `file.split('/')[0]`, which yields '' for /repo/products/... on POSIX and the
// whole string for C:\...\products\... on Windows. Neither is an include_dir,
// so before the fix the file left scope, was never opened, and the process
// exited 0 -- claiming "no new hits" about a file it never read.
//
// A literal backslash would NOT be platform-independent: on POSIX a backslash
// is an ordinary filename character, so 'products\x\index.html' is one
// nonexistent file rather than a path, and the case would go red there for the
// wrong reason. The native separator is covered by the unit test below instead.
test('the scanner exits 1 on a new hit when given an absolute path', () => {
  const dir = fs.mkdtempSync(path.join(ROOT, 'products', '.vas-test-'));
  try {
    const abs = path.join(dir, 'index.html');
    fs.writeFileSync(abs, "<script>gtag('js', new Date())</script>\n");
    const r = spawnSync('node', [SCAN, abs], { cwd: ROOT });
    assert.equal(r.status, 1, 'absolute path must still reach the scanner');
    // The reported path must be normalized, because the allowlist globs, the
    // baseline map keys, and --write-baseline all key on this same string.
    assert.match(r.stderr.toString(), /products\/\.vas-test-[^/\\]+\/index\.html:1/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('toRepoPath normalizes native separators and absolute paths', () => {
  // path.join uses the platform separator, so this asserts the same contract on
  // Windows (backslashes) and POSIX (already forward slashes).
  assert.equal(toRepoPath(path.join('products', 'app', 'index.html')), 'products/app/index.html');
  assert.equal(toRepoPath(path.join(ROOT, 'products', 'app', 'index.html')), 'products/app/index.html');
  assert.equal(toRepoPath('products/app/index.html'), 'products/app/index.html');
});

test('every allowlist entry states a reason, and the data file never grows silently', () => {
  const cfg = loadConfig();
  for (const a of cfg.allowlist) assert.ok(a.reason && a.reason.length > 20);
  for (const g of cfg.baseline) assert.ok(g.reason && /baseline/i.test(g.reason));
});
