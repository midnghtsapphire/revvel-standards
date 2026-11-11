import { mkdtemp } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createSSEParser } from '../src/agui.js';
import { createServer } from '../src/server.js';

export async function startServer(opts = {}) {
  const dataDir = opts.dataDir ?? (await mkdtemp(path.join(os.tmpdir(), 'halo-demo-')));
  const server = createServer({ dataDir, now: () => '2026-11-11T00:00:00.000Z', ...opts });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const close = () => new Promise((r) => { server.closeAllConnections?.(); server.close(r); });
  return { base, dataDir, close };
}

/** A "device": its own client identity talking to the server. Returns every event plus arrival times. */
export async function runAgent(base, { threadId, deviceId, query, runId = 'run-test' }) {
  const t0 = performance.now();
  const res = await fetch(`${base}/agui`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ threadId, runId, messages: [], state: {}, tools: [], context: [], forwardedProps: { product: 'affiliate-hub', deviceId, query } }),
  });
  const status = res.status;
  const contentType = res.headers.get('content-type');
  const events = [];
  const arrivals = [];
  if (status === 200) {
    const parser = createSSEParser();
    const decoder = new TextDecoder();
    for await (const chunk of res.body) {
      for (const e of parser.push(decoder.decode(chunk, { stream: true }))) {
        events.push(e);
        arrivals.push(performance.now() - t0);
      }
    }
  }
  return { status, contentType, events, arrivals, totalMs: performance.now() - t0 };
}
