'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHmac } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const ROOT = path.join(__dirname, '..');

async function loadServer() {
  return import(pathToFileURL(path.join(
    ROOT,
    'products/screen-recorder-finder/server/static-stripe-server.mjs',
  )).href);
}

function listen(server) {
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve(server.address().port));
  });
}

test('screen-recorder-finder CircleCI job probes /health inside the container', () => {
  const config = fs.readFileSync(path.join(ROOT, '.circleci/config.yml'), 'utf8');
  assert.match(config, /screen-recorder-finder-image:/);
  assert.match(config, /product-image-gate\.sh screen-recorder-finder/);
  const script = fs.readFileSync(path.join(ROOT, '.circleci/scripts/product-image-gate.sh'), 'utf8');
  assert.match(script, /set -euo pipefail/);
  assert.match(script, /127\.0\.0\.1:8080\/health/);
  assert.match(script, /checkout without keys must stay unavailable/);
  assert.equal(script.includes('curl -fsS http://127.0.0.1:8080/health || true'), false);
  const dockerfile = fs.readFileSync(path.join(ROOT, 'products/screen-recorder-finder/Dockerfile'), 'utf8');
  assert.match(dockerfile, /^FROM node:22-alpine AS build/m);
  const spec = fs.readFileSync(path.join(ROOT, 'products/screen-recorder-finder/.do/app.yaml'), 'utf8');
  assert.match(spec, /domain: screen-recorder-finder\.revvel\.co/);
  assert.match(spec, /http_path: \/health/);
  assert.match(spec, /key: STRIPE_SECRET_KEY/);
  assert.match(spec, /key: STRIPE_PUBLISHABLE_KEY/);
  assert.match(spec, /key: STRIPE_WEBHOOK_SECRET/);
  assert.match(spec, /key: STRIPE_PRICE_ID/);
  assert.match(spec, /value: test/);
  assert.equal(spec.includes('sk_test_'), false);
  assert.equal(spec.includes('sk_live_'), false);
});

test('health returns 200 and checkout stays unavailable without keys', async () => {
  const { createApp, SERVICE } = await loadServer();
  const server = createApp({ env: { STRIPE_MODE: 'test' }, staticRoot: path.join(__dirname, 'no-such-static') });
  const port = await listen(server);
  try {
    const health = await fetch(`http://127.0.0.1:${port}/health`);
    assert.equal(health.status, 200);
    assert.deepEqual(await health.json(), { status: 'ok', service: SERVICE });
    const checkout = await fetch(`http://127.0.0.1:${port}/api/checkout`, { method: 'POST' });
    assert.equal(checkout.status, 503);
    const body = await checkout.json();
    assert.equal(body.ok, false);
    assert.equal(body.mode, 'test');
    assert.equal(body.reason, 'missing_STRIPE_SECRET_KEY');
  } finally {
    server.close();
  }
});

test('test mode refuses a live secret and a bad price id', async () => {
  const { inspectStripeEnv, createCheckoutSession } = await loadServer();
  const live = inspectStripeEnv({ STRIPE_MODE: 'test', STRIPE_SECRET_KEY: 'sk_live_unit', STRIPE_PRICE_ID: 'price_unit' });
  assert.equal(live.checkoutReady, false);
  assert.equal(live.reason, 'live_secret_refused_in_test_mode');
  let called = false;
  const result = await createCheckoutSession({
    env: { STRIPE_MODE: 'test', STRIPE_SECRET_KEY: 'sk_test_unit', STRIPE_PRICE_ID: 'not-a-price' },
    origin: 'http://127.0.0.1:8080',
    fetchImpl: async () => { called = true; throw new Error('should not call Stripe'); },
  });
  assert.equal(called, false);
  assert.equal(result.status, 503);
  assert.equal(result.body.reason, 'missing_or_invalid_STRIPE_PRICE_ID');
});

test('a configured test key posts the price id and returns the session url', async () => {
  const { createCheckoutSession } = await loadServer();
  let auth = '';
  let body = '';
  const result = await createCheckoutSession({
    env: {
      STRIPE_MODE: 'test',
      STRIPE_SECRET_KEY: 'sk_test_unit',
      STRIPE_PRICE_ID: 'price_unit',
    },
    origin: 'https://screen-recorder-finder.revvel.co',
    fetchImpl: async (url, options) => {
      auth = options.headers.Authorization;
      body = options.body;
      assert.equal(url, 'https://api.stripe.com/v1/checkout/sessions');
      return {
        ok: true,
        json: async () => ({ url: 'https://checkout.stripe.com/c/pay/cs_test_unit', id: 'cs_test_unit' }),
      };
    },
  });
  assert.equal(result.status, 200);
  assert.equal(result.body.url, 'https://checkout.stripe.com/c/pay/cs_test_unit');
  assert.equal(auth, 'Bearer sk_test_unit');
  assert.match(body, /line_items%5B0%5D%5Bprice%5D=price_unit/);
  assert.match(body, /success_url=https%3A%2F%2Fscreen-recorder-finder\.revvel\.co%2Fpricing%3Fcheckout%3Dsuccess/);
});

test('unset STRIPE_MODE defaults to test', async () => {
  const { inspectStripeEnv } = await loadServer();
  const inspected = inspectStripeEnv({ STRIPE_SECRET_KEY: 'sk_test_unit', STRIPE_PRICE_ID: 'price_unit' });
  assert.equal(inspected.mode, 'test');
  assert.equal(inspected.checkoutReady, true);
});

test('webhook accepts a valid signature and rejects a stale one', async () => {
  const { verifyStripeSignature, createApp } = await loadServer();
  const secret = 'whsec_unit';
  const raw = Buffer.from('{"id":"evt_unit","type":"checkout.session.completed"}');
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = createHmac('sha256', secret)
    .update(Buffer.concat([Buffer.from(`${timestamp}.`), raw]))
    .digest('hex');
  const header = `t=${timestamp},v1=${signature}`;
  assert.equal(verifyStripeSignature(raw, header, secret, timestamp).ok, true);
  assert.equal(verifyStripeSignature(raw, header, secret, timestamp + 301).reason, 'timestamp_out_of_tolerance');
  assert.equal(verifyStripeSignature(raw, header, '', timestamp).reason, 'missing_STRIPE_WEBHOOK_SECRET');

  const server = createApp({
    env: { STRIPE_WEBHOOK_SECRET: secret },
    staticRoot: path.join(__dirname, 'no-such-static'),
    now: () => timestamp * 1000,
  });
  const port = await listen(server);
  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/stripe/webhook`, {
      method: 'POST',
      headers: { 'stripe-signature': header, 'content-type': 'application/json' },
      body: raw,
    });
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.received, true);
    assert.equal(payload.type, 'checkout.session.completed');
  } finally {
    server.close();
  }
});

test('static files cannot escape the export directory', async () => {
  const { resolveStatic, createApp } = await loadServer();
  const root = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'screen-recorder-finder-static-'));
  fs.writeFileSync(path.join(root, 'index.html'), '<p>home</p>');
  fs.writeFileSync(path.join(root, 'pricing.html'), '<p>pricing</p>');
  assert.equal(await resolveStatic(root, '/../package.json'), null);
  const server = createApp({ env: {}, staticRoot: root });
  const port = await listen(server);
  try {
    const home = await fetch(`http://127.0.0.1:${port}/`);
    assert.equal(home.status, 200);
    assert.match(await home.text(), /home/);
    const pricing = await fetch(`http://127.0.0.1:${port}/pricing`);
    assert.equal(pricing.status, 200);
    const escaped = await fetch(`http://127.0.0.1:${port}/..%2F..%2Fpackage.json`);
    assert.equal(escaped.status, 404);
  } finally {
    server.close();
  }
});

test('checkout origin is limited to local, revvel.co, and ondigitalocean.app', async () => {
  const { publicOrigin } = await loadServer();
  assert.equal(publicOrigin(new URL('http://evil.example/pricing'), {}), null);
  assert.equal(publicOrigin(new URL('http://127.0.0.1:8080/pricing'), {}), 'http://127.0.0.1:8080');
  assert.equal(
    publicOrigin(new URL('https://screen-recorder-finder.revvel.co/pricing'), {}),
    'https://screen-recorder-finder.revvel.co',
  );
  assert.equal(
    publicOrigin(new URL('http://ignored.example/pricing'), { PUBLIC_BASE_URL: 'https://screen-recorder-finder.revvel.co' }),
    'https://screen-recorder-finder.revvel.co',
  );
});
