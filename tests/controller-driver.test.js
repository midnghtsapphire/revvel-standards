'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const { listRuns, reassignWorkflow } = require('../scripts/controller/controller');

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

test('reassignWorkflow: no workflow path is skipped cleanly', async () => {
  const out = await reassignWorkflow({ id: 9, ref: 'main' }, () => Promise.resolve(null));
  assert.equal(out, 'reassign-skipped(no-workflow)');
});
