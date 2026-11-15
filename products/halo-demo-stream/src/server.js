// halo-demo-stream server: AG-UI over SSE + file-backed session resume.
//
//   POST /agui                      RunAgentInput JSON in, AG-UI SSE stream out
//   GET  /a2ui/sessions/:id         committed session state (resume lookup)
//   GET  /health                    {status:"ok"}
//   GET  /                          demo page;  GET /agui.js  shared client code
//
// Zero dependencies. Binds 127.0.0.1 unless HOST is set explicitly.

import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { EventType, diffState, encodeSSE } from './agui.js';
import { SESSION_ID_RE, SessionStore } from './session-store.js';
import * as affiliateHub from './adapters/affiliate-hub.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(here, '..', 'public');
const MAX_BODY = 64 * 1024;

export const DEFAULT_ADAPTERS = { [affiliateHub.id]: affiliateHub };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const json = (res, status, body) => {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(`${JSON.stringify(body)}\n`);
};

async function readBody(req) {
  let size = 0;
  const chunks = [];
  for await (const c of req) {
    size += c.length;
    if (size > MAX_BODY) throw Object.assign(new Error('body too large'), { status: 413 });
    chunks.push(c);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw Object.assign(new Error('body must be JSON (AG-UI RunAgentInput)'), { status: 400 });
  }
}

/**
 * @param {object} opts
 * @param {string} opts.dataDir          where session files live
 * @param {number} [opts.streamDelayMs]  pause between streamed chunks (demo pacing)
 * @param {() => string} [opts.now]      clock, injectable for deterministic tests
 * @param {object} [opts.adapters]       product adapters keyed by product id
 */
export function createServer({ dataDir, streamDelayMs = 0, now = () => new Date().toISOString(), adapters = DEFAULT_ADAPTERS }) {
  const store = new SessionStore(dataDir);

  async function handleRun(req, res) {
    const input = await readBody(req);
    const threadId = input?.threadId;
    if (typeof threadId !== 'string' || !SESSION_ID_RE.test(threadId)) {
      return json(res, 400, { error: 'threadId (the session id) must match [A-Za-z0-9_-]{8,64}' });
    }
    const product = input.forwardedProps?.product ?? 'affiliate-hub';
    const adapter = adapters[product];
    if (!adapter) return json(res, 404, { error: `unknown product: ${product}`, products: Object.keys(adapters) });
    const deviceId = typeof input.forwardedProps?.deviceId === 'string' ? input.forwardedProps.deviceId.slice(0, 40) : 'unknown';
    const runId = typeof input.runId === 'string' && input.runId ? input.runId.slice(0, 64) : `run-${Date.now()}`;

    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-store',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    let closed = false;
    res.on('close', () => { closed = true; });
    const emit = async (event) => {
      if (closed) return false;
      res.write(encodeSSE(event));
      if (streamDelayMs) await sleep(streamDelayMs);
      return true;
    };

    await store.withLock(threadId, async () => {
      try {
        const record = (await store.load(threadId)) ?? {
          sessionId: threadId, revision: 0, updatedAt: now(), state: adapter.initialState(),
        };
        await emit({ type: EventType.RUN_STARTED, threadId, runId });
        // Resume point: every run opens with the last committed state, so any
        // client (a second device, a reload, a restarted server) starts here.
        await emit({ type: EventType.STATE_SNAPSHOT, snapshot: record.state });

        const messageId = `msg-${record.revision + 1}`;
        await emit({ type: EventType.TEXT_MESSAGE_START, messageId, role: 'assistant' });
        let nextState = null;
        for await (const part of adapter.run({ state: record.state, query: input.forwardedProps?.query, deviceId })) {
          if (part.text !== undefined) {
            if (!(await emit({ type: EventType.TEXT_MESSAGE_CONTENT, messageId, delta: part.text }))) return;
          }
          if (part.state) nextState = part.state;
        }
        await emit({ type: EventType.TEXT_MESSAGE_END, messageId });
        if (!nextState) throw new Error('adapter produced no state');

        // Commit before telling the client, so what a client has seen is
        // never ahead of what the next client will be handed. An aborted
        // client (closed) does not commit a half-finished run.
        if (closed) return;
        const committed = { sessionId: threadId, revision: record.revision + 1, updatedAt: now(), state: nextState };
        await store.save(committed);
        await emit({ type: EventType.STATE_DELTA, delta: diffState(record.state, nextState) });
        await emit({ type: EventType.RUN_FINISHED, threadId, runId, result: { revision: committed.revision } });
      } catch (err) {
        await emit({ type: EventType.RUN_ERROR, message: String(err.message ?? err), code: 'RUN_FAILED' });
      }
    });
    res.end();
  }

  async function serveFile(res, name, type) {
    const body = await readFile(path.join(name === 'agui.js' ? here : publicDir, name));
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-cache' });
    res.end(body);
  }

  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      if (req.method === 'POST' && url.pathname === '/agui') return await handleRun(req, res);
      if (req.method === 'GET' && url.pathname === '/health') return json(res, 200, { status: 'ok', service: 'halo-demo-stream' });
      if (req.method === 'GET' && url.pathname === '/') return await serveFile(res, 'index.html', 'text/html; charset=utf-8');
      if (req.method === 'GET' && url.pathname === '/agui.js') return await serveFile(res, 'agui.js', 'text/javascript; charset=utf-8');
      const m = url.pathname.match(/^\/a2ui\/sessions\/([^/]+)$/);
      if (req.method === 'GET' && m) {
        if (!SESSION_ID_RE.test(m[1])) return json(res, 400, { error: 'invalid session id' });
        const rec = await store.load(m[1]);
        return rec ? json(res, 200, rec) : json(res, 404, { error: 'no such session' });
      }
      return json(res, 404, { error: 'not found' });
    } catch (err) {
      if (!res.headersSent) return json(res, err.status ?? 500, { error: String(err.message ?? err) });
      res.end();
    }
  });
  return server;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT ?? 4180);
  const host = process.env.HOST ?? '127.0.0.1';
  const dataDir = process.env.DEMO_DATA_DIR ?? path.join(here, '..', 'data', 'sessions');
  const server = createServer({ dataDir, streamDelayMs: Number(process.env.STREAM_DELAY_MS ?? 60) });
  server.listen(port, host, () => console.log(`halo-demo-stream listening on http://${host}:${port}/ (sessions: ${dataDir})`));
}
