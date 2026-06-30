'use strict';

const { test } = require('node:test');
const assert = require('node:assert');

// gh.js reads global fetch at call time, so we can stub it per-case.
const { api } = require('../scripts/biome/gh');

function stubFetch({ ok, status, body }) {
  global.fetch = async () => ({
    ok,
    status,
    text: async () => body,
    json: async () => JSON.parse(body),
  });
}

const ORIGINAL_FETCH = global.fetch;
test.after(() => {
  global.fetch = ORIGINAL_FETCH;
});

test('204 returns null', async () => {
  stubFetch({ ok: true, status: 204, body: '' });
  assert.equal(await api('/x'), null);
});

test('empty body returns null', async () => {
  stubFetch({ ok: true, status: 200, body: '' });
  assert.equal(await api('/x'), null);
});

test('ok + valid JSON parses', async () => {
  stubFetch({ ok: true, status: 200, body: '{"hello":"world"}' });
  assert.deepEqual(await api('/x'), { hello: 'world' });
});

test('ok + non-JSON throws (surfaced, not silently masked as null)', async () => {
  stubFetch({ ok: true, status: 200, body: '<html>502 Bad Gateway</html>' });
  await assert.rejects(() => api('/x'), /returned non-JSON/);
});

test('non-ok + allowError returns null (graceful degrade, no throw on error page)', async () => {
  stubFetch({ ok: false, status: 502, body: '<html>Bad Gateway</html>' });
  assert.equal(await api('/x', { allowError: true }), null);
});

test('non-ok without allowError throws', async () => {
  stubFetch({ ok: false, status: 500, body: 'boom' });
  await assert.rejects(() => api('/x'), /-> 500/);
});
