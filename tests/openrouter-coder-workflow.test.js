'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const yaml = require('yaml');

const repoRoot = path.join(__dirname, '..');
const workflowPath = path.join(repoRoot, '.github', 'workflows', 'openrouter-coder.yml');
const coderScriptPath = path.join(repoRoot, '.github', 'scripts', 'openrouter_coder.py');

function loadWorkflow() {
  return yaml.parse(fs.readFileSync(workflowPath, 'utf8'));
}

function getOpenRouterRunStep(workflow) {
  return workflow.jobs.code.steps.find((step) => step.name === 'Run OpenRouter coder');
}

test('openrouter-coder workflow only starts from approved labels or manual dispatch', () => {
  const workflow = loadWorkflow();

  assert.ok(workflow.on.issues, 'issues trigger must remain enabled for approval labels');
  assert.deepStrictEqual(workflow.on.issues.types, ['labeled']);
  assert.ok(workflow.on.workflow_dispatch, 'manual dispatch must remain available');
  assert.ok(!Object.hasOwn(workflow.on, 'issue_comment'), 'issue_comment trigger must stay disabled');
  // Coder jobs need headroom for multi-file OpenRouter turns. WR #16889 pinned
  // this at exactly 45 to catch a silent drop back to 30 — but equality also
  // rejects a deliberate INCREASE, and #17777 raised every visiting-agent
  // workflow to 60, turning main red for a change that moved the value the
  // safe way. A floor catches the regression the pin exists for and lets the
  // headroom grow.
  assert.ok(
    workflow.jobs.code['timeout-minutes'] >= 45,
    `timeout-minutes is ${workflow.jobs.code['timeout-minutes']}; the floor is 45 (WR #16889)`,
  );
  assert.match(workflow.jobs.code.if, /spec-approved/);
  assert.match(workflow.jobs.code.if, /wr:code/);
});

test('openrouter-coder workflow invokes the checked-in coder script', () => {
  const workflow = loadWorkflow();
  const step = getOpenRouterRunStep(workflow);

  assert.ok(step, 'Run OpenRouter coder step must exist');
  assert.ok(fs.existsSync(coderScriptPath), 'the workflow must point at an existing coder script');
  assert.strictEqual(
    step.env.GITHUB_REPOSITORY,
    '${{ github.repository }}',
    'coder script needs GITHUB_REPOSITORY to comment on failures'
  );
  assert.match(step.run, /test -f \.github\/scripts\/openrouter_coder\.py/);
  assert.match(step.run, /python \.github\/scripts\/openrouter_coder\.py --output-path \/tmp\/openrouter-coder-result\.json/);
  assert.match(step.run, /test -s \/tmp\/openrouter-coder-result\.json/);
  assert.doesNotMatch(step.run, /python\s+scripts\/openrouter_coder\.py\b/);
  assert.doesNotMatch(step.run, /No openrouter_coder\.py script found; skipping/);
});

test('openrouter-coder workflow accepts dispatcher prompt input without rejecting dispatch', () => {
  const workflow = loadWorkflow();
  const inputs = workflow.on.workflow_dispatch.inputs;

  assert.strictEqual(inputs.issue_number.required, true);
  assert.strictEqual(inputs.prompt.required, false);
  assert.strictEqual(inputs.prompt.type, 'string');
});

test('openrouter-coder Actions job stays github-hosted and does not fake an LM Studio fallback', () => {
  const workflow = loadWorkflow();
  const source = fs.readFileSync(workflowPath, 'utf8');
  const live = source
    .split('\n')
    .filter((l) => !/^\s*#/.test(l))
    .join('\n');
  const step = getOpenRouterRunStep(workflow);

  assert.strictEqual(
    workflow.jobs.code['runs-on'],
    'ubuntu-latest',
    'Coder Actions is GitHub-hosted; ubuntu-latest CANNOT reach laptop LM Studio',
  );
  assert.ok(
    !Object.hasOwn(step.env || {}, 'REVVEL_LLM_ALLOW_CLOUD'),
    'do not open the spend gate on a runner that cannot see LM Studio',
  );
  assert.ok(
    !Object.hasOwn(step.env || {}, 'WR_MODEL'),
    'leaving WR_MODEL unset uses the cheap kimi-k2 default; setting opus burns the $16',
  );
  assert.doesNotMatch(live, /LMSTUDIO_ENDPOINT/);
  assert.doesNotMatch(live, /127\.0\.0\.1:1234/);
  assert.doesNotMatch(live, /localhost:1234/);
  assert.match(source, /CANNOT reach LM Studio/);
});

test('openrouter-coder script defaults to kimi-k2 and refuses LM Studio on github-hosted', () => {
  const source = fs.readFileSync(coderScriptPath, 'utf8');
  const { spawnSync } = require('node:child_process');

  assert.match(source, /DEFAULT_OPENROUTER_MODEL = "moonshotai\/kimi-k2"/);
  assert.doesNotMatch(
    source,
    /env\("WR_MODEL", "anthropic\/claude-opus-4\.7"\)/,
    'opus must not be the implicit default',
  );
  assert.match(source, /is_github_hosted_runner/);
  assert.match(source, /lane-1-openrouter/);
  assert.match(source, /lane-0-lmstudio/);

  const result = spawnSync('python3', [coderScriptPath, '--self-test'], {
    encoding: 'utf8',
    cwd: repoRoot,
  });
  assert.strictEqual(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /self-test ok/);
});
