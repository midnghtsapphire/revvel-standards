'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const yaml = require('js-yaml');
const entry = import('../.circleci/scripts/pr-lifecycle-labels.mjs');
const env = {
  CIRCLE_BRANCH: 'main', CIRCLE_PROJECT_USERNAME: 'midnghtsapphire',
  CIRCLE_PROJECT_REPONAME: 'revvel-standards', GH_TOKEN: 'test-only-value',
  REVVEL_BADGE_AUTHORS: 'github-actions[bot],midnghtsapphire',
};

test('CircleCI refuses branch, PR, tag and wrong-repository invocations', async () => {
  const { lifecycleInvocation } = await entry;
  for (const override of [
    { CIRCLE_BRANCH: 'feature/change' }, { CIRCLE_BRANCH: undefined },
    { CIRCLE_PULL_REQUEST: 'https://github.com/example/repo/pull/1' },
    { CIRCLE_PULL_REQUESTS: 'https://github.com/example/repo/pull/1' },
    { CIRCLE_TAG: 'v1' }, { CIRCLE_PROJECT_USERNAME: 'other' },
    { CIRCLE_PROJECT_REPONAME: 'other' },
  ]) assert.throws(() => lifecycleInvocation({ ...env, ...override }));
});

test('CircleCI defaults to dry run and requires explicit valid apply setting', async () => {
  const { lifecycleInvocation } = await entry;
  assert.ok(!lifecycleInvocation(env).argv.includes('--apply'));
  assert.ok(!lifecycleInvocation({ ...env, REVVEL_LIFECYCLE_APPLY: 'false' }).apply);
  assert.ok(lifecycleInvocation({ ...env, REVVEL_LIFECYCLE_APPLY: 'true' }).argv.includes('--apply'));
  assert.throws(() => lifecycleInvocation({ ...env, REVVEL_LIFECYCLE_APPLY: 'yes' }));
});

test('CircleCI token precedence stays out of CLI arguments; missing setup fails', async () => {
  const { lifecycleInvocation } = await entry;
  const result = lifecycleInvocation({ ...env, REVVEL_LIFECYCLE_GITHUB_TOKEN: 'dedicated-test-token' });
  assert.equal(result.token, 'dedicated-test-token');
  assert.ok(!result.argv.join(' ').includes(result.token));
  assert.equal(lifecycleInvocation({ ...env, GH_TOKEN: '', GITHUB_TOKEN: 'fallback-test' }).token, 'fallback-test');
  assert.throws(() => lifecycleInvocation({ ...env, GH_TOKEN: '' }), /Missing GitHub credential/);
  assert.throws(() => lifecycleInvocation({ ...env, REVVEL_BADGE_AUTHORS: '' }), /REVVEL_BADGE_AUTHORS/);
});

test('CircleCI isolates maintenance from PR tests and serializes label writes', () => {
  const config = yaml.load(readFileSync('.circleci/config.yml', 'utf8'));
  assert.equal(config.parameters['run-pr-lifecycle'].default, false);
  for (const name of ['pr-workflow', 'main-workflow']) {
    assert.equal(config.workflows[name].unless, '<< pipeline.parameters.run-pr-lifecycle >>');
    assert.equal(config.workflows[name].jobs.length, 4);
  }
  const workflow = config.workflows['pr-lifecycle-maintenance'];
  assert.deepEqual(workflow.when.and, ['<< pipeline.parameters.run-pr-lifecycle >>', { equal: ['main', '<< pipeline.git.branch >>'] }]);
  const job = workflow.jobs[0]['pr-lifecycle-labels'];
  assert.equal(job.context, 'revvel-pr-lifecycle');
  assert.equal(job.filters.branches.only, 'main');
  assert.equal(job['serial-group'], '<< pipeline.project.slug >>/pr-lifecycle-labels');
});
