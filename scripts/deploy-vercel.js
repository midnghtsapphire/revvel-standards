#!/usr/bin/env node
/**
 * Deploy Vercel Workflow Setup
 * 
 * Adds deploy.yml to any repo - automates deployment for all web projects
 * 
 * Usage: node scripts/deploy-vercel.js --repo=owner/repo
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const WORKFLOW_TEMPLATE = `name: Deploy
on:
  push:
    branches: [main]
  workflow_dispatch:
  pull_request:
    branches: [main]

permissions:
  contents: read

jobs:
  deploy:
    name: Deploy to Vercel
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install Dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: \${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: \${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: \${{ secrets.VERCEL_PROJECT_ID }}
          github-token: \${{ secrets.GITHUB_TOKEN }}

      - name: Report deployment
        if: always()
        run: |
          echo "::warning::Deployment \${{ job.status }}"
`;

const DEPLOY_SECRETS = `## Required Secrets

| Secret | Where to get |
|--------|-------------|
| \`VERCEL_TOKEN\` | vercel.com/account/tokens |
| \`VERCEL_ORG_ID\` | Project Settings → General |
| \`VERCEL_PROJECT_ID\` | Project Settings → General |

## Manual Deploy

\`\`\`bash
gh workflow run deploy.yml
\`\`\`
`;

// Parse args
const args = process.argv.slice(2);
const repoFlag = args.find(a => a.startsWith('--repo='));
const repo = repoFlag ? repoFlag.split('=')[1] : null;

if (!repo) {
  console.log('Usage: node scripts/deploy-vercel.js --repo=owner/repo');
  console.log('');
  console.log('This script creates .github/workflows/deploy.yml for Vercel auto-deploy.');
  console.log('');
  console.log('Required secrets: VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID');
  process.exit(0);
}

console.log(`Setting up Vercel deploy for ${repo}...`);

const [owner, repoName] = repo.split('/');

// Use GitHub API via gh to create/update the workflow file in the target repo
try {
  // Check if the workflow already exists
  let existingSha = null;
  try {
    const existing = execSync(
      `gh api repos/${repo}/contents/.github/workflows/deploy.yml`,
      { encoding: 'utf-8' }
    );
    existingSha = JSON.parse(existing).sha;
    console.log('Existing deploy.yml found — updating...');
  } catch (err) {
    // 404 = file doesn't exist yet (expected on first run); other errors bubble up
    if (!err.message.includes('404') && !err.message.includes('Not Found')) {
      throw err;
    }
    console.log('No existing deploy.yml — creating...');
  }

  const content = Buffer.from(WORKFLOW_TEMPLATE).toString('base64');
  const body = JSON.stringify({
    message: 'chore: add Vercel deploy workflow from revvel-standards',
    content,
    ...(existingSha ? { sha: existingSha } : {})
  });

  execSync(
    `gh api repos/${repo}/contents/.github/workflows/deploy.yml -X PUT --input -`,
    { input: body, encoding: 'utf-8', stdio: ['pipe', 'inherit', 'inherit'] }
  );

  console.log(`✅ Created/updated .github/workflows/deploy.yml in ${repo}`);
  console.log('');
  console.log('Next steps — add required secrets to the repo:');
  console.log(`  gh secret set VERCEL_TOKEN --repo=${repo}`);
  console.log(`  gh secret set VERCEL_ORG_ID --repo=${repo}`);
  console.log(`  gh secret set VERCEL_PROJECT_ID --repo=${repo}`);
  console.log('');
  console.log('Then connect the repo in the Vercel dashboard:');
  console.log(`  https://vercel.com/new?import=https://github.com/${repo}`);
} catch (err) {
  console.error(`❌ Failed to set up deploy workflow: ${err.message}`);
  process.exit(1);
}