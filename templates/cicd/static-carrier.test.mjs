import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { gzipSync } from 'node:zlib';
import { staticCarrier } from './static-carrier.mjs';
import { packageStatic } from './deploy-static.mjs';
const require = createRequire(import.meta.url);
const runtime = await readFile(new URL('./static-runtime.mjs', import.meta.url), 'utf8');
const asset = body => ({ body: Buffer.from(body).toString('base64'), etag: '"fixture"' });

test('typed carrier fails closed on absent/repeated anchors and unsupported format', () => {
  const options = { runtime, payload: '', product: 'affiliate-hub', format: 'railway-ts' };
  assert.throws(() => staticCarrier({ ...options, runtime: runtime.replace('  const mime = {', '  const mimeChanged = {') }), /exactly once/);
  assert.throws(() => staticCarrier({ ...options, runtime: runtime + '\n  const mime = {' }), /exactly once/);
  assert.throws(() => staticCarrier({ ...options, format: 'unknown' }), /Unsupported/);
});

test('all four typed carriers compile strictly, preserve payloads and serve compiled HTTP', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'revvel-static-types-'));
  await writeFile(join(dir, 'package.json'), '{"type":"module"}');
  const products = ['affiliate-hub', 'ai-video-toolkit', 'screen-recorder-finder', 'goap-swarm-console'];
  const sources = [];
  for (const product of products) {
    const manifest = { '/index.html': asset(product), '/health': asset('{"status":"ok"}'), '/pricing.html': asset('Pricing'), '/agent-as-fte.html': asset('Sales'), '/agent-as-fte/deck.html': asset('Deck'), '/goap-agent-sales-deck.pdf': asset('%PDF-1.4') };
    const out = join(dir, 'products', product, 'out');
    await mkdir(join(out, 'agent-as-fte'), { recursive: true });
    for (const [key, entry] of Object.entries(manifest)) await writeFile(join(out, key.slice(1)), Buffer.from(entry.body, 'base64'));
    const ts = join(dir, `${product}.ts`), js = join(dir, `${product}.mjs`);
    await packageStatic({ repoRoot: dir, product, output: ts, format: 'railway-ts' });
    await packageStatic({ repoRoot: dir, product, output: js });
    const typed = await readFile(ts, 'utf8'), plain = await readFile(js, 'utf8');
    const payload = source => /startPackedSite\("([A-Za-z0-9+/=]+)"\);/.exec(source)[1];
    assert.equal(payload(typed), payload(plain), `${product}: exact compressed asset parity`);
    sources.push(ts);
  }
  const compiler = require.resolve('typescript/bin/tsc');
  const typeRoots = resolve(fileURLToPath(new URL('../../node_modules/@types', import.meta.url)));
  const result = spawnSync(process.execPath, [compiler, '--strict', '--target', 'ES2022', '--module', 'NodeNext', '--types', 'node', '--typeRoots', typeRoots, '--outDir', join(dir, 'compiled'), ...sources], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  for (const product of products) {
    const child = spawn(process.execPath, [join(dir, 'compiled', `${product}.js`)], { env: { ...process.env, PORT: '0' }, stdio: ['ignore', 'pipe', 'pipe'] });
    try {
      const port = await new Promise((resolvePort, reject) => {
        const timer = setTimeout(() => reject(new Error('Compiled server startup timeout')), 10000);
        child.once('exit', code => { clearTimeout(timer); reject(new Error(`Compiled server exited ${code}`)); });
        child.stdout.on('data', chunk => { const match = String(chunk).match(/port (\d+)/); if (match) { clearTimeout(timer); resolvePort(match[1]); } });
      });
      const base = `http://127.0.0.1:${port}`;
      assert.equal(await (await fetch(base)).text(), product);
      assert.deepEqual(await (await fetch(`${base}/health`)).json(), { status: 'ok' });
      assert.equal((await fetch(base, { method: 'POST' })).status, 405);
      assert.equal((await fetch(`${base}/missing`)).status, 404);
    } finally { const stopped = once(child, 'exit'); child.kill(); await stopped; }
  }
});
