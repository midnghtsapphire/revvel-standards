#!/usr/bin/env node
/**
 * Deploy Vercel Workflow Setup
 * 
 * Adds deploy.yml to any repo - automates deployment for all web projects
 * 
 * Usage: node scripts/deploy-vercel.js --repo=owner/repo
 */

const fs = require('fs');
const crypto = require('crypto');
const { execSync } = require('child_process');
const GIT_USER_NAME = 'revvel-automation[bot]';
const GIT_USER_EMAIL = 'revvel-automation@users.noreply.github.com';

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

const runId = Date.now();
const branch = `automation/vercel-deploy-${runId}-${crypto.randomBytes(4).toString('hex')}`;
const tempDir = `/tmp/vercel-deploy-${repo.replace('/', '-')}-${runId}`;
const targetDir = `${tempDir}/target`;
const prBodyFile = `${tempDir}/pr-body.md`;
const cleanupTempDir = () => {
  if (!tempDir.startsWith('/tmp/vercel-deploy-')) {
    throw new Error(`Refusing to delete unexpected temp path: ${tempDir}`);
  }
  execSync(`rm -rf "${tempDir}"`, { stdio: 'inherit' });
};

execSync(`mkdir -p "${tempDir}"`, { stdio: 'inherit' });
try {
  execSync(`gh repo clone ${repo} "${targetDir}"`, { stdio: 'inherit' });
} catch (error) {
  throw new Error(`Failed to clone ${repo}. Verify repo format (owner/repo), run "gh auth status", and check repository permissions. (${error.message})`);
}
execSync('mkdir -p .github/workflows', { cwd: targetDir, stdio: 'inherit' });
fs.writeFileSync(`${targetDir}/.github/workflows/deploy.yml`, WORKFLOW_TEMPLATE);
fs.writeFileSync(prBodyFile, `Adds .github/workflows/deploy.yml for Vercel auto-deploy.\n\n${DEPLOY_SECRETS}\n`);

execSync(`git checkout -b ${branch}`, { cwd: targetDir, stdio: 'inherit' });
execSync('git add .github/workflows/deploy.yml', { cwd: targetDir, stdio: 'inherit' });

let hasChanges = true;
try {
  execSync('git diff --cached --quiet', { cwd: targetDir, stdio: 'pipe' });
  hasChanges = false;
} catch (error) {
  // git diff --quiet exits 1 when differences are present.
  if (error.status !== 1) {
    throw error;
  }
}

if (!hasChanges) {
  console.log('No changes detected. deploy.yml is already up to date.');
  cleanupTempDir();
  process.exit(0);
}

execSync(`git config user.name "${GIT_USER_NAME}"`, { cwd: targetDir, stdio: 'inherit' });
execSync(`git config user.email "${GIT_USER_EMAIL}"`, { cwd: targetDir, stdio: 'inherit' });
execSync('git commit -m "ci: add Vercel deploy workflow"', { cwd: targetDir, stdio: 'inherit' });
execSync(`git push -u origin ${branch}`, { cwd: targetDir, stdio: 'inherit' });
execSync(
  `gh pr create --repo ${repo} --base main --head ${branch} --title "ci: add Vercel deploy workflow" --body-file "${prBodyFile}"`,
  { cwd: targetDir, stdio: 'inherit' }
);
console.log(`Opened PR in ${repo} from branch ${branch}.`);
cleanupTempDir();
