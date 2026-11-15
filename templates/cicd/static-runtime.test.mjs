import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { staticHandler } from './static-runtime.mjs';

test('public artifact serves routes, caching and HTTP boundaries', async () => {
  const asset = body => ({ body: Buffer.from(body).toString('base64'), etag: '"test-etag"' });
  const server = createServer(staticHandler({ '/index.html': asset('<h1>Home</h1>'), '/pricing.html': asset('<h1>Pricing</h1>'), '/health': asset('{"status":"ok"}'), '/_next/static/site.js': asset('console.log(1)'), '/404.html': asset('Not found') }));
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    assert.equal(await (await fetch(base)).text(), '<h1>Home</h1>');
    assert.equal(await (await fetch(`${base}/pricing`)).text(), '<h1>Pricing</h1>');
    const health = await fetch(`${base}/health`);
    assert.equal(health.headers.get('cache-control'), 'no-store'); assert.equal(health.headers.get('content-type'), 'application/json');
    assert.deepEqual(await health.json(), { status: 'ok' });
    assert.equal((await fetch(`${base}/_next/static/site.js`)).headers.get('cache-control'), 'public, max-age=31536000, immutable');
    assert.equal((await fetch(base, { headers: { 'If-None-Match': '"test-etag"' } })).status, 304);
    const head = await fetch(`${base}/pricing`, { method: 'HEAD' }); assert.equal(await head.text(), ''); assert.equal(head.status, 200);
    assert.equal((await fetch(`${base}/.env`)).status, 404);
    assert.equal((await fetch(`${base}/missing`)).status, 404);
    assert.equal((await fetch(`${base}/%ZZ`)).status, 400);
    assert.equal((await fetch(`${base}/%5csecret`)).status, 400);
    assert.equal((await fetch(base, { method: 'POST' })).status, 405);
  } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
});
