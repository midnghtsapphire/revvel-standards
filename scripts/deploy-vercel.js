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

// In a real implementation, this would:
// 1. Clone the repo
// 2. Create .github/workflows/deploy.yml
// 3. Push to remote

console.log(`
TODO: Clone ${repo} and add deploy workflow:

1. Create .github/workflows/deploy.yml:
${WORKFLOW_TEMPLATE}

2. Add secrets via GitHub:
   gh secret set VERCEL_TOKEN --repo=${repo}
   gh secret set VERCEL_ORG_ID --repo=${repo}
   gh secret set VERCEL_PROJECT_ID --repo=${repo}

3. Connect repo in Vercel dashboard:
   https://vercel.com/new?import=https://github.com/${repo}
`);

console.log(`
For Soul2Bowl specifically:
- Go to: https://vercel.com/new?import=https://github.com/MIDNGHTSAPPHIRE/Soul2Bowl
- Connect GitHub → Select Soul2Bowl repo
- Deploy
- Add secrets to GitHub: gh secret set VERCEL_* ...
`);