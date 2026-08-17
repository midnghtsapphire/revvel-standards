#!/usr/bin/env node
'use strict';

/**
 * Dashboard CLI - Interactive project visibility tool
 * 
 * Provides quick access to project info, URLs, status without "looking in folders"
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const REPO_ROOT = execSync('git rev-parse --show-toplevel', { encoding: 'utf-8' }).trim();
const DATA_FILE = path.join(REPO_ROOT, 'dashboard-data.json');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
};

/**
 * Get color for status badge
 */
function getStatusColor(status) {
  if (!status) return colors.reset;
  const s = status.toLowerCase();
  if (s.includes('active') || s.includes('✅') || s.includes('live') || s.includes('deployed')) {
    return colors.green;
  }
  if (s.includes('dev') || s.includes('progress') || s.includes('🔵')) {
    return colors.yellow;
  }
  return colors.reset;
}

function loadData() {
  if (!fs.existsSync(DATA_FILE)) {
    console.log(`${colors.yellow}⚠️  Dashboard data not found. Generating...${colors.reset}`);
    execSync('node scripts/aggregate-project-dashboard.js', { cwd: REPO_ROOT, stdio: 'inherit' });
  }
  
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
}

function printHeader(text) {
  console.log(`\n${colors.bright}${colors.cyan}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}  ${text}${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}${'='.repeat(60)}${colors.reset}\n`);
}

function printProject(project, index) {
  const statusColor = getStatusColor(project.status);
  
  console.log(`${colors.bright}${index + 1}. ${project.name}${colors.reset}`);
  console.log(`   Status: ${statusColor}${project.status || 'Unknown'}${colors.reset}`);
  if (project.description) console.log(`   Description: ${project.description.substring(0, 80)}...`);
  if (project.link) console.log(`   Link: ${colors.cyan}${project.link}${colors.reset}`);
  if (project.source) console.log(`   Source: ${project.source}`);
  console.log();
}

function printURL(url, index) {
  console.log(`${colors.bright}${index + 1}. ${url.url}${colors.reset}`);
  console.log(`   Project: ${url.project}`);
  console.log(`   Type: ${colors.magenta}${url.type}${colors.reset}`);
  console.log(`   Source: ${url.source}`);
  console.log();
}

function printDomain(domain, index) {
  const statusColor = getStatusColor(domain.status);
  console.log(`${colors.bright}${index + 1}. ${domain.name}${colors.reset}`);
  console.log(`   Status: ${statusColor}${domain.status}${colors.reset}`);
  console.log(`   Purpose: ${domain.purpose}`);
  if (domain.notes) console.log(`   Notes: ${domain.notes}`);
  console.log();
}

function search(data, query) {
  const results = {
    projects: [],
    urls: [],
    domains: [],
  };
  
  const q = query.toLowerCase();
  
  // Search projects
  results.projects = data.projects.filter(p => 
    p.name.toLowerCase().includes(q) ||
    (p.description && p.description.toLowerCase().includes(q)) ||
    (p.status && p.status.toLowerCase().includes(q))
  );
  
  // Search URLs
  results.urls = data.urls.filter(u => 
    u.url.toLowerCase().includes(q) ||
    u.project.toLowerCase().includes(q)
  );
  
  // Search domains
  results.domains = data.domains.filter(d => 
    d.name.toLowerCase().includes(q) ||
    d.purpose.toLowerCase().includes(q) ||
    (d.notes && d.notes.toLowerCase().includes(q))
  );
  
  return results;
}

function showSummary(data) {
  printHeader('📊 MIDNGHTSAPPHIRE Project Dashboard Summary');
  
  console.log(`${colors.bright}Total Projects:${colors.reset} ${colors.green}${data.projects.length}${colors.reset}`);
  console.log(`${colors.bright}Active Services:${colors.reset} ${colors.green}${data.inventory.masterInventory?.services.filter(s => s.status.includes('Active') || s.status.includes('✅')).length || 0}${colors.reset}`);
  console.log(`${colors.bright}Test URLs:${colors.reset} ${colors.green}${data.urls.length}${colors.reset}`);
  console.log(`${colors.bright}Tracked Domains:${colors.reset} ${colors.green}${data.domains.length}${colors.reset}`);
  console.log(`${colors.bright}Last Updated:${colors.reset} ${new Date(data.lastUpdated).toLocaleString()}`);
  
  console.log(`\n${colors.cyan}Key Domains:${colors.reset}`);
  data.domains.slice(0, 5).forEach((d, i) => {
    const statusColor = d.status === 'Active' ? colors.green : colors.yellow;
    console.log(`  ${i + 1}. ${d.name} - ${statusColor}${d.status}${colors.reset} (${d.purpose})`);
  });
  
  console.log(`\n${colors.cyan}Recent Projects:${colors.reset}`);
  data.projects.slice(0, 5).forEach((p, i) => {
    console.log(`  ${i + 1}. ${p.name} - ${p.status || 'Unknown'}`);
  });
  
  console.log(`\n${colors.bright}Commands:${colors.reset}`);
  console.log(`  ${colors.cyan}dashboard projects${colors.reset}    - List all projects`);
  console.log(`  ${colors.cyan}dashboard urls${colors.reset}        - List all test URLs`);
  console.log(`  ${colors.cyan}dashboard domains${colors.reset}     - List all domains`);
  console.log(`  ${colors.cyan}dashboard search <term>${colors.reset} - Search everything`);
  console.log(`  ${colors.cyan}dashboard refresh${colors.reset}     - Regenerate dashboard`);
  console.log(`  ${colors.cyan}dashboard open${colors.reset}        - Open HTML dashboard in browser`);
}

function showProjects(data, filter = null) {
  printHeader('📦 All Projects');
  
  let projects = data.projects;
  if (filter) {
    projects = projects.filter(p => 
      p.name.toLowerCase().includes(filter.toLowerCase()) ||
      (p.status && p.status.toLowerCase().includes(filter.toLowerCase()))
    );
  }
  
  console.log(`Found ${colors.bright}${projects.length}${colors.reset} projects\n`);
  projects.forEach((p, i) => printProject(p, i));
}

function showURLs(data, filter = null) {
  printHeader('🔗 Test URLs');
  
  let urls = data.urls;
  if (filter) {
    urls = urls.filter(u => 
      u.url.toLowerCase().includes(filter.toLowerCase()) ||
      u.project.toLowerCase().includes(filter.toLowerCase())
    );
  }
  
  console.log(`Found ${colors.bright}${urls.length}${colors.reset} URLs\n`);
  urls.forEach((u, i) => printURL(u, i));
}

function showDomains(data, filter = null) {
  printHeader('🌐 Domains');
  
  let domains = data.domains;
  if (filter) {
    domains = domains.filter(d => 
      d.name.toLowerCase().includes(filter.toLowerCase()) ||
      d.purpose.toLowerCase().includes(filter.toLowerCase())
    );
  }
  
  console.log(`Found ${colors.bright}${domains.length}${colors.reset} domains\n`);
  domains.forEach((d, i) => printDomain(d, i));
}

function showSearch(data, query) {
  printHeader(`🔍 Search Results for "${query}"`);
  
  const results = search(data, query);
  
  if (results.projects.length > 0) {
    console.log(`${colors.bright}${colors.green}Projects (${results.projects.length}):${colors.reset}\n`);
    results.projects.forEach((p, i) => printProject(p, i));
  }
  
  if (results.urls.length > 0) {
    console.log(`${colors.bright}${colors.green}URLs (${results.urls.length}):${colors.reset}\n`);
    results.urls.forEach((u, i) => printURL(u, i));
  }
  
  if (results.domains.length > 0) {
    console.log(`${colors.bright}${colors.green}Domains (${results.domains.length}):${colors.reset}\n`);
    results.domains.forEach((d, i) => printDomain(d, i));
  }
  
  if (results.projects.length === 0 && results.urls.length === 0 && results.domains.length === 0) {
    console.log(`${colors.yellow}No results found for "${query}"${colors.reset}`);
  }
}

function refresh() {
  printHeader('🔄 Refreshing Dashboard');
  console.log('Regenerating dashboard data...\n');
  execSync('node scripts/aggregate-project-dashboard.js', { cwd: REPO_ROOT, stdio: 'inherit' });
  console.log(`\n${colors.green}✅ Dashboard refreshed successfully!${colors.reset}`);
}

function openBrowser() {
  const dashboardPath = path.join(REPO_ROOT, 'dashboard.html');
  
  if (!fs.existsSync(dashboardPath)) {
    console.log(`${colors.yellow}⚠️  Dashboard not found. Generating...${colors.reset}`);
    execSync('node scripts/aggregate-project-dashboard.js', { cwd: REPO_ROOT, stdio: 'inherit' });
  }
  
  console.log(`${colors.cyan}Opening dashboard in browser...${colors.reset}`);
  
  try {
    const platform = process.platform;
    if (platform === 'darwin') {
      execSync(`open ${dashboardPath}`);
    } else if (platform === 'win32') {
      execSync(`start ${dashboardPath}`);
    } else {
      execSync(`xdg-open ${dashboardPath}`);
    }
  } catch (err) {
    console.log(`${colors.yellow}Could not open browser automatically.${colors.reset}`);
    console.log(`Please open manually: ${dashboardPath}`);
  }
}

function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  if (!command || command === 'help' || command === '--help' || command === '-h') {
    console.log(`${colors.bright}${colors.cyan}Dashboard CLI - Project Visibility Tool${colors.reset}`);
    console.log(`\nUsage: dashboard [command] [options]\n`);
    console.log(`Commands:`);
    console.log(`  ${colors.green}summary${colors.reset}             Show dashboard summary (default)`);
    console.log(`  ${colors.green}projects [filter]${colors.reset}   List all projects`);
    console.log(`  ${colors.green}urls [filter]${colors.reset}       List all test URLs`);
    console.log(`  ${colors.green}domains [filter]${colors.reset}    List all domains`);
    console.log(`  ${colors.green}search <term>${colors.reset}       Search everything`);
    console.log(`  ${colors.green}refresh${colors.reset}             Regenerate dashboard data`);
    console.log(`  ${colors.green}open${colors.reset}                Open HTML dashboard in browser`);
    console.log(`  ${colors.green}help${colors.reset}                Show this help message`);
    console.log(`\nExamples:`);
    console.log(`  dashboard summary`);
    console.log(`  dashboard projects`);
    console.log(`  dashboard search oaudrey`);
    console.log(`  dashboard urls vercel`);
    console.log(`  dashboard domains`);
    return;
  }
  
  const data = loadData();
  
  switch (command) {
    case 'summary':
    case 's':
      showSummary(data);
      break;
    
    case 'projects':
    case 'p':
      showProjects(data, args[1]);
      break;
    
    case 'urls':
    case 'u':
      showURLs(data, args[1]);
      break;
    
    case 'domains':
    case 'd':
      showDomains(data, args[1]);
      break;
    
    case 'search':
    case 'find':
    case 'f':
      if (!args[1]) {
        console.log(`${colors.red}Error: Please provide a search term${colors.reset}`);
        console.log(`Usage: dashboard search <term>`);
        process.exit(1);
      }
      showSearch(data, args.slice(1).join(' '));
      break;
    
    case 'refresh':
    case 'r':
      refresh();
      break;
    
    case 'open':
    case 'o':
    case 'view':
      openBrowser();
      break;
    
    default:
      // Default to summary
      showSummary(data);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  loadData,
  search,
  showSummary,
  showProjects,
  showURLs,
  showDomains,
  showSearch,
};
