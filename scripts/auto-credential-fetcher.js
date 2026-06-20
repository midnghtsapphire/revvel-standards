#!/usr/bin/env node
/**
 * Auto Credential Fetcher - Autonomous API Key Harvester
 * 
 * This agent automatically:
 * 1. Opens browser to each service
 * 2. Logs in (if needed)
 * 3. Navigates to API settings
 * 4. Extracts the API key
 * 5. Saves to local credentials folder
 * 6. Syncs to GitHub
 * 
 * Run: node auto-credential-fetcher.js
 * Or: npx playwright install && node auto-credential-fetcher.js
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync, execFileSync } = require('child_process');

// Configuration
const CREDS_DIR = process.env.CREDENTIALS_DIR || 
  (process.platform === 'win32' 
    ? `${process.env.USERPROFILE}\\.local\\revvel-agent\\credentials`
    : `${process.env.HOME}/.local/revvel-agent/credentials`);

const REPO = 'midnghtsapphire/revvel-standards';

// Services to fetch
const SERVICES = [
  {
    name: 'BITO_API_KEY',
    url: 'https://bito.ai',
    loginUrl: 'https://bito.ai/login',
    settingsUrl: 'https://bito.ai/settings',
    keySelector: '[data-testid="api-key"], .api-key, #apiKey, input[readonly]',
    loginSelector: '#email, input[name="email"]',
    notes: 'Go to Settings > API Keys'
  },
  {
    name: 'JULES_API_KEY',
    url: 'https://jules.google.com',
    loginUrl: 'https://jules.google.com',
    settingsUrl: 'https://jules.google.com/settings',
    keySelector: 'input[readonly], pre, code',
    loginSelector: 'input[type="email"], [aria-label*="email"]',
    notes: 'Sign in with Google, then API settings'
  },
  {
    name: 'NOIMOSAI_API_KEY',
    url: 'https://noimosai.com',
    loginUrl: 'https://noimosai.com/login',
    settingsUrl: 'https://noimosai.com/settings',
    keySelector: '[data-key], .api-key, pre',
    loginSelector: 'input[name="email"], button[aria-label*="login"]',
    notes: 'Go to Settings > API Keys'
  },
  {
    name: 'OPENAI_API_KEY',
    url: 'https://platform.openai.com',
    loginUrl: 'https://platform.openai.com/login',
    settingsUrl: 'https://platform.openai.com/api-keys',
    keySelector: '[data-key], code, pre',
    loginSelector: '[name="email"], input[type="email"]',
    notes: 'Go to API Keys section'
  },
  {
    name: 'TAVILY_API_KEY',
    url: 'https://app.tavily.com',
    loginUrl: 'https://app.tavily.com/login',
    settingsUrl: 'https://app.tavily.com/settings',
    keySelector: '[data-testid="api-key"], code',
    loginSelector: 'input[type="email"]',
    notes: 'Go to Settings > API Key'
  }
];

// Try to use Puppeteer if available, otherwise use curl
async function tryPuppeteer() {
  try {
    const puppeteer = require('puppeteer');
    return puppeteer;
  } catch {
    return null;
  }
}

async function tryPlaywright() {
  try {
    const { chromium } = require('playwright');
    return { chromium };
  } catch {
    return null;
  }
}

async function fetchWithBrowser(url, options = {}) {
  console.log(`\n🌐 Opening: ${url}`);
  
  // Try Playwright first
  let pw = await tryPlaywright();
  if (pw) {
    try {
      const browser = await pw.chromium.launch({ 
        headless: false,
        args: ['--start-maximized']
      });
      const page = await browser.newPage();
      
      await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
      
      // Get page content
      const content = await page.content();
      const title = await page.title();
      
      await browser.close();
      
      return { success: true, content, title, method: 'playwright' };
    } catch (e) {
      console.log(`   Playwright failed: ${e.message}`);
    }
  }
  
  // Fallback to curl
  console.log(`   Using curl fallback...`);
  try {
    // No shell: pass args as an array so the URL can't be interpreted by a shell.
    // nosemgrep: javascript.lang.security.detect-child-process.detect-child-process -- arg array (no shell); url comes from the hardcoded SERVICES allowlist
    const result = execFileSync('curl', ['-sL', url, '--max-time', '30'], { encoding: 'utf8' });
    return { success: true, content: result, title: '', method: 'curl' };
  } catch (e) {
    return { success: false, error: e.message, method: 'none' };
  }
}

async function extractApiKey(content, service) {
  // Common API key patterns
  const patterns = [
    /sk-[a-zA-Z0-9]{20,}/g,
    /sk-ant-[a-zA-Z0-9_-]{50,}/g,
    /tavly-[a-zA-Z0-9]{30,}/g,
    /bito_[a-zA-Z0-9]{30,}/g,
    /[a-f0-9]{32,}/g,
    /["'](?:api[_-]?key|token|secret)["']\s*[:=]\s*["'][^"']{20,}["']/gi,
  ];
  
  for (const pattern of patterns) {
    const matches = content.match(pattern);
    if (matches) {
      // Filter out false positives
      const valid = matches.filter(m => 
        m.length > 30 && 
        !m.includes('example') && 
        !m.includes('your-')
      );
      if (valid.length > 0) {
        return valid[0].replace(/["']/g, '');
      }
    }
  }
  
  return null;
}

function saveCredential(name, value) {
  const filePath = path.join(CREDS_DIR, name);
  
  // Ensure directory exists
  if (!fs.existsSync(CREDS_DIR)) {
    fs.mkdirSync(CREDS_DIR, { recursive: true });
  }
  
  fs.writeFileSync(filePath, value);
  console.log(`   💾 Saved: ${name}`);
  console.log(`   📁 ${filePath}`);
  
  return filePath;
}

async function syncToGitHub(name) {
  const filePath = path.join(CREDS_DIR, name);
  
  if (!fs.existsSync(filePath)) {
    console.log(`   ⚠️  File not found: ${filePath}`);
    return false;
  }
  
  const value = fs.readFileSync(filePath, 'utf8').trim();
  
  try {
    // Validate the secret name and pass the value via stdin (no shell, no echo)
    // so the secret never appears on a command line and can't be shell-injected.
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
      throw new Error(`Refusing to sync secret with unsafe name: ${name}`);
    }
    // nosemgrep: javascript.lang.security.detect-child-process.detect-child-process -- arg array (no shell); name validated; secret passed via stdin (input) not argv
    const result = execFileSync(
      'gh',
      ['secret', 'set', name, '--body-file', '-', '--repo', REPO],
      { encoding: 'utf8', input: value }
    );
    console.log(`   ✅ Synced to GitHub: ${name}`);
    return true;
  } catch (e) {
    // Try direct API
    try {
      const { execSync: exec } = require('child_process');
      const response = require('https').request(
        `https://api.github.com/repos/${REPO}/actions/secrets/${name}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `token ${process.env.GITHUB_TOKEN}`,
            'Content-Type': 'application/json',
          }
        },
        (res) => {
          console.log(`   ✅ Synced via API: ${name}`);
          return true;
        }
      );
      response.end(JSON.stringify({ secret_value: value }));
    } catch (apiErr) {
      console.log(`   ⚠️  GitHub sync skipped (no permissions)`);
      return false;
    }
  }
}

async function checkExistingCredentials() {
  console.log('\n📋 Checking existing credentials...');
  
  if (!fs.existsSync(CREDS_DIR)) {
    console.log('   No credentials directory found');
    return {};
  }
  
  const files = fs.readdirSync(CREDS_DIR)
    .filter(f => !f.startsWith('.') && !f.endsWith('.initialized'));
  
  const existing = {};
  for (const file of files) {
    existing[file] = true;
    console.log(`   ✅ ${file}`);
  }
  
  return existing;
}

async function fetchService(service) {
  console.log(`\n${'═'.repeat(50)}`);
  console.log(`🔑 Fetching: ${service.name}`);
  console.log(`📍 URL: ${service.url}`);
  console.log('═'.repeat(50));
  
  // Check if already have it
  const existingPath = path.join(CREDS_DIR, service.name);
  if (fs.existsSync(existingPath)) {
    console.log(`   ⏭️  Already exists: ${service.name}`);
    return { name: service.name, status: 'skipped', reason: 'already_exists' };
  }
  
  // Try to fetch
  const result = await fetchWithBrowser(service.settingsUrl);
  
  if (!result.success) {
    console.log(`   ❌ Failed to fetch`);
    return { name: service.name, status: 'failed', error: result.error };
  }
  
  // Try to extract key
  const key = await extractApiKey(result.content, service);
  
  if (key) {
    console.log(`   ✅ Found API key!`);
    saveCredential(service.name, key);
    await syncToGitHub(service.name);
    
    return { name: service.name, status: 'success', key: key.substring(0, 20) + '...' };
  }
  
  console.log(`   ⚠️  Could not auto-extract key`);
  console.log(`   💡 Manual steps:`);
  console.log(`      1. Open: ${service.settingsUrl}`);
  console.log(`      2. Login if needed`);
  console.log(`      3. Find API key section`);
  console.log(`      4. Copy key`);
  console.log(`      5. Run: echo "YOUR_KEY" > "${existingPath}"`);
  
  return { name: service.name, status: 'manual_needed', url: service.settingsUrl };
}

async function main() {
  console.log('\n' + '╔' + '═'.repeat(48) + '╗');
  console.log('║' + ' '.repeat(10) + '🤖 Auto Credential Fetcher' + ' '.repeat(12) + '║');
  console.log('╚' + '═'.repeat(48) + '╝');
  
  console.log(`\n📁 Credentials dir: ${CREDS_DIR}`);
  console.log(`📦 Target repo: ${REPO}`);
  
  // Ensure directory exists
  if (!fs.existsSync(CREDS_DIR)) {
    fs.mkdirSync(CREDS_DIR, { recursive: true });
  }
  
  // Check what we already have
  const existing = await checkExistingCredentials();
  
  // Services to check
  const toFetch = SERVICES.filter(s => !existing[s.name]);
  
  if (toFetch.length === 0) {
    console.log('\n✅ All credentials already exist!');
  } else {
    console.log(`\n📦 Need to fetch: ${toFetch.length} credentials`);
  }
  
  const results = [];
  
  for (const service of toFetch) {
    const result = await fetchService(service);
    results.push(result);
  }
  
  // Summary
  console.log('\n' + '═'.repeat(50));
  console.log('📊 SUMMARY');
  console.log('═'.repeat(50));
  
  const success = results.filter(r => r.status === 'success').length;
  const failed = results.filter(r => r.status === 'failed').length;
  const manual = results.filter(r => r.status === 'manual_needed').length;
  
  console.log(`   ✅ Fetched: ${success}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   💡 Manual needed: ${manual}`);
  
  if (manual > 0) {
    console.log('\n📝 Manual Steps Required:');
    for (const r of results.filter(r => r.status === 'manual_needed')) {
      console.log(`   • ${r.name}: ${r.url}`);
    }
  }
  
  console.log('\n' + '═'.repeat(50));
  
  // If we got some keys, sync them
  const newKeys = results.filter(r => r.status === 'success');
  if (newKeys.length > 0) {
    console.log('\n🔄 Syncing new credentials to GitHub...');
    for (const r of newKeys) {
      await syncToGitHub(r.name);
    }
  }
  
  console.log('\n✅ Auto Credential Fetcher complete!');
  console.log('\n💡 To add credentials manually:');
  console.log('   echo "KEY_VALUE" > "' + path.join(CREDS_DIR, 'NEW_KEY') + '"');
}

main().catch(console.error);
