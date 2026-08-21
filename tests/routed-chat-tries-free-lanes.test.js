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
      // A key is set so the HTTP fallback is reachable: this test is about the
      // embedding model being skipped, not about which Perplexity path runs.
      // The keyless-vs-HTTP distinction is covered by its own tests below.
      PERPLEXITY_API_KEY: 'test-key',
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

test('with a key set, the lane falls back to the HTTP API and authenticates', async () => {
  // Superseded #17868's assertion that a *keyless* HTTP request is sent. That
  // was the wrong model: api.perplexity.ai requires a key, so a keyless request
  // there can only 401. The HTTP path is the keyed fallback, and when it runs
  // it must actually authenticate.
  const pplx = await stubServer({ models: ['sonar'], reply: 'perplexity answer' });
  try {
    await withEnv({
      LMSTUDIO_ENDPOINT: DEAD,
      PERPLEXITY_ENDPOINT: `${pplx.url}/chat/completions`,
      PERPLEXITY_API_KEY: 'test-key',
      [GATE_ENV]: undefined,
    }, async () => {
      const result = await routedChat({ profile: 'repo_surgery', messages: MESSAGES, silent: true });
      assert.strictEqual(result.content, 'perplexity answer');
      assert.strictEqual(result.lane, 'lane-2-perplexity-keyless');
      assert.strictEqual(result.keyless, false, 'Lane reported itself keyless while using a key.');
    });
    assert.strictEqual(pplx.hits.length, 1, 'Perplexity was not called exactly once.');
    assert.strictEqual(pplx.hits[0].method, 'POST');
    assert.strictEqual(pplx.hits[0].auth, 'Bearer test-key',
      'The keyed fallback must send the key it was given.');
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

/**
 * Added in #17870, after the lane merged in #17868 turned out to be the wrong
 * implementation of "keyless".
 *
 * That version POSTed to api.perplexity.ai with no Authorization header and
 * called it keyless. The official API requires a key, so that path could only
 * ever 401 — it was a lane that executed, which is better than the label it
 * replaced, but it could never actually answer.
 *
 * The repo already had the real thing and I missed it: `callPerplexityNoKey`
 * in scripts/perplexity-research-issue.js shells out to the
 * `helallao/perplexity-ai` Python package, which needs no key of any kind.
 * `config/routing-failover.yml`'s "keyless Perplexity" has always meant that.
 *
 * These tests pin the correction so the wrong lane cannot come back.
 */

const { execFileSync } = require('node:child_process');

test('the keyless bridge has exactly one copy, shared by both callers', () => {
  // Two inline copies would drift, and the drift would stay invisible until
  // one of them stopped matching the installed Python package.
  const fs2 = require('node:fs');
  const path2 = require('node:path');
  const scripts = path2.join(__dirname, '..', 'scripts');
  const owners = fs2
    .readdirSync(scripts)
    .filter((f) => f.endsWith('.js'))
    .filter((f) => /const NO_KEY_BRIDGE\s*=\s*`/.test(fs2.readFileSync(path2.join(scripts, f), 'utf8')));

  assert.deepStrictEqual(
    owners,
    ['perplexity-no-key-bridge.js'],
    'The Python bridge source must be defined in exactly one module. Found it ' +
      `defined in: ${owners.join(', ')}`,
  );
});

test('the shared bridge stays in step with the research script that used to own it', () => {
  const bridge = require('../scripts/perplexity-no-key-bridge');
  assert.strictEqual(bridge.BRIDGE_MODEL, 'sonar',
    'CONFIG.model was "sonar" when the bridge was extracted; a silent change ' +
    'here would send the research agent to a different model than before.');
  assert.strictEqual(bridge.BRIDGE_FALLBACK, 'auto');
  assert.match(bridge.NO_KEY_INSTALL_HINT, /helallao\/perplexity-ai/,
    'The install hint must name the package that actually provides the keyless lane.');
  assert.match(bridge.NO_KEY_BRIDGE, /from perplexity import/,
    'The bridge must still import the Python package; an empty or truncated ' +
    'extraction would fail only at runtime, on a real request.');
});

test('the keyless lane prefers the bridge and never sends a keyless HTTP request', async () => {
  // With no key set, the HTTP path can only 401 — so it must not be attempted.
  // A stub server standing in for api.perplexity.ai must receive nothing.
  const pplx = await stubServer({ models: ['sonar'], reply: 'should never be used' });
  try {
    await withEnv({
      LMSTUDIO_ENDPOINT: DEAD,
      PERPLEXITY_ENDPOINT: `${pplx.url}/chat/completions`,
      PERPLEXITY_API_KEY: undefined,
      [GATE_ENV]: undefined,
    }, async () => {
      // python3 exists here but the perplexity package does not, so the bridge
      // fails and — with no key — the lane must stop rather than fall to HTTP.
      await assert.rejects(
        () => routedChat({ profile: 'repo_surgery', messages: MESSAGES, silent: true }),
        (err) => {
          assert.strictEqual(err.name, 'CloudSpendBlockedError',
            `Expected to reach the gated paid lane, got ${err.name}: ${err.message}`);
          return true;
        },
      );
    });
    assert.strictEqual(
      pplx.hits.length, 0,
      'A keyless HTTP request was sent to the Perplexity API. Without a key that ' +
        'can only 401 — the keyless path is the Python bridge, not this endpoint.',
    );
  } finally {
    await pplx.close();
  }
});

test('a missing bridge reports the install hint, not a bare failure', async () => {
  // "Not installed" and "refused" are different facts and only one is actionable.
  const lane = require('../scripts/perplexity-lane');
  await withEnv({ PERPLEXITY_API_KEY: undefined }, async () => {
    await assert.rejects(
      () => lane.chat({ messages: MESSAGES }),
      (err) => {
        assert.strictEqual(err.name, 'PerplexityLaneUnavailable');
        assert.match(err.message, /helallao\/perplexity-ai/,
          `The failure must say how to install the bridge. Got: ${err.message}`);
        return true;
      },
    );
  });
});

void execFileSync;
