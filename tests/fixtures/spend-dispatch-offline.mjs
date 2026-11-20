// 2026-11-15: strict offline fixture for the actual dispatcher entry point.
// Provider responses are test-only mocks; neither Github nor a provider is called.
import assert from 'node:assert/strict';
import net from 'node:net';
import tls from 'node:tls';
import http from 'node:http';
import https from 'node:https';

const forbid = () => { throw new Error('Real network is forbidden in spend tests'); };
net.Socket.prototype.connect = forbid;
tls.connect = forbid;
http.request = forbid;
https.request = forbid;

const receipt = { github: 0, openrouter: 0, manus: 0, packs: [], comments: [] };
const response = (data, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => data,
  text: async () => JSON.stringify(data),
});

globalThis.fetch = async (input, opts = {}) => {
  const url = new URL(input);
  if (url.hostname === 'openrouter.ai') {
    receipt.openrouter += 1;
    assert.equal(url.pathname, '/api/v1/chat/completions');
    assert.equal(opts.method, 'POST');
    assert.equal(process.env.REVVEL_LLM_ALLOW_CLOUD, '1');
    assert.equal(opts.headers.Authorization, 'Bearer offline-test-key');
    const payload = JSON.parse(opts.body);
    assert.match(payload.messages[0].content, /WR #123: Offline issue/);
    if (process.env.MOCK_PROVIDER_FAILURE === '1') return response({ error: 'offline 402' }, 402);
    return response({ choices: [{ message: { content: 'OFFLINE MOCK plan' } }] });
  }
  if (url.hostname === 'api.manus.ai') {
    receipt.manus += 1;
    assert.equal(url.pathname, '/v1/tasks');
    assert.equal(opts.method, 'POST');
    assert.equal(process.env.REVVEL_LLM_ALLOW_CLOUD, '1');
    assert.equal(opts.headers.API_KEY, 'offline-test-key');
    return response({ task_id: 'offline-mock-task', task_url: 'https://example.invalid/offline-mock' });
  }
  assert.equal(url.hostname, 'api.github.com', `Unexpected request: ${url}`);
  receipt.github += 1;
  if (url.pathname.endsWith('/issues/123') && !opts.method) {
    return response({
      title: 'Offline issue', body: 'Implement the offline gate regression.',
      labels: [{ name: process.env.FORCED_ROUTE }], html_url: 'https://example.invalid/123',
    });
  }
  if (url.pathname.endsWith('/comments')) {
    if (opts.method === 'POST') {
      receipt.comments.push(JSON.parse(opts.body).body);
      return response({ id: 1 });
    }
    return response([]);
  }
  if (url.pathname.includes('/contents/wr/roo-queue/')) {
    if (opts.method === 'PUT') {
      receipt.packs.push(Buffer.from(JSON.parse(opts.body).content, 'base64').toString('utf8'));
      return response({ content: { sha: 'offline-mock' } });
    }
    return response({ message: 'offline new file' }, 404);
  }
  throw new Error(`Unexpected Github mock request: ${url}`);
};

process.on('exit', () => {
  console.log(`OFFLINE_RECEIPT ${JSON.stringify(receipt)}`);
});
