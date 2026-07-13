#!/usr/bin/env node
/**
 * credential-autonomy-agent.js
 *
 * Rotates and restores GitHub repository secrets used by the automation
 * pipeline. Invoked from .github/workflows/credential-autonomy-agent.yml.
 *
 * SECURITY NOTE:
 *   `gh secret set` accepts the secret value via stdin when `--body` is
 *   omitted. We deliberately use the stdin path so plaintext secret values
 *   never appear in argv (visible to other processes via /proc/<pid>/cmdline
 *   or `ps aux`). See scripts/provision-repo-secrets.sh for the same
 *   established pattern.
 */

const { spawnSync } = require('child_process');

const REPO = process.env.GITHUB_REPOSITORY || process.env.REPO || '';

/**
 * Run a subprocess synchronously.
 *
 * @param {string} cmd
 * @param {string[]} args
 * @param {{ input?: string }} [options]
 *   input: if provided, piped to the child's stdin. Node's spawnSync silently
 *          drops `input` when stdio[0] === 'ignore', so we switch stdio[0] to
 *          'pipe' whenever an input is supplied.
 * @returns {{ status: number|null, stdout: string, stderr: string }}
 */
function run(cmd, args, options = {}) {
  const hasInput = typeof options.input === 'string' && options.input.length > 0;
  const spawnOptions = {
    stdio: [hasInput ? 'pipe' : 'ignore', 'pipe', 'pipe'],
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

function listSecrets() {
  const res = run('gh', ['secret', 'list', '--repo', REPO]);
  if (res.status !== 0) {
    throw new Error(`gh secret list failed: ${res.stderr.trim()}`);
  }
  return res.stdout
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split(/\s+/)[0]);
}

function removeSecret(name) {
  const res = run('gh', ['secret', 'remove', name, '--repo', REPO]);
  if (res.status !== 0) {
    // Non-fatal: secret may already be absent.
    console.warn(`warn: could not remove secret ${name}: ${res.stderr.trim()}`);
  }
}

/**
 * Restore (create or overwrite) a repository secret.
 *
 * The value is passed to `gh secret set` via stdin so the plaintext never
 * appears in the child process argv.
 *
 * @param {string} name
 * @param {string} value
 */
function restore(name, value) {
  if (!name || typeof value !== 'string') {
    throw new Error('restore(name, value): both arguments required');
  }
  const res = run('gh', ['secret', 'set', name, '--repo', REPO], { input: value });
  if (res.status !== 0) {
    throw new Error(`gh secret set ${name} failed: ${res.stderr.trim()}`);
  }
  // Intentionally do not log `value` or any derivative of it.
  console.log(`ok: restored secret ${name}`);
}

module.exports = { run, listSecrets, removeSecret, restore };

if (require.main === module) {
  const [, , action, name] = process.argv;
  try {
    if (action === 'list') {
      console.log(listSecrets().join('\n'));
    } else if (action === 'remove' && name) {
      removeSecret(name);
    } else if (action === 'restore' && name) {
      const value = process.env.SECRET_VALUE;
      if (!value) {
        throw new Error('SECRET_VALUE env var required for restore');
      }
      restore(name, value);
    } else {
      console.error('usage: credential-autonomy-agent.js <list|remove NAME|restore NAME>');
      process.exit(2);
    }
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}
