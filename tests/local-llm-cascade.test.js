'use strict';

/**
 * Layer 0 has to actually be Layer 0.
 *
 * `wr/agents/HIERARCHY.md` says the router defaults to local LLMs and targets
 * 60-70% of work there. In practice the cascade existed only inside
 * `scripts/wr_rewrite.py`, and every other caller in the repo went straight to
 * OpenRouter — which is how ~270 scheduled cloud calls/day accumulated
 * unnoticed (#17849).
 *
 * `scripts/local_llm.py` is that cascade, extracted. These tests exercise it
 * against stub HTTP servers standing in for LM Studio and Ollama, so the
 * behaviour is checked rather than assumed:
 *
 *   1. When LM Studio answers, the completion comes back tagged lane-0 and the
 *      other lanes are never contacted.
 *   2. When LM Studio is down, Ollama takes over — still local, still free.
 *   3. When BOTH local lanes are down, the paid lane is REFUSED by default.
 *      This is the property that turns "the laptop was asleep" into an error
 *      instead of a bill, so it is asserted from both directions: refused with
 *      the gate unset, and reached only once the gate is explicitly opened.
 *   4. A caller may narrow the gate but never widen it.
 */

const test = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const path = require('node:path');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');

const execFileAsync = promisify(execFile);

const SCRIPT = path.join(__dirname, '..', 'scripts', 'local_llm.py');

/** Minimal stand-in for LM Studio's OpenAI-compatible server. */
function startLmStudioStub(reply, hits) {
  const server = http.createServer((req, res) => {
    hits.push(`lmstudio:${req.url}`);
    res.setHeader('Content-Type', 'application/json');
    if (req.url.endsWith('/models')) {
      res.end(JSON.stringify({ data: [{ id: 'local-test-model' }] }));
      return;
    }
    res.end(JSON.stringify({
      model: 'local-test-model',
      choices: [{ message: { content: reply } }],
      usage: { total_tokens: 42 },
    }));
  });
  return server;
}

/** Minimal stand-in for Ollama's native API. */
function startOllamaStub(reply, hits) {
  const server = http.createServer((req, res) => {
    hits.push(`ollama:${req.url}`);
    res.setHeader('Content-Type', 'application/json');
    if (req.url.endsWith('/api/tags')) {
      res.end(JSON.stringify({ models: [{ name: 'gemma3' }] }));
      return;
    }
    res.end(JSON.stringify({ response: reply }));
  });
  return server;
}

function listen(server) {
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve(server.address().port));
  });
}

function close(server) {
  return new Promise((resolve) => server.close(resolve));
}

/**
 * Run the CLI. Returns {status, stdout, stderr} without throwing.
 *
 * Must be async: execFileSync blocks Node's event loop, so the in-process stub
 * servers below could never answer the child's request and every local lane
 * would look unreachable.
 */
async function runAsk(env, prompt = 'hello') {
  try {
    const { stdout, stderr } = await execFileAsync('python3', [SCRIPT, 'ask', prompt], {
      env: { ...process.env, ...env },
      encoding: 'utf8',
      timeout: 30000,
    });
    return { status: 0, stdout, stderr };
  } catch (err) {
    return {
      status: err.code ?? 1,
      stdout: err.stdout?.toString() ?? '',
      stderr: err.stderr?.toString() ?? '',
    };
  }
}

/** Same, for the `doctor` subcommand. */
async function runDoctor(env) {
  try {
    const { stdout } = await execFileAsync('python3', [SCRIPT, 'doctor'], {
      env: { ...process.env, ...env },
      encoding: 'utf8',
      timeout: 30000,
    });
    return { status: 0, stdout };
  } catch (err) {
    return { status: err.code ?? 1, stdout: err.stdout?.toString() ?? '' };
  }
}

/**
 * Unreachable endpoints. Port 1 is reserved and refuses connections fast, so
 * the "lane is down" path is exercised without waiting on a timeout.
 */
const DEAD = {
  LMSTUDIO_ENDPOINT: 'http://127.0.0.1:1/v1',
  OLLAMA_ENDPOINT: 'http://127.0.0.1:1',
};

test('LM Studio answers: result is lane-0 and no other lane is contacted', async () => {
  const hits = [];
  const lm = startLmStudioStub('LOCAL ANSWER', hits);
  const ollama = startOllamaStub('SHOULD NOT BE USED', hits);
  const lmPort = await listen(lm);
  const olPort = await listen(ollama);
  try {
    const r = await runAsk({
      LMSTUDIO_ENDPOINT: `http://127.0.0.1:${lmPort}/v1`,
      OLLAMA_ENDPOINT: `http://127.0.0.1:${olPort}`,
      REVVEL_LLM_ALLOW_CLOUD: '',
    });
    assert.strictEqual(r.status, 0, `expected success, got: ${r.stderr}`);
    assert.match(r.stdout, /LOCAL ANSWER/);
    assert.match(r.stderr, /lane-0-lmstudio/, 'must report the lane it used');
    assert.match(r.stderr, /free \(local\)/, 'must report that it cost nothing');
    assert.ok(
      !hits.some((h) => h.startsWith('ollama:')),
      `Ollama must not be contacted when LM Studio answers; hits: ${hits.join(', ')}`,
    );
  } finally {
    await close(lm);
    await close(ollama);
  }
});

test('LM Studio down: Ollama takes over, still local and free', async () => {
  const hits = [];
  const ollama = startOllamaStub('OLLAMA ANSWER', hits);
  const olPort = await listen(ollama);
  try {
    const r = await runAsk({
      LMSTUDIO_ENDPOINT: DEAD.LMSTUDIO_ENDPOINT,
      OLLAMA_ENDPOINT: `http://127.0.0.1:${olPort}`,
      REVVEL_LLM_ALLOW_CLOUD: '',
    });
    assert.strictEqual(r.status, 0, `expected success, got: ${r.stderr}`);
    assert.match(r.stdout, /OLLAMA ANSWER/);
    assert.match(r.stderr, /lane-0b-ollama/);
    assert.match(r.stderr, /free \(local\)/);
  } finally {
    await close(ollama);
  }
});

test('both local lanes down: the paid lane is REFUSED by default', async () => {
  const r = await runAsk({
    ...DEAD,
    REVVEL_LLM_ALLOW_CLOUD: '',
    OPENROUTER_API_KEY: 'sk-would-have-worked',
  });
  assert.strictEqual(r.status, 2, 'must exit 2 (refused), not 0 and not a crash');
  assert.match(r.stderr, /refus/i, 'must say it refused rather than failing vaguely');
  assert.match(
    r.stderr,
    /REVVEL_LLM_ALLOW_CLOUD/,
    'must name the gate so the operator knows how to open it deliberately',
  );
  assert.match(
    r.stderr,
    /local lanes were tried first/i,
    'must show the local failures, so a sleeping laptop is diagnosable',
  );
  assert.doesNotMatch(
    r.stdout,
    /\S/,
    'must not emit a completion it did not obtain',
  );
});

test('the gate must be exactly "1" — no truthy-looking value opens it', async () => {
  for (const value of ['true', 'yes', '0', 'TRUE', ' ']) {
    const r = await runAsk({
      ...DEAD,
      REVVEL_LLM_ALLOW_CLOUD: value,
      OPENROUTER_API_KEY: 'sk-would-have-worked',
    });
    assert.strictEqual(
      r.status,
      2,
      `REVVEL_LLM_ALLOW_CLOUD=${JSON.stringify(value)} must NOT open the paid lane`,
    );
  }
});

test('opening the gate reaches the cloud lane, and says it is billed', async () => {
  // No stub for OpenRouter: reaching it and failing on a bad key is proof the
  // gate opened. The assertion is that the refusal is gone, not that it worked.
  const r = await runAsk({
    ...DEAD,
    REVVEL_LLM_ALLOW_CLOUD: '1',
    OPENROUTER_API_KEY: 'sk-invalid-key-for-test',
  });
  assert.notStrictEqual(r.status, 2, 'must no longer be a refusal once opened');
  assert.doesNotMatch(
    r.stderr,
    /refusing to spend/,
    'the explicit opt-in must actually take effect',
  );
});

test('doctor exits non-zero when nothing can serve a request', async () => {
  // CLAUDE.md gotcha #6: the exit code must mean "the postcondition holds",
  // not "the tool finished". No lane up => nothing will run => non-zero.
  const r = await runDoctor({ ...DEAD, REVVEL_LLM_ALLOW_CLOUD: '' });
  assert.strictEqual(r.status, 1, 'doctor must fail when no lane can serve work');
});

test('doctor exits zero and names the local lane when LM Studio is up', async () => {
  const hits = [];
  const lm = startLmStudioStub('unused', hits);
  const lmPort = await listen(lm);
  try {
    const r = await runDoctor({
      LMSTUDIO_ENDPOINT: `http://127.0.0.1:${lmPort}/v1`,
      OLLAMA_ENDPOINT: DEAD.OLLAMA_ENDPOINT,
      REVVEL_LLM_ALLOW_CLOUD: '',
    });
    assert.strictEqual(r.status, 0, 'doctor must succeed when a local lane is up');
    assert.match(r.stdout, /lane-0-lmstudio/);
    assert.match(r.stdout, /local-test-model/, 'must list the loaded model');
    assert.match(r.stdout, /at no cost/);
  } finally {
    await close(lm);
  }
});

/**
 * The trap this repo already fell into once.
 *
 * `.github/workflows/wr-rewrite.yml` is the only workflow wired to Layer 0, and
 * all four of its recorded runs failed in ~23 seconds because no self-hosted
 * runner picked them up. The tempting "fix" is to switch it to `ubuntu-latest`
 * so it at least runs — at which point `LMSTUDIO_ENDPOINT: 127.0.0.1:1234`
 * points at an Azure VM's own loopback, every request falls through to
 * OpenRouter, and the workflow looks healthier while costing money on every run.
 *
 * A green workflow that silently stopped being Layer 0 is worse than a red one.
 */
test('workflows wired to LM Studio must stay on a self-hosted runner', () => {
  const fs = require('node:fs');
  const dir = path.join(__dirname, '..', '.github', 'workflows');
  const offenders = [];
  for (const name of fs.readdirSync(dir).filter((f) => /\.ya?ml$/.test(f))) {
    const text = fs.readFileSync(path.join(dir, name), 'utf8');
    const live = text
      .split('\n')
      .filter((l) => !/^\s*#/.test(l))
      .join('\n');
    if (!/LMSTUDIO_ENDPOINT/.test(live)) continue;
    // A loopback endpoint is only meaningful on a runner that IS the machine.
    if (!/127\.0\.0\.1|localhost/.test(live)) continue;
    if (!/runs-on:\s*(\[?\s*)?self-hosted/.test(live)) {
      offenders.push(name);
    }
  }
  assert.deepStrictEqual(
    offenders,
    [],
    'These workflows point LMSTUDIO_ENDPOINT at loopback but do not run on a ' +
      'self-hosted runner, so LM Studio is unreachable and every call falls ' +
      `through to the billed lane:\n  ${offenders.join('\n  ')}`,
  );
});

/**
 * The cascade must live in one place. It previously existed only inside
 * wr_rewrite.py, which is why no other caller in the repo ever tried Layer 0.
 */
test('wr_rewrite delegates to the shared cascade instead of reimplementing it', () => {
  const fs = require('node:fs');
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'scripts', 'wr_rewrite.py'),
    'utf8',
  );
  const live = source
    .split('\n')
    .filter((l) => !/^\s*#/.test(l))
    .join('\n');
  assert.match(live, /import local_llm/, 'must import the shared module');
  assert.match(
    live,
    /local_llm\.complete\(/,
    'rewrites must go through the shared cascade, not a private copy',
  );
  for (const dup of ['def call_lmstudio', 'def call_ollama']) {
    assert.doesNotMatch(
      live,
      new RegExp(dup),
      `${dup} must not be reimplemented here — that is what let Layer 0 drift`,
    );
  }
});

/**
 * An embedding model is not a chat model.
 *
 * LM Studio lists every loaded model in /v1/models — embedding models included.
 * The first version of `call_lmstudio` picked `loaded[0]`, so a user whose only
 * loaded model was `text-embedding-nomic-embed-text-v1.5` would have had that
 * id sent to /chat/completions and got back a provider error naming nothing
 * useful. Reported from a real setup, not imagined.
 */
test('LM Studio with only an embedding model reports why, not a generic failure', async () => {
  const hits = [];
  const server = http.createServer((req, res) => {
    hits.push(req.url);
    res.setHeader('Content-Type', 'application/json');
    if (req.url.endsWith('/models')) {
      res.end(JSON.stringify({
        data: [{ id: 'text-embedding-nomic-embed-text-v1.5' }],
      }));
      return;
    }
    res.end(JSON.stringify({ choices: [{ message: { content: 'should not happen' } }] }));
  });
  const port = await listen(server);
  try {
    const r = await runAsk({
      LMSTUDIO_ENDPOINT: `http://127.0.0.1:${port}/v1`,
      OLLAMA_ENDPOINT: DEAD.OLLAMA_ENDPOINT,
      REVVEL_LLM_ALLOW_CLOUD: '',
    });
    assert.notStrictEqual(r.status, 0, 'must not claim success');
    assert.match(r.stderr, /embedding/i, 'must name the actual problem');
    assert.match(
      r.stderr,
      /chat\/instruct|chat model/i,
      'must say what to load instead',
    );
    assert.ok(
      !hits.some((u) => u.includes('chat/completions')),
      `must not send an embedding model to the completions endpoint; hits: ${hits.join(', ')}`,
    );
  } finally {
    await close(server);
  }
});

test('doctor does not report a usable lane when only embeddings are loaded', async () => {
  const server = http.createServer((req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ data: [{ id: 'nomic-embed-text-v1.5' }] }));
  });
  const port = await listen(server);
  try {
    const r = await runDoctor({
      LMSTUDIO_ENDPOINT: `http://127.0.0.1:${port}/v1`,
      OLLAMA_ENDPOINT: DEAD.OLLAMA_ENDPOINT,
      REVVEL_LLM_ALLOW_CLOUD: '',
    });
    assert.strictEqual(r.status, 1, 'a lane that cannot serve work is not OK');
    assert.match(r.stdout, /embedding/i, 'must say why');
  } finally {
    await close(server);
  }
});

/**
 * LM Studio 0.4.0 additions: token auth, and a native `/api/v1` surface for
 * model management.
 *
 * Both matter for the same reason — the two failures they prevent are the ones
 * that look like something else. A secured server answers 401, which the client
 * previously reported as "unreachable", sending you to check whether LM Studio
 * was running when it plainly was. And "the wrong model is loaded" is the most
 * common Layer 0 failure by far, so it needs a fix that does not require
 * clicking around a UI.
 */

/** Stub of LM Studio 0.4.0: token-gated, with a native load endpoint. */
function startSecuredStub(token, state, hits) {
  return http.createServer((req, res) => {
    hits.push(`${req.method} ${req.url} auth=${req.headers.authorization ?? 'none'}`);
    res.setHeader('Content-Type', 'application/json');
    if (req.headers.authorization !== `Bearer ${token}`) {
      res.writeHead(401);
      res.end(JSON.stringify({ error: 'unauthorized' }));
      return;
    }
    if (req.url.endsWith('/api/v1/models/load')) {
      let body = '';
      req.on('data', (c) => { body += c; });
      req.on('end', () => {
        state.loaded = JSON.parse(body || '{}').model;
        res.end(JSON.stringify({ ok: true, model: state.loaded }));
      });
      return;
    }
    if (req.url.endsWith('/models')) {
      res.end(JSON.stringify({ data: state.loaded ? [{ id: state.loaded }] : [] }));
      return;
    }
    res.end(JSON.stringify({
      model: state.loaded,
      choices: [{ message: { content: 'SECURED ANSWER' } }],
      usage: { total_tokens: 7 },
    }));
  });
}

test('a 401 from LM Studio says the token is missing, not that it is unreachable', async () => {
  const hits = [];
  const server = startSecuredStub('right-token', { loaded: 'gemma-3-4b-it' }, hits);
  const port = await listen(server);
  try {
    const r = await runAsk({
      LMSTUDIO_ENDPOINT: `http://127.0.0.1:${port}/v1`,
      LMSTUDIO_API_KEY: '', // deliberately absent
      OLLAMA_ENDPOINT: DEAD.OLLAMA_ENDPOINT,
      REVVEL_LLM_ALLOW_CLOUD: '',
    });
    assert.notStrictEqual(r.status, 0);
    assert.match(
      r.stderr,
      /LMSTUDIO_API_KEY/,
      'must name the variable to set — a bare "unreachable" sends you to check ' +
        'whether the server is running, which it is',
    );
  } finally {
    await close(server);
  }
});

test('with the token set, the secured server answers normally', async () => {
  const hits = [];
  const server = startSecuredStub('right-token', { loaded: 'gemma-3-4b-it' }, hits);
  const port = await listen(server);
  try {
    const r = await runAsk({
      LMSTUDIO_ENDPOINT: `http://127.0.0.1:${port}/v1`,
      LMSTUDIO_API_KEY: 'right-token',
      OLLAMA_ENDPOINT: DEAD.OLLAMA_ENDPOINT,
      REVVEL_LLM_ALLOW_CLOUD: '',
    });
    assert.strictEqual(r.status, 0, `expected success, got: ${r.stderr}`);
    assert.match(r.stdout, /SECURED ANSWER/);
    assert.ok(
      hits.every((h) => h.includes('auth=Bearer right-token')),
      `every request must carry the token; hits: ${hits.join(' | ')}`,
    );
  } finally {
    await close(server);
  }
});

test('`load` posts to the native /api/v1 surface, not the OpenAI-compatible one', async () => {
  const hits = [];
  const state = { loaded: null };
  const server = startSecuredStub('t', state, hits);
  const port = await listen(server);
  try {
    const { stdout } = await execFileAsync(
      'python3',
      [SCRIPT, 'load', 'gemma-3-4b-it'],
      {
        env: {
          ...process.env,
          LMSTUDIO_ENDPOINT: `http://127.0.0.1:${port}/v1`,
          LMSTUDIO_API_KEY: 't',
        },
        encoding: 'utf8',
        timeout: 30000,
      },
    );
    assert.match(stdout, /loaded: gemma-3-4b-it/);
    assert.strictEqual(state.loaded, 'gemma-3-4b-it', 'the server must have been told to load it');
    assert.ok(
      hits.some((h) => h.includes('/api/v1/models/load')),
      `load must use the native path; hits: ${hits.join(' | ')}`,
    );
  } finally {
    await close(server);
  }
});

test('a 404 on load explains the LM Studio version requirement', async () => {
  // Older builds have no /api/v1. The error has to say that, or it reads as
  // "loading is broken" rather than "your LM Studio predates this endpoint".
  const server = http.createServer((req, res) => {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'not found' }));
  });
  const port = await listen(server);
  try {
    let stderr = '';
    try {
      await execFileAsync('python3', [SCRIPT, 'load', 'x'], {
        env: { ...process.env, LMSTUDIO_ENDPOINT: `http://127.0.0.1:${port}/v1` },
        encoding: 'utf8',
        timeout: 30000,
      });
    } catch (err) {
      stderr = err.stderr?.toString() ?? '';
    }
    assert.match(stderr, /0\.4\.0/, 'must name the version that introduced /api/v1');
  } finally {
    await close(server);
  }
});
