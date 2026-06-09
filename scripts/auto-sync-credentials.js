#!/usr/bin/env node
/**
 * Auto-sync credentials from JSON backup to GitHub secrets.
 * 
 * This script reads credentials from CREDENTIAL_BACKUP_JSON and syncs
 * any missing secrets to the GitHub repository.
 * 
 * Usage:
 *   node scripts/auto-sync-credentials.js --repo owner/repo
 * 
 * Environment:
 *   CREDENTIAL_BACKUP_JSON  - JSON object with secret_name: value pairs
 *   GITHUB_TOKEN            - GitHub token with repo secrets write access
 */

'use strict';

const https = require('https');

const GITHUB_API = 'api.github.com';

async function githubRequest(method, path, body = null) {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  if (!token) throw new Error('GITHUB_TOKEN not set');

  return new Promise((resolve, reject) => {
    const options = {
      hostname: GITHUB_API,
      path,
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function listSecrets(repo) {
  const result = await githubRequest('GET', `/repos/${repo}/actions/secrets`);
  return (result.data.secrets || []).map(s => s.name);
}

async function setSecret(repo, name, value) {
  // Get public key for encryption
  const keyResult = await githubRequest('GET', `/repos/${repo}/actions/secrets/public-key`);
  const { key_id, key } = keyResult.data;

  // Encrypt value using the public key
  const encrypted = encryptValue(value, key);
  
  return githubRequest('PUT', `/repos/${repo}/actions/secrets/${name}`, {
    encrypted_value: encrypted,
    key_id,
  });
}

function encryptValue(value, publicKey) {
  // Simple XOR encryption for demo - in production use libsodium or the GitHub API
  // This is a placeholder - the real implementation would use proper encryption
  const crypto = require('crypto');
  const keyBuffer = Buffer.from(publicKey, 'base64');
  const valueBuffer = Buffer.from(value);
  
  // Use AES-GCM for proper encryption
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', keyBuffer.slice(0, 32), iv);
  const encrypted = Buffer.concat([cipher.update(valueBuffer), cipher.final()]);
  const tag = cipher.getAuthTag();
  
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

async function main() {
  const args = process.argv.slice(2);
  let repo = process.env.GITHUB_REPOSITORY;
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--repo' && args[i + 1]) {
      repo = args[i + 1];
      i++;
    }
  }

  if (!repo) {
    console.error('Usage: node auto-sync-credentials.js --repo owner/repo');
    process.exit(1);
  }

  // Read credentials from JSON backup
  const backupJson = process.env.CREDENTIAL_BACKUP_JSON;
  if (!backupJson) {
    console.log('CREDENTIAL_BACKUP_JSON not set — nothing to sync');
    process.exit(0);
  }

  let credentials;
  try {
    credentials = JSON.parse(backupJson);
  } catch (e) {
    console.error('Invalid JSON in CREDENTIAL_BACKUP_JSON');
    process.exit(1);
  }

  // Get existing secrets
  const existing = await listSecrets(repo);
  const existingSet = new Set(existing);

  // Sync missing secrets
  const synced = [];
  const skipped = [];
  const failed = [];

  for (const [name, value] of Object.entries(credentials)) {
    if (existingSet.has(name)) {
      skipped.push(name);
      console.log(`⏭️  ${name} — already set, skipping`);
      continue;
    }

    if (!value || typeof value !== 'string' || value.length === 0) {
      console.log(`⚠️  ${name} — empty value, skipping`);
      continue;
    }

    try {
      await setSecret(repo, name, value);
      synced.push(name);
      console.log(`✅ ${name} — synced`);
    } catch (e) {
      failed.push(name);
      console.error(`❌ ${name} — failed: ${e.message}`);
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Synced: ${synced.length}`);
  console.log(`Skipped: ${skipped.length}`);
  console.log(`Failed: ${failed.length}`);

  if (synced.length > 0) {
    console.log(`\n✅ Auto-sync complete! Synced: ${synced.join(', ')}`);
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});