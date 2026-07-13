#!/usr/bin/env node
/**
 * Credential Autonomy Agent
 *
 * Manages GitHub repository secrets used by automated workflows.
 * Supports listing, backing up, restoring, and removing secrets.
 *
 * SECURITY: Secret values are passed to `gh secret set` via stdin,
 * never as argv elements. Argv is visible to other processes on the
 * host via /proc/<pid>/cmdline and `ps aux`, so passing plaintext
 * secrets on the command line would leak them for the process lifetime.
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const REPO = process.env.GITHUB_REPOSITORY || 'midnghtsapphire/revvel-standards';
const BACKUP_DIR = path.join(process.cwd(), '.credential-backups');

/**
 * Run a subprocess.
 *
 * @param {string} cmd - executable
 * @param {string[]} args - argv (do NOT put secrets here)
 * @param {object} [options]
 * @param {string} [options.input] - if provided, piped to child stdin.
 *   NOTE: Node's spawnSync silently drops `input` when stdio[0] is 'ignore',
 *   so we explicitly switch stdio[0] to 'pipe' whenever input is present.
 * @returns {{ status: number|null, stdout: string, stderr: string }}
 */
function run(cmd, args, options = {}) {
  const hasInput = typeof options.input === 'string' && options.input.length >= 0 && options.input !== undefined;
  const stdio = hasInput
    ? ['pipe', 'pipe', 'pipe']
    : ['ignore', 'pipe', 'pipe'];

  const spawnOpts = {
    stdio,
    encoding: 'utf8',
  };
  if (hasInput) {
    spawnOpts.input = options.input;
  }

  const result = spawnSync(cmd, args, spawnOpts);
  return {
    status: result.status,
    stdout: (result.stdout || '').toString(),
    stderr: (result.stderr || '').toString(),
  };
}

function list() {
  const res = run('gh', ['secret', 'list', '--repo', REPO]);
  if (res.status !== 0) {
    console.error('Failed to list secrets:', res.stderr);
    process.exit(1);
  }
  console.log(res.stdout);
}

function backup() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
  const res = run('gh', ['secret', 'list', '--repo', REPO]);
  if (res.status !== 0) {
    console.error('Failed to list secrets for backup:', res.stderr);
    process.exit(1);
  }
  const manifest = {
    repo: REPO,
    timestamp: new Date().toISOString(),
    // Note: gh does not expose secret values; this only records names.
    secrets: res.stdout
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => line.split(/\s+/)[0]),
  };
  const outPath = path.join(BACKUP_DIR, `manifest-${Date.now()}.json`);
  fs.writeFileSync(outPath, JSON.stringify(manifest, null, 2));
  console.log(`Backup manifest written to ${outPath}`);
}

/**
 * Restore a secret by name from an environment variable.
 *
 * SECURITY: The secret value is passed to `gh secret set` via stdin.
 * `gh secret set NAME` (without --body) reads the value from stdin,
 * so the plaintext never appears in argv / `ps` / /proc/<pid>/cmdline.
 */
function restore(name, value) {
  if (!name || typeof value !== 'string') {
    console.error('restore(name, value): both arguments are required');
    process.exit(1);
  }
  const res = run('gh', ['secret', 'set', name, '--repo', REPO], { input: value });
  if (res.status !== 0) {
    // Do NOT include the value in error output.
    console.error(`Failed to restore secret ${name}:`, res.stderr);
    process.exit(1);
  }
  console.log(`Restored secret: ${name}`);
}

function remove(name) {
  if (!name) {
    console.error('remove(name): name is required');
    process.exit(1);
  }
  const res = run('gh', ['secret', 'remove', name, '--repo', REPO]);
  if (res.status !== 0) {
    console.error(`Failed to remove secret ${name}:`, res.stderr);
    process.exit(1);
  }
  console.log(`Removed secret: ${name}`);
}

function main() {
  const [, , action, ...rest] = process.argv;
  switch (action) {
    case 'list':
      list();
      break;
    case 'backup':
      backup();
      break;
    case 'restore': {
      const [name] = rest;
      const envVar = `SECRET_${name}`;
      const value = process.env[envVar];
      if (value === undefined) {
        console.error(`Environment variable ${envVar} is not set`);
        process.exit(1);
      }
      restore(name, value);
      break;
    }
    case 'remove': {
      const [name] = rest;
      remove(name);
      break;
    }
    default:
      console.error('Usage: credential-autonomy-agent.js <list|backup|restore NAME|remove NAME>');
      process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { run, list, backup, restore, remove };
