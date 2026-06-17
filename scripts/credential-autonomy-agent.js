#!/usr/bin/env node
/**
 * Credential Autonomy Agent
 * 
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

function run(command, args = [], options = {}) {
  // spawnSync with an explicit argv array does NOT spawn a shell, so args
  // cannot be shell-injected. All callers pass a fixed command ('gh').
  // nosemgrep: javascript.lang.security.detect-child-process.detect-child-process -- arg array (no shell); command is a fixed literal at every call site
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    ...options,
  });
  return {
    ok: result.status === 0,
    stdout: result.stdout?.trim() || '',
    stderr: result.stderr?.trim() || '',
    error: result.error,
  };
}

function parseBackupJSON() {
  if (!BACKUP_JSON) {
    log('CREDENTIAL_BACKUP_JSON not set', 'error');
    return {};
  }
  try {
    return JSON.parse(BACKUP_JSON);
  } catch (e) {
    log(`Invalid JSON in CREDENTIAL_BACKUP_JSON: ${e.message}`, 'error');
    return {};
  }
}

async function getCurrentSecrets() {
  const result = run('gh', ['secret', 'list', '--repo', REPO]);
  if (!result.ok) {
    log('Failed to list secrets', 'error');
    return [];
  }
  
  return result.stdout
    .split('\n')
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
      const result = run('gh', ['secret', 'set', name, '--body', value, '--repo', REPO]);
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

async function refresh(expiringSecrets) {
  // For now, just report - actual rotation would need provider-specific logic
  if (!expiringSecrets || expiringSecrets.length === 0) {
    log('Nothing to refresh', 'info');
    return [];
  }
  
  log(`🔄 ${expiringSecrets.length} secrets may need rotation:`, 'warning');
  console.log(`   ${expiringSecrets.join(', ')}`);
  
  // In the future, this could trigger rotation workflows
  return [];
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
  
  try {
    switch (ACTION) {
      case 'audit':
        const auditResult = await audit();
        actionsTaken.push(`audited:${auditResult.ok.length}`);
        break;
        
      case 'restore':
        const auditForRestore = await audit();
        const restored = await restore(auditForRestore.inBackupNotGitHub);
        actionsTaken.push(`restored:${restored.length}`);
        break;
        
      case 'cleanup':
        const auditForCleanup = await audit();
        const cleaned = await cleanup(auditForCleanup.inGitHubNotBackup);
        actionsTaken.push(`cleaned:${cleaned.length}`);
        break;
        
      case 'refresh':
        const auditForRefresh = await audit();
        const refreshed = await refresh([]);
        actionsTaken.push(`refreshed:${refreshed.length}`);
        break;
        
      case 'full':
      default:
        // Do everything
        const fullAudit = await audit();
        
        // 1. Restore missing
        if (fullAudit.inBackupNotGitHub.length > 0) {
          const restored = await restore(fullAudit.inBackupNotGitHub);
          actionsTaken.push(`restored:${restored.length}`);
        }
        
        // 2. Report critical missing (can't restore if not in backup)
        if (fullAudit.missing.length > 0) {
          log(`Critical secrets missing from backup: ${fullAudit.missing.join(', ')}`, 'error');
          actionsTaken.push(`missing:${fullAudit.missing.length}`);
        }
        
        // 3. Log extras (don't delete - might be intentional)
        if (fullAudit.inGitHubNotBackup.length > 0) {
          log(`Extra secrets (not in backup): ${fullAudit.inGitHubNotBackup.join(', ')}`, 'info');
          actionsTaken.push(`extras:${fullAudit.inGitHubNotBackup.length}`);
        }
        
        actionsTaken.push(`ok:${fullAudit.ok.length}`);
        break;
    }
  } catch (error) {
    log(`Agent failed: ${error.message}`, 'error');
    console.log(error.stack);
    process.exit(1);
  }
  
  console.log('\n═══════════════════════════════════════');
  console.log('✅ Credential Autonomy Agent Complete');
  console.log('═══════════════════════════════════════');
  console.log(`   Actions: ${actionsTaken.join(', ')}`);
  
  // Output for GitHub Actions
  if (process.env.GITHUB_OUTPUT) {
    require('fs').appendFileSync(process.env.GITHUB_OUTPUT, 
      `\nstatus=success\nactions_taken=${actionsTaken.join(';')}\n`);
  }
  
  process.exit(0);
}

main();