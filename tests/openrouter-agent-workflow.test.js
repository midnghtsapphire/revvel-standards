'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const yaml = require('yaml');

const repoRoot = path.join(__dirname, '..');
const workflowPath = path.join(repoRoot, '.github', 'workflows', 'openrouter-agent.yml');
const agentScriptPath = path.join(repoRoot, '.github', 'scripts', 'openrouter_agent.py');

function loadWorkflow() {
  return yaml.parse(fs.readFileSync(workflowPath, 'utf8'));
}

test('openrouter-agent Actions job stays github-hosted and does not fake an LM Studio fallback', () => {
  const workflow = loadWorkflow();
  const source = fs.readFileSync(workflowPath, 'utf8');
  const live = source
    .split('\n')
    .filter((l) => !/^\s*#/.test(l))
    .join('\n');
  const job = workflow.jobs['openrouter-agent'];
  const runStep = job.steps.find((step) => step.name === 'Run OpenRouter agent');

  assert.strictEqual(
    job['runs-on'],
    'ubuntu-latest',
    'Agent Actions is GitHub-hosted; ubuntu-latest CANNOT reach laptop LM Studio',
  );
  assert.ok(runStep, 'Run OpenRouter agent step must exist');
  assert.match(
    String(runStep.if),
    /REVVEL_LLM_ALLOW_CLOUD/,
    'spend gate stays on the Agent API step until a real local runner exists',
  );
  assert.ok(
    !Object.hasOwn(runStep.env || {}, 'REVVEL_LLM_ALLOW_CLOUD'),
    'do not set REVVEL_LLM_ALLOW_CLOUD in this job env — the runner cannot see LM Studio',
  );
  assert.doesNotMatch(live, /LMSTUDIO_ENDPOINT/);
  assert.doesNotMatch(live, /127\.0\.0\.1:1234/);
  assert.doesNotMatch(live, /localhost:1234/);
  assert.match(source, /CANNOT reach LM Studio/);
  assert.match(runStep.run, /python \.github\/scripts\/openrouter_agent\.py/);
  assert.ok(fs.existsSync(agentScriptPath), 'agent script must exist');
});

test('openrouter-agent script self-test covers hosted-runner guard', () => {
  const result = spawnSync('python3', [agentScriptPath, '--self-test'], {
    encoding: 'utf8',
    cwd: repoRoot,
  });
  assert.strictEqual(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /self-test ok/);
});
