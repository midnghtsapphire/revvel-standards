'use strict';

/**
 * `routedChat` is the single entry point every persona in
 * `scripts/openrouter-personas.js` uses — DRAGNET included, via its
 * `repo_surgery` profile. Until 2026-08-21 its body was one call to
 * `callOpenRouter`, which meant two free lanes the repo already owned were
 * unreachable from it:
 *
 *   1. LM Studio on the operator's machine. `scripts/local_llm.py` had
 *      implemented Layer 0 for Python; nothing on the JS side could reach it.
 *      The operator was running a local model at zero cost that DRAGNET could
 *      not use.
 *
 *   2. The keyless Perplexity tier-2 that `config/routing-failover.yml` has
 *      declared since WR-4481. `scripts/lane-failover.js` decides to fail over
 *      to it and writes that decision to the ledger — but it imports only
 *      `fs`, `path`, and `failure-ledger`. No HTTP client. The only other
 *      mentions of api.perplexity.ai in the repo are a `curl` health probe and
 *      a commented-out line in `search_orchestrator.py`.
 *
 * So the failover had a producer and no consumer: it emitted a label, a route
 * decision, and a ledger class, and never sent a request. RVS-VERIFY-001 —
 * "a marker nobody checks is decoration" — in its purest form, because the
 * marker described a network call that did not happen.
 *
 * These tests stand up real stub servers and assert on what is actually
 * requested, because that is the only thing that distinguishes this fix from
 * the decoration it replaces. Asserting that the code *mentions* Perplexity
 * would have passed before the fix too.
 */

const test = require('node:test');
const assert = require('node:assert');
const http = require('node:http');

const { routedChat } = require('../scripts/openrouter-routing');
const { GATE_ENV, GATE_VALUE } = require('../scripts/llm-spend-gate');

/** Start a stub OpenAI-compatible server; resolves to {url, hits, close}. */
function stubServer({ models = ['stub-chat-model'], reply = 'stub answer', status = 200 } = {}) {
  const hits = [];
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      hits.push({ path: req.url, method: req.method, auth: req.headers.authorization || null, body });
      if (status !== 200) {
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'stub refusal' }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      if (req.url.endsWith('/models')) {
        res.end(JSON.stringify({ data: models.map((id) => ({ id })) }));
      } else {
        res.end(JSON.stringify({ model: models[0], choices: [{ message: { content: reply } }] }));
      }
    });
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      resolve({
        url: `http://127.0.0.1:${server.address().port}`,
        hits,
        close: () => new Promise((r) => server.close(r)),
      });
    });
  });
}

/** Point every lane at somewhere harmless, then restore. */
function withEnv(vars, fn) {
  const saved = {};
  for (const [k, v] of Object.entries(vars)) {
    saved[k] = process.env[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  return (async () => fn())().finally(() => {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });
}

/** A port with nothing listening, so a lane is genuinely absent. */
const DEAD = 'http://127.0.0.1:1';

const MESSAGES = [{ role: 'user', content: 'ping' }];

test('LM Studio answers and nothing paid is contacted', async () => {
  const lm = await stubServer({ models: ['google/gemma-3-4b'], reply: 'local answer' });
  try {
    await withEnv({
      LMSTUDIO_ENDPOINT: `${lm.url}/v1`,
      LMSTUDIO_MODEL: undefined,
      LMSTUDIO_API_KEY: undefined,
      PERPLEXITY_ENDPOINT: DEAD,
      [GATE_ENV]: undefined, // paid lane closed: reaching it would throw
    }, async () => {
      const result = await routedChat({ profile: 'repo_surgery', messages: MESSAGES, silent: true });
      assert.strictEqual(result.content, 'local answer');
      assert.strictEqual(result.lane, 'lane-0-lmstudio');
      assert.strictEqual(result.modelUsed, 'google/gemma-3-4b');
      assert.strictEqual(result.profile, 'repo_surgery');
    });
    assert.ok(
      lm.hits.some((h) => h.path.endsWith('/chat/completions')),
      'LM Studio was never actually asked to complete anything.',
    );
  } finally {
    await lm.close();
  }
});

test('an embedding-only LM Studio is skipped, not mistaken for a chat lane', async () => {
  // The operator had text-embedding-nomic-embed-text-v1.5 loaded. It appears
  // in /v1/models exactly like a chat model and errors on /chat/completions,
  // so auto-selection must not pick it and call Layer 0 healthy.
  const lm = await stubServer({ models: ['text-embedding-nomic-embed-text-v1.5'] });
  const pplx = await stubServer({ models: ['sonar'], reply: 'perplexity answer' });
  try {
    await withEnv({
      LMSTUDIO_ENDPOINT: `${lm.url}/v1`,
      LMSTUDIO_MODEL: undefined,
      PERPLEXITY_ENDPOINT: `${pplx.url}/chat/completions`,
      PERPLEXITY_API_KEY: undefined,
      [GATE_ENV]: undefined,
    }, async () => {
      const result = await routedChat({ profile: 'repo_surgery', messages: MESSAGES, silent: true });
      assert.strictEqual(result.lane, 'lane-2-perplexity-keyless');
    });
    assert.ok(
      !lm.hits.some((h) => h.path.endsWith('/chat/completions')),
      'An embedding model was sent a chat completion.',
    );
  } finally {
    await lm.close();
    await pplx.close();
  }
});

test('the keyless Perplexity lane sends a real request, with no Authorization header', async () => {
  // The whole defect: this request never left the process. Assert the bytes.
  const pplx = await stubServer({ models: ['sonar'], reply: 'perplexity answer' });
  try {
    await withEnv({
      LMSTUDIO_ENDPOINT: DEAD,
      PERPLEXITY_ENDPOINT: `${pplx.url}/chat/completions`,
      PERPLEXITY_API_KEY: undefined,
      [GATE_ENV]: undefined,
    }, async () => {
      const result = await routedChat({ profile: 'repo_surgery', messages: MESSAGES, silent: true });
      assert.strictEqual(result.content, 'perplexity answer');
      assert.strictEqual(result.lane, 'lane-2-perplexity-keyless');
      assert.strictEqual(result.keyless, true, 'Lane reported itself keyed when no key was set.');
    });
    assert.strictEqual(pplx.hits.length, 1, 'Perplexity was not called exactly once.');
    assert.strictEqual(pplx.hits[0].method, 'POST');
    assert.strictEqual(
      pplx.hits[0].auth, null,
      'The keyless lane sent an Authorization header, so it was not keyless.',
    );
    assert.match(pplx.hits[0].body, /"messages"/, 'Perplexity got no messages.');
  } finally {
    await pplx.close();
  }
});

test('both free lanes down falls through to the paid lane, which the spend gate refuses', async () => {
  await withEnv({
    LMSTUDIO_ENDPOINT: DEAD,
    PERPLEXITY_ENDPOINT: DEAD,
    [GATE_ENV]: undefined,
  }, async () => {
    await assert.rejects(
      () => routedChat({ profile: 'repo_surgery', messages: MESSAGES, silent: true }),
      (err) => {
        assert.strictEqual(
          err.name, 'CloudSpendBlockedError',
          `Expected the spend gate to refuse, got ${err.name}: ${err.message}`,
        );
        return true;
      },
      'Free lanes exhausted must reach the paid lane and be refused, not silently succeed.',
    );
  });
});

test('a free lane that is broken rather than absent does not get laundered into a paid call', async () => {
  // If a lane throws something that is not its own LaneUnavailable — a bug in
  // our code, a bad argument — swallowing it would turn a defect into spend.
  await withEnv({
    LMSTUDIO_ENDPOINT: DEAD,
    PERPLEXITY_ENDPOINT: DEAD,
    [GATE_ENV]: GATE_VALUE, // paid lane OPEN, so only correct propagation keeps us out of it
  }, async () => {
    await assert.rejects(
      () => routedChat({ profile: 'repo_surgery', messages: [], silent: true }),
      (err) => {
        assert.match(
          err.message, /messages array is required/,
          `Expected the argument error to propagate, got: ${err.message}`,
        );
        return true;
      },
      'A programming error inside a free lane was swallowed and became a billed call.',
    );
  });
});
