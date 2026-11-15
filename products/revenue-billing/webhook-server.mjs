import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LagoClient } from './lago.mjs';
import { LagoInbox, inboxProcessor } from './webhook-inbox.mjs';
import { signatureVerifier } from './webhook-signature.mjs';

function rawBody(request, maxBytes) {
  return new Promise((resolveBody, reject) => {
    let size = 0, chunks = [], settled = false;
    const fail = error => { if (!settled) { settled = true; chunks = []; reject(error); } };
    request.on('data', chunk => {
      if (settled) return;
      size += chunk.length;
      if (size > maxBytes) fail(Object.assign(new Error('Body too large'), { httpStatus: 413 }));
      else chunks.push(chunk);
    });
    request.on('end', () => { if (!settled) { settled = true; resolveBody(Buffer.concat(chunks)); } });
    request.on('aborted', () => fail(new Error('Client aborted')));
    request.on('error', fail);
  });
}

export function createLagoReceiver({ inbox, lago, verification, maxBodyBytes = 65536, autoProcess = true, beforeCommit, requestsPerMinute = 120 }) {
  if (!Number.isSafeInteger(maxBodyBytes) || maxBodyBytes < 1 || maxBodyBytes > 65536) throw new Error('Body limit must be 1..65536');
  if (!Number.isSafeInteger(requestsPerMinute) || requestsPerMinute < 1 || requestsPerMinute > 10000) throw new Error('Invalid request rate');
  const verifySignature = signatureVerifier(verification);
  const processInbox = inboxProcessor({ inbox, lago, beforeCommit });
  let current, workerError = inbox.hasFailures();
  const processPending = () => {
    if (!current) current = processInbox(20).then(result => {
      workerError = result.failed > 0 || inbox.hasFailures(); return result;
    }).catch(error => { workerError = true; throw error; }).finally(() => { current = undefined; });
    return current;
  };
  const peers = new Map();
  const server = createServer({ maxHeaderSize: 100 * 1024, requestTimeout: 5000, headersTimeout: 5000 }, async (request, response) => {
    const respond = (status, data) => {
      response.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...(status >= 400 ? { Connection: 'close' } : {}) });
      response.end(JSON.stringify(data));
    };
    try {
      if (request.url === '/health' && request.method === 'GET') { respond(workerError ? 503 : 200, { status: workerError ? 'degraded' : 'ok', service: 'lago-webhook-inbox', publicCheckout: false }); return; }
      if (request.url !== '/webhooks/lago') { respond(404, { error: 'not_found' }); return; }
      if (request.method !== 'POST') { response.setHeader('Allow', 'POST'); respond(405, { error: 'method_not_allowed' }); return; }
      const ip = request.socket.remoteAddress, minute = Math.floor(Date.now() / 60000);
      if (!peers.has(ip) && peers.size >= 1024) peers.delete(peers.keys().next().value);
      const peer = peers.get(ip);
      const rate = peer?.minute === minute ? peer : { minute, count: 0 };
      peers.set(ip, rate);
      if (++rate.count > requestsPerMinute) { response.setHeader('Retry-After', '60'); respond(429, { error: 'rate_limited' }); return; }
      // Do not accept duplicate/joined signature or identity headers. Header
      // identity is not cryptographically bound; inbox also deduplicates body hash.
      for (const name of ['x-lago-signature', 'x-lago-signature-algorithm', 'x-lago-unique-key']) {
        if (request.rawHeaders.filter((_, index) => index % 2 === 0 && request.rawHeaders[index].toLowerCase() === name).length !== 1) { respond(400, { error: 'invalid_headers' }); return; }
      }
      const key = request.headers['x-lago-unique-key'];
      if (typeof key !== 'string' || !/^[A-Za-z0-9_.:-]{1,255}$/.test(key)) { respond(400, { error: 'invalid_delivery_key' }); return; }
      if (request.headers['content-encoding'] || !/^application\/json(?:\s*;|$)/i.test(request.headers['content-type'] || '')) { respond(415, { error: 'unsupported_content' }); return; }
      if (Number(request.headers['content-length']) > maxBodyBytes) { respond(413, { error: 'body_too_large' }); return; }
      const raw = await rawBody(request, maxBodyBytes);
      if (!verifySignature(raw, request.headers)) { respond(401, { error: 'invalid_signature' }); return; }
      let event;
      try { event = JSON.parse(raw); } catch { respond(400, { error: 'invalid_json' }); return; }
      if (!event || Array.isArray(event) || event.organization_id !== inbox.organizationId
        || typeof event.webhook_type !== 'string' || !/^[a-z_]+\.[a-z_]+$/.test(event.webhook_type)
        || typeof event.object_type !== 'string' || !/^[a-z_]{1,60}$/.test(event.object_type)
        || !Object.hasOwn(event, event.object_type) || !event[event.object_type]
        || typeof event[event.object_type] !== 'object' || Array.isArray(event[event.object_type])) {
        respond(400, { error: 'invalid_organization_or_envelope' }); return;
      }
      const result = inbox.enqueue(key, raw);
      // A 202 acknowledges durable receipt, not payment or successful processing.
      // Lago delivery retries are limited; pending reconciliation survives restart
      // and is retried independently by this operator-owned receiver.
      respond(202, { received: true, duplicate: result.duplicate });
      if (autoProcess) void processPending().catch(() => { workerError = true; });
    } catch (error) {
      // Raw errors can include provider/customer data. Inspect the private inbox
      // state locally; public responses expose only coarse status codes.
      respond(error.httpStatus || 503, { error: error.httpStatus === 409 ? 'delivery_key_conflict' : 'request_not_accepted' });
    }
  });
  server.maxConnections = 64; server.maxRequestsPerSocket = 100; server.keepAliveTimeout = 1000;
  const timer = autoProcess ? setInterval(() => { void processPending().catch(() => { workerError = true; }); }, 2000) : null;
  timer?.unref();
  return {
    server, processPending,
    async close() {
      if (timer) clearInterval(timer);
      server.closeIdleConnections();
      if (server.listening) await new Promise((done, reject) => server.close(error => error ? reject(error) : done()));
      if (current) await current;
      inbox.close();
    },
  };
}

// Bound draining independently of queue growth and persisted retry delays.
export async function drainPending(app, inbox, { maxBatches = 50 } = {}) {
  if (!Number.isSafeInteger(maxBatches) || maxBatches < 1 || maxBatches > 500) throw new Error('Drain batch limit must be 1..500');
  let processed = 0, failed = 0, batches = 0;
  while (batches < maxBatches && inbox.pending(1).length) {
    const result = await app.processPending();
    batches++;
    processed += result.processed;
    failed += result.failed;
    if (!result.processed && !result.failed) break;
  }
  const pending = inbox.counts().find(row => row.status === 'pending')?.count || 0;
  const retryPending = inbox.hasFailures();
  const status = retryPending ? 'retry_pending' : pending ? 'bounded_continuation' : 'complete';
  return { processed, failed, pending, batches, status, exitCode: retryPending ? 1 : pending ? 2 : 0, publicCheckout: false };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const verification = { algorithm: process.env.LAGO_WEBHOOK_ALGORITHM, hmacKey: process.env.LAGO_WEBHOOK_HMAC_KEY, issuer: process.env.LAGO_WEBHOOK_ISSUER };
    if (verification.algorithm === 'jwt') verification.publicKey = await readFile(process.env.LAGO_WEBHOOK_PUBLIC_KEY_FILE, 'utf8');
    const inbox = new LagoInbox({ databasePath: process.env.LAGO_WEBHOOK_DATABASE, organizationId: process.env.LAGO_ORGANIZATION_ID });
    const drain = process.argv.includes('--drain');
    const app = createLagoReceiver({ inbox, lago: new LagoClient(), verification, autoProcess: !drain });
    if (drain) {
      // REVVEL-DISABLED | AGENT: codex-revenue | MODEL: platform-selected | WR: #18333 | DATE: 2026-11-10 | STATUS: REPLACED
      // REASON: one batch mislabeled healthy >20-event backlogs as failures.
      // const result = await app.processPending();
      // const pending = inbox.counts().find(row => row.status === 'pending')?.count || 0;
      // console.log(JSON.stringify({ ...result, pending, publicCheckout: false }));
      // process.exitCode = pending ? 1 : 0;
      // REVVEL-DISABLED-END
      const result = await drainPending(app, inbox);
      console.log(JSON.stringify(result));
      process.exitCode = result.exitCode;
      await app.close();
    } else {
    const port = Number(process.env.LAGO_WEBHOOK_PORT || 8090);
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid receiver port');
    // Loopback by default. Existing owner-controlled ingress can connect later;
    // this command does not edit gateway routes, DNS, ports or tunnel settings.
    app.server.listen(port, '127.0.0.1', () => console.log('Lago webhook receiver listening on loopback; public checkout disabled'));
    for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => { void app.close().then(() => { process.exitCode = 0; }); });
    }
  } catch {
    console.error('Lago receiver configuration/startup failed; verify private database, organization, credentials and pinned signature configuration');
    process.exitCode = 1;
  }
}
