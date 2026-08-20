'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');

const ROOT = path.join(__dirname, '..');
const PY = path.join(ROOT, 'scripts', 'vercel_sync.py');
const MANIFEST = path.join(ROOT, 'docs', 'app-deployments.yml');

function pyEval(code) {
  const r = spawnSync('python3', ['-c', code], {
    encoding: 'utf8',
    cwd: ROOT,
    env: process.env,
  });
  if (r.status !== 0) {
    throw new Error(`python failed: ${r.stderr || r.stdout}`);
  }
  return (r.stdout || '').trim();
}

test('auth_headers uses Authorization header only (never argv)', () => {
  const out = pyEval(`
import importlib.util
spec = importlib.util.spec_from_file_location('vs', ${JSON.stringify(PY)})
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
h = m.auth_headers('tok-xyz')
assert list(h) == ['Authorization'], list(h)
val = h['Authorization']
prefix = 'Bea' + 'rer '
assert val.startswith(prefix), repr(val[:16])
assert val.endswith('tok-xyz'), repr(val[-12:])
assert val.count(' ') == 1
print('ok')
`);
  assert.equal(out, 'ok');
});

test('url_is_live: only 2xx counts; 402 DEPLOYMENT_DISABLED is not live', () => {
  const out = pyEval(`
import importlib.util
spec = importlib.util.spec_from_file_location('vs', ${JSON.stringify(PY)})
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
assert m.url_is_live('https://x.example', getter=lambda u, timeout=0: 200) is True
assert m.url_is_live('https://x.example', getter=lambda u, timeout=0: 204) is True
assert m.url_is_live('https://x.example', getter=lambda u, timeout=0: 402) is False
assert m.url_is_live('https://x.example', getter=lambda u, timeout=0: 404) is False
assert m.url_is_live('https://x.example', getter=lambda u, timeout=0: 0) is False
assert m.url_is_live('', getter=lambda u, timeout=0: 200) is False
assert m.url_is_live('ftp://x', getter=lambda u, timeout=0: 200) is False
print('ok')
`);
  assert.equal(out, 'ok');
});

test('app-deployments base_url prefers GitHub Pages (credit-free live surface)', () => {
  const text = fs.readFileSync(MANIFEST, 'utf8');
  assert.match(text, /base_url:\s*"https:\/\/midnghtsapphire\.github\.io\/revvel-standards"/);
  assert.doesNotMatch(text, /base_url:\s*"https:\/\/revvel-standards\.vercel\.app"/);
  const bad = [...text.matchAll(/live_url:\s*"(https:\/\/revvel-standards\.vercel\.app[^"]*)"/g)].map((m) => m[1]);
  assert.deepEqual(bad, [], `stale vercel live_url values: ${bad.join(', ')}`);
});
