#!/usr/bin/env node
/**
 * R&D Research Fleet - Auto GitHub Join
 * Creates branded fork and sets up workflows on first run
 */

const { execSync, execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const CONFIG = {
  repoName: 'rnd-research-fleet',
  orgName: 'freedomangelcorp', // Your org
  description: 'R&D Research Fleet - Autonomous Deep Research Engine',
  workflowPath: './.github/workflows',
  defaultBranch: 'main'
};

// ASCII art
const LOGO = `
╔══════════════════════════════════════════════╗
║  🔬 R&D Research Fleet - Auto Setup        ║
║  Autonomous Deep Research Engine            ║
╚══════════════════════════════════════════════╝
`;

async function main() {
  console.log(LOGO);
  console.log('');

  // Check if already set up
  if (isGitHubConnected()) {
    console.log('✅ Already connected to GitHub');
    console.log('   To re-setup, delete .git folder and run again');
    return;
  }

  // Get GitHub token
  const token = process.env.GITHUB_TOKEN || 
                (await prompt('Enter your GitHub Personal Access Token: '));
  
  if (!token) {
    console.error('❌ GitHub token required');
    console.log('');
    console.log('Get a token at: https://github.com/settings/tokens');
    console.log('Required scopes: repo, workflow, admin:org');
    process.exit(1);
  }

  // Create repo on GitHub
  console.log('');
  console.log('📤 Creating GitHub repository...');
  
  const repoCreated = await createGitHubRepo(token);
  
  if (repoCreated) {
    console.log('✅ Repository created!');
    console.log('');
    console.log('📋 Next steps:');
    console.log('1. Push your code: git push origin main');
    console.log('2. Enable Actions on GitHub');
    console.log('3. Add secrets in GitHub Settings');
    console.log('');
    
    // Setup secrets reminder
    console.log('🔐 Add these secrets in GitHub Settings > Secrets:');
    console.log('   - OPENROUTER_API_KEY (optional)');
    console.log('   - GITHUB_TOKEN (for Actions)');
    console.log('');
  }

  // Initialize local git
  console.log('🔄 Initializing local Git...');
  initGit(token);

  console.log('');
  console.log('═'.repeat(50));
  console.log('✅ SETUP COMPLETE!');
  console.log('═'.repeat(50));
  console.log('');
  console.log('🚀 Run: node perplexity-research.js "your question"');
  console.log('');
}

function isGitHubConnected() {
  try {
    execSync('git remote get-url origin', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

async function createGitHubRepo(token) {
  try {
    // Check if gh CLI is available
    try {
      execSync('gh auth status', { stdio: 'pipe' });
      // Use gh CLI
      execSync(`gh repo create ${CONFIG.repoName} --public --clone --description "${CONFIG.description}"`, {
        env: { ...process.env, GH_TOKEN: token, GITHUB_TOKEN: token },
        stdio: 'inherit'
      });
      return true;
    } catch {
      // gh not configured, use API
    }

    // Use GitHub API directly
    const response = await fetch('https://api.github.com/user/repos', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json'
      },
      body: JSON.stringify({
        name: CONFIG.repoName,
        description: CONFIG.description,
        public: true,
        auto_init: true
      })
    });

    if (!response.ok) {
      const error = await response.json();
      if (error.message?.includes('already exists')) {
        console.log('ℹ️  Repository already exists');
        return true;
      }
      throw new Error(error.message);
    }

    const data = await response.json();
    console.log(`   Repo URL: ${data.html_url}`);
    return true;

  } catch (e) {
    console.log(`⚠️  Could not create repo: ${e.message}`);
    console.log('   You can create it manually at https://github.com/new');
    return false;
  }
}

function initGit(token) {
  try {
    // Initialize if not already
    execSync('git init', { stdio: 'pipe' });
    
    // Set remote. Pass the URL as an argv element (no shell) so the token and
    // any user-derived path segment cannot be interpreted as shell syntax.
    const remoteUrl = `https://x-access-token:${token}@github.com/${process.env.USER || 'user'}/${CONFIG.repoName}.git`;
    execFileSync('git', ['remote', 'add', 'origin', remoteUrl], { stdio: 'pipe' });
    
    // Configure git
    execSync('git config user.email "research@rnd-fleet.com"', { stdio: 'pipe' });
    execSync('git config user.name "R&D Research Fleet"', { stdio: 'pipe' });
    
    // Create initial commit if needed
    try {
      execSync('git log --oneline -1', { stdio: 'pipe' });
    } catch {
      execSync('git add .', { stdio: 'pipe' });
      execSync('git commit -m "Initial commit - R&D Research Fleet v1.0.0"', { stdio: 'pipe' });
    }
    
    console.log('✅ Git initialized');
    
  } catch (e) {
    console.log(`⚠️  Git init: ${e.message}`);
  }
}

function prompt(question) {
  const readline = require('readline');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

// Export for use as module
module.exports = { main, createGitHubRepo, initGit };

// Run if called directly
if (require.main === module) {
  main().catch(e => {
    console.error('Error:', e.message);
    process.exit(1);
  });
}
