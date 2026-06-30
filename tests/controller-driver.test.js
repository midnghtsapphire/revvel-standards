'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { listRuns, reassignWorkflow, loadPriorReassigns } = require('../scripts/controller/controller');

function writeFeed(feed) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ctrl-'));
  fs.writeFileSync(path.join(dir, 'controller-status.json'), JSON.stringify(feed));
  return dir;
}

test('listRuns pages past 100 so a large fleet is not truncated', async () => {
  const page1 = Array.from({ length: 100 }, (_, i) => ({ id: i, status: 'in_progress' }));
  const page2 = Array.from({ length: 37 }, (_, i) => ({ id: 100 + i, status: 'in_progress' }));
  const pagesSeen = [];
  const api = (url) => {
    const page = Number((url.match(/[?&]page=(\d+)/) || [])[1] || 1); // precise: not fooled by per_page=100
    pagesSeen.push(page);
    if (page === 1) return Promise.resolve({ workflow_runs: page1 });
    if (page === 2) return Promise.resolve({ workflow_runs: page2 });
    return Promise.resolve({ workflow_runs: [] });
  };
  const runs = await listRuns('in_progress', api);
  assert.equal(runs.length, 137); // both pages collected
  assert.deepEqual(pagesSeen, [1, 2]); // paged once more, then stopped on the short page
});

test('listRuns stops on the first short page', async () => {
  let pages = 0;
  const api = () => { pages += 1; return Promise.resolve({ workflow_runs: [{ id: 1, status: 'in_progress' }] }); };
  const runs = await listRuns('queued', api);
  assert.equal(runs.length, 1);
  assert.equal(pages, 1); // a <100 page is the last page
});

test('reassignWorkflow: succeeds with the model input', async () => {
  const api = () => Promise.resolve(null); // 204 success
  const out = await reassignWorkflow({ path: '.github/workflows/x.yml', ref: 'main', nextModel: 'm1' }, api);
  assert.equal(out, 'reassigned');
});

test('reassignWorkflow: retries without inputs when the model input is rejected', async () => {
  let n = 0;
  const api = () => { n += 1; if (n === 1) return Promise.reject(new Error('unexpected input model')); return Promise.resolve(null); };
  const out = await reassignWorkflow({ path: '.github/workflows/x.yml', ref: 'main', nextModel: 'm1' }, api);
  assert.equal(out, 'reassigned(no-model-input)');
});

test('reassignWorkflow: both attempts fail -> reassign-failed (never a false success)', async () => {
  const errs = [new Error('input required'), new Error('workflow not found')];
  let n = 0;
  const api = () => Promise.reject(errs[n++] || errs[1]);
  const out = await reassignWorkflow({ path: '.github/workflows/x.yml', ref: 'main', nextModel: 'm1' }, api);
  assert.match(out, /^reassign-failed:/);
});

test('reassignWorkflow: a non-422 first error does NOT retry on the default model', async () => {
  let n = 0;
  const api = () => { n += 1; return Promise.reject(new Error('429 rate limit exceeded')); };
  const out = await reassignWorkflow({ path: '.github/workflows/x.yml', ref: 'main', nextModel: 'm1' }, api);
  assert.match(out, /^reassign-failed:/);
  assert.equal(n, 1); // did not silently relaunch without the model input
});

test('loadPriorReassigns persists BOTH reassign and escalate entries from a real feed', () => {
  const dir = writeFeed({
    preempt_enabled: true,
    preemptions: [
      { path: '.github/workflows/a.yml', planned: 'reassign', reassign_count: 1, tried_models: ['m1'] },
      { path: '.github/workflows/b.yml', planned: 'escalate', reassign_count: 2, tried_models: ['m1', 'm2'] },
    ],
  });
  const map = loadPriorReassigns(dir);
  assert.equal(map['.github/workflows/a.yml'].count, 1);
  assert.deepEqual(map['.github/workflows/b.yml'].tried, ['m1', 'm2']); // escalated stays escalated next tick
});

test('loadPriorReassigns ignores a dry-run feed (state must not advance from a dry scan)', () => {
  const dir = writeFeed({
    preempt_enabled: false,
    preemptions: [{ path: '.github/workflows/a.yml', planned: 'reassign', reassign_count: 1, tried_models: ['m1'] }],
  });
  assert.deepEqual(loadPriorReassigns(dir), {});
});

test('reassignWorkflow: no workflow path is skipped cleanly', async () => {
  const out = await reassignWorkflow({ id: 9, ref: 'main' }, () => Promise.resolve(null));
  assert.equal(out, 'reassign-skipped(no-workflow)');
});
