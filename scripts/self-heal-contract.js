#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const args = {
    component: '',
    error: '',
    issue: '',
    repo: process.env.GITHUB_REPOSITORY || '',
    workflow: '',
    runId: '',
    action: '',
    output: '',
    verification: 'manual',
  };

  for (let i = 2; i < argv.length; i += 1) {
    const key = argv[i];
    const val = argv[i + 1];
    if (!val || val.startsWith('--')) continue;
    if (key === '--component') { args.component = val; i += 1; }
    else if (key === '--error') { args.error = val; i += 1; }
    else if (key === '--issue') { args.issue = val; i += 1; }
    else if (key === '--repo') { args.repo = val; i += 1; }
    else if (key === '--workflow') { args.workflow = val; i += 1; }
    else if (key === '--run-id') { args.runId = val; i += 1; }
    else if (key === '--action') { args.action = val; i += 1; }
    else if (key === '--output') { args.output = val; i += 1; }
    else if (key === '--verification') { args.verification = val; i += 1; }
  }

  return args;
}

function buildContract(args) {
  const hasError = Boolean(args.error?.trim());
  return {
    schema_version: '2026-05-24',
    generated_at: new Date().toISOString(),
    component: args.component || 'unknown-component',
    repository: args.repo || null,
    issue_number: args.issue ? String(args.issue) : null,
    workflow: args.workflow || null,
    run_id: args.runId || null,
    incident: {
      error: hasError ? args.error : null,
      action_taken: args.action || 'fallback-route',
      labels: hasError
        ? ['openrouter', 'auto-fix', 'needs-human']
        : ['openrouter', 'auto-fix'],
    },
    verification: {
      status: 'pending',
      method: args.verification || 'manual',
      required: true,
    },
    escalation: {
      on_failure: 'open-needs-human-issue',
      target_label: 'needs-human',
    },
  };
}

function emit(contract, outputPath) {
  const payload = `${JSON.stringify(contract, null, 2)}\n`;
  if (outputPath) {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, payload);
  }
  process.stdout.write(payload);

  if (process.env.GITHUB_OUTPUT) {
    const delimiter = 'SELF_HEAL_EOF';
    const writeOutput = (name, value) => {
      fs.appendFileSync(
        process.env.GITHUB_OUTPUT,
        `${name}<<${delimiter}\n${value || ''}\n${delimiter}\n`
      );
    };

    writeOutput('self_heal_component', contract.component);
    writeOutput('self_heal_issue', contract.issue_number || '');
    writeOutput('self_heal_verification', contract.verification.method);
    writeOutput('self_heal_output', outputPath || '');
  }
}

function main() {
  const args = parseArgs(process.argv);
  const contract = buildContract(args);
  emit(contract, args.output);
}

module.exports = { parseArgs, buildContract };

if (require.main === module) {
  main();
}
