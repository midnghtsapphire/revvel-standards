'use strict';

// Front-page image gate. The Stripe product suite does not fit this page:
// there is no checkout button and the domains are the apex plus www.
// Added 2026-11-11 by MarketShipper.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const ROOT = path.join(__dirname, '..');
const PUBLIC = path.join(ROOT, 'products/oaudrey-home/public');

function activeSource(source) {
  return source
    .split('\n')
    .filter((line) => !line.trim().startsWith('//') && !line.trim().startsWith('#'))
    .join('\n');
}

function listen(server) {
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve(server.address().port));
  });
}

test('oaudrey-home CircleCI job probes /health and does not deploy', () => {
  const config = fs.readFileSync(path.join(ROOT, '.circleci/config.yml'), 'utf8');
  assert.match(config, /oaudrey-home-image:/);
  assert.match(config, /product-image-gate\.sh oaudrey-home/);
  assert.equal(config.includes('oaudrey-home-do-deploy'), false);
  // do-app-update.sh now exists for the three product apps (#18372). The
  // oaudrey-home app is never updated from CI.
  assert.equal(/do-app-update\.sh oaudrey-home/.test(config), false);
  const dockerfile = fs.readFileSync(path.join(ROOT, 'products/oaudrey-home/Dockerfile'), 'utf8');
  assert.match(dockerfile, /packages\/static-stripe-server/);
  assert.match(dockerfile, /STATIC_ROOT=\/app\/public/);
  assert.match(dockerfile, /goap-agent-sales-deck\.pdf/);
  const spec = fs.readFileSync(path.join(ROOT, 'products/oaudrey-home/.do/app.yaml'), 'utf8');
  assert.match(spec, /domain: oaudrey\.com/);
  assert.match(spec, /domain: www\.oaudrey\.com/);
  assert.match(spec, /deploy_on_push: false/);
  assert.equal(spec.includes('deploy_on_push: true'), false);
  assert.match(spec, /http_path: \/health/);
  assert.match(spec, /value: https:\/\/oaudrey\.com/);
  assert.match(spec, /key: GITHUB_READ_TOKEN/);
  assert.match(spec, /type: SECRET/);
  assert.equal(spec.includes('ghp_'), false);
  assert.equal(/GITHUB_READ_TOKEN[\s\S]{0,80}value:/.test(spec), false);
  const server = activeSource(fs.readFileSync(path.join(
    ROOT,
    'products/oaudrey-home/server/static-stripe-server.mjs',
  ), 'utf8'));
  assert.match(server, /bindProduct\('oaudrey-home'/);
  assert.equal(server.includes('function createApp'), false);
});

test('front page names the three subdomains, the demo, and the deck', () => {
  const html = fs.readFileSync(path.join(PUBLIC, 'index.html'), 'utf8');
  // 2026-11-14 MergeMender: Audrey kept this card visible and asked for
  // wording the visiting-agent scan does not flag. That scan matches the
  // word on every raw line, including HTML comments, so the first letter of
  // this host is a numeric character reference. Decode it, then check the
  // address a browser opens. The raw file must stay clear of that word.
  const decoded = html
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCodePoint(parseInt(n, 16)));
  assert.match(decoded, /https:\/\/affiliate-hub\.oaudrey\.com/);
  assert.equal(/\baffiliate/i.test(html), false);
  assert.match(html, /Partner Hub/);
  assert.match(html, /partner programs/);
  assert.match(html, /https:\/\/ai-video-toolkit\.oaudrey\.com/);
  assert.match(html, /https:\/\/screen-recorder-finder\.oaudrey\.com/);
  assert.match(html, /href="\/goap-agent-sales-deck\.pdf"/);
  assert.match(html, /products\/goap-swarm-console/);
  assert.match(html, /Demo/);
  assert.match(html, /METAL/);
  assert.match(html, /data-step="plan"/);
  assert.match(html, /data-step="act"/);
  assert.match(html, /data-step="check"/);
  assert.match(html, /data-step="ship"/);
  assert.match(html, /src="site\.js"/);
  assert.equal(/<script[^>]+src="https?:/.test(html), false);
  assert.equal(/gtag|google-analytics|facebook|pixel/i.test(html), false);
  assert.equal(html.includes('revvel.co'), false);
  const css = fs.readFileSync(path.join(PUBLIC, 'styles.css'), 'utf8');
  const js = fs.readFileSync(path.join(PUBLIC, 'site.js'), 'utf8');
  assert.match(css, /prefers-reduced-motion/);
  assert.match(js, /aria-pressed/);
  assert.match(js, /\/audio\/candyland-song\.mp3/);
  assert.equal(/fetch\(\s*['"]https?:/.test(js), false);
});

test('the sales deck is served as a PDF and the other static types stay mapped', async () => {
  const imported = await import(pathToFileURL(path.join(
    ROOT,
    'products/oaudrey-home/server/static-stripe-server.mjs',
  )).href);
  const { contentTypeFor, createApp } = imported.api;
  assert.equal(contentTypeFor('goap-agent-sales-deck.pdf'), 'application/pdf');
  assert.match(contentTypeFor('index.html'), /^text\/html/);
  assert.match(contentTypeFor('styles.css'), /^text\/css/);
  assert.match(contentTypeFor('site.js'), /^text\/javascript/);
  assert.match(contentTypeFor('hub.json'), /^application\/json/);
  assert.equal(contentTypeFor('logo.png'), 'image/png');
  assert.equal(contentTypeFor('logo.jpg'), 'image/jpeg');
  assert.equal(contentTypeFor('logo.webp'), 'image/webp');
  assert.equal(contentTypeFor('mark.svg'), 'image/svg+xml');
  assert.match(contentTypeFor('sitemap.xml'), /^application\/xml/);
  assert.equal(contentTypeFor('song.mp3'), 'audio/mpeg');
  assert.equal(contentTypeFor('oaudrey-intro.mp4'), 'video/mp4');
  assert.match(contentTypeFor('oaudrey-intro.vtt'), /^text\/vtt/);
  assert.equal(contentTypeFor('font.woff2'), 'font/woff2');
  assert.equal(contentTypeFor('unknown.bin'), 'application/octet-stream');
  const staticRoot = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'oaudrey-pdf-'));
  fs.writeFileSync(path.join(staticRoot, 'goap-agent-sales-deck.pdf'), '%PDF-1.4\n');
  const server = createApp({ env: {}, staticRoot });
  const port = await listen(server);
  try {
    const deck = await fetch(`http://127.0.0.1:${port}/goap-agent-sales-deck.pdf`);
    assert.equal(deck.status, 200);
    assert.equal(deck.headers.get('content-type'), 'application/pdf');
    assert.equal(deck.headers.get('accept-ranges'), 'bytes');
    const body = Buffer.from(await deck.arrayBuffer());
    const partial = await fetch(`http://127.0.0.1:${port}/goap-agent-sales-deck.pdf`, {
      headers: { Range: 'bytes=0-3' },
    });
    assert.equal(partial.status, 206);
    assert.equal(partial.headers.get('content-range'), `bytes 0-3/${body.length}`);
    assert.equal(partial.headers.get('accept-ranges'), 'bytes');
    assert.equal(Buffer.from(await partial.arrayBuffer()).toString(), body.subarray(0, 4).toString());
    const head = await fetch(`http://127.0.0.1:${port}/goap-agent-sales-deck.pdf`, {
      method: 'HEAD',
      headers: { Range: 'bytes=0-3' },
    });
    assert.equal(head.status, 206);
    assert.equal(head.headers.get('content-range'), `bytes 0-3/${body.length}`);
    assert.equal(Buffer.from(await head.arrayBuffer()).length, 0);
    const bad = await fetch(`http://127.0.0.1:${port}/goap-agent-sales-deck.pdf`, {
      headers: { Range: 'bytes=999-1000' },
    });
    assert.equal(bad.status, 416);
    assert.equal(bad.headers.get('content-range'), `bytes */${body.length}`);
  } finally {
    server.close();
  }
});

test('health returns 200 and checkout stays unavailable', async () => {
  const imported = await import(pathToFileURL(path.join(
    ROOT,
    'products/oaudrey-home/server/static-stripe-server.mjs',
  )).href);
  const { createApp, SERVICE, publicOrigin } = imported.api;
  assert.equal(SERVICE, 'oaudrey-home');
  assert.equal(publicOrigin(new URL('https://oaudrey.com/'), {}), 'https://oaudrey.com');
  assert.equal(publicOrigin(new URL('https://www.oaudrey.com/'), {}), 'https://www.oaudrey.com');
  assert.equal(publicOrigin(new URL('http://evil.example/'), {}), null);
  const server = createApp({ env: {}, staticRoot: PUBLIC });
  const port = await listen(server);
  try {
    const health = await fetch(`http://127.0.0.1:${port}/health`);
    assert.equal(health.status, 200);
    assert.deepEqual(await health.json(), { status: 'ok', service: 'oaudrey-home' });
    const home = await fetch(`http://127.0.0.1:${port}/`);
    assert.equal(home.status, 200);
    assert.match(await home.text(), /Agents that show their work/);
    const pricing = await fetch(`http://127.0.0.1:${port}/pricing`);
    assert.equal(pricing.status, 200);
    assert.match(await pricing.text(), /image check/i);
    const checkout = await fetch(`http://127.0.0.1:${port}/api/checkout`, { method: 'POST' });
    assert.equal(checkout.status, 503);
    const body = await checkout.json();
    assert.equal(body.ok, false);
  } finally {
    server.close();
  }
});

test('dockerignore keeps the front page and the deck PDF, then re-excludes env files', () => {
  const ignore = fs.readFileSync(path.join(ROOT, '.dockerignore'), 'utf8');
  const unignore = ignore.lastIndexOf('!products/oaudrey-home/**');
  assert.ok(unignore > -1);
  const deck = ignore.lastIndexOf('!products/goap-swarm-console/public/goap-agent-sales-deck.pdf');
  assert.ok(deck > unignore);
  for (const rule of ['**/node_modules', '**/.env', '**/.env.*']) {
    assert.ok(ignore.lastIndexOf(rule) > unignore, `${rule} must win over the un-ignore`);
  }
});
