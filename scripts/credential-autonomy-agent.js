#!/usr/bin/env node
/**
 * Credential Autonomy Agent
 *
 * Manages GitHub repository secrets safely. Secret values are passed to
 * `gh secret set` via stdin (never argv) so they do not appear in
 * /proc/<pid>/cmdline or `ps aux`.
 */

const { spawnSync } = require('child_process');

const REPO = process.env.GITHUB_REPOSITORY || '';

/**
 * Run a subprocess.
 *
 * @param {string} cmd
 * @param {string[]} args
 * @param {{ input?: string }} [options]
 * @returns {{ status: number|null, stdout: string, stderr: string }}
 */
function run(cmd, args, options = {}) {
  const hasInput = typeof options.input === 'string';
  // NOTE: Node's spawnSync silently drops `input` when stdio[0] === 'ignore',
  // so we must switch stdin to 'pipe' whenever we intend to feed the child.
  const stdio = [hasInput ? 'pipe' : 'ignore', 'pipe', 'pipe'];
  const spawnOptions = { stdio, encoding: 'utf8' };
  if (hasInput) {
    spawnOptions.input = options.input;
  }
  const result = spawnSync(cmd, args, spawnOptions);
  return {
    status: result.status,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
  };
}

function listSecrets() {
  const result = run('gh', ['secret', 'list', '--repo', REPO]);
  if (result.status !== 0) {
    throw new Error(`Failed to list secrets: ${result.stderr}`);
  }
  return result.stdout
    .split('\n')
    .map((line) => line.trim().split(/\s+/)[0])
    .filter(Boolean);
}

function removeSecret(name) {
  const result = run('gh', ['secret', 'remove', name, '--repo', REPO]);
  if (result.status !== 0) {
    throw new Error(`Failed to remove secret ${name}: ${result.stderr}`);
  }
}

/**
 * Restore (create or update) a repository secret.
 *
 * The secret value is delivered via stdin so plaintext is never present in
 * the child process's argv. See scripts/provision-repo-secrets.sh for the
 * established pattern this mirrors.
 *
 * @param {string} name
 * @param {string} value
 */
function restore(name, value) {
  if (typeof value !== 'string') {
    throw new TypeError(`restore(${name}): value must be a string`);
  }
  const result = run('gh', ['secret', 'set', name, '--repo', REPO], { input: value });
  if (result.status !== 0) {
    // Deliberately do NOT include `value` or stderr contents that could echo it.
    throw new Error(`Failed to set secret ${name} (exit ${result.status})`);
  }
}

module.exports = {
  run,
  listSecrets,
  removeSecret,
  restore,
};
