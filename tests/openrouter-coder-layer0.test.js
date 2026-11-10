'use strict';

/**
 * The coder must try the free laptop before it tries the credit card.
 *
 * Symptom (#17949): a work request labelled `wr:code` produced only
 *
 *   ❌ OpenRouter coder failed for issue #17949.
 *   Error: Refusing to call a paid LLM API from "openrouter_coder":
 *   REVVEL_LLM_ALLOW_CLOUD is not set to "1".
 *
 * even on a machine with LM Studio running and answering. The cause was not the
 * gate. `.github/scripts/openrouter_coder.py` POSTed to OpenRouter directly and
 * asserted the spend gate as the first statement of that call, so the paid lane
 * was the *only* lane: a shut gate meant "fail", when it should have meant "use
 * Layer 0". `scripts/local_llm.py` had held the LM Studio -> Ollama ->
 * OpenRouter cascade since #17849, and this caller never used it — the lesson
 * recorded in learnings.md on 2026-08-21, that shared code is not shared until
 * something other than its original caller uses it.
 *
 * So the first test below is the regression: gate shut, LM Studio answering,
 * and the run must succeed for free. Against the old script it fails with the
 * message above. The second test holds the other direction — with no local lane
 * reachable and the gate still shut, the run must fail and say so, because
 * "fall back to Layer 0" must not become "spend quietly".
 */

const test = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');

const execFileAsync = promisify(execFile);

const CODER = path.join(__dirname, '..', '.github', 'scripts', 'openrouter_coder.py');

/**
 * The interpreter to spawn, found by *running* candidates rather than looking
 * them up. On Windows both `python3` and `python` resolve to Microsoft Store
 * stubs that sit on PATH, print "Python was not found" and exit 9009 — so a
 * PATH lookup succeeds and the spawn fails. PYTHON=... overrides.
 */
function pythonBin() {
  if (process.env.PYTHON) return process.env.PYTHON;
  for (const candidate of ['python3', 'python', 'py']) {
    const probe = spawnSync(candidate, ['-c', ''], { stdio: 'ignore' });
    if (!probe.error && probe.status === 0) return candidate;
  }
  return null;
}

/**
 * Stand-in for LM Studio's OpenAI-compatible server. Records what it was asked
 * for so the test can assert which model the local lane received.
 */
function startLmStudioStub(reply, seen) {
  return http.createServer((req, res) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
    });
    req.on('end', () => {
      res.setHeader('Content-Type', 'application/json');

      if (req.url.endsWith('/models')) {
        res.end(JSON.stringify({ data: [{ id: 'local-coder-model' }] }));
        return;
      }

      let body = {};
      try {
        body = JSON.parse(raw || '{}');
      } catch {
        body = {};
      }
      seen.push({ url: req.url, model: body.model, prompt: JSON.stringify(body.messages || '') });

      res.end(
        JSON.stringify({
          model: 'local-coder-model',
          choices: [{ message: { content: reply } }],
          usage: { total_tokens: 7 },
        }),
      );
    });
  });
}

function listen(server) {
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server.address().port)));
}

function close(server) {
  return new Promise((resolve) => server.close(resolve));
}

/** A port nothing is listening on, so that lane fails fast instead of hanging. */
async function deadPort() {
  const probe = http.createServer(() => {});
  const port = await listen(probe);
  await close(probe);
  return port;
}

/**
 * Run the coder in a throwaway cwd. The script writes the model's files
 * relative to `Path.cwd()`, so this must never be the repository.
 *
 * Every variable the paid lane could read is blanked explicitly rather than
 * inherited: a developer with OPENROUTER_API_KEY and REVVEL_LLM_ALLOW_CLOUD
 * exported would otherwise have these tests spend real money and still pass.
 * GITHUB_TOKEN is blanked for the same reason in the other direction — the
 * failure path posts a comment to the issue, and a test must not comment on a
 * real repository.
 */
async function runCoder(env) {
  const bin = pythonBin();
  assert.ok(bin, 'no Python interpreter on this machine runs — cannot verify the cascade');

  const workdir = fs.mkdtempSync(path.join(os.tmpdir(), 'coder-layer0-'));
  const outputPath = path.join(workdir, 'result.json');

  const base = {
    GITHUB_REPOSITORY: 'example/repo',
    ISSUE_NUMBER: '17949',
    ISSUE_TITLE: 'Add a greeting module',
    ISSUE_BODY: 'Create greet.txt saying hello.',
    GITHUB_TOKEN: '',
    OPENROUTER_API_KEY: '',
    REVVEL_LLM_ALLOW_CLOUD: '',
    OPENROUTER_MODEL: '',
    LMSTUDIO_MODEL: '',
    REVVEL_LLM_TIMEOUT: '10',
  };

  let status = 0;
  let stdout = '';
  let stderr = '';
  try {
    const run = await execFileAsync(bin, [CODER, '--output-path', outputPath], {
      cwd: workdir,
      env: { ...process.env, ...base, ...env },
      encoding: 'utf8',
      timeout: 60000,
    });
    stdout = run.stdout;
    stderr = run.stderr;
  } catch (err) {
    status = err.code ?? 1;
    stdout = err.stdout?.toString() ?? '';
    stderr = err.stderr?.toString() ?? '';
  }

  const payload = fs.existsSync(outputPath)
    ? JSON.parse(fs.readFileSync(outputPath, 'utf8'))
    : null;

  return { status, stdout, stderr, payload, workdir };
}

const MODEL_REPLY = JSON.stringify({
  files: [{ path: 'greet.txt', content: 'hello from layer 0\n' }],
  commit_message: 'feat: add greeting',
});

test('the coder serves a work request from LM Studio with the spend gate shut', async () => {
  const seen = [];
  const lmstudio = startLmStudioStub(MODEL_REPLY, seen);
  const lmPort = await listen(lmstudio);
  const ollamaPort = await deadPort();

  let result;
  try {
    result = await runCoder({
      LMSTUDIO_ENDPOINT: `http://127.0.0.1:${lmPort}/v1`,
      OLLAMA_ENDPOINT: `http://127.0.0.1:${ollamaPort}`,
      // The pin the workflow passes. It names a cloud model, so it must reach
      // the paid lane only — see the model assertion below.
      WR_MODEL: 'anthropic/claude-opus-4.7',
    });
  } finally {
    await close(lmstudio);
  }

  assert.strictEqual(
    result.status,
    0,
    `the gate is shut but LM Studio was answering, so this must succeed for free.\n` +
      `stderr:\n${result.stderr}`,
  );

  // The exact symptom from #17949 must not appear when a local lane is up.
  assert.ok(
    !/REVVEL_LLM_ALLOW_CLOUD/.test(result.stderr),
    `refused on the spend gate despite a reachable local lane:\n${result.stderr}`,
  );

  assert.ok(result.payload, 'no result payload was written');
  assert.deepStrictEqual(result.payload.files_written, ['greet.txt']);
  assert.strictEqual(result.payload.commit_message, 'feat: add greeting');

  // The lane is recorded, so a free run and a billed run are told apart after
  // the fact rather than assumed (RVS-VERIFY-001).
  assert.strictEqual(result.payload.lane, 'lane-0-lmstudio');
  assert.strictEqual(result.payload.paid, false);

  // The model actually wrote the file, in the throwaway cwd. Line endings are
  // normalised because the script writes with Python's default newline
  // translation, so content arrives CRLF on Windows and LF on CI.
  assert.strictEqual(
    fs.readFileSync(path.join(result.workdir, 'greet.txt'), 'utf8').replace(/\r\n/g, '\n'),
    'hello from layer 0\n',
  );

  // WR_MODEL must NOT have been forwarded to the local lane. If it were, LM
  // Studio would be asked for "anthropic/claude-opus-4.7", 404, and the cascade
  // would fall through to the paid lane every single time — a local-first
  // router that always pays.
  const chat = seen.filter((hit) => !hit.url.endsWith('/models'));
  assert.ok(chat.length > 0, 'LM Studio stub was never asked to complete anything');
  for (const hit of chat) {
    assert.notStrictEqual(
      hit.model,
      'anthropic/claude-opus-4.7',
      'WR_MODEL leaked onto the local lane; LM Studio has no model by that name',
    );
  }
});

test('with no local lane reachable the shut gate still refuses to spend', async () => {
  const lmPort = await deadPort();
  const ollamaPort = await deadPort();

  const result = await runCoder({
    LMSTUDIO_ENDPOINT: `http://127.0.0.1:${lmPort}/v1`,
    OLLAMA_ENDPOINT: `http://127.0.0.1:${ollamaPort}`,
    WR_MODEL: 'anthropic/claude-opus-4.7',
  });

  assert.notStrictEqual(result.status, 0, 'every lane failed, so this must not report success');
  assert.strictEqual(result.payload, null, 'a failed run must not leave a result payload');
  assert.match(
    result.stderr,
    /REVVEL_LLM_ALLOW_CLOUD/,
    `the refusal must name the variable that would permit the spend:\n${result.stderr}`,
  );
});
