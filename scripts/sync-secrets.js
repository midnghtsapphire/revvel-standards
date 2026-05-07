#!/usr/bin/env node
/**
 * Secrets Propagation Script
 * 
 * Reads .env.example from revvel-standards and syncs to target repos.
 * Uses docs/SECRETS_MANAGEMENT.md as source of truth.
 * 
 * Usage: node scripts/sync-secrets.js --repo owner/repo
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const REVVEL_STANDARDS = path.join(__dirname, '..');
const SECRETS_DOC = path.join(REVVEL_STANDARDS, 'docs/SECRETS_MANAGEMENT.md');
const ENV_TEMPLATE = path.join(REVVEL_STANDARDS, '.env.example');

// Parse secrets from documentation
function parseSecretsFromDoc() {
  const content = fs.readFileSync(SECRETS_DOC, 'utf-8');
  const secrets = [];
  
  // Match table rows with secret names
  const regex = /\| `([A-Z_]+)` \|/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    secrets.push(match[1]);
  }
  
  return [...new Set(secrets)]; // Dedupe
}

// Parse .env.example
function parseEnvTemplate() {
  const content = fs.readFileSync(ENV_TEMPLATE, 'utf-8');
  const vars = [];
  
  content.split('\n').forEach(line => {
    const match = line.match(/^([A-Z_]+)=/);
    if (match && !line.startsWith('#')) {
      vars.push(match[1]);
    }
  });
  
  return vars;
}

// Get GH CLI
function ghAPI(endpoint, method = 'GET', body = null) {
  const args = ['api', endpoint];
  if (method !== 'GET') args.push('-X', method);

  if (body) args.push('-f', JSON.stringify(body));
  return execSync(`gh ${args.join(' ')}`, { encoding: 'utf-8' });
}

// Main
const args = process.argv.slice(2);
const repoFlag = args.find(a => a.startsWith('--repo='));
const repo = repoFlag ? repoFlag.split('=')[1] : null;

if (!repo) {
  console.log('Usage: node scripts/sync-secrets.js --repo=owner/repo');
  console.log('');
  console.log('Secrets found in docs/SECRETS_MANAGEMENT.md:');
  const docSecrets = parseSecretsFromDoc();
  console.log(`  Total: ${docSecrets.length}`);
  console.log(`  ${docSecrets.slice(0, 10).join(', ')}...`);
  console.log('');
  console.log('Variables in .env.example:');
  const envVars = parseEnvTemplate();
  console.log(`  Total: ${envVars.length}`);
  process.exit(0);
}

console.log(`Syncing to ${repo}...`);
const docSecrets = parseSecretsFromDoc();
const envVars = parseEnvTemplate();

// Combine both sources
const allVars = [...new Set([...docSecrets, ...envVars])];

console.log(`Found ${allVars.length} secrets/variables to sync`);

// Create .env.example update
const output = allVars.map(v => `${v}=`).join('\n');
const localFile = `/tmp/${repo.replace('/', '-')}.env.example`;

fs.writeFileSync(localFile, `# Synced from revvel-standards\n# ${new Date().toISOString()}\n\n${output}\n`);

console.log(`Created: ${localFile}`);
console.log('');
console.log('Next step: open a PR in the target repo with this file as `.env.example`.');
