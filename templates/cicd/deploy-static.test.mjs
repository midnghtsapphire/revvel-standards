import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { packageStatic } from './deploy-static.mjs';

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'revvel-static-test-'));
  const out = join(root, 'products', 'affiliate-hub', 'out'); await mkdir(out, { recursive: true });
  return { root, out };
}
async function populate(out, reverse = false) {
  const entries = [['index.html', '<h1>Catalog</h1>'], ['pricing.html', '<h1>Pricing</h1>'], ['health', '{"status":"ok"}'], ['.env', 'DO_NOT_PUBLISH_SECRET'], ['private.pem', 'DO_NOT_PUBLISH_KEY'], ['z.css', 'body{color:red}'], ['a.js', 'console.log(1)']];
  for (const [name, body] of reverse ? entries.reverse() : entries) await writeFile(join(out, name), body);
}

test('packaging limits public product scope and is deterministic across directory insertion order', async () => {
  const a = await fixture(), b = await fixture(); await populate(a.out); await populate(b.out, true);
  await writeFile(join(a.root, 'private.json'), '{"secret":"PRIVATE_REPOSITORY_CONTENT"}');
  const one = await packageStatic({ repoRoot: a.root, product: 'affiliate-hub', output: join(a.root, 'release.mjs') });
  const two = await packageStatic({ repoRoot: b.root, product: 'affiliate-hub', output: join(b.root, 'release.mjs') });
  assert.equal(one.sha256, two.sha256); assert.equal(one.files, 5);
  const source = await readFile(one.output, 'utf8');
  const payload = /startPackedSite\("([A-Za-z0-9+/=]+)"\);/.exec(source)[1];
  const manifest = JSON.parse(gunzipSync(Buffer.from(payload, 'base64')));
  assert.deepEqual(Object.keys(manifest), ['/a.js', '/health', '/index.html', '/pricing.html', '/z.css']);
  assert.ok(!JSON.stringify(manifest).includes('DO_NOT_PUBLISH'));
  await assert.rejects(packageStatic({ repoRoot: a.root, product: 'affiliate-hub', output: one.output }), /EEXIST/);
  await assert.rejects(packageStatic({ repoRoot: a.root, product: '..', output: join(a.root, 'other.mjs') }), /three revenue/);
});

test('packaging refuses incomplete routes and public symlinks', async t => {
  const { root, out } = await fixture(); await writeFile(join(out, 'index.html'), 'Home');
  await assert.rejects(packageStatic({ repoRoot: root, product: 'affiliate-hub', output: join(root, 'missing.mjs') }), /home, pricing and health/);
  await populate(out);
  try { await symlink(root, join(out, 'private-link'), 'junction'); }
  catch (error) { if (error.code === 'EPERM') { t.skip('OS denied creating a test symlink'); return; } throw error; }
  await assert.rejects(packageStatic({ repoRoot: root, product: 'affiliate-hub', output: join(root, 'linked.mjs') }), /Symbolic links/);
});

test('GOAP requires sales routes and embeds only its named public sales PDF', async () => {
  const root = await mkdtemp(join(tmpdir(), 'revvel-goap-static-test-'));
  const out = join(root, 'products', 'goap-swarm-console', 'out');
  await mkdir(join(out, 'agent-as-fte'), { recursive: true });
  await writeFile(join(out, 'index.html'), 'Home');
  await writeFile(join(out, 'health'), '{"status":"ok"}');
  await assert.rejects(packageStatic({ repoRoot: root, product: 'goap-swarm-console', output: join(root, 'incomplete.mjs') }), /sales page, deck, PDF/);
  await writeFile(join(out, 'agent-as-fte.html'), 'Sales');
  await writeFile(join(out, 'agent-as-fte', 'deck.html'), 'Deck');
  await writeFile(join(out, 'goap-agent-sales-deck.pdf'), '%PDF-1.4 public sales deck');
  await writeFile(join(out, 'private.pdf'), '%PDF-private');
  const result = await packageStatic({ repoRoot: root, product: 'goap-swarm-console', output: join(root, 'release.mjs') });
  const source = await readFile(result.output, 'utf8');
  const payload = /startPackedSite\("([A-Za-z0-9+/=]+)"\);/.exec(source)[1];
  const manifest = JSON.parse(gunzipSync(Buffer.from(payload, 'base64')));
  assert.ok(manifest['/goap-agent-sales-deck.pdf']);
  assert.equal(manifest['/private.pdf'], undefined);
  assert.equal(result.files, 5);
});
