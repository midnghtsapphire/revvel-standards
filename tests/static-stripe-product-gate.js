'use strict';

// One image-gate suite for every product that binds packages/static-stripe-server.
// A product test file only passes its slug. Added 2026-11-11 by MarketShipper
// so affiliate-hub and ai-video-toolkit do not each carry the same cases.
// What breaks if this file is removed: the product test files register nothing,
// and the CircleCI image gate no longer checks /health, TRUST_PROXY, or the spec.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHmac } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const ROOT = path.join(__dirname, '..');

function listen(server) {
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve(server.address().port));
  });
}

function activeSource(source) {
  return source
    .split('\n')
    .filter((line) => !line.trim().startsWith('//'))
    .join('\n');
}

function registerStaticStripeProduct({ slug, legacyPeerDeps }) {
  const domain = `${slug}.revvel.co`;
  const origin = `https://${domain}`;

  async function loadServer() {
    const imported = await import(pathToFileURL(path.join(
      ROOT,
      'products',
      slug,
      'server/static-stripe-server.mjs',
    )).href);
    return imported.api;
  }

  test(`${slug} binds the shared server and does not keep a second implementation`, () => {
    const serverPath = path.join(ROOT, 'products', slug, 'server/static-stripe-server.mjs');
    const active = activeSource(fs.readFileSync(serverPath, 'utf8'));
    assert.match(active, /packages\/static-stripe-server\/server\.mjs/);
    assert.match(active, new RegExp(`bindProduct\\('${slug}'`));
    assert.equal(active.includes('function clientAddress'), false);
    const buttonPath = path.join(ROOT, 'products', slug, 'app/pricing/stripe-checkout-button.tsx');
    const button = activeSource(fs.readFileSync(buttonPath, 'utf8'));
    assert.match(button, /packages\/static-stripe-server\/stripe-checkout-button/);
    assert.equal(button.includes('function StripeCheckoutButton'), false);
  });

  test(`${slug} CircleCI job probes /health inside the container`, () => {
    const config = fs.readFileSync(path.join(ROOT, '.circleci/config.yml'), 'utf8');
    assert.match(config, new RegExp(`${slug}-image:`));
    assert.match(config, new RegExp(`product-image-gate\\.sh ${slug}`));
    const script = fs.readFileSync(path.join(ROOT, '.circleci/scripts/product-image-gate.sh'), 'utf8');
    assert.match(script, /set -euo pipefail/);
    assert.match(script, /127\.0\.0\.1:8080\/health/);
    assert.match(script, /checkout without keys must stay unavailable/);
    assert.equal(script.includes('curl -fsS http://127.0.0.1:8080/health || true'), false);
    const dockerfile = fs.readFileSync(path.join(ROOT, 'products', slug, 'Dockerfile'), 'utf8');
    const activeDocker = dockerfile
      .split('\n')
      .filter((line) => !line.trim().startsWith('#'))
      .join('\n');
    assert.match(activeDocker, /^FROM node:22-alpine AS build/m);
    assert.match(activeDocker, /packages\/static-stripe-server/);
    if (legacyPeerDeps) {
      assert.match(activeDocker, /npm ci --ignore-scripts --legacy-peer-deps/);
    } else {
      assert.match(activeDocker, /npm ci --ignore-scripts/);
      assert.equal(activeDocker.includes('--legacy-peer-deps'), false);
    }
    const spec = fs.readFileSync(path.join(ROOT, 'products', slug, '.do/app.yaml'), 'utf8');
    assert.match(spec, new RegExp(`domain: ${slug}\\.revvel\\.co`));
    assert.match(spec, /http_path: \/health/);
    assert.match(spec, /key: STRIPE_SECRET_KEY/);
    assert.match(spec, /key: STRIPE_PUBLISHABLE_KEY/);
    assert.match(spec, /key: STRIPE_WEBHOOK_SECRET/);
    assert.match(spec, /key: STRIPE_PRICE_ID/);
    assert.match(spec, /value: test/);
    assert.match(spec, /deploy_on_push: false/);
    assert.equal(spec.includes('deploy_on_push: true'), false);
    assert.equal(spec.includes('sk_test_'), false);
    assert.equal(spec.includes('sk_live_'), false);
    assert.equal(config.includes(`${slug}-do-deploy`), false);
    assert.equal(config.includes('do-app-update.sh'), false);
    assert.equal(fs.existsSync(path.join(ROOT, '.circleci/scripts/do-app-update.sh')), false);
  });

  test(`${slug} health returns 200 and checkout stays unavailable without keys`, async () => {
    const { createApp, SERVICE } = await loadServer();
    assert.equal(SERVICE, slug);
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

  test(`${slug} test mode refuses a live secret and a bad price id`, async () => {
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

  test(`${slug} a configured test key posts the price id and returns the session url`, async () => {
    const { createCheckoutSession } = await loadServer();
    let auth = '';
    let body = '';
    const result = await createCheckoutSession({
      env: {
        STRIPE_MODE: 'test',
        STRIPE_SECRET_KEY: 'sk_test_unit',
        STRIPE_PRICE_ID: 'price_unit',
      },
      origin,
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
    assert.match(body, new RegExp(`client_reference_id=${slug}`));
    const encoded = encodeURIComponent(`${origin}/pricing?checkout=success`);
    assert.match(body, new RegExp(`success_url=${encoded.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`));
  });

  test(`${slug} unset STRIPE_MODE defaults to test`, async () => {
    const { inspectStripeEnv } = await loadServer();
    const inspected = inspectStripeEnv({ STRIPE_SECRET_KEY: 'sk_test_unit', STRIPE_PRICE_ID: 'price_unit' });
    assert.equal(inspected.mode, 'test');
    assert.equal(inspected.checkoutReady, true);
  });

  test(`${slug} webhook accepts a valid signature and rejects a stale one`, async () => {
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

  test(`${slug} static files cannot escape the export directory`, async () => {
    const { resolveStatic, createApp } = await loadServer();
    const staticRoot = fs.mkdtempSync(path.join(require('node:os').tmpdir(), `${slug}-static-`));
    fs.writeFileSync(path.join(staticRoot, 'index.html'), '<p>home</p>');
    fs.writeFileSync(path.join(staticRoot, 'pricing.html'), '<p>pricing</p>');
    assert.equal(await resolveStatic(staticRoot, '/../package.json'), null);
    const server = createApp({ env: {}, staticRoot });
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

  test(`${slug} checkout origin is limited to local, revvel.co, and ondigitalocean.app`, async () => {
    const { publicOrigin } = await loadServer();
    assert.equal(publicOrigin(new URL('http://evil.example/pricing'), {}), null);
    assert.equal(publicOrigin(new URL('http://127.0.0.1:8080/pricing'), {}), 'http://127.0.0.1:8080');
    assert.equal(publicOrigin(new URL(`${origin}/pricing`), {}), origin);
    assert.equal(
      publicOrigin(new URL('http://ignored.example/pricing'), { PUBLIC_BASE_URL: origin }),
      origin,
    );
  });

  test(`${slug} dockerignore re-excludes node_modules, .next, and env files after the un-ignore`, () => {
    const ignore = fs.readFileSync(path.join(ROOT, '.dockerignore'), 'utf8');
    const unignore = ignore.lastIndexOf(`!products/${slug}/**`);
    assert.ok(unignore > -1, `${slug} sources must be un-ignored`);
    const shared = ignore.lastIndexOf('!packages/static-stripe-server/**');
    assert.ok(shared > -1, 'shared server must be un-ignored');
    for (const rule of ['**/node_modules', '**/.next', '**/.env', '**/.env.*']) {
      assert.ok(ignore.lastIndexOf(rule) > unignore, `${rule} must win over the product un-ignore`);
      assert.ok(ignore.lastIndexOf(rule) > shared, `${rule} must win over the shared server un-ignore`);
    }
  });

  test(`${slug} checkout rate limit uses the visitor IP, not the shared proxy socket`, async () => {
    const { clientAddress, rateLimited, createApp } = await loadServer();
    const both = {
      headers: { 'do-connecting-ip': '203.0.113.8', 'x-forwarded-for': '198.51.100.4, 10.0.0.1' },
      socket: { remoteAddress: '10.0.0.8' },
    };
    assert.equal(clientAddress(both, {}), '203.0.113.8');
    const forwarded = {
      headers: { 'x-forwarded-for': '198.51.100.4, 10.0.0.1' },
      socket: { remoteAddress: '10.0.0.8' },
    };
    assert.equal(clientAddress(forwarded, {}), '10.0.0.8');
    assert.equal(clientAddress(forwarded, { TRUST_PROXY: '1' }), '198.51.100.4');
    assert.equal(clientAddress({ headers: {}, socket: { remoteAddress: '127.0.0.1' } }, {}), '127.0.0.1');
    const hits = new Map();
    hits.set('stale', [1]);
    assert.equal(rateLimited(hits, '203.0.113.8', 1_000_000), false);
    assert.equal(hits.has('stale'), false);
    const server = createApp({ env: { STRIPE_MODE: 'test' }, staticRoot: path.join(__dirname, 'no-such-static') });
    const port = await listen(server);
    try {
      let limited = 0;
      for (let i = 0; i < 11; i += 1) {
        const response = await fetch(`http://127.0.0.1:${port}/api/checkout`, {
          method: 'POST',
          headers: { 'do-connecting-ip': `203.0.113.${slug.length}` },
        });
        if (response.status === 429) limited += 1;
      }
      assert.equal(limited, 1);
      const other = await fetch(`http://127.0.0.1:${port}/api/checkout`, {
        method: 'POST',
        headers: { 'do-connecting-ip': '203.0.113.10' },
      });
      assert.equal(other.status, 503);
    } finally {
      server.close();
    }
  });
}

module.exports = { registerStaticStripeProduct };
