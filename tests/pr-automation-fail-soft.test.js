const fs = require('fs');
const path = require('path');
const yaml = require('yaml');

const WORKFLOWS = [
  '.github/workflows/openrouter-assignee.yml',
  '.github/workflows/ready-for-review.yml',
  '.github/workflows/augment-check.yml',
  '.github/workflows/priority-router.yml',
  '.github/workflows/pr-state-orchestrator.yml',
  '.github/workflows/pr-lifecycle.yml',
  '.github/workflows/jules-pr-reviewer.yml'
];

function assert(condition, message) {
  if (!condition) throw new Error(message || 'assertion failed');
}

function asStepList(job) {
  return Array.isArray(job?.steps) ? job.steps : [];
}

function run() {
  for (const workflowPath of WORKFLOWS) {
    const absolutePath = path.join(__dirname, '..', workflowPath);
    const parsed = yaml.parse(fs.readFileSync(absolutePath, 'utf8'));
    const jobs = parsed?.jobs || {};
    const githubScriptSteps = [];

    for (const [jobId, job] of Object.entries(jobs)) {
      for (const step of asStepList(job)) {
        if (String(step.uses || '').startsWith('actions/github-script@')) {
          githubScriptSteps.push({ jobId, step });
        }
      }
    }

    assert(githubScriptSteps.length > 0, `${workflowPath} should contain github-script automation`);

    for (const { jobId, step } of githubScriptSteps) {
      assert(
        step['continue-on-error'] === true,
        `${workflowPath} job ${jobId} step "${step.name || step.uses}" must be fail-soft`
      );
    }
  }

  const julesWorkflow = fs.readFileSync(
    path.join(__dirname, '..', '.github/workflows/jules-pr-reviewer.yml'),
    'utf8'
  );
  assert(julesWorkflow.includes('context: jules/review'), 'Jules workflow must own jules/review context');
  assert(
    /createCommitStatus[\s\S]+context:\s*'jules\/review'/.test(julesWorkflow),
    'Jules workflow must finalize jules/review status'
  );

  console.log('pr-automation-fail-soft tests passed');
}

run();
