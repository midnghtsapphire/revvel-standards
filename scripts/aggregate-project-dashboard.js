#!/usr/bin/env node
'use strict';

/**
 * Project Dashboard Aggregator
 * 
 * Aggregates project inventory, BOM, URLs, and status from all sources
 * and generates a centralized dashboard for easy visibility.
 * 
 * Runs via cron (hourly) or manually via CLI.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const REPO_ROOT = execSync('git rev-parse --show-toplevel', { encoding: 'utf-8' }).trim();
const DOCS_DIR = path.join(REPO_ROOT, 'docs');
// Output dir defaults to the repo root (so update-project-dashboard.yml commits
// the real tracked dashboard). Tests set DASHBOARD_OUT_DIR to a temp dir so a
// plain `npm test` no longer rewrites the committed dashboard (WR #14544).
const OUT_DIR = process.env.DASHBOARD_OUT_DIR || REPO_ROOT;
fs.mkdirSync(OUT_DIR, { recursive: true });
const OUTPUT_FILE = path.join(OUT_DIR, 'dashboard.html');
const DATA_FILE = path.join(OUT_DIR, 'dashboard-data.json');

function getRootProjectName() {
  try {
    const packageJson = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf-8'));
    return packageJson.name || path.basename(REPO_ROOT);
  } catch (err) {
    return path.basename(REPO_ROOT);
  }
}

/**
 * Extract project information from markdown files
 */
function extractProjectData() {
  const projects = [];
  const inventory = {};
  const bom = {};
  const urls = [];
  
  console.log('📊 Aggregating project data...');
  
  // Read Master Inventory
  const masterInventoryPath = path.join(DOCS_DIR, '_MASTER_INVENTORY.md');
  if (fs.existsSync(masterInventoryPath)) {
    const content = fs.readFileSync(masterInventoryPath, 'utf-8');
    inventory.masterInventory = parseInventory(content);
    console.log(`  ✅ Loaded Master Inventory (${inventory.masterInventory.services.length} services)`);
  }
  
  // Read Master BOM
  const masterBOMPath = path.join(DOCS_DIR, '_MASTER_BOM.md');
  if (fs.existsSync(masterBOMPath)) {
    const content = fs.readFileSync(masterBOMPath, 'utf-8');
    bom.masterBOM = parseBOM(content);
    console.log(`  ✅ Loaded Master BOM`);
  }
  
  // Read Projects to Ship
  const projectsToShipPath = path.join(DOCS_DIR, 'PROJECTS_TO_SHIP.md');
  if (fs.existsSync(projectsToShipPath)) {
    const content = fs.readFileSync(projectsToShipPath, 'utf-8');
    const projectList = parseProjectsToShip(content);
    projects.push(...projectList);
    console.log(`  ✅ Loaded Projects to Ship (${projectList.length} projects)`);
  }
  
  // Read Project Catalog
  const projectCatalogPath = path.join(DOCS_DIR, 'PROJECT_CATALOG.md');
  if (fs.existsSync(projectCatalogPath)) {
    const content = fs.readFileSync(projectCatalogPath, 'utf-8');
    const catalogProjects = parseProjectCatalog(content);
    projects.push(...catalogProjects);
    console.log(`  ✅ Loaded Project Catalog (${catalogProjects.length} projects)`);
  }
  
  // Scan for all README files to extract test URLs
  console.log('  🔍 Scanning for test URLs in README files...');
  urls.push(...extractTestURLs());
  
  // Scan for domain info
  const domains = extractDomainInfo();
  console.log(`  ✅ Found ${domains.length} domains`);
  
  // Scan for project status
  const projectStatus = extractProjectStatus();
  console.log(`  ✅ Loaded status for ${projectStatus.length} projects`);
  
  return {
    projects: deduplicateProjects(projects),
    inventory,
    bom,
    urls: deduplicateURLs(urls),
    domains,
    projectStatus,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Parse inventory markdown content
 */
function parseInventory(content) {
  const services = [];
  const lines = content.split('\n');
  let inTable = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Detect table start
    if (line.startsWith('|') && line.includes('Service') && line.includes('Status')) {
      inTable = true;
      continue;
    }
    
    // Skip separator
    if (line.startsWith('|---') || line.startsWith('| ---')) {
      continue;
    }
    
    // Parse table row
    if (inTable && line.startsWith('|')) {
      const cells = line.split('|').map(c => c.trim()).filter(c => c);
      if (cells.length >= 8) {  // Need all 8 columns
        services.push({
          name: cells[0],
          description: cells[1],
          status: cells[6] || 'Unknown',  // Column 6 is Status (0-indexed)
          usedBy: cells[7] || 'Unknown',  // Column 7 is Used By (0-indexed)
        });
      }
    }
    
    // End of table
    if (inTable && !line.startsWith('|')) {
      inTable = false;
    }
  }
  
  return { services };
}

/**
 * Parse BOM markdown content
 */
function parseBOM(content) {
  const items = [];
  const lines = content.split('\n');
  
  // Extract BOM items from tables
  let inTable = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line.startsWith('|') && (line.includes('Item') || line.includes('Service'))) {
      inTable = true;
      continue;
    }
    
    if (line.startsWith('|---')) continue;
    
    if (inTable && line.startsWith('|')) {
      const cells = line.split('|').map(c => c.trim()).filter(c => c);
      if (cells.length >= 2) {
        items.push({
          name: cells[0],
          details: cells.slice(1).join(' | '),
        });
      }
    }
    
    if (inTable && !line.startsWith('|')) {
      inTable = false;
    }
  }
  
  return { items };
}

/**
 * Parse Projects to Ship content
 */
function parseProjectsToShip(content) {
  const projects = [];
  const lines = content.split('\n');
  let inTable = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line.startsWith('|') && line.includes('Project')) {
      inTable = true;
      continue;
    }
    
    if (line.startsWith('|---')) continue;
    
    if (inTable && line.startsWith('|')) {
      const cells = line.split('|').map(c => c.trim()).filter(c => c);
      if (cells.length >= 3) {
        projects.push({
          name: cells[0],
          status: cells[1] || 'Unknown',
          revenue: cells[2] || 'Unknown',
          notes: cells[3] || '',
          source: 'PROJECTS_TO_SHIP.md',
        });
      }
    }
    
    if (inTable && !line.startsWith('|')) {
      inTable = false;
    }
  }
  
  return projects;
}

/**
 * Parse Project Catalog content
 */
function parseProjectCatalog(content) {
  const projects = [];
  const lines = content.split('\n');
  let inTable = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line.startsWith('|') && (line.includes('Repository') || line.includes('Project'))) {
      inTable = true;
      continue;
    }
    
    if (line.startsWith('|---')) continue;
    
    if (inTable && line.startsWith('|')) {
      const cells = line.split('|').map(c => c.trim()).filter(c => c);
      if (cells.length >= 3) {
        // Extract link from markdown [text](url)
        let link = '';
        const lastCell = cells[cells.length - 1];
        const linkMatch = lastCell ? lastCell.match(/\[.*?\]\((.*?)\)/) : null;
        if (linkMatch) {
          link = linkMatch[1];
        }
        
        projects.push({
          name: cells[0].replace(/\*\*/g, ''),
          status: cells[1] || 'Unknown',
          description: cells[2] || '',
          link: link,
          source: 'PROJECT_CATALOG.md',
        });
      }
    }
    
    if (inTable && !line.startsWith('|')) {
      inTable = false;
    }
  }
  
  return projects;
}

/**
 * Extract test URLs from README files
 */
function extractTestURLs() {
  const urls = [];
  const urlPattern = /https?:\/\/[^\s\)]+/g;
  const vercelPattern = /https?:\/\/[a-zA-Z0-9-]+\.vercel\.app[^\s\)]*/g;
  
  try {
    // Find all README files
    const findCmd = [
      `find ${REPO_ROOT} -type f \\( -name "README.md" -o -name "readme.md" \\)`,
      `-not -path "*/.git/*"`,
      `-not -path "*/node_modules/*"`,
      `-not -path "*/.next/*"`,
      `-not -path "*/dist/*"`,
      `-not -path "*/.venv/*"`,
      `2>/dev/null`,
    ].join(' ');
    const readmes = execSync(findCmd, { encoding: 'utf-8' }).trim().split('\n').filter(f => f);
    
    for (const readme of readmes) {
      if (!readme) continue;
      
      const content = fs.readFileSync(readme, 'utf-8');
      const relativeDir = path.relative(REPO_ROOT, path.dirname(readme));
      const projectName = relativeDir ? path.basename(path.dirname(readme)) : getRootProjectName();
      
      // Extract Vercel URLs
      const vercelMatches = content.match(vercelPattern) || [];
      for (const url of vercelMatches) {
        urls.push({
          url: url.replace(/[,\.\)]$/, ''),
          project: projectName,
          type: 'vercel',
          source: readme.replace(REPO_ROOT, ''),
        });
      }
      
      // Extract other URLs from Test sections
      const testSectionMatch = content.match(/##\s+Test[\s\S]*?(?=##|$)/i);
      if (testSectionMatch) {
        const testSection = testSectionMatch[0];
        const allUrls = testSection.match(urlPattern) || [];
        for (const url of allUrls) {
          if (!url.includes('vercel.app')) {
            urls.push({
              url: url.replace(/[,\.\)]$/, ''),
              project: projectName,
              type: 'test',
              source: readme.replace(REPO_ROOT, ''),
            });
          }
        }
      }
    }
  } catch (err) {
    console.error('  ⚠️  Error extracting test URLs:', err.message);
  }
  
  return urls;
}

/**
 * Extract domain information
 */
function extractDomainInfo() {
  const domains = [];
  
  // Key domains to track
  const keyDomains = [
    { name: 'oaudrey.com', status: 'Active', purpose: 'Freedom Angel Hub', notes: 'Main automation hub' },
    { name: 'freedomangel.org', status: 'Research', purpose: 'Nonprofit', notes: 'Anti-trafficking initiative' },
    { name: 'revvel.co', status: 'Active', purpose: 'Portfolio', notes: 'Main portfolio site' },
    { name: 'soup2bowl.com', status: 'In Development', purpose: 'Catering', notes: 'St. Louis fusion cuisine' },
    { name: 'sam.gov', status: 'External', purpose: 'Gov Registration', notes: 'Federal contracting' },
    { name: 'grants.gov', status: 'External', purpose: 'Grant Search', notes: 'Federal grants' },
  ];
  
  domains.push(...keyDomains);
  
  // Scan oaudrey/index.html for subdomain info
  const oaudreyIndexPath = path.join(REPO_ROOT, 'oaudrey', 'index.html');
  if (fs.existsSync(oaudreyIndexPath)) {
    const content = fs.readFileSync(oaudreyIndexPath, 'utf-8');
    const subdomainPattern = /([a-z-]+)\.oaudrey\.com/g;
    let match;
    while ((match = subdomainPattern.exec(content)) !== null) {
      domains.push({
        name: match[0],
        status: 'Active',
        purpose: 'oAudrey Subdomain',
        notes: `Part of oAudrey hub`,
      });
    }
  }
  
  return [...new Set(domains.map(d => JSON.stringify(d)))].map(d => JSON.parse(d));
}

/**
 * Extract project status from various sources
 */
function extractProjectStatus() {
  const status = [];
  
  // Check for SYSTEM_STATE files
  try {
    const findCmd = `find ${REPO_ROOT} -type f -name "SYSTEM_STATE.md" 2>/dev/null`;
    const systemStates = execSync(findCmd, { encoding: 'utf-8' }).trim().split('\n').filter(f => f);
    
    for (const file of systemStates) {
      if (!file) continue;
      const content = fs.readFileSync(file, 'utf-8');
      const projectName = path.basename(path.dirname(file));
      status.push({
        project: projectName,
        file: file.replace(REPO_ROOT, ''),
        hasSystemState: true,
      });
    }
  } catch (err) {
    // Ignore errors
  }
  
  return status;
}

/**
 * Deduplicate projects by name
 * 
 * Strategy: First-wins approach
 * - Projects are matched case-insensitively by name
 * - If a project appears in multiple sources, the first occurrence is kept
 * - Missing fields (link, description) are merged from later occurrences
 * - Priority order: PROJECTS_TO_SHIP.md > PROJECT_CATALOG.md
 */
function deduplicateProjects(projects) {
  const seen = new Map();
  
  for (const project of projects) {
    const key = project.name.toLowerCase();
    if (!seen.has(key)) {
      seen.set(key, project);
    } else {
      // Merge data
      const existing = seen.get(key);
      if (!existing.link && project.link) existing.link = project.link;
      if (!existing.description && project.description) existing.description = project.description;
    }
  }
  
  return Array.from(seen.values());
}

function deduplicateURLs(urls) {
  const seen = new Set();
  return urls.filter(entry => {
    const key = `${entry.url}|${entry.project}|${entry.type}|${entry.source}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Helper function to get badge class for status
 */
function getBadgeClass(status) {
  const s = (status || '').toLowerCase();
  if (s.includes('active') || s.includes('✅') || s.includes('live') || s.includes('deployed')) return 'badge-active';
  if (s.includes('dev') || s.includes('progress') || s.includes('🔵')) return 'badge-dev';
  if (s.includes('research') || s.includes('🟡')) return 'badge-research';
  return 'badge-unknown';
}

/**
 * Generate HTML dashboard
 */
function generateDashboard(data) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MIDNGHTSAPPHIRE Project Dashboard</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #fff;
      padding: 20px;
      line-height: 1.6;
    }
    .container {
      max-width: 1400px;
      margin: 0 auto;
    }
    header {
      text-align: center;
      margin-bottom: 40px;
    }
    h1 {
      font-size: 2.5rem;
      margin-bottom: 10px;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
    }
    .subtitle {
      font-size: 1rem;
      opacity: 0.9;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    .card {
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
      border-radius: 12px;
      padding: 20px;
      border: 1px solid rgba(255, 255, 255, 0.2);
      box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
    }
    .card h2 {
      font-size: 1.5rem;
      margin-bottom: 15px;
      border-bottom: 2px solid rgba(255, 255, 255, 0.3);
      padding-bottom: 10px;
    }
    .stat {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
    .stat:last-child {
      border-bottom: none;
    }
    .stat-label {
      font-weight: 600;
    }
    .stat-value {
      font-weight: 300;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
    }
    th, td {
      text-align: left;
      padding: 10px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
    th {
      font-weight: 600;
      background: rgba(255, 255, 255, 0.1);
    }
    tr:hover {
      background: rgba(255, 255, 255, 0.05);
    }
    a {
      color: #fff;
      text-decoration: underline;
    }
    a:hover {
      color: #ffd700;
    }
    .badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 0.85rem;
      font-weight: 600;
    }
    .badge-active { background: #10b981; }
    .badge-dev { background: #3b82f6; }
    .badge-research { background: #f59e0b; }
    .badge-unknown { background: #6b7280; }
    .last-updated {
      text-align: center;
      margin-top: 30px;
      opacity: 0.7;
      font-size: 0.9rem;
    }
    .search-box {
      width: 100%;
      padding: 12px;
      margin-bottom: 20px;
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.3);
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
      font-size: 1rem;
    }
    .search-box::placeholder {
      color: rgba(255, 255, 255, 0.6);
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>🚀 MIDNGHTSAPPHIRE Project Dashboard</h1>
      <p class="subtitle">Centralized visibility into all projects, BOM, inventory, and status</p>
    </header>

    <input type="text" class="search-box" id="searchBox" placeholder="Search projects, domains, URLs..." onkeyup="filterAll()">

    <div class="grid">
      <!-- Summary Card -->
      <div class="card">
        <h2>📊 Summary</h2>
        <div class="stat">
          <span class="stat-label">Total Projects:</span>
          <span class="stat-value">${data.projects.length}</span>
        </div>
        <div class="stat">
          <span class="stat-label">Active Services:</span>
          <span class="stat-value">${data.inventory.masterInventory?.services.filter(s => s.status.includes('Active') || s.status.includes('✅')).length || 0}</span>
        </div>
        <div class="stat">
          <span class="stat-label">Test URLs:</span>
          <span class="stat-value">${data.urls.length}</span>
        </div>
        <div class="stat">
          <span class="stat-label">Tracked Domains:</span>
          <span class="stat-value">${data.domains.length}</span>
        </div>
        <div class="stat">
          <span class="stat-label">Last Updated:</span>
          <span class="stat-value">${new Date(data.lastUpdated).toLocaleString()}</span>
        </div>
      </div>

      <!-- Key Domains Card -->
      <div class="card">
        <h2>🌐 Key Domains</h2>
        <table>
          <thead>
            <tr>
              <th>Domain</th>
              <th>Status</th>
              <th>Purpose</th>
            </tr>
          </thead>
          <tbody>
            ${data.domains.slice(0, 10).map(d => `
              <tr>
                <td>${escapeHtml(d.name)}</td>
                <td><span class="badge ${getBadgeClass(d.status)}">${escapeHtml(d.status)}</span></td>
                <td>${escapeHtml(d.purpose)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Projects Table -->
    <div class="card">
      <h2>📦 All Projects</h2>
      <table id="projectsTable">
        <thead>
          <tr>
            <th>Project</th>
            <th>Status</th>
            <th>Description</th>
            <th>Source</th>
            <th>Link</th>
          </tr>
        </thead>
        <tbody>
          ${data.projects.map(p => `
            <tr>
              <td><strong>${escapeHtml(p.name)}</strong></td>
              <td><span class="badge ${getBadgeClass(p.status)}">${escapeHtml(p.status)}</span></td>
              <td>${escapeHtml(p.description || p.notes || p.revenue || '')}</td>
              <td>${escapeHtml(p.source || 'N/A')}</td>
              <td>${p.link && /^https?:\/\//i.test(p.link) ? `<a href="${escapeHtml(p.link)}" target="_blank" rel="noopener noreferrer">View</a>` : 'N/A'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <!-- Test URLs Table -->
    <div class="card">
      <h2>🔗 Test URLs</h2>
      <table id="urlsTable">
        <thead>
          <tr>
            <th>URL</th>
            <th>Project</th>
            <th>Type</th>
            <th>Source</th>
          </tr>
        </thead>
        <tbody>
          ${data.urls.map(u => `
            <tr>
              <td><a href="${escapeHtml(u.url)}" target="_blank">${escapeHtml(u.url)}</a></td>
              <td>${escapeHtml(u.project)}</td>
              <td><span class="badge badge-${escapeHtml(u.type)}">${escapeHtml(u.type)}</span></td>
              <td>${escapeHtml(u.source)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <!-- Active Services -->
    <div class="card">
      <h2>⚙️ Active Services (Inventory)</h2>
      <table id="servicesTable">
        <thead>
          <tr>
            <th>Service</th>
            <th>Description</th>
            <th>Status</th>
            <th>Used By</th>
          </tr>
        </thead>
        <tbody>
          ${(data.inventory.masterInventory?.services || []).slice(0, 20).map(s => `
            <tr>
              <td><strong>${escapeHtml(s.name)}</strong></td>
              <td>${escapeHtml(s.description.substring(0, 100))}...</td>
              <td>${escapeHtml(s.status)}</td>
              <td>${escapeHtml(s.usedBy)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <div class="last-updated">
      Dashboard generated at ${new Date(data.lastUpdated).toLocaleString()}
      <br>
      <small>Auto-updates every 4 hours via GitHub Actions cron job</small>
    </div>
  </div>

  <script>
    function filterAll() {
      const query = document.getElementById('searchBox').value.toLowerCase();
      
      // Filter projects
      const projectRows = document.querySelectorAll('#projectsTable tbody tr');
      projectRows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(query) ? '' : 'none';
      });
      
      // Filter URLs
      const urlRows = document.querySelectorAll('#urlsTable tbody tr');
      urlRows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(query) ? '' : 'none';
      });
      
      // Filter services
      const serviceRows = document.querySelectorAll('#servicesTable tbody tr');
      serviceRows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(query) ? '' : 'none';
      });
    }
  </script>
</body>
</html>`;

  return html;
}

/**
 * Main execution
 */
function main() {
  console.log('🚀 Project Dashboard Aggregator');
  console.log('================================\n');
  
  try {
    // Extract all data
    const data = extractProjectData();
    
    // Save raw data
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    console.log(`\n💾 Saved raw data to ${DATA_FILE}`);
    
    // Generate HTML dashboard
    const html = generateDashboard(data);
    fs.writeFileSync(OUTPUT_FILE, html);
    console.log(`✅ Generated dashboard at ${OUTPUT_FILE}`);
    
    // Print summary
    console.log('\n📊 Dashboard Summary:');
    console.log(`  Projects: ${data.projects.length}`);
    console.log(`  Services: ${data.inventory.masterInventory?.services.length || 0}`);
    console.log(`  Test URLs: ${data.urls.length}`);
    console.log(`  Domains: ${data.domains.length}`);
    console.log(`  Last Updated: ${new Date(data.lastUpdated).toLocaleString()}`);
    console.log('\n✅ Dashboard generation complete!');
    console.log(`   Open ${OUTPUT_FILE} in your browser to view.`);
    
  } catch (err) {
    console.error('❌ Error generating dashboard:', err);
    process.exit(1);
  }
}

// Export for testing
if (require.main === module) {
  main();
}

module.exports = {
  extractProjectData,
  parseInventory,
  parseBOM,
  parseProjectsToShip,
  parseProjectCatalog,
  extractTestURLs,
  extractDomainInfo,
  extractProjectStatus,
  deduplicateURLs,
  generateDashboard,
};
