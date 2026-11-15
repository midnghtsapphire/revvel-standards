import { DatabaseSync } from 'node:sqlite';
import { openSync, closeSync, mkdirSync } from 'node:fs';
import { dirname, isAbsolute, normalize } from 'node:path';
import { createHash } from 'node:crypto';

export class LagoInbox {
  constructor({ databasePath, organizationId, maxPending = 1000, now = Date.now }) {
    if (!isAbsolute(databasePath || '') || normalize(databasePath).split(/[\\/]/).some(p => ['public', 'out'].includes(p))) throw new Error('Choose an absolute private database path outside public/out');
    if (typeof organizationId !== 'string' || !organizationId || organizationId.length > 255) throw new Error('Expected Lago organization is required');
    if (!Number.isSafeInteger(maxPending) || maxPending < 1 || maxPending > 10000) throw new Error('maxPending must be 1..10000');
    this.organizationId = organizationId; this.maxPending = maxPending; this.now = now;
    mkdirSync(dirname(databasePath), { recursive: true, mode: 0o700 });
    // Preserve existing databases; a new credential-bearing inbox starts private.
    try { closeSync(openSync(databasePath, 'ax', 0o600)); } catch (error) { if (error.code !== 'EEXIST') throw error; }
    this.db = new DatabaseSync(databasePath);
    try {
      const version = this.db.prepare('PRAGMA user_version').get().user_version;
      if (![0, 1, 2].includes(version)) throw new Error('Unsupported billing inbox schema; preserve database and upgrade receiver');
      this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000; PRAGMA max_page_count=32768;
        CREATE TABLE IF NOT EXISTS inbox (
          id INTEGER PRIMARY KEY, organization TEXT NOT NULL, delivery_key TEXT NOT NULL,
          body_sha256 TEXT NOT NULL, body BLOB NOT NULL, status TEXT NOT NULL DEFAULT 'pending',
          attempts INTEGER NOT NULL DEFAULT 0, last_error TEXT, received_at TEXT NOT NULL,
          next_attempt_at INTEGER NOT NULL DEFAULT 0,
          UNIQUE(organization, delivery_key), UNIQUE(organization, body_sha256));
        CREATE TABLE IF NOT EXISTS observations (
          id INTEGER PRIMARY KEY, event_id INTEGER NOT NULL, organization TEXT NOT NULL,
          resource_kind TEXT NOT NULL, resource_id TEXT NOT NULL, snapshot TEXT NOT NULL,
          observed_at TEXT NOT NULL, UNIQUE(event_id, resource_kind, resource_id));
        `);
      // Additive migration: existing inbox events/snapshots are retained intact.
      if (!this.db.prepare('PRAGMA table_info(inbox)').all().some(column => column.name === 'next_attempt_at')) this.db.exec('ALTER TABLE inbox ADD COLUMN next_attempt_at INTEGER NOT NULL DEFAULT 0');
      this.db.exec('PRAGMA user_version=2');
      // The expected tenant belongs to this receiver, not an untrusted HTTP path.
      const mismatch = this.db.prepare('SELECT 1 FROM inbox WHERE organization != ? LIMIT 1').get(organizationId);
      if (mismatch) throw new Error('Database belongs to another Lago organization');
    } catch (error) { this.db.close(); throw error; }
  }

  enqueue(deliveryKey, raw) {
    const hash = createHash('sha256').update(raw).digest('hex');
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const existing = this.db.prepare('SELECT id, body_sha256, status FROM inbox WHERE organization=? AND delivery_key=?').get(this.organizationId, deliveryKey);
      if (existing && existing.body_sha256 !== hash) throw Object.assign(new Error('Delivery key payload conflict'), { httpStatus: 409 });
      // Unique-key is NOT covered by Lago's signature. Replaying the same signed
      // body with a changed header must not create another event/business effect.
      const duplicate = existing || this.db.prepare('SELECT id, status FROM inbox WHERE organization=? AND body_sha256=?').get(this.organizationId, hash);
      if (duplicate) { this.db.exec('COMMIT'); return { duplicate: true, ...duplicate }; }
      const pending = this.db.prepare("SELECT COUNT(*) AS count FROM inbox WHERE status='pending'").get().count;
      if (pending >= this.maxPending) throw Object.assign(new Error('Inbox capacity reached'), { httpStatus: 503 });
      const result = this.db.prepare('INSERT INTO inbox(organization,delivery_key,body_sha256,body,received_at) VALUES(?,?,?,?,?)').run(this.organizationId, deliveryKey, hash, raw, new Date().toISOString());
      this.db.exec('COMMIT'); return { id: Number(result.lastInsertRowid), duplicate: false, status: 'pending' };
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }

  pending(limit = 100) {
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) throw new Error('Batch limit must be 1..100');
    return this.db.prepare("SELECT id, body FROM inbox WHERE organization=? AND status='pending' AND next_attempt_at<=? ORDER BY id LIMIT ?").all(this.organizationId, this.now(), limit);
  }

  finish(id, snapshots, { beforeCommit = () => {} } = {}) {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const current = this.db.prepare('SELECT status FROM inbox WHERE id=? AND organization=?').get(id, this.organizationId);
      if (current?.status === 'pending') {
        const insert = this.db.prepare('INSERT INTO observations(event_id,organization,resource_kind,resource_id,snapshot,observed_at) VALUES(?,?,?,?,?,?)');
        for (const snapshot of snapshots) {
          const data = JSON.stringify(snapshot.data);
          if (Buffer.byteLength(data) > 262144) throw new Error('Provider snapshot exceeds 256 KiB bound');
          insert.run(id, this.organizationId, snapshot.kind, snapshot.id, data, new Date().toISOString());
        }
        beforeCommit(); // Fault injection in tests demonstrates rollback, not a false processed marker.
        this.db.prepare("UPDATE inbox SET status=?,last_error=NULL,attempts=attempts+1 WHERE id=?").run(snapshots.length ? 'processed' : 'ignored', id);
      }
      this.db.exec('COMMIT');
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }

  failure(id, code = 'reconciliation_failed') {
    // Persist exponential delay separately from transport ACKs. A failing Lago
    // service must not be polled every receiver tick or lose its retry on restart.
    this.db.prepare('UPDATE inbox SET attempts=attempts+1,last_error=?,next_attempt_at=?+MIN(300000,1000*(1<<MIN(attempts,8))) WHERE id=? AND organization=? AND status=?').run(code, this.now(), id, this.organizationId, 'pending');
  }
  hasFailures() {
    return Boolean(this.db.prepare("SELECT 1 FROM inbox WHERE organization=? AND status='pending' AND last_error IS NOT NULL LIMIT 1").get(this.organizationId));
  }
  counts() {
    return this.db.prepare('SELECT status,COUNT(*) AS count FROM inbox WHERE organization=? GROUP BY status').all(this.organizationId).map(row => ({ ...row }));
  }
  close() { this.db.close(); }
}

function identifier(value, label) {
  if (typeof value !== 'string' || !value || value.length > 255) throw new Error(`Missing or invalid ${label}`);
  return value;
}

export async function reconcileNotification(event, lago) {
  const snapshots = [];
  if (event.object_type === 'invoice' && event.webhook_type.startsWith('invoice.')) {
    const id = identifier(event.invoice?.lago_id, 'invoice ID');
    const { invoice } = await lago.invoice(id);
    if (invoice?.lago_id !== id) throw new Error('Invoice API ID mismatch');
    const customer = identifier(invoice.customer?.external_id, 'invoice customer');
    if (event.invoice.customer?.external_id && event.invoice.customer.external_id !== customer) throw new Error('Invoice customer mismatch');
    const subscriptions = invoice.subscriptions;
    if (!Array.isArray(subscriptions) || subscriptions.length > 20) throw new Error('Invoice subscription list missing or exceeds bound');
    snapshots.push({ kind: 'invoice', id, data: invoice });
    for (const item of subscriptions) {
      const externalId = identifier(item.external_id, 'subscription external ID');
      const expectedLagoId = identifier(item.lago_id, 'invoice subscription Lago ID');
      const { subscription } = await lago.subscription(externalId);
      const actualLagoId = identifier(subscription?.lago_id, 'provider subscription Lago ID');
      const actualCustomer = identifier(subscription?.external_customer_id, 'provider subscription customer');
      // REVVEL-DISABLED | AGENT: codex | MODEL: GPT-6 | WR: #18333 | DATE: 2026-11-10 | STATUS: REPLACED
      // REASON: equality alone does not prove that both identifiers are present.
      // if (subscription?.external_id !== externalId || subscription.lago_id !== item.lago_id || subscription.external_customer_id !== customer) throw new Error('Subscription/customer API mismatch');
      // snapshots.push({ kind: 'subscription', id: subscription.lago_id, data: subscription });
      // REVVEL-DISABLED-END
      if (subscription.external_id !== externalId || actualLagoId !== expectedLagoId || actualCustomer !== customer) throw new Error('Subscription/customer API mismatch');
      snapshots.push({ kind: 'subscription', id: actualLagoId, data: subscription });
    }
  } else if (event.object_type === 'subscription' && event.webhook_type.startsWith('subscription.')) {
    const externalId = identifier(event.subscription?.external_id, 'subscription external ID');
    const expectedLagoId = identifier(event.subscription?.lago_id, 'notified subscription Lago ID');
    const expectedCustomer = identifier(event.subscription?.external_customer_id, 'notified subscription customer');
    const { subscription } = await lago.subscription(externalId);
    const actualLagoId = identifier(subscription?.lago_id, 'provider subscription Lago ID');
    const actualCustomer = identifier(subscription?.external_customer_id, 'provider subscription customer');
    // REVVEL-DISABLED | AGENT: codex | MODEL: GPT-6 | WR: #18333 | DATE: 2026-11-10 | STATUS: REPLACED
    // REASON: undefined === undefined accepted a missing customer binding.
    // if (subscription?.external_id !== externalId || subscription.lago_id !== event.subscription.lago_id || subscription.external_customer_id !== event.subscription.external_customer_id) throw new Error('Subscription API identity mismatch');
    // snapshots.push({ kind: 'subscription', id: subscription.lago_id, data: subscription });
    // REVVEL-DISABLED-END
    if (subscription.external_id !== externalId || actualLagoId !== expectedLagoId || actualCustomer !== expectedCustomer) throw new Error('Subscription API identity mismatch');
    snapshots.push({ kind: 'subscription', id: actualLagoId, data: subscription });
  }
  // These are provider observations, not customer entitlements. Unknown events
  // are durably marked ignored; no fabricated auth/fulfillment path is exposed.
  return snapshots;
}

export function inboxProcessor({ inbox, lago, beforeCommit }) {
  let running = false;
  return async (limit = 100) => {
    if (running) return { busy: true };
    running = true;
    let processed = 0, failed = 0;
    try {
      for (const event of inbox.pending(limit)) {
        try {
          const snapshots = await reconcileNotification(JSON.parse(Buffer.from(event.body)), lago);
          inbox.finish(event.id, snapshots, { beforeCommit }); processed++;
        } catch { inbox.failure(event.id); failed++; }
      }
      return { processed, failed };
    } finally { running = false; }
  };
}
