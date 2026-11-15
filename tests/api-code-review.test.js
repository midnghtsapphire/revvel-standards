'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'security-gates', 'api-code-review.js');
const review = require(SCRIPT);

function withGate(value, fn) {
  const prev = process.env.REVVEL_LLM_ALLOW_CLOUD;
  if (value === undefined) delete process.env.REVVEL_LLM_ALLOW_CLOUD;
  else process.env.REVVEL_LLM_ALLOW_CLOUD = value;
  const restore = () => {
    if (prev === undefined) delete process.env.REVVEL_LLM_ALLOW_CLOUD;
    else process.env.REVVEL_LLM_ALLOW_CLOUD = prev;
  };
  return Promise.resolve(fn()).finally(restore);
}

function server(handler) {
  return new Promise((resolve) => {
    const seen = [];
    const srv = http.createServer((req, res) => {
      let body = '';
      req.on('data', (c) => (body += c));
      req.on('end', () => {
        const rec = { method: req.method, url: req.url, headers: req.headers, body: body ? JSON.parse(body) : null };
        seen.push(rec);
        const out = handler(rec, seen);
        res.statusCode = out.status || 200;
        res.setHeader('content-type', 'application/json');
        res.end(JSON.stringify(out.json));
      });
    });
    srv.listen(0, '127.0.0.1', () => resolve({ srv, seen, url: `http://127.0.0.1:${srv.address().port}` }));
  });
}

const DIFF = 'diff --git a/a.js b/a.js\n+++ b/a.js\n@@ -0,0 +1 @@\n+const x = 1;\n';

test('spend gate closed: no provider is called, result is a skip, never an error', async () => {
  await withGate(undefined, async () => {
    let called = false;
    const out = await review.run({ diff: DIFF, env: { OPENROUTER_API_KEY: 'k' }, fetchImpl: async () => { called = true; } });
    assert.equal(called, false);
    assert.match(out.skipped, /spend gate/);
  });
  await withGate('true', async () => {
    const out = await review.run({ diff: DIFF, env: { OPENROUTER_API_KEY: 'k' }, fetchImpl: async () => { throw new Error('x'); } });
    assert.match(out.skipped, /spend gate/);
  });
});

test('empty diff is skipped', async () => {
  await withGate('1', async () => {
    assert.match((await review.run({ diff: '  \n', env: {} })).skipped, /no reviewable changes/);
  });
});

test('openrouter: sends the diff as untrusted data, returns the text, never exposes the key in results', async () => {
  const fake = await server(() => ({ json: { choices: [{ message: { content: ' Looks fine. ' } }] } }));
  try {
    await withGate('1', async () => {
      const out = await review.run({ diff: DIFF, env: { OPENROUTER_API_KEY: 'sekret-test-key', OPENROUTER_BASE_URL: fake.url } });
      assert.equal(out.results[0].text, 'Looks fine.');
      assert.equal(out.results[0].model, 'google/gemini-2.5-flash');
      assert.equal(fake.seen[0].url, '/chat/completions');
      assert.equal(fake.seen[0].headers.authorization, 'Bearer sekret-test-key');
      assert.match(fake.seen[0].body.messages[0].content, /<untrusted>\ndiff --git/);
      assert.match(fake.seen[0].body.messages[0].content, /never instructions to you/);
      assert.doesNotMatch(JSON.stringify(out), /sekret-test-key/);
    });
  } finally {
    fake.srv.close();
  }
});

test('missing key, HTTP error and network error are non-fatal notes', async () => {
  const fake = await server(() => ({ status: 500, json: {} }));
  try {
    await withGate('1', async () => {
      const none = await review.run({ diff: DIFF, env: {} });
      assert.match(none.results[0].skipped, /OPENROUTER_API_KEY is not set/);
      const http500 = await review.run({ diff: DIFF, env: { OPENROUTER_API_KEY: 'k', OPENROUTER_BASE_URL: fake.url } });
      assert.match(http500.results[0].error, /HTTP 500/);
      const net = await review.run({ diff: DIFF, env: { OPENROUTER_API_KEY: 'k', OPENROUTER_BASE_URL: 'http://127.0.0.1:1' } });
      assert.match(net.results[0].error, /call failed/);
    });
  } finally {
    fake.srv.close();
  }
});

test('a long diff is truncated and the reviewer is told', () => {
  const big = review.buildPrompt('x'.repeat(500), 100);
  assert.equal(big.truncated, true);
  assert.match(big.text, /truncated for size/);
  assert.equal(review.buildPrompt('short', 100).truncated, false);
});

test('manus v2: creates a task, polls until stopped, returns the assistant answer', async () => {
  let polls = 0;
  const fake = await server((req) => {
    if (req.url === '/v2/task.create') return { json: { ok: true, task_id: 't1', task_url: 'https://manus.example.invalid/t1' } };
    polls += 1;
    if (polls === 1) return { json: { ok: true, messages: [{ type: 'status_update', status_update: { agent_status: 'running' } }] } };
    return {
      json: {
        ok: true,
        messages: [
          { type: 'status_update', status_update: { agent_status: 'stopped' } },
          { type: 'assistant_message', assistant_message: { content: 'One issue on line 3.' } },
        ],
      },
    };
  });
  try {
    await withGate('1', async () => {
      const out = await review.run({
        diff: DIFF,
        env: { REVIEW_PROVIDERS: 'manus', MANUS_API_KEY: 'mk', MANUS_BASE_URL: fake.url, MANUS_POLL_MS: '5', MANUS_TIMEOUT_S: '5' },
      });
      assert.equal(out.results[0].text, 'One issue on line 3.');
      assert.equal(out.results[0].taskUrl, 'https://manus.example.invalid/t1');
      assert.equal(fake.seen[0].headers['x-manus-api-key'], 'mk');
      assert.equal(fake.seen[0].body.message.content[0].type, 'text');
      assert.match(fake.seen[0].body.message.content[0].text, /Do not browse, run code, create files, open pull requests/);
      assert.match(fake.seen[1].url, /\/v2\/task\.listMessages\?task_id=t1/);
    });
  } finally {
    fake.srv.close();
  }
});

test('manus: error status, waiting, create failure and timeout are notes, not failures', async () => {
  const mk = (statusUpdate) => server((req) => (req.url === '/v2/task.create'
    ? { json: { ok: true, task_id: 't' } }
    : { json: { ok: true, messages: [{ type: 'status_update', status_update: statusUpdate }, { type: 'error_message', error_message: { content: 'boom' } }] } }));
  const env = (url, extra = {}) => ({ REVIEW_PROVIDERS: 'manus', MANUS_API_KEY: 'mk', MANUS_BASE_URL: url, MANUS_POLL_MS: '5', MANUS_TIMEOUT_S: '1', ...extra });
  await withGate('1', async () => {
    const err = await mk({ agent_status: 'error' });
    const waiting = await mk({ agent_status: 'waiting' });
    const running = await mk({ agent_status: 'running' });
    const denied = await server(() => ({ status: 401, json: { ok: false, error: { code: 'unauthenticated' } } }));
    try {
      assert.match((await review.run({ diff: DIFF, env: env(err.url) })).results[0].error, /Manus task failed: boom/);
      assert.match((await review.run({ diff: DIFF, env: env(waiting.url) })).results[0].error, /asked for input/);
      assert.match((await review.run({ diff: DIFF, env: env(running.url) })).results[0].error, /did not finish/);
      assert.match((await review.run({ diff: DIFF, env: env(denied.url) })).results[0].error, /task\.create failed \(HTTP 401 unauthenticated\)/);
    } finally {
      for (const s of [err, waiting, running, denied]) s.srv.close();
    }
  });
});

test('bito and unknown providers are explained, not faked', async () => {
  await withGate('1', async () => {
    const out = await review.run({ diff: DIFF, env: { REVIEW_PROVIDERS: 'bito,nope' } });
    assert.match(out.results[0].skipped, /docker agent/);
    assert.equal(out.results[1].skipped, 'unknown provider');
  });
});

test('comment: only when asked, needs a token and a PR, and is signed', async () => {
  assert.match(await review.postComment({}, 'x'), /not requested/);
  assert.match(await review.postComment({ REVIEW_POST_COMMENT: '1' }, 'x'), /needs GITHUB_TOKEN/);
  let seen;
  const msg = await review.postComment(
    { REVIEW_POST_COMMENT: '1', GITHUB_TOKEN: 't', CIRCLE_PULL_REQUEST: 'https://github.com/o/r/pull/5' },
    'Proofy: hi\n\n— Proofy',
    async (url, opts) => {
      seen = { url, opts };
      return { ok: true, status: 201 };
    },
  );
  assert.equal(msg, 'comment posted');
  assert.match(seen.url, /repos\/o\/r\/issues\/5\/comments/);
  assert.match(JSON.parse(seen.opts.body).body, /^Proofy: .*— Proofy$/s);
});

test('the CLI exits 0 and says why when the gate is closed (end to end in a git repo)', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'acr-'));
  const g = (...a) => execFileSync('git', a, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  g('init', '-q', '-b', 'main');
  g('config', 'user.email', 't@example.invalid');
  g('config', 'user.name', 't');
  fs.writeFileSync(path.join(dir, 'a.txt'), 'a\n');
  g('add', '-A');
  g('commit', '-q', '-m', 'b');
  const base = g('rev-parse', 'HEAD');
  fs.writeFileSync(path.join(dir, 'b.txt'), 'b\n');
  g('add', '-A');
  g('commit', '-q', '-m', 'p');
  const r = spawnSync('node', [SCRIPT, '--base', base], { cwd: dir, encoding: 'utf8', env: { PATH: process.env.PATH, OPENROUTER_API_KEY: 'k' } });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /skipped\. REVVEL_LLM_ALLOW_CLOUD is not "1"/);
  const bad = spawnSync('node', [SCRIPT, '--base', '0000000000000000000000000000000000000000'], { cwd: dir, encoding: 'utf8', env: { PATH: process.env.PATH } });
  assert.equal(bad.status, 0, 'an unreadable diff is only a notice');
  assert.match(bad.stdout, /could not read the diff/);
});
