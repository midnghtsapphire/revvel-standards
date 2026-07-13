#!/usr/bin/env node
/**
 * Credential Autonomy Agent
 *
 * Manages GitHub repository secrets safely. Secret values are always passed
 * to `gh secret set` via stdin (never as argv) so they don't leak through
 * /proc/<pid>/cmdline or `ps aux`.
 */

const { spawnSync } = require('child_process');

const REPO = process.env.GITHUB_REPOSITORY || process.env.REPO || '';

/**
 * Run a command synchronously.
 *
 * @param {string} cmd
 * @param {string[]} args
 * @param {{ input?: string }} [options]
 * @returns {{ status: number|null, stdout: string, stderr: string }}
 */
function run(cmd, args, options = {}) {
  const hasInput = typeof options.input === 'string' && options.input.length > 0;
  // Note: Node's spawnSync silently drops `input` when stdio[0] === 'ignore',
  // so we must switch stdin to 'pipe' whenever input is provided.
  const stdio = [hasInput ? 'pipe' : 'ignore', 'pipe', 'pipe'];

  const spawnOptions = {
    stdio,
    encoding: 'utf8',
  };
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

function list() {
  const res = run('gh', ['secret', 'list', '--repo', REPO]);
  if (res.status !== 0) {
    throw new Error(`gh secret list failed: ${res.stderr}`);
  }
  return res.stdout
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split(/\s+/)[0]);
}

function remove(name) {
  const res = run('gh', ['secret', 'remove', name, '--repo', REPO]);
  if (res.status !== 0) {
    throw new Error(`gh secret remove ${name} failed: ${res.stderr}`);
  }
}

/**
 * Restore (create or update) a repository secret.
 *
 * IMPORTANT: The plaintext `value` is delivered to `gh secret set` via stdin,
 * never as an argv element. Passing it via `--body VALUE` would place the
 * plaintext in the child process's argv, which is world-readable on the host
 * (see /proc/<pid>/cmdline, `ps aux`) for the lifetime of the process.
 *
 * The same safe pattern is used by scripts/provision-repo-secrets.sh.
 *
 * @param {string} name
 * @param {string} value
 */
function restore(name, value) {
  if (typeof name !== 'string' || !name) {
    throw new Error('restore: name is required');
  }
  if (typeof value !== 'string') {
    throw new Error('restore: value must be a string');
  }

  const res = run('gh', ['secret', 'set', name, '--repo', REPO], { input: value });
  if (res.status !== 0) {
    // Deliberately do not echo `value` or any portion of it.
    throw new Error(`gh secret set ${name} failed: ${res.stderr}`);
  }
}

module.exports = { run, list, remove, restore };

if (require.main === module) {
  const [, , action, name, value] = process.argv;
  try {
    switch (action) {
      case 'list':
        console.log(list().join('\n'));
        break;
      case 'remove':
        remove(name);
        break;
      case 'restore':
        // Prefer reading value from env to avoid it appearing in this process's argv either.
        restore(name, process.env.SECRET_VALUE || value || '');
        break;
      default:
        console.error('Usage: credential-autonomy-agent.js <list|remove|restore> [name] [value]');
        process.exit(2);
    }
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}
