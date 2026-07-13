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
function run(command, args = [], options = {}) {
  // spawnSync with an explicit argv array does NOT spawn a shell, so args
  // cannot be shell-injected. All callers pass a fixed command ('gh').
  //
  // Callers may pass `options.input` to feed data (e.g. secret values) to
  // the child's stdin instead of argv, since argv is visible to any other
  // process on the host for the process's lifetime via
  // /proc/<pid>/cmdline or `ps aux`. stdio[0] must be 'pipe' (not
  // 'ignore') for `input` to actually reach the child.
  // nosemgrep: javascript.lang.security.detect-child-process.detect-child-process -- arg array (no shell); command is a fixed literal at every call site
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    stdio: [options.input !== undefined ? 'pipe' : 'ignore', 'pipe', 'pipe'],
    ...options,
  });
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
    .filter(line => line.trim())
    .map(line => line.split(' ')[0]);
}

async function audit() {
  log('🔍 Auditing credentials...', 'info');
  
  const current = await getCurrentSecrets();
  const backup = parseBackupJSON();
  const currentSet = new Set(current);
  const backupKeys = Object.keys(backup);
  
  const missing = [];
  const inBackupNotGitHub = [];
  const inGitHubNotBackup = [];
  const ok = [];
  
  // Check each known credential
  for (const [name, info] of Object.entries(CREDENTIAL_REGISTRY)) {
    const inGitHub = currentSet.has(name);
    const inBackup = backupKeys.includes(name) && backup[name];
    
    if (inGitHub && inBackup) {
      ok.push(name);
    } else if (inGitHub && !inBackup) {
      inGitHubNotBackup.push(name);
    } else if (!inGitHub && inBackup) {
      inBackupNotGitHub.push(name);
    } else if (info.critical && !inGitHub) {
      missing.push(name);
    }
  }
  
  console.log('\n📊 Audit Results:\n');
  
  if (ok.length) {
    log(`OK: ${ok.length}`, 'success');
    console.log(`   ${ok.join(', ')}\n`);
  }
  
  if (inBackupNotGitHub.length) {
    log(`Need restore: ${inBackupNotGitHub.length}`, 'warning');
    console.log(`   ${inBackupNotGitHub.join(', ')}\n`);
  }
  
  if (inGitHubNotBackup.length) {
    log(`Extra (not in backup): ${inGitHubNotBackup.length}`, 'info');
    console.log(`   ${inGitHubNotBackup.join(', ')}\n`);
  }
  
  if (missing.length) {
    log(`CRITICAL missing: ${missing.length}`, 'error');
    console.log(`   ${missing.join(', ')}\n`);
  }
  
  return {
    missing,
    inBackupNotGitHub,
    inGitHubNotBackup,
    ok,
  };
}

async function restore(secretsToRestore) {
  if (!secretsToRestore || secretsToRestore.length === 0) {
    log('Nothing to restore', 'info');
    return [];
  }
  
  const backup = parseBackupJSON();
  const restored = [];
  
  log(`🔄 Restoring ${secretsToRestore.length} secrets...`, 'action');
  
  for (const name of secretsToRestore) {
    const value = backup[name];
    if (!value) {
      log(`${name}: not in backup`, 'warning');
      continue;
    }
    
    if (DRY_RUN) {
      log(`${name}: would restore (DRY RUN)`, 'action');
    } else {
      // Pass the plaintext value via stdin (not argv/--body) so it never
      // appears in `ps aux` / /proc/<pid>/cmdline. `gh secret set` reads
      // from stdin by default when --body is omitted — same safe pattern
      // already established in scripts/provision-repo-secrets.sh.
      const result = run('gh', ['secret', 'set', name, '--repo', REPO], { input: value });
      if (result.ok) {
        log(`${name}: restored`, 'success');
        restored.push(name);
      } else {
        log(`${name}: FAILED - ${result.stderr}`, 'error');
      }
    }
  }
  
  return restored;
}

async function cleanup(staleSecrets) {
  if (!staleSecrets || staleSecrets.length === 0) {
    log('Nothing to cleanup', 'info');
    return [];
  }
  
  log(`🧹 Cleaning up ${staleSecrets.length} stale secrets...`, 'action');
  
  const cleaned = [];
  for (const name of staleSecrets) {
    if (DRY_RUN) {
      log(`${name}: would remove (DRY RUN)`, 'action');
    } else {
      const result = run('gh', ['secret', 'remove', name, '--repo', REPO]);
      if (result.ok) {
        log(`${name}: removed`, 'success');
        cleaned.push(name);
      } else {
        log(`${name}: FAILED to remove`, 'warning');
      }
    }
  }
  
  return cleaned;
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
