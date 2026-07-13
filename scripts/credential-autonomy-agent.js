#!/usr/bin/env node
/**
 * credential-autonomy-agent.js
 *
 * Autonomous credential management agent. Handles listing, restoring, and
 * auditing GitHub repository secrets via the `gh` CLI.
 *
 * SECURITY NOTE: Secret values MUST be passed to `gh secret set` via stdin,
 * never via `--body <value>` on the command line. Argv is visible to any
 * other process on the host via `/proc/<pid>/cmdline` or `ps aux` for the
 * lifetime of the child process. See scripts/provision-repo-secrets.sh for
 * the established safe pattern.
 */

'use strict';

const { spawnSync } = require('child_process');

const REPO = process.env.GITHUB_REPOSITORY || process.env.REPO || '';

/**
 * Run a subprocess synchronously.
 *
 * @param {string} cmd - executable
 * @param {string[]} args - argv
 * @param {object} [options]
 * @param {string} [options.input] - if provided, piped to child's stdin.
 *   NOTE: Node's spawnSync silently drops `input` when stdio[0] === 'ignore',
 *   so we must switch stdin to 'pipe' whenever input is supplied.
 * @returns {{status:number|null, stdout:string, stderr:string}}
 */
function run(cmd, args, options = {}) {
  const hasInput = typeof options.input === 'string' && options.input.length >= 0 && options.input !== undefined;
  const stdinMode = options.input !== undefined ? 'pipe' : 'ignore';

  const spawnOpts = {
    stdio: [stdinMode, 'pipe', 'pipe'],
    encoding: 'utf8',
  };

  if (options.input !== undefined) {
    spawnOpts.input = options.input;
  }

  const result = spawnSync(cmd, args, spawnOpts);

  return {
    status: result.status,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
  };
}

/**
 * List all secrets currently configured on the repository.
 */
function list() {
  if (!REPO) {
    throw new Error('REPO/GITHUB_REPOSITORY is not set');
  }
  const res = run('gh', ['secret', 'list', '--repo', REPO]);
  if (res.status !== 0) {
    throw new Error(`gh secret list failed: ${res.stderr.trim()}`);
  }
  return res.stdout
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.split(/\s+/)[0]);
}

/**
 * Remove a secret from the repository.
 */
function remove(name) {
  if (!REPO) {
    throw new Error('REPO/GITHUB_REPOSITORY is not set');
  }
  const res = run('gh', ['secret', 'remove', name, '--repo', REPO]);
  if (res.status !== 0) {
    throw new Error(`gh secret remove failed for ${name}: ${res.stderr.trim()}`);
  }
  return true;
}

/**
 * Restore (create or update) a secret on the repository.
 *
 * SECURITY: The secret value is delivered to `gh` via stdin. It is NEVER
 * placed in argv. Do not add `--body value` here.
 */
function restore(name, value) {
  if (!REPO) {
    throw new Error('REPO/GITHUB_REPOSITORY is not set');
  }
  if (typeof name !== 'string' || !name) {
    throw new Error('restore(): name must be a non-empty string');
  }
  if (typeof value !== 'string') {
    throw new Error('restore(): value must be a string');
  }

  // gh secret set reads the value from stdin when --body is omitted.
  const res = run('gh', ['secret', 'set', name, '--repo', REPO], { input: value });
  if (res.status !== 0) {
    // Do not include `value` in the error message.
    throw new Error(`gh secret set failed for ${name}: ${res.stderr.trim()}`);
  }
  return true;
}

module.exports = { run, list, remove, restore };

if (require.main === module) {
  const [, , subcmd, ...rest] = process.argv;
  try {
    switch (subcmd) {
      case 'list': {
        const names = list();
        for (const n of names) console.log(n);
        break;
      }
      case 'remove': {
        const [name] = rest;
        if (!name) throw new Error('usage: remove <NAME>');
        remove(name);
        console.log(`removed ${name}`);
        break;
      }
      case 'restore': {
        const [name] = rest;
        if (!name) throw new Error('usage: restore <NAME> (value from env $SECRET_VALUE)');
        const value = process.env.SECRET_VALUE;
        if (typeof value !== 'string') {
          throw new Error('SECRET_VALUE env var is required for restore');
        }
        restore(name, value);
        console.log(`restored ${name}`);
        break;
      }
      default:
        console.error('usage: credential-autonomy-agent.js <list|remove|restore> [args]');
        process.exit(2);
    }
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}
