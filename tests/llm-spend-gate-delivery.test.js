'use strict';

// 2026-11-15: inherited delivery-site regressions. No detector exemptions change.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const vm = require('node:vm');
const YAML = require('yaml');
const { pythonBinOrThrow } = require('../scripts/lib/python-bin.js');
const ROOT = path.join(__dirname, '..');

function dispatch(route, gate, key, failure = false) {
  const env = {
    ...process.env,
    GH_TOKEN: 'offline-test-token', ISSUE_NUMBER: '123', REPO: 'offline/repo',
    FORCED_ROUTE: route, OPENROUTER_API_KEY: '', MANUS_API_KEY: '',
    MOCK_PROVIDER_FAILURE: failure ? '1' : '0',
  };
  delete env.REVVEL_LLM_ALLOW_CLOUD;
  if (gate !== undefined) env.REVVEL_LLM_ALLOW_CLOUD = gate;
  if (key) env[route === 'roo' ? 'OPENROUTER_API_KEY' : 'MANUS_API_KEY'] = 'offline-test-key';
  const run = spawnSync(process.execPath, [
    '--import', path.join(__dirname, 'fixtures/spend-dispatch-offline.mjs'),
    path.join(ROOT, 'scripts/wr_dispatch.mjs'),
  ], { cwd: ROOT, env, encoding: 'utf8', timeout: 10000 });
  assert.ifError(run.error);
  const line = run.stdout.split('\n').find((s) => s.startsWith('OFFLINE_RECEIPT '));
  assert.ok(line, `Actual dispatcher must execute the offline fixture: ${run.stderr}`);
  return { ...run, receipt: JSON.parse(line.slice('OFFLINE_RECEIPT '.length)) };
}

test('PoT Python spend gate executes five offline unittest regressions', () => {
  const run = spawnSync(pythonBinOrThrow('offline spend-gate tests'), ['tests/test_spend_gate_delivery.py'], {
    cwd: ROOT, env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' },
    encoding: 'utf8', timeout: 10000,
  });
  assert.ifError(run.error);
  assert.equal(run.status, 0, run.stderr);
  assert.match(run.stderr, /Ran 5 tests/);
  assert.match(run.stderr, /\bOK\b/);
});

for (const gate of [undefined, '0', '', 'true', 'yes', 'on']) {
  test(`Roo closed gate ${JSON.stringify(gate)} never calls a paid provider or retries`, () => {
    const run = dispatch('roo', gate, true);
    assert.equal(run.status, 0, run.stderr);
    assert.equal(run.receipt.openrouter, 0);
    assert.equal(run.receipt.manus, 0);
    assert.equal(run.receipt.packs.length, 1);
    assert.match(run.receipt.packs[0], /Cloud spend refused/);
    assert.match(run.receipt.packs[0], /Implement the offline gate regression/);
    assert.doesNotMatch(run.receipt.packs[0], /OFFLINE MOCK plan/);
    assert.match(run.stderr, /no retry/);
  });
}

for (const gate of ['0', '1']) {
  test(`Roo missing key with gate ${gate} keeps its honest manual fallback`, () => {
    const run = dispatch('roo', gate, false);
    assert.equal(run.status, 0, run.stderr);
    assert.equal(run.receipt.openrouter, 0);
    assert.equal(run.receipt.manus, 0);
    assert.equal(run.receipt.packs.length, 1);
    assert.match(run.receipt.packs[0], /OpenRouter key not set/);
  });
}

test('Roo open gate consumes one mock response and no real provider', () => {
  const run = dispatch('roo', '1', true);
  assert.equal(run.status, 0, run.stderr);
  assert.equal(run.receipt.openrouter, 1);
  assert.equal(run.receipt.manus, 0);
  assert.match(run.receipt.packs[0], /OFFLINE MOCK plan/);
});

test('Roo mock provider refusal writes a manual pack without paid retry', () => {
  const run = dispatch('roo', '1', true, true);
  assert.equal(run.status, 0, run.stderr);
  assert.equal(run.receipt.openrouter, 1);
  assert.match(run.receipt.packs[0], /write the task plan by hand/);
  assert.doesNotMatch(run.receipt.packs[0], /OFFLINE MOCK plan/);
});

for (const gate of [undefined, '0', 'true']) {
  test(`Manus closed gate ${JSON.stringify(gate)} is terminal before paid task creation`, () => {
    const run = dispatch('manus', gate, true);
    assert.equal(run.status, 1);
    assert.match(run.stderr, /CloudSpendBlockedError/);
    assert.match(run.stderr, /wr_dispatch.manus/);
    assert.equal(run.receipt.manus, 0);
    assert.equal(run.receipt.openrouter, 0);
    assert.equal(run.receipt.comments.length, 0);
  });
}

for (const gate of ['0', '1']) {
  test(`Manus missing key with gate ${gate} does not create a paid task`, () => {
    const run = dispatch('manus', gate, false);
    assert.equal(run.status, 1);
    assert.equal(run.receipt.manus, 0);
    assert.equal(run.receipt.openrouter, 0);
  });
}

test('Manus open gate creates only one mock task', () => {
  const run = dispatch('manus', '1', true);
  assert.equal(run.status, 0, run.stderr);
  assert.equal(run.receipt.manus, 1);
  assert.equal(run.receipt.openrouter, 0);
  assert.match(run.receipt.comments[0], /offline-mock-task/);
});

const source = fs.readFileSync(path.join(ROOT, '.github/workflows/opencode.yml'), 'utf8');
const workflow = YAML.parse(source);
const SHA = '77fc88c8ade8e5a620ebbe1197f3a572d29ae91a';
const contexts = {
  'opencode-comment': {
    event_name: 'issue_comment',
    event: { comment: { body: '/opencode offline test', author_association: 'OWNER' } },
  },
  'opencode-label': { event_name: 'issues', event: { label: { name: 'opencode' } } },
  'opencode-manual': { event_name: 'workflow_dispatch', event: {} },
};
function evaluate(expression, github, gate) {
  // Evaluate these exact simple GitHub expressions offline, with only the two
  // GitHub functions present in this workflow. Never executes the action itself.
  const vars = { REVVEL_LLM_ALLOW_CLOUD: gate === undefined ? '' : gate };
  return vm.runInNewContext(expression, {
    github, vars, fromJSON: JSON.parse,
    contains: (value, item) => value.includes(item),
  }, { timeout: 1000 });
}

for (const [name, github] of Object.entries(contexts)) {
  test(`${name} preserves its trigger AND gates the pinned credential-bearing action`, () => {
    const job = workflow.jobs[name];
    const action = job.steps.find((s) => s.name === 'Run OpenCode');
    assert.equal(action.uses, `anomalyco/opencode/github@${SHA}`);
    assert.equal(action.with.use_github_token, true);
    assert.equal(action.with.share, false);
    assert.match(job.if, /&& vars\.REVVEL_LLM_ALLOW_CLOUD == '1'/);
    assert.equal(action.if, "vars.REVVEL_LLM_ALLOW_CLOUD == '1'");
    let mockProviderCalls = 0;
    for (const gate of [undefined, '', '0', 'true', 'yes']) {
      if (evaluate(job.if, github, gate) && evaluate(action.if, github, gate)) mockProviderCalls += 1;
    }
    assert.equal(mockProviderCalls, 0, 'closed gate must prevent action/credential delivery');
    if (evaluate(job.if, github, '1') && evaluate(action.if, github, '1')) mockProviderCalls += 1;
    assert.equal(mockProviderCalls, 1, 'open gate runs only the offline action mock');
    assert.equal(evaluate(job.if, { ...github, event_name: 'push' }, '1'), false);
    if (name === 'opencode-comment') {
      const foreign = { ...github, event: { comment: { ...github.event.comment, author_association: 'NONE' } } };
      assert.equal(evaluate(job.if, foreign, '1'), false);
      const noCommand = { ...github, event: { comment: { ...github.event.comment, body: 'ordinary comment' } } };
      assert.equal(evaluate(job.if, noCommand, '1'), false);
    }
    if (name === 'opencode-label') {
      assert.equal(evaluate(job.if, { ...github, event: { label: { name: 'other' } } }, '1'), false);
    }
  });
}

test('OpenCode action pin provenance and original mutable refs remain visible', () => {
  assert.equal((source.match(/# uses: anomalyco\/opencode\/github@latest/g) || []).length, 3);
  const tag = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/governance-spend/receipts/opencode-latest-tag.json')));
  assert.equal(tag.object.type, 'commit');
  assert.equal(tag.object.sha, SHA);
  const metadata = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/governance-spend/receipts/opencode-action-metadata.json')));
  assert.equal(metadata.path, 'github/action.yml');
  assert.equal(metadata.html_url, `https://github.com/anomalyco/opencode/blob/${SHA}/github/action.yml`);
  const upstream = YAML.parse(Buffer.from(metadata.content, 'base64').toString('utf8'));
  assert.ok(upstream.inputs.model);
  assert.ok(upstream.inputs.use_github_token);
  assert.ok(upstream.inputs.share);
  assert.equal(upstream.runs.using, 'composite');
});
