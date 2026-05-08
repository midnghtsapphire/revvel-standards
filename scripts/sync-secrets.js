#!/usr/bin/env node
/**
 * Secrets Propagation Script
 * 
 * Reads from SSOT: docs/SECRETS_MATRIX.md
 * Syncs to ANY target repo.
 * 
 * Usage: node scripts/sync-secrets.js --repo=owner/repo
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const REVVEL_STANDARDS = path.join(__dirname, '..');
const SECRETS_DOC = path.join(REVVEL_STANDARDS, 'docs/SECRETS_MATRIX.md');
const SECRETS_LEGACY = path.join(REVVEL_STANDARDS, 'docs/SECRETS_MANAGEMENT.md');
const ENV_TEMPLATE = path.join(REVVEL_STANDARDS, '.env.example');

// Parse SSOT matrix for all secrets
function parseSecretsMatrix() {
  const fileToCheck = fs.existsSync(SECRETS_DOC) ? SECRETS_DOC : SECRETS_LEGACY;
  const content = fs.readFileSync(fileToCheck, 'utf-8');
  const secrets = {
    required: [],
    optional: [],
    all: []
  };
  
  // Match table format: | `SECRET_NAME` |
  const regex = /\| \`([A-Z_][A-Z0-9_]*)\` \|/g;
  let match;
  const found = new Set();
  
  while ((match = regex.exec(content)) !== null) {
    const secret = match[1];
    // Skip workflow filenames
    if (!secret.endsWith('.yml') && !secret.endsWith('.yaml')) {
      found.add(secret);
    }
  }
  
  // Also read .env.example
  if (fs.existsSync(ENV_TEMPLATE)) {
    const env = fs.readFileSync(ENV_TEMPLATE, 'utf-8');
    env.split('\n').forEach(line => {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=/);
      if (m) found.add(m[1]);
    });
  }
  
  const all = [...found].sort();
  return {
    required: all.filter(s => !['GROQ_API_KEY', 'JULES_API_KEY', 'RECURSE_ML_API_KEY', 'HEYGEN_API_KEY', 'LEONARDO_API_KEY', 'ELEVEN_API_KEY'].includes(s)),
    optional: all.filter(s => ['GROQ_API_KEY', 'JULES_API_KEY', 'RECURSE_ML_API_KEY', 'HEYGEN_API_KEY', 'LEONARDO_API_KEY', 'ELEVEN_API_KEY'].includes(s)),
    all
  };
}

// Get GH CLI
function ghAPI(endpoint, method = 'GET', body = null) {
  const args = ['api', endpoint];
  if (method !== 'GET') args.unshift('-X', method);
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
  const matrix = parseSecretsMatrix();
  console.log('Secrets from SSOT (docs/SECRETS_MATRIX.md):');
  console.log(`  Total: ${matrix.all.length}`);
  console.log(`  Required: ${matrix.required.length}`);
  console.log(`  Optional: ${matrix.optional.length}`);
  console.log('');
  console.log('Required for ALL projects:');
  console.log(`  ${matrix.required.slice(0, 8).join(', ')}`);
  console.log('');
  console.log('Optional (depends on features):');
  console.log(`  ${matrix.optional.join(', ')}`);
  process.exit(0);
}

console.log(`Syncing to ${repo}...`);
const docSecrets = parseSecretsMatrix();

console.log(`Found ${docSecrets.all.length} secrets/variables to sync`);

// Create .env.example update with REQUIRED + OPTIONAL sections
const requiredLines = docSecrets.required.map(v => `${v}=`).join('\n');
const optionalLines = docSecrets.optional.map(v => `# ${v}=`).join('\n');
const output = `# REQUIRED FOR ALL PROJECTS\n${requiredLines}\n\n# OPTIONAL (depends on features)\n${optionalLines}`;

const localFile = `/tmp/${repo.replace('/', '-')}.env.example`;

fs.writeFileSync(localFile, `# Synced from revvel-standards (SSOT)\n# ${new Date().toISOString()}\n\n${output}\n`);

console.log(`Created: ${localFile}`);
console.log('');
console.log('In target repo, add secrets via:');
console.log(`  gh secret set SECRET_NAME --repo=${repo}`);