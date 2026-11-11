import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHmac, generateKeyPairSync, sign } from 'node:crypto';
import { once } from 'node:events';
import { spawn } from 'node:child_process';
import { request } from 'node:http';
import { LagoInbox } from './webhook-inbox.mjs';
import { createLagoReceiver, drainPending } from './webhook-server.mjs';

const secret = 'offline-only-test-key';
const organization = 'org-test';
const notification = (patch = {}) => ({ webhook_type: 'invoice.payment_status_updated', object_type: 'invoice', organization_id: organization, invoice: { lago_id: 'invoice-1', payment_status: 'pending', customer: { external_id: 'buyer-1' } }, ...patch });
const invoice = { lago_id: 'invoice-1', status: 'finalized', payment_status: 'succeeded', customer: { external_id: 'buyer-1' }, subscriptions: [{ lago_id: 'subscription-1', external_id: 'subscription-external-1' }] };
const subscription = { lago_id: 'subscription-1', external_id: 'subscription-external-1', external_customer_id: 'buyer-1', status: 'active', plan_code: 'pro' };
const provider = () => ({ invoice: async id => { assert.equal(id, 'invoice-1'); return { invoice }; }, subscription: async id => { assert.equal(id, 'subscription-external-1'); return { subscription }; } });
function hmac(raw) { return createHmac('sha256', secret).update(raw).digest('base64'); }
function headers(raw, key = 'delivery-1') { return { 'Content-Type': 'application/json', 'X-Lago-Signature-Algorithm': 'hmac', 'X-Lago-Signature': hmac(raw), 'X-Lago-Unique-Key': key }; }
async function database() { return join(await mkdtemp(join(tmpdir(), 'revvel-lago-webhook-')), 'inbox.sqlite'); }
async function fixture({ databasePath, now = Date.now, lago = provider(), verification = { algorithm: 'hmac', hmacKey: secret }, ...options } = {}) {
  databasePath ||= await database();
  const inbox = new LagoInbox({ databasePath, organizationId: organization, now });
  const app = createLagoReceiver({ inbox, lago, verification, autoProcess: false, ...options });
  app.server.listen(0, '127.0.0.1'); await once(app.server, 'listening');
  return { ...app, inbox, databasePath, base: `http://127.0.0.1:${app.server.address().port}` };
}
async function send(app, event = notification(), key = 'delivery-1', edits = {}) {
  const raw = typeof event === 'string' ? event : JSON.stringify(event);
  return fetch(`${app.base}/webhooks/lago`, { method: 'POST', headers: { ...headers(raw, key), ...edits }, body: raw });
}

test('actual HTTP HMAC verification, durable acknowledgement and authoritative reconciliation', async () => {
  const app = await fixture();
  try {
    const response = await send(app); assert.equal(response.status, 202);
    assert.deepEqual(await response.json(), { received: true, duplicate: false });
    assert.deepEqual(app.inbox.counts(), [{ status: 'pending', count: 1 }]);
    assert.deepEqual(await app.processPending(), { processed: 1, failed: 0 });
    const rows = app.inbox.db.prepare('SELECT snapshot FROM observations ORDER BY id').all();
    assert.equal(rows.length, 2);
    // Signed notification said pending; the private snapshot must reflect Lago's
    // current response rather than using an old notification as payment proof.
    assert.equal(JSON.parse(rows[0].snapshot).payment_status, 'succeeded');
    assert.equal((await send(app)).status, 202);
    assert.equal((await (await send(app, notification(), 'changed-unsigned-header')).json()).duplicate, true);
    await app.processPending();
    assert.equal(app.inbox.db.prepare('SELECT COUNT(*) AS n FROM observations').get().n, 2);
    assert.equal((await send(app, notification({ webhook_type: 'invoice.created' }))).status, 409);
    assert.equal((await fetch(`${app.base}/checkout`, { method: 'POST' })).status, 404);
    assert.equal((await (await fetch(`${app.base}/health`)).json()).publicCheckout, false);
  } finally { await app.close(); }
});

test('signature, algorithm, organization and envelope failures never enter the inbox', async () => {
  const app = await fixture();
  try {
    assert.equal((await send(app, notification(), 'bad-signature', { 'X-Lago-Signature': hmac('wrong-body') })).status, 401);
    assert.equal((await send(app, notification(), 'bad-algorithm', { 'X-Lago-Signature-Algorithm': 'jwt' })).status, 401);
    assert.equal((await send(app, notification({ organization_id: 'another-tenant' }), 'wrong-org')).status, 400);
    assert.equal((await send(app, '{broken', 'bad-json')).status, 400);
    assert.equal((await send(app, '{}', 'bad-envelope')).status, 400);
    assert.equal((await send(app, notification(), 'encoding', { 'Content-Encoding': 'gzip' })).status, 415);
    assert.equal((await fetch(`${app.base}/webhooks/lago`)).status, 405);
    assert.deepEqual(app.inbox.counts(), []);
  } finally { await app.close(); }
});

test('actual HTTP bounds content length and chunked body, and rate limits peers', async () => {
  const app = await fixture({ maxBodyBytes: 512 });
  try {
    assert.equal((await send(app, 'x'.repeat(513))).status, 413);
    const chunked = await new Promise((done, reject) => {
      const req = request(`${app.base}/webhooks/lago`, { method: 'POST', headers: headers('x') }, res => { res.resume(); res.on('end', () => done(res.statusCode)); });
      req.on('error', reject); req.write('x'.repeat(300)); req.end('y'.repeat(300));
    });
    assert.equal(chunked, 413); assert.deepEqual(app.inbox.counts(), []);
  } finally { await app.close(); }
  const limited = await fixture({ requestsPerMinute: 1 });
  try { assert.equal((await send(limited)).status, 202); assert.equal((await send(limited)).status, 429); }
  finally { await limited.close(); }
});

test('actual HTTP JWT RS256 pins issuer, key, algorithm and exact raw data', async () => {
  const keys = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const issuer = 'https://lago.example';
  const app = await fixture({ verification: { algorithm: 'jwt', publicKey: keys.publicKey.export({ type: 'spki', format: 'pem' }), issuer } });
  const token = (body, iss = issuer, alg = 'RS256') => {
    const header = Buffer.from(JSON.stringify({ alg, typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ data: body, iss })).toString('base64url');
    return `${header}.${payload}.${sign('RSA-SHA256', Buffer.from(`${header}.${payload}`), keys.privateKey).toString('base64url')}`;
  };
  const raw = JSON.stringify(notification());
  try {
    const options = signature => ({ 'X-Lago-Signature-Algorithm': 'jwt', 'X-Lago-Signature': signature });
    assert.equal((await send(app, raw, 'jwt-good', options(token(raw)))).status, 202);
    assert.equal((await send(app, `${raw} `, 'jwt-body-mismatch', options(token(raw)))).status, 401);
    assert.equal((await send(app, raw, 'jwt-issuer', options(token(raw, 'https://attacker.example')))).status, 401);
    assert.equal((await send(app, raw, 'jwt-alg', options(token(raw, issuer, 'HS256')))).status, 401);
  } finally { await app.close(); }
});

test('restart recovery, transient failure and transaction rollback preserve pending work', async () => {
  const path = await database();
  let clock = Date.now();
  const now = () => clock;
  let app = await fixture({ databasePath: path });
  await send(app); await app.close();
  app = await fixture({ databasePath: path, now, lago: { invoice: async () => { throw new Error('private provider error'); } } });
  assert.deepEqual(await app.processPending(), { processed: 0, failed: 1 });
  assert.equal((await fetch(`${app.base}/health`)).status, 503);
  assert.equal(app.inbox.db.prepare('SELECT last_error FROM inbox').get().last_error, 'reconciliation_failed');
  assert.deepEqual(await app.processPending(), { processed: 0, failed: 0 });
  assert.equal((await fetch(`${app.base}/health`)).status, 503);
  await app.close();
  clock += 10000;
  app = await fixture({ databasePath: path, now, beforeCommit: () => { throw new Error('simulated transactional failure'); } });
  assert.deepEqual(await app.processPending(), { processed: 0, failed: 1 });
  assert.equal(app.inbox.db.prepare('SELECT COUNT(*) AS n FROM observations').get().n, 0);
  await app.close();
  clock += 10000;
  app = await fixture({ databasePath: path, now });
  try {
    assert.deepEqual(await app.processPending(), { processed: 1, failed: 0 });
    assert.deepEqual(app.inbox.counts(), [{ status: 'processed', count: 1 }]);
    assert.equal((await (await send(app)).json()).duplicate, true);
  } finally { await app.close(); }
});

test('abrupt process exit inside reconciliation transaction is recovered without partial observations', async () => {
  const path = await database();
  const inboxUrl = new URL('./webhook-inbox.mjs', import.meta.url).href;
  const serverUrl = new URL('./webhook-server.mjs', import.meta.url).href;
  const source = `import {LagoInbox} from ${JSON.stringify(inboxUrl)};import {createLagoReceiver} from ${JSON.stringify(serverUrl)};
    const inbox=new LagoInbox({databasePath:process.argv[1],organizationId:'org-test'});
    const app=createLagoReceiver({inbox,lago:{invoice:async()=>({invoice:${JSON.stringify(invoice)}}),subscription:async()=>({subscription:${JSON.stringify(subscription)}})},verification:{algorithm:'hmac',hmacKey:'offline-only-test-key'},beforeCommit:()=>process.exit(23)});
    app.server.listen(0,'127.0.0.1',()=>console.log(app.server.address().port));`;
  const child = spawn(process.execPath, ['--input-type=module', '-e', source, path], { stdio: ['ignore', 'pipe', 'pipe'], env: { SYSTEMROOT: process.env.SYSTEMROOT } });
  const exit = once(child, 'exit');
  const port = await new Promise((done, reject) => { const timeout = setTimeout(() => reject(new Error('Crash fixture did not start')), 10000); child.stdout.once('data', data => { clearTimeout(timeout); done(String(data).trim()); }); child.once('error', reject); });
  const raw = JSON.stringify(notification());
  // Response may be cut off by process.exit after its durable insert. Either
  // outcome must recover the same inbox record, just as a lost HTTP ACK does.
  await fetch(`http://127.0.0.1:${port}/webhooks/lago`, { method: 'POST', headers: headers(raw), body: raw }).catch(() => {});
  const [code] = await exit; assert.equal(code, 23);
  const app = await fixture({ databasePath: path });
  try {
    assert.deepEqual(app.inbox.counts(), [{ status: 'pending', count: 1 }]);
    assert.equal(app.inbox.db.prepare('SELECT COUNT(*) AS n FROM observations').get().n, 0);
    assert.deepEqual(await app.processPending(), { processed: 1, failed: 0 });
    assert.equal(app.inbox.db.prepare('SELECT COUNT(*) AS n FROM observations').get().n, 2);
  } finally { await app.close(); }
});

test('current API customer mismatch cannot be recorded as processed', async () => {
  const app = await fixture({ lago: { ...provider(), subscription: async () => ({ subscription: { ...subscription, external_customer_id: 'other-buyer' } }) } });
  try { await send(app); assert.deepEqual(await app.processPending(), { processed: 0, failed: 1 }); assert.equal(app.inbox.db.prepare('SELECT COUNT(*) AS n FROM observations').get().n, 0); }
  finally { await app.close(); }
});

test('unsupported authentic events are recorded ignored, and pending capacity is bounded', async () => {
  const app = await fixture();
  try {
    await send(app, { organization_id: organization, webhook_type: 'customer.created', object_type: 'customer', customer: { external_id: 'buyer-1' } });
    assert.deepEqual(await app.processPending(), { processed: 1, failed: 0 });
    assert.deepEqual(app.inbox.counts(), [{ status: 'ignored', count: 1 }]);
  } finally { await app.close(); }
  const db = new LagoInbox({ databasePath: await database(), organizationId: organization, maxPending: 1 });
  try {
    db.enqueue('a', Buffer.from('a'));
    assert.throws(() => db.enqueue('b', Buffer.from('b')), error => error.httpStatus === 503);
    assert.equal(db.enqueue('new-header', Buffer.from('a')).duplicate, true);
  } finally { db.close(); }
});

test('parallel signed HTTP deliveries and separate connections produce one durable event', async () => {
  const path = await database();
  const one = await fixture({ databasePath: path }), two = await fixture({ databasePath: path });
  try {
    const deliveries = await Promise.all(Array.from({ length: 10 }, (_, index) => send(index % 2 ? one : two, notification(), `parallel-${index}`)));
    assert.ok(deliveries.every(response => response.status === 202));
    assert.equal(one.inbox.db.prepare('SELECT COUNT(*) AS n FROM inbox').get().n, 1);
    await Promise.all([one.processPending(), two.processPending()]);
    assert.equal(one.inbox.db.prepare('SELECT COUNT(*) AS n FROM observations').get().n, 2);
    assert.deepEqual(one.inbox.counts(), [{ status: 'processed', count: 1 }]);
  } finally { await one.close(); await two.close(); }
});

test('a private inbox cannot be reopened under another configured organization', async () => {
  const path = await database();
  const db = new LagoInbox({ databasePath: path, organizationId: organization });
  db.enqueue('existing', Buffer.from(JSON.stringify(notification()))); db.close();
  assert.throws(() => new LagoInbox({ databasePath: path, organizationId: 'other-organization' }), /another Lago organization/);
  const same = new LagoInbox({ databasePath: path, organizationId: organization });
  try { assert.deepEqual(same.counts(), [{ status: 'pending', count: 1 }]); }
  finally { same.close(); }
});

test('signed subscription events reconcile only with present matching provider/customer identifiers', async () => {
  const event = { organization_id: organization, webhook_type: 'subscription.started', object_type: 'subscription', subscription };
  const valid = await fixture();
  try {
    assert.equal((await send(valid, event)).status, 202);
    assert.deepEqual(await valid.processPending(), { processed: 1, failed: 0 });
    assert.equal(valid.inbox.db.prepare('SELECT COUNT(*) AS n FROM observations').get().n, 1);
  } finally { await valid.close(); }
  for (const field of ['lago_id', 'external_customer_id']) {
    // Reproduce the reviewer's undefined===undefined shape, not just one-sided
    // mismatches. Notification and provider can both omit the same field.
    for (const missingFrom of ['notification', 'provider', 'both']) {
      const notified = { ...subscription }, fetched = { ...subscription };
      if (missingFrom !== 'provider') delete notified[field];
      if (missingFrom !== 'notification') delete fetched[field];
      const app = await fixture({ lago: { ...provider(), subscription: async () => ({ subscription: fetched }) } });
      try {
        assert.equal((await send(app, { ...event, subscription: notified })).status, 202);
        assert.deepEqual(await app.processPending(), { processed: 0, failed: 1 }, `${field} missing from ${missingFrom}`);
        assert.deepEqual(app.inbox.counts(), [{ status: 'pending', count: 1 }]);
        assert.equal(app.inbox.db.prepare('SELECT COUNT(*) AS n FROM observations').get().n, 0);
      } finally { await app.close(); }
    }
  }
});

test('bounded drain completes healthy multi-batch HTTP backlog and distinguishes continuation', async () => {
  const app = await fixture();
  try {
    for (let i = 0; i < 45; i++) assert.equal((await send(app, notification({ offline_delivery: i }), `drain-${i}`)).status, 202);
    assert.deepEqual(await app.processPending(), { processed: 20, failed: 0 });
    assert.equal(app.inbox.counts().find(row => row.status === 'pending').count, 25);
    assert.deepEqual(await drainPending(app, app.inbox, { maxBatches: 1 }), {
      processed: 20, failed: 0, pending: 5, batches: 1, status: 'bounded_continuation', exitCode: 2, publicCheckout: false,
    });
    for (let i = 45; i < 70; i++) assert.equal((await send(app, notification({ offline_delivery: i }), `drain-${i}`)).status, 202);
    assert.deepEqual(await drainPending(app, app.inbox), {
      processed: 30, failed: 0, pending: 0, batches: 2, status: 'complete', exitCode: 0, publicCheckout: false,
    });
  } finally { await app.close(); }
});

test('drain preserves retry backoff while completing other due batches', async () => {
  let calls = 0;
  let clock = Date.now();
  const healthy = provider();
  // REVVEL-DISABLED | AGENT: codex | MODEL: GPT-6 | WR: #18355 | DATE: 2026-11-11 | STATUS: REPLACED
  // REASON: The real clock allowed the one-second retry to become due during slow scheduled runs.
  // const app = await fixture({ lago: { ...healthy, invoice: async id => { calls++; if (calls === 1) throw new Error('offline transient'); return healthy.invoice(id); } } });
  // REVVEL-DISABLED-END
  const app = await fixture({ now: () => clock, lago: { ...healthy, invoice: async id => { calls++; if (calls === 1) throw new Error('offline transient'); return healthy.invoice(id); } } });
  try {
    for (let i = 0; i < 26; i++) assert.equal((await send(app, notification({ offline_delivery: i }), `retry-${i}`)).status, 202);
    assert.deepEqual(await drainPending(app, app.inbox), {
      processed: 25, failed: 1, pending: 1, batches: 2, status: 'retry_pending', exitCode: 1, publicCheckout: false,
    });
    assert.equal(calls, 26);
    assert.deepEqual(await drainPending(app, app.inbox), {
      processed: 0, failed: 0, pending: 1, batches: 0, status: 'retry_pending', exitCode: 1, publicCheckout: false,
    });
    assert.equal(calls, 26, 'backoff is never bypassed by drain');
    assert.equal(app.inbox.db.prepare("SELECT COUNT(*) AS n FROM inbox WHERE status='pending' AND attempts=1").get().n, 1);
    clock += 1000;
    assert.deepEqual(await drainPending(app, app.inbox), {
      processed: 1, failed: 0, pending: 0, batches: 1, status: 'complete', exitCode: 0, publicCheckout: false,
    });
    assert.equal(calls, 27);
  } finally { await app.close(); }
});
