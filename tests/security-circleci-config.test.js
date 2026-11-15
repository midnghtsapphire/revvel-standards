'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const file = path.join(root, '.circleci/config.yml');
// REVVEL-DISABLED | AGENT: orbit | MODEL: runtime-unspecified | WR: security-circleci-20261115 | DATE: 2026-11-15 | STATUS: REPLACED
// REASON: Python isolated mode excludes user-installed PyYAML; root tests already install the locked yaml package.
// const config = JSON.parse(execFileSync('python3', ['-I', '-c', 'import json,sys,yaml; print(json.dumps(yaml.safe_load(open(sys.argv[1]))))', file], { encoding: 'utf8' }));
// REVVEL-DISABLED-END
const config = require('yaml').parse(fs.readFileSync(file, 'utf8'));
const job = config.jobs['policy-check'];
const run = job.steps.find(step => step.run).run;
test('existing PR/main workflows retain policy-check, with no added schedule or context', () => {
  const current = config.workflows;
  assert.deepEqual(Object.keys(current).sort(), ['main-workflow', 'pr-workflow', 'version']);
  for (const name of ['pr-workflow', 'main-workflow']) {
    const entry = current[name].jobs.find(entry => typeof entry === 'object' && entry['policy-check']);
    assert.ok(entry, name);
    assert.equal(entry['policy-check'].context, undefined);
    assert.equal(current[name].triggers, undefined);
  }
  assert.equal(job.steps.includes('checkout'), false);
  assert.equal(job.resource_class, 'small');
  assert.deepEqual(job.environment, { BASH_ENV: '/dev/null' });
});
test('transport sources the invoker from a full immutable committed object, not candidate HEAD', () => {
  const pin = run.command.match(/^shim_source=([a-f0-9]{40})$/m)?.[1];
  assert.ok(pin);
  const approved = execFileSync('git', ['show', `${pin}:.circleci/scripts/security-completion.sh`], { cwd: root });
  assert.deepEqual(approved, fs.readFileSync(path.join(root, '.circleci/scripts/security-completion.sh')));
  assert.match(run.command, /git .* show "\$shim_source:\.circleci\/scripts\/security-completion\.sh"/);
  for (const name of ['policy_source', 'scanner_source']) assert.match(run.command, new RegExp(`^${name}=[a-f0-9]{40}$`, 'm'));
  assert.match(run.command, /env -i PATH=\/usr\/local\/bin:\/usr\/bin:\/bin/);
  assert.doesNotMatch(run.command, /--depth|git checkout|npm |npx |eval |context:|TOKEN|API_KEY|ALLOW_DESTROY/);
  assert.match(run.command, /refs\/heads\/main:refs\/remotes\/origin\/main/);
  assert.match(run.command, /"\$head\^1"/);
});
test('transport shell parses and does not swallow invoker or bootstrap failures', () => {
  // CircleCI consumes escaped literal pipeline delimiters before Bash sees
  // the script. Raw heredocs fail its expression compiler even though YAML
  // and bash -n alone accept them. Keep this actual compiler bug regression.
  assert.equal((run.command.match(/\\<</g) || []).length, 2);
  assert.doesNotMatch(run.command, /(?<!\\)<</);
  const compiledShell = run.command.replaceAll('\\<<', '<<');
  const result = spawnSync('/bin/bash', ['-n'], { input: compiledShell, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(run.command, /trap blocked ERR/);
  assert.match(run.command, /exit 2/);
  assert.match(run.command, /status=\$\?/);
  assert.match(run.command, /exit "\$status"/);
  const artifact = job.steps.find(step => step.store_artifacts).store_artifacts;
  assert.equal(artifact.path, '/tmp/security-completion-reports');
  assert.doesNotMatch(artifact.path, /private|candidate|tools/);
});
test('legacy invocation remains commented with dated owner-rule retirement metadata', () => {
  const text = fs.readFileSync(file, 'utf8');
  assert.match(text, /REVVEL-DISABLED \| AGENT: orbit .*DATE: 2026-11-15 \| STATUS: REPLACED/);
  assert.match(text, /#     command: bash \.circleci\/scripts\/check-archival-policy\.sh/);
  assert.match(text, /historical label-resolution commentary/);
});
