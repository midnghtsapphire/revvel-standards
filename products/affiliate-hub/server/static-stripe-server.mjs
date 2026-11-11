// Affiliate Hub runtime server. Added 2026-11-11 by MarketShipper for WR #18330.
//
// Why this file exists: the Next.js app is a static export (`output: 'export'`
// in next.config.js). A static export cannot read STRIPE_SECRET_KEY at request
// time, and putting that secret in NEXT_PUBLIC_* would publish it in the
// JavaScript bundle. The 2026-11-10 payment-link helper in app/lib/checkout.ts
// stays for build-time Payment Links. This server is the additional path:
// it serves the exported `out/` directory and creates a Stripe Checkout
// Session only when runtime env vars are present.
//
// Test mode is the default. A key that starts with sk_live_ is refused while
// STRIPE_MODE is test (or unset). This process does not grant an account or
// entitlement — these directory products have no user store. A 200 from
// /api/checkout means Stripe returned a session URL. A 200 from /health means
// the process is serving; it does not mean a payment or a DNS name works.
//
// What breaks if this file is removed: the container has no process to bind
// port 8080, /health fails, and checkout cannot see runtime secrets.

import http from 'node:http';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const SERVICE = 'affiliate-hub';

const HERE = path.dirname(fileURLToPath(import.meta.url));

function defaultStaticRoot() {
  if (process.env.STATIC_ROOT) return path.resolve(process.env.STATIC_ROOT);
  return path.resolve(HERE, '../out');
}
const BODY_LIMIT = 1_000_000;
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 10;
const SIGNATURE_TOLERANCE_SEC = 300;

const PRICE_ID = /^price_[A-Za-z0-9]+$/;

function keyKind(value, mode) {
  const secretOk = mode === 'test' ? value.startsWith('sk_test_') : value.startsWith('sk_live_');
  const publishableOk = mode === 'test' ? value.startsWith('pk_test_') : value.startsWith('pk_live_');
  return { secretOk, publishableOk };
}

export function inspectStripeEnv(env = process.env) {
  const raw = String(env.STRIPE_MODE ?? 'test').trim().toLowerCase();
  if (raw !== 'test' && raw !== 'live') {
    return { mode: 'test', checkoutReady: false, reason: 'invalid_STRIPE_MODE', publishableKey: null };
  }
  const mode = raw;
  const secret = String(env.STRIPE_SECRET_KEY || '');
  const publishable = String(env.STRIPE_PUBLISHABLE_KEY || '');
  const price = String(env.STRIPE_PRICE_ID || '');
  let publishableKey = null;
  if (publishable) {
    if (!keyKind(publishable, mode).publishableOk) {
      return { mode, checkoutReady: false, reason: 'publishable_key_mode_mismatch', publishableKey: null };
    }
    publishableKey = publishable;
  }
  if (!secret) {
    return { mode, checkoutReady: false, reason: 'missing_STRIPE_SECRET_KEY', publishableKey };
  }
  if (mode === 'test' && secret.startsWith('sk_live_')) {
    return { mode, checkoutReady: false, reason: 'live_secret_refused_in_test_mode', publishableKey };
  }
  if (!keyKind(secret, mode).secretOk) {
    return {
      mode,
      checkoutReady: false,
      reason: mode === 'test' ? 'test_mode_requires_sk_test_key' : 'live_mode_requires_sk_live_key',
      publishableKey,
    };
  }
  if (!PRICE_ID.test(price)) {
    return { mode, checkoutReady: false, reason: 'missing_or_invalid_STRIPE_PRICE_ID', publishableKey };
  }
  return { mode, checkoutReady: true, reason: null, publishableKey };
}

export function publicOrigin(requestUrl, env = process.env) {
  if (env.PUBLIC_BASE_URL) {
    let configured;
    try {
      configured = new URL(env.PUBLIC_BASE_URL);
    } catch {
      return null;
    }
    const local = configured.hostname === 'localhost' || configured.hostname === '127.0.0.1';
    if (configured.protocol !== 'https:' && !local) return null;
    return configured.origin;
  }
  const host = requestUrl.hostname;
  const local = host === 'localhost' || host === '127.0.0.1';
  const allowed = local || host.endsWith('.revvel.co') || host.endsWith('.ondigitalocean.app');
  if (!allowed) return null;
  const protocol = local ? 'http:' : 'https:';
  return `${protocol}//${requestUrl.host}`;
}

export function verifyStripeSignature(rawBody, header, secret, nowSec = Math.floor(Date.now() / 1000)) {
  if (!secret) return { ok: false, reason: 'missing_STRIPE_WEBHOOK_SECRET' };
  if (!header || typeof header !== 'string') return { ok: false, reason: 'missing_signature' };
  let timestamp = '';
  const signatures = [];
  for (const part of header.split(',')) {
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    const key = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();
    if (key === 't') timestamp = value;
    if (key === 'v1' && value) signatures.push(value);
  }
  if (!/^\d+$/.test(timestamp) || signatures.length === 0) {
    return { ok: false, reason: 'malformed_signature' };
  }
  const age = Math.abs(nowSec - Number(timestamp));
  if (age > SIGNATURE_TOLERANCE_SEC) return { ok: false, reason: 'timestamp_out_of_tolerance' };
  const signed = Buffer.concat([Buffer.from(`${timestamp}.`, 'utf8'), Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(String(rawBody))]);
  const expected = createHmac('sha256', secret).update(signed).digest('hex');
  const expectedBuf = Buffer.from(expected, 'utf8');
  const match = signatures.some((sig) => {
    const got = Buffer.from(sig, 'utf8');
    return got.length === expectedBuf.length && timingSafeEqual(expectedBuf, got);
  });
  return match ? { ok: true } : { ok: false, reason: 'signature_mismatch' };
}

export async function createCheckoutSession({ env = process.env, origin, fetchImpl = fetch }) {
  const inspected = inspectStripeEnv(env);
  if (!inspected.checkoutReady) {
    return { status: 503, body: { ok: false, mode: inspected.mode, reason: inspected.reason } };
  }
  if (!origin) {
    return { status: 400, body: { ok: false, mode: inspected.mode, reason: 'origin_not_allowed' } };
  }
  const params = new URLSearchParams();
  params.set('mode', 'subscription');
  params.set('line_items[0][price]', env.STRIPE_PRICE_ID);
  params.set('line_items[0][quantity]', '1');
  params.set('success_url', `${origin}/pricing?checkout=success`);
  params.set('cancel_url', `${origin}/pricing?checkout=cancel`);
  params.set('client_reference_id', SERVICE);
  let response;
  try {
    response = await fetchImpl('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });
  } catch {
    return { status: 502, body: { ok: false, mode: inspected.mode, reason: 'stripe_unreachable' } };
  }
  let payload = {};
  try {
    payload = await response.json();
  } catch {
    payload = {};
  }
  if (!response.ok || typeof payload.url !== 'string' || !payload.url.startsWith('https://')) {
    return {
      status: 502,
      body: {
        ok: false,
        mode: inspected.mode,
        reason: 'stripe_checkout_rejected',
        stripeType: payload.error?.type ? String(payload.error.type) : 'unknown',
      },
    };
  }
  return { status: 200, body: { ok: true, mode: inspected.mode, url: payload.url, id: payload.id || null } };
}

function send(res, status, body, extraHeaders = {}) {
  const json = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'content-length': Buffer.byteLength(json),
    ...extraHeaders,
  });
  res.end(json);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > BODY_LIMIT) {
        reject(Object.assign(new Error('body_too_large'), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function headerValue(req, name) {
  const value = req.headers?.[name];
  if (Array.isArray(value)) return value[0] || '';
  return typeof value === 'string' ? value : '';
}

function looksLikeIp(value) {
  if (typeof value !== 'string') return false;
  const candidate = value.trim();
  if (candidate.length < 3 || candidate.length > 64) return false;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(candidate)) {
    return candidate.split('.').every((octet) => Number(octet) <= 255);
  }
  return candidate.includes(':') && /^[0-9a-fA-F:.]+$/.test(candidate);
}

// App Platform's edge sets do-connecting-ip to the visitor. The socket address
// is the proxy, so keying the limit on it puts every visitor in one bucket.
// X-Forwarded-For is the fallback for another proxy; only its first hop is
// the client. A missing or malformed header falls back to the socket.
export function clientAddress(req) {
  const connecting = headerValue(req, 'do-connecting-ip').trim();
  if (looksLikeIp(connecting)) return connecting;
  const forwarded = headerValue(req, 'x-forwarded-for');
  const firstHop = forwarded.split(',')[0].trim();
  if (looksLikeIp(firstHop)) return firstHop;
  const socketIp = req.socket?.remoteAddress || '';
  if (looksLikeIp(socketIp)) return socketIp;
  return 'unknown';
}

export function rateLimited(hits, ip, nowMs) {
  for (const [key, stamps] of hits) {
    const live = stamps.filter((stamp) => nowMs - stamp < RATE_WINDOW_MS);
    if (live.length === 0) hits.delete(key);
    else hits.set(key, live);
  }
  const recent = hits.get(ip) || [];
  if (recent.length >= RATE_MAX) return true;
  recent.push(nowMs);
  hits.set(ip, recent);
  return false;
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2',
};

export async function resolveStatic(root, urlPath) {
  let pathname;
  try {
    pathname = decodeURIComponent(urlPath.split('?')[0]);
  } catch {
    return null;
  }
  if (pathname.includes('\0')) return null;
  const trimmed = pathname.replace(/^\/+/, '');
  const candidates = trimmed === '' || trimmed.endsWith('/')
    ? [path.join(trimmed, 'index.html')]
    : [trimmed, `${trimmed}.html`, path.join(trimmed, 'index.html')];
  const rootResolved = path.resolve(root);
  for (const rel of candidates) {
    const full = path.resolve(rootResolved, rel);
    if (full !== rootResolved && !full.startsWith(`${rootResolved}${path.sep}`)) continue;
    try {
      const info = await stat(full);
      if (info.isFile()) return full;
    } catch {
      // Try the next candidate. A missing file is not an error.
    }
  }
  return null;
}

function sendHealth(req, res, ctx) {
  if (req.method === 'HEAD') {
    res.writeHead(200, {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    });
    res.end();
    return;
  }
  send(res, 200, { status: 'ok', service: ctx.service });
}

function sendStripeConfig(res, ctx) {
  const inspected = inspectStripeEnv(ctx.env);
  send(res, 200, {
    mode: inspected.mode,
    checkoutReady: inspected.checkoutReady,
    reason: inspected.reason,
    publishableKey: inspected.publishableKey,
  });
}

function requestOrigin(req, ctx) {
  try {
    const hostUrl = new URL(`http://${req.headers.host || '127.0.0.1'}`);
    return publicOrigin(hostUrl, ctx.env);
  } catch {
    return null;
  }
}

async function postCheckout(req, res, ctx) {
  if (rateLimited(ctx.hits, clientAddress(req), ctx.now())) {
    send(res, 429, { ok: false, reason: 'rate_limited' });
    return;
  }
  const result = await createCheckoutSession({
    env: ctx.env,
    origin: requestOrigin(req, ctx),
    fetchImpl: ctx.fetchImpl,
  });
  send(res, result.status, result.body);
}

async function postWebhook(req, res, ctx) {
  const secret = String(ctx.env.STRIPE_WEBHOOK_SECRET || '');
  const raw = await readBody(req);
  const verdict = verifyStripeSignature(raw, req.headers['stripe-signature'], secret);
  if (!verdict.ok) {
    const status = verdict.reason === 'missing_STRIPE_WEBHOOK_SECRET' ? 503 : 400;
    send(res, status, { ok: false, reason: verdict.reason });
    return;
  }
  let event;
  try {
    event = JSON.parse(raw.toString('utf8'));
  } catch {
    send(res, 400, { ok: false, reason: 'invalid_json' });
    return;
  }
  // Log the event id and type only. The body can contain an email address.
  console.log(JSON.stringify({
    service: ctx.service,
    stripeEvent: event?.type || 'unknown',
    stripeEventId: event?.id || null,
  }));
  send(res, 200, { ok: true, received: true, type: event?.type || null });
}

async function serveStatic(req, res, ctx, pathname) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    send(res, 405, { ok: false, reason: 'method_not_allowed' });
    return;
  }
  const file = await resolveStatic(ctx.staticRoot, pathname);
  if (!file) {
    const missing = await resolveStatic(ctx.staticRoot, '/404.html');
    if (missing && req.method === 'GET') {
      const html = await readFile(missing);
      res.writeHead(404, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
      res.end(html);
      return;
    }
    send(res, 404, { ok: false, reason: 'not_found' });
    return;
  }
  const data = await readFile(file);
  const type = MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';
  const immutable = pathname.includes('/_next/static/');
  res.writeHead(200, {
    'content-type': type,
    'content-length': data.length,
    'cache-control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
  });
  res.end(req.method === 'HEAD' ? undefined : data);
}

async function handle(req, res, ctx) {
  const pathname = new URL(req.url || '/', 'http://127.0.0.1').pathname;
  const health = pathname === '/health' || pathname === '/health/';
  if ((req.method === 'GET' || req.method === 'HEAD') && health) {
    sendHealth(req, res, ctx);
    return;
  }
  if (req.method === 'GET' && pathname === '/api/stripe/config') {
    sendStripeConfig(res, ctx);
    return;
  }
  if (pathname === '/api/checkout' && req.method === 'POST') {
    await postCheckout(req, res, ctx);
    return;
  }
  if (pathname === '/api/stripe/webhook' && req.method === 'POST') {
    await postWebhook(req, res, ctx);
    return;
  }
  await serveStatic(req, res, ctx, pathname);
}

export function createApp(options = {}) {
  const ctx = {
    env: options.env || process.env,
    staticRoot: options.staticRoot || defaultStaticRoot(),
    fetchImpl: options.fetchImpl || fetch,
    now: options.now || Date.now,
    hits: new Map(),
    service: options.service || SERVICE,
  };
  return http.createServer(async (req, res) => {
    try {
      await handle(req, res, ctx);
    } catch (error) {
      const status = error?.status || 500;
      const reason = status === 413 ? 'body_too_large' : 'internal_error';
      const text = String(error?.stack || error)
        .replace(/sk_(test|live)_\w+/g, 'sk_$1_[redacted]')
        .replace(/whsec_\w+/g, 'whsec_[redacted]');
      console.error(text);
      if (!res.headersSent) send(res, status, { ok: false, reason });
      else res.end();
    }
  });
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const port = Number(process.env.PORT || 8080);
  const server = createApp();
  server.listen(port, '0.0.0.0', () => {
    console.log(JSON.stringify({ service: SERVICE, listening: port, stripeMode: inspectStripeEnv().mode }));
  });
}
