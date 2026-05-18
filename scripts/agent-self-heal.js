#!/usr/bin/env node
'use strict';

/**
 * Agent self-heal packet generator.
 *
 * Produces deterministic recovery actions for GOAP/agent/workflow failures and
 * can apply them to a GitHub issue using the gh CLI. It does not need model or
 * vendor credentials; it routes recovery through existing labels and workflows.
 */

const { spawnSync } = require('child_process');

const RECOVERY_RULES = [
  {
    id: 'credential-backup',
    match: /(doppler|secret|credential|api[_ -]?key|token|vault)/i,
    labels: ['auto-fix', 'ralph-loop', 'agent-fallback'],
    actions: [
      'Run scripts/credential-backup-harness.js for the required secret list.',
      'Check GitHub Actions secrets first; Doppler is optional.',
      'Use SOPS/age, pass, Bitwarden CLI, 1Password CLI, Infisical, or Vault as backup sources.',
    ],
  },
  {
    id: 'agent-timeout',
    match: /(timeout|timed out|no response|unavailable|502|503|504|rate limit|quota|429)/i,
    labels: ['auto-fix', 'ralph-loop', 'agent-fallback'],
    actions: [
      'Retry once with exponential backoff.',
      'Route to the OpenHands -> Cursor -> OpenRouter fallback chain.',
      'If an LLM key is missing, switch to no-key/local research lanes where available.',
    ],
  },
  {
    id: 'workflow-config',
    match: /(yaml|syntax|parse|workflow|github-script|permission|scope)/i,
    labels: ['auto-fix', 'ralph-loop', 'agent-fallback'],
    actions: [
      'Run npm run workflows:validate.',
      'Patch the workflow or permission block causing the failure.',
      'Rerun the targeted workflow validation before retrying the workflow.',
    ],
  },
  {
    id: 'goap-agent',
    match: /(goap|agent|openhands|cursor|openrouter|jules|research)/i,
    labels: ['auto-fix', 'ralph-loop', 'agent-fallback'],
    actions: [
      'Capture the failing component, input issue/PR number, and error summary.',
      'Create or update a recovery issue/comment with the packet below.',
      'Route the item back through the fallback chain instead of waiting on one agent.',
    ],
  },
];

function usage(exitCode = 0) {
  process.stdout.write(`
agent-self-heal.js

Usage:
  node scripts/agent-self-heal.js --component NAME --error TEXT [--issue N --repo owner/repo --apply]

Options:
  --component <name>  Failing workflow/agent/component name (required)
  --error <text>      Error summary or log excerpt (required)
  --issue <number>    Issue/PR number to comment on when --apply is used
  --repo <owner/repo> GitHub repo for gh commands (default: GITHUB_REPOSITORY)
  --apply             Add recovery labels and comment via gh CLI
  --json              Print JSON packet instead of markdown
  --help              Show this help
`);
  process.exit(exitCode);
}

function parseArgs(argv) {
  const opts = {
    component: '',
    error: '',
    issue: process.env.ISSUE_NUMBER || '',
    repo: process.env.GITHUB_REPOSITORY || '',
    apply: false,
    json: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = () => {
      if (i + 1 >= argv.length) throw new Error(`${arg} requires a value`);
      return argv[++i];
    };
    if (arg === '--help' || arg === '-h') usage(0);
    else if (arg === '--component') opts.component = next();
    else if (arg.startsWith('--component=')) opts.component = arg.slice('--component='.length);
    else if (arg === '--error') opts.error = next();
    else if (arg.startsWith('--error=')) opts.error = arg.slice('--error='.length);
    else if (arg === '--issue') opts.issue = next();
    else if (arg.startsWith('--issue=')) opts.issue = arg.slice('--issue='.length);
    else if (arg === '--repo') opts.repo = next();
    else if (arg.startsWith('--repo=')) opts.repo = arg.slice('--repo='.length);
    else if (arg === '--apply') opts.apply = true;
    else if (arg === '--json') opts.json = true;
    else throw new Error(`unknown arg: ${arg}`);
  }
  return opts;
}

function classify(component, error) {
  const text = `${component}\n${error}`;
  const matched = RECOVERY_RULES.filter((rule) => rule.match.test(text));
  const rules = matched.length > 0 ? matched : [{
    id: 'generic-agent-error',
    labels: ['auto-fix', 'ralph-loop', 'agent-fallback'],
    actions: [
      'Capture full logs and inputs.',
      'Retry through the fallback chain.',
      'Add a targeted test or workflow validation for the recovered failure.',
    ],
  }];

  const labels = [...new Set(rules.flatMap((rule) => rule.labels))];
  const actions = [...new Set(rules.flatMap((rule) => rule.actions))];
  return { rules: rules.map((rule) => rule.id), labels, actions };
}

function packet(opts) {
  const recovery = classify(opts.component, opts.error);
  return {
    title: `[AUTO-ERROR] ${opts.component} failed`,
    component: opts.component,
    error: opts.error,
    issue: opts.issue || null,
    repo: opts.repo || null,
    labels: recovery.labels,
    recovery_rules: recovery.rules,
    actions: recovery.actions,
    created_at: new Date().toISOString(),
  };
}

function renderMarkdown(data) {
  return [
    '## Agent Self-Heal Packet',
    '',
    `**Component:** \`${data.component}\``,
    `**Detected rules:** ${data.recovery_rules.map((rule) => `\`${rule}\``).join(', ')}`,
    '',
    '### Error Summary',
    '```text',
    String(data.error).slice(0, 4000),
    '```',
    '',
    '### Recovery Actions',
    ...data.actions.map((action, index) => `${index + 1}. ${action}`),
    '',
    `**Routing labels:** ${data.labels.map((label) => `\`${label}\``).join(', ')}`,
    '',
    '_Generated by `scripts/agent-self-heal.js`._',
  ].join('\n');
}

function commandExists(command) {
  return spawnSync('bash', ['-lc', `command -v ${command}`], { encoding: 'utf8' }).status === 0;
}

function applyToGithub(data) {
  if (!data.repo || !data.issue) {
    throw new Error('--apply requires --repo and --issue');
  }
  if (!commandExists('gh')) {
    throw new Error('gh CLI not found');
  }

  const labelArg = data.labels.join(',');
  const labelResult = spawnSync('gh', ['issue', 'edit', String(data.issue), '--repo', data.repo, '--add-label', labelArg], {
    encoding: 'utf8',
  });
  if (labelResult.status !== 0) {
    throw new Error(labelResult.stderr.trim() || 'failed to add labels');
  }

  const commentResult = spawnSync('gh', ['issue', 'comment', String(data.issue), '--repo', data.repo, '--body', renderMarkdown(data)], {
    encoding: 'utf8',
  });
  if (commentResult.status !== 0) {
    throw new Error(commentResult.stderr.trim() || 'failed to post self-heal comment');
  }
}

function main() {
  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`error: ${error.message}\n`);
    usage(2);
  }

  if (!opts.component) {
    process.stderr.write('error: --component is required\n');
    process.exit(2);
  }
  if (!opts.error) {
    process.stderr.write('error: --error is required\n');
    process.exit(2);
  }

  const data = packet(opts);
  if (opts.apply) applyToGithub(data);
  process.stdout.write(opts.json ? `${JSON.stringify(data)}\n` : `${renderMarkdown(data)}\n`);
}

main();
