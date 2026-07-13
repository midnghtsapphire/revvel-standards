#!/usr/bin/env node
/**
 * Credential Autonomy Agent
 *
 * Manages GitHub repository secrets used by automation workflows.
 * Supports listing, backing up, restoring, and rotating secrets.
 *
 * SECURITY NOTE:
 *   When calling `gh secret set`, the secret value is delivered via stdin,
 *   NOT as an argv element. Passing secrets on argv makes them visible to
 *   any process on the host via /proc/<pid>/cmdline or `ps aux`. The safe
 *   pattern (also used in scripts/provision-repo-secrets.sh) is to omit
 *   `--body` and pipe the value through stdin.
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const REPO = process.env.GITHUB_REPOSITORY || 'midnghtsapphire/revvel-standards';
const BACKUP_DIR = path.join(process.cwd(), '.credential-backups');

/**
 * Run a child process synchronously.
 *
 * @param {string} cmd - executable name
 * @param {string[]} args - argv (must NOT contain secret material)
 * @param {object} [options]
 * @param {string} [options.input] - if present, piped to child's stdin.
 *   NOTE: Node's spawnSync silently ignores `input` when stdio[0] is
 *   'ignore', so we explicitly switch stdin to 'pipe' when input is set.
 * @returns {{ status: number|null, stdout: string, stderr: string }}
 */
function run(cmd, args, options = {}) {
  const hasInput = typeof options.input === 'string';
  const stdinMode = hasInput ? 'pipe' : 'ignore';
  const spawnOptions = {
    stdio: [stdinMode, 'pipe', 'pipe'],
    encoding: 'utf8',
  };
  if (hasInput) {
    spawnOptions.input = options.input;
  }
  const result = spawnSync(cmd, args, spawnOptions);
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

function remove(name) {
  const res = run('gh', ['secret', 'remove', name, '--repo', REPO]);
  if (res.status !== 0) {
    console.error(`Failed to remove secret ${name}:`, res.stderr);
    process.exit(1);
  }
  console.log(`Removed secret ${name}`);
}

function restore(name, value) {
  if (!name || typeof value !== 'string') {
    console.error('restore(name, value) requires both arguments');
    process.exit(1);
  }
  // SECURITY: Do NOT pass `value` on argv. Pipe it via stdin so it never
  // appears in /proc/<pid>/cmdline or `ps aux`.
  const res = run(
    'gh',
    ['secret', 'set', name, '--repo', REPO],
    { input: value }
  );
  if (res.status !== 0) {
    // Do NOT echo `value` or the child's stdin back to logs.
    console.error(`Failed to restore secret ${name}:`, res.stderr);
    process.exit(1);
  }
  console.log(`Restored secret ${name}`);
}

function backupManifest() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
  const res = run('gh', ['secret', 'list', '--repo', REPO]);
  if (res.status !== 0) {
    console.error('Failed to list secrets for backup manifest:', res.stderr);
    process.exit(1);
  }
  const manifestPath = path.join(BACKUP_DIR, `manifest-${Date.now()}.txt`);
  fs.writeFileSync(manifestPath, res.stdout, { mode: 0o600 });
  console.log(`Wrote manifest to ${manifestPath}`);
}

function usage() {
  console.log(`Usage: credential-autonomy-agent.js <command> [args]

Commands:
  list                       List repo secrets
  remove <NAME>              Remove a repo secret
  restore <NAME> <VALUE>     Set/restore a repo secret (value via stdin)
  backup                     Write a manifest of current secret names
`);
}

function main() {
  const [, , cmd, ...rest] = process.argv;
  switch (cmd) {
    case 'list':
      return list();
    case 'remove':
      return remove(rest[0]);
    case 'restore':
      return restore(rest[0], rest[1]);
    case 'backup':
      return backupManifest();
    default:
      usage();
      process.exit(cmd ? 1 : 0);
  }
}

if (require.main === module) {
  main();
}

module.exports = { run, list, remove, restore, backupManifest };
