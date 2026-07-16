#!/usr/bin/env node
/**
 * Credential Autonomy Agent
 *
 * Manages GitHub repository secrets safely. Secret values are always passed
 * to `gh secret set` via stdin (never as argv) so they don't leak through
 * /proc/<pid>/cmdline or `ps aux`.
 * Handles all credential management autonomously:
 * - audit: Check what exists vs what's needed
 * - restore: Restore missing secrets from backup
 * - cleanup: Remove stale/duplicate secrets
 * - refresh: Rotate credentials that are expiring
 * - full: Do everything
 *
 * No human intervention required.
 */

'use strict';

const { spawnSync } = require('child_process');
const https = require('https');

const ACTION = process.env.ACTION || 'full';
const DRY_RUN = process.env.DRY_RUN === 'true';
const BACKUP_JSON = process.env.CREDENTIAL_BACKUP_JSON || '';
const REPO = process.env.GITHUB_REPOSITORY || 'midnghtsapphire/revvel-standards';

// Minimum number of usable (truthy-valued) keys a backup must contain before we
// trust it enough to make DESTRUCTIVE decisions (i.e. deleting a GitHub secret
// because it is "not in backup"). A truncated / empty / malformed backup would
// otherwise make every real secret look stale and get deleted — so cleanup is
// refused unless the backup clears this bar. Kept deliberately low so a legit
// small backup still validates; it only guards against near-empty corruption.
const MIN_EXPECTED_BACKUP_KEYS = 5;

// All known credential patterns
const CREDENTIAL_REGISTRY = {
  // AI / Agents
  'OPENROUTER_API_KEY': { critical: true, description: 'OpenRouter LLM API' },
  'OPENAI_API_KEY': { critical: false, description: 'OpenAI API' },
  'ANTHROPIC_API_KEY': { critical: false, description: 'Anthropic API' },
  'JULES_API_KEY': { critical: true, description: 'Google Jules agent' },
  'BITO_API_KEY': { critical: true, description: 'Bito AI code review' },

  // Project Management
  'LINEAR_API_KEY': { critical: true, description: 'Linear project tracking' },
  'NOTION_API_KEY': { critical: true, description: 'Notion docs/templates' },

  // Chrome Extensions (Google OAuth)
  'GOOGLE_OAUTH_TOKEN': { critical: true, description: 'Google OAuth for extensions' },
  'CLAUDE_CODE_TOKEN': { critical: false, description: 'Claude Code Chrome ext' },
  'GUMLOOP_TOKEN': { critical: false, description: 'Gumloop Chrome ext' },

  // Marketing / Social
  'TWITTER_API_KEY': { critical: false, description: 'Twitter API' },
  'TWITTER_API_KEY_SECRET': { critical: false, description: 'Twitter API secret' },
  'TWITTER_ACCESS_TOKEN': { critical: false, description: 'Twitter access token' },
  'TWITTER_ACCESS_TOKEN_SECRET': { critical: false, description: 'Twitter access secret' },
  'LINKEDIN_ACCESS_TOKEN': { critical: false, description: 'LinkedIn API' },
  'REDDIT_CLIENT_ID': { critical: false, description: 'Reddit API' },
  'REDDIT_CLIENT_SECRET': { critical: false, description: 'Reddit API secret' },
  'PRODUCT_HUNT_API_TOKEN': { critical: false, description: 'Product Hunt API' },

  // Payments
  'STRIPE_SECRET_KEY': { critical: false, description: 'Stripe payments' },

  // Infrastructure
  'SUPABASE_SERVICE_ROLE_KEY': { critical: false, description: 'Supabase backend' },
  'VERCEL_TOKEN': { critical: false, description: 'Vercel deployments' },
  'DIGITALOCEAN_API_TOKEN': { critical: false, description: 'DigitalOcean' },
  'RAILWAY_TOKEN': { critical: false, description: 'Railway deploy' },
  'RESEND_API_KEY': { critical: false, description: 'Resend email' },
  'AMPLITUDE_API_KEY': { critical: false, description: 'Amplitude analytics' },

  // DNS / Domains
  'NAMECHEAP_API_KEY': { critical: false, description: 'Namecheap DNS' },
  'NAMECHEAP_USERNAME': { critical: false, description: 'Namecheap username' },
  'PORKBUN_API_KEY': { critical: false, description: 'Porkbun DNS' },
  'PORKBUN_SECRET_API_KEY': { critical: false, description: 'Porkbun secret' },

  // SEO
  'GOOGLE_SEARCH_CONSOLE_KEY': { critical: false, description: 'Google Search Console' },
  'GOOGLE_BUSINESS_PROFILE_KEY': { critical: false, description: 'Google Business Profile' },
};

function log(message, type = 'info') {
  const prefix = {
    info: 'ℹ️',
    success: '✅',
    warning: '⚠️',
    error: '❌',
    action: '🔧',
  }[type] || '•';
  console.log(`${prefix} ${message}`);
}

function run(cmd, args, options = {}) {
  const hasInput = typeof options.input === 'string' && options.input.length > 0;
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
  return parseSecretListOutput(res.stdout);
}

/**
 * Parse + validate CREDENTIAL_BACKUP_JSON once. Returns
 * { backup, valid, reason }:
 *   - backup: the parsed object (or {} when unparseable)
 *   - valid:  true ONLY when the backup parsed as a JSON object AND holds at
 *             least MIN_EXPECTED_BACKUP_KEYS usable (truthy-valued) keys.
 *   - reason: human-readable explanation when !valid.
 *
 * `valid` gates any destructive action (cleanup): we must never delete a real
 * GitHub secret just because a truncated / empty / malformed backup made it
 * look "not in backup".
 */
function loadBackup(rawJson = BACKUP_JSON) {
  if (!rawJson) {
    return { backup: {}, valid: false, reason: 'CREDENTIAL_BACKUP_JSON not set' };
  }
  let parsed;
  try {
    parsed = JSON.parse(rawJson);
  } catch (e) {
    return { backup: {}, valid: false, reason: `Invalid JSON in CREDENTIAL_BACKUP_JSON: ${e.message}` };
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { backup: {}, valid: false, reason: 'CREDENTIAL_BACKUP_JSON did not parse to a JSON object' };
  }
  const usableKeys = Object.keys(parsed).filter((k) => parsed[k]);
  if (usableKeys.length < MIN_EXPECTED_BACKUP_KEYS) {
    return {
      backup: parsed,
      valid: false,
      reason: `Backup has only ${usableKeys.length} usable key(s) (< ${MIN_EXPECTED_BACKUP_KEYS}); treating as unreliable (possible truncation)`,
    };
  }
  return { backup: parsed, valid: true, reason: '' };
}

// Parse the columnar output of `gh secret list` into secret names. Split on ANY
// run of whitespace (tabs or multiple spaces): the columns are whitespace-
// aligned, and a naive split(' ') can yield wrong/empty names when columns are
// tab- or multi-space-separated. Pure so it is unit-testable.
function parseSecretListOutput(stdout) {
  return String(stdout || '')
    .split('\n')
    .filter(line => line.trim())
    .map(line => line.trim().split(/\s+/)[0])
    .filter(Boolean);
}

async function getCurrentSecrets() {
  const result = run('gh', ['secret', 'list', '--repo', REPO]);
  if (!result.ok) {
    // Do NOT return [] on failure. An empty list would make the restore logic
    // believe EVERY secret is missing and overwrite them all from backup — a
    // destructive decision driven by a transient auth/API error. Fail loudly
    // instead so the run surfaces the real problem rather than acting on bad
    // data.
    const detail = result.stderr || result.error?.message || 'unknown error';
    throw new Error(`Failed to list secrets via 'gh secret list': ${detail}`);
  }

  return parseSecretListOutput(result.stdout);
}

async function audit() {
  log('🔍 Auditing credentials...', 'info');

  const current = await getCurrentSecrets();
  const { backup, valid: backupValid, reason: backupReason } = loadBackup();
  if (!backupValid) {
    log(`Backup not usable for destructive decisions: ${backupReason}`, 'warning');
  }
  const currentSet = new Set(current);
  // A backup entry only counts as restorable when it has a truthy value.
  const backupKeys = Object.keys(backup).filter((k) => backup[k]);
  const backupSet = new Set(backupKeys);

  const missing = [];
  const inBackupNotGitHub = [];
  const inGitHubNotBackup = [];
  const ok = [];

  // Classify the UNION of registry names and (usable) backup keys — not just
  // the hardcoded registry. A credential present in the backup but absent from
  // the registry (e.g. a newly added one not yet registered) must still be
  // restorable; iterating the registry alone would silently skip it while
  // reporting success. Criticality remains registry-derived metadata (a
  // non-registry secret defaults to non-critical).
  const allNames = new Set([...Object.keys(CREDENTIAL_REGISTRY), ...backupKeys]);

  for (const name of allNames) {
    const info = CREDENTIAL_REGISTRY[name];
    const critical = info ? info.critical : false;
    const inGitHub = currentSet.has(name);
    const inBackup = backupSet.has(name);

    if (inGitHub && inBackup) {
      ok.push(name);
    } else if (inGitHub && !inBackup) {
      inGitHubNotBackup.push(name);
    } else if (!inGitHub && inBackup) {
      inBackupNotGitHub.push(name);
    } else if (critical && !inGitHub) {
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
    backupValid,
    backupReason,
  };
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

async function refresh() {
  // Credential rotation requires provider-specific logic (Twitter, Stripe,
  // Google OAuth, etc. all rotate differently) that does NOT exist anywhere in
  // this repo yet. Rather than fabricate rotation or imply work happened, be
  // honest: this is a no-op until a real rotation source is wired in.
  log('Credential rotation is not implemented for any provider yet — refresh is a no-op.', 'warning');
  return { supported: false };
}

async function main() {
  console.log('═══════════════════════════════════════');
  console.log('🤖 Credential Autonomy Agent');
  console.log('═══════════════════════════════════════');
  console.log(`   Action: ${ACTION}`);
  console.log(`   Dry Run: ${DRY_RUN}`);
  console.log(`   Repo: ${REPO}`);
  console.log('');

  let actionsTaken = [];
  // Tracks whether the run should escalate (non-zero exit + status=failure) so
  // that heal-on-failure automation can actually trigger. Set when: a critical
  // secret remains unresolved after restore attempts, a restore itself failed,
  // or a destructive cleanup was refused because the backup was untrustworthy.
  let hadFailure = false;

  try {
    switch (ACTION) {
      case 'audit': {
        const auditResult = await audit();
        actionsTaken.push(`audited:${auditResult.ok.length}`);
        if (auditResult.missing.length > 0) {
          log(`Critical secrets missing (not in GitHub, not in backup): ${auditResult.missing.join(', ')}`, 'error');
          hadFailure = true;
        }
        break;
      }

      case 'restore': {
        const auditForRestore = await audit();
        const { restored, failed } = await restore(auditForRestore.inBackupNotGitHub);
        actionsTaken.push(`restored:${restored.length}`);
        if (failed.length > 0) {
          log(`Restore failed for: ${failed.join(', ')}`, 'error');
          hadFailure = true;
        }
        // Critical secrets that could not be restored (never in backup, or the
        // restore call failed) are still missing → escalate.
        const criticalStillMissing = [
          ...auditForRestore.missing,
          ...auditForRestore.inBackupNotGitHub.filter(
            (n) => CREDENTIAL_REGISTRY[n]?.critical && !restored.includes(n)
          ),
        ];
        if (criticalStillMissing.length > 0) {
          log(`Critical secrets still missing after restore: ${[...new Set(criticalStillMissing)].join(', ')}`, 'error');
          hadFailure = true;
        }
        break;
      }

      case 'cleanup': {
        const auditForCleanup = await audit();
        // P0 SAFETY GATE: never delete GitHub secrets based on an empty /
        // malformed / truncated backup. If the backup didn't validate, every
        // real secret would look "not in backup" and get wiped. Refuse.
        if (!auditForCleanup.backupValid) {
          log(`Refusing to run cleanup: backup is not trustworthy (${auditForCleanup.backupReason}). Deleting secrets that merely appear "not in backup" could destroy real credentials.`, 'error');
          actionsTaken.push('cleanup:refused');
          hadFailure = true;
          break;
        }
        const cleaned = await cleanup(auditForCleanup.inGitHubNotBackup);
        actionsTaken.push(`cleaned:${cleaned.length}`);
        break;
      }

      case 'refresh': {
        await audit();
        await refresh();
        // Honest no-op: don't claim rotation work occurred.
        actionsTaken.push('refresh:unsupported');
        break;
      }

      case 'full':
      default: {
        // Do everything
        const fullAudit = await audit();

        // 1. Restore missing
        if (fullAudit.inBackupNotGitHub.length > 0) {
          const { restored, failed } = await restore(fullAudit.inBackupNotGitHub);
          actionsTaken.push(`restored:${restored.length}`);
          if (failed.length > 0) {
            log(`Restore failed for: ${failed.join(', ')}`, 'error');
            hadFailure = true;
          }
          const criticalNotRestored = fullAudit.inBackupNotGitHub.filter(
            (n) => CREDENTIAL_REGISTRY[n]?.critical && !restored.includes(n)
          );
          if (criticalNotRestored.length > 0) {
            hadFailure = true;
          }
        }

        // 2. Report critical missing (can't restore if not in backup) — escalate
        if (fullAudit.missing.length > 0) {
          log(`Critical secrets missing from backup: ${fullAudit.missing.join(', ')}`, 'error');
          actionsTaken.push(`missing:${fullAudit.missing.length}`);
          hadFailure = true;
        }

        // 3. Log extras (don't delete in `full` — might be intentional; use the
        //    dedicated `cleanup` action, which is backup-validity-gated).
        if (fullAudit.inGitHubNotBackup.length > 0) {
          log(`Extra secrets (not in backup): ${fullAudit.inGitHubNotBackup.join(', ')}`, 'info');
          actionsTaken.push(`extras:${fullAudit.inGitHubNotBackup.length}`);
        }

        actionsTaken.push(`ok:${fullAudit.ok.length}`);
        break;
      }
    }
  } catch (error) {
    log(`Agent failed: ${error.message}`, 'error');
    console.log(error.stack);
    if (process.env.GITHUB_OUTPUT) {
      require('fs').appendFileSync(process.env.GITHUB_OUTPUT,
        `\nstatus=failure\nactions_taken=${actionsTaken.join(';')}\n`);
    }
    process.exit(1);
  }

  const status = hadFailure ? 'failure' : 'success';
  console.log('\n═══════════════════════════════════════');
  console.log(`${hadFailure ? '❌' : '✅'} Credential Autonomy Agent Complete (${status})`);
  console.log('═══════════════════════════════════════');
  console.log(`   Actions: ${actionsTaken.join(', ')}`);

  // Output for GitHub Actions
  if (process.env.GITHUB_OUTPUT) {
    require('fs').appendFileSync(process.env.GITHUB_OUTPUT,
      `\nstatus=${status}\nactions_taken=${actionsTaken.join(';')}\n`);
  }

  process.exit(hadFailure ? 1 : 0);
}

// Only run the agent (which calls process.exit) when invoked as a CLI, so the
// pure helpers can be require()'d and unit-tested.
if (require.main === module) {
  main();
}

module.exports = {
  loadBackup,
  parseSecretListOutput,
  CREDENTIAL_REGISTRY,
  MIN_EXPECTED_BACKUP_KEYS,
};
