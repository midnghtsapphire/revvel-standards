#!/usr/bin/env node
'use strict';

/**
 * Daily WR & PR Summary Generator
 * 
 * Generates a daily summary document that tracks:
 * - New issues created
 * - New PRs opened
 * - Vercel deployment URLs
 * - Repositories affected
 * 
 * Output: wr/summaries/YYYY-MM-DD.md and wr/summaries/YYYY-MM-DD.html
 */

const { Octokit } = require('@octokit/rest');
const fs = require('fs');
const path = require('path');

// ────────────────────────────────────────────────────────────────────────────
// Configuration
// ────────────────────────────────────────────────────────────────────────────

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const ORG = process.env.GITHUB_REPOSITORY_OWNER || 'midnghtsapphire';
const REPO = process.env.GITHUB_REPOSITORY?.split('/')[1] || 'revvel-standards';

if (!GITHUB_TOKEN) {
  console.error('❌ GITHUB_TOKEN is required');
  process.exit(1);
}

const octokit = new Octokit({ auth: GITHUB_TOKEN });

// ────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ────────────────────────────────────────────────────────────────────────────

/**
 * Get today's date in YYYY-MM-DD format
 */
function getToday() {
  const date = new Date();
  return date.toISOString().split('T')[0];
}

/**
 * Get yesterday's date in YYYY-MM-DD format
 */
function getYesterday() {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return date.toISOString().split('T')[0];
}

/**
 * Format ISO timestamp to readable format
 */
function formatDate(isoString) {
  const date = new Date(isoString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

/**
 * Extract Vercel URLs from PR body or comments
 */
function extractVercelUrls(text) {
  if (!text) return [];
  const vercelPattern = /https?:\/\/[a-zA-Z0-9-]+\.vercel\.app[^\s)]*/g;
  return [...new Set(text.match(vercelPattern) || [])];
}

/**
 * Extract repository references from text
 */
function extractRepoReferences(text) {
  if (!text) return [];
  const repoPattern = /(?:^|\s)([a-zA-Z0-9-]+)\/([a-zA-Z0-9._-]+)(?:\s|$|[,.])/g;
  const matches = [];
  let match;
  while ((match = repoPattern.exec(text)) !== null) {
    matches.push(`${match[1]}/${match[2]}`);
  }
  return [...new Set(matches)];
}

// ────────────────────────────────────────────────────────────────────────────
// Data Fetching
// ────────────────────────────────────────────────────────────────────────────

/**
 * Fetch issues created since a given date
 */
async function fetchIssuesSince(since) {
  try {
    const { data } = await octokit.rest.issues.listForRepo({
      owner: ORG,
      repo: REPO,
      state: 'all',
      since: `${since}T00:00:00Z`,
      per_page: 100,
      sort: 'created',
      direction: 'desc'
    });
    
    // Filter out pull requests (GitHub API includes PRs in issues endpoint)
    return data.filter(issue => !issue.pull_request);
  } catch (error) {
    console.error('❌ Error fetching issues:', error.message);
    return [];
  }
}

/**
 * Fetch pull requests created since a given date
 */
async function fetchPRsSince(since) {
  try {
    const { data } = await octokit.rest.pulls.list({
      owner: ORG,
      repo: REPO,
      state: 'all',
      sort: 'created',
      direction: 'desc',
      per_page: 100
    });
    
    // Filter PRs created since the given date
    return data.filter(pr => {
      const createdAt = new Date(pr.created_at);
      const sinceDate = new Date(`${since}T00:00:00Z`);
      return createdAt >= sinceDate;
    });
  } catch (error) {
    console.error('❌ Error fetching PRs:', error.message);
    return [];
  }
}

/**
 * Fetch PR comments for a specific PR
 */
async function fetchPRComments(prNumber) {
  try {
    const { data } = await octokit.rest.issues.listComments({
      owner: ORG,
      repo: REPO,
      issue_number: prNumber,
      per_page: 100
    });
    return data;
  } catch (error) {
    console.error(`❌ Error fetching comments for PR #${prNumber}:`, error.message);
    return [];
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Report Generation
// ────────────────────────────────────────────────────────────────────────────

/**
 * Generate markdown report
 */
async function generateMarkdownReport(date, issues, prs) {
  const lines = [];
  
  lines.push(`# Daily WR & PR Summary — ${date}`);
  lines.push('');
  lines.push(`**Generated:** ${formatDate(new Date().toISOString())}`);
  lines.push('');
  lines.push('---');
  lines.push('');
  
  // Summary stats
  lines.push('## Summary');
  lines.push('');
  lines.push(`- **Issues Created:** ${issues.length}`);
  lines.push(`- **Pull Requests Opened:** ${prs.length}`);
  lines.push('');
  
  // Issues section
  lines.push('## Issues Created Today');
  lines.push('');
  if (issues.length === 0) {
    lines.push('_No issues created today._');
  } else {
    lines.push('| # | Title | Author | Created | Labels |');
    lines.push('|---|---|---|---|---|');
    for (const issue of issues) {
      const labels = issue.labels.map(l => l.name).join(', ') || 'none';
      lines.push(`| [#${issue.number}](${issue.html_url}) | ${issue.title} | @${issue.user.login} | ${formatDate(issue.created_at)} | ${labels} |`);
    }
  }
  lines.push('');
  
  // PRs section
  lines.push('## Pull Requests Opened Today');
  lines.push('');
  if (prs.length === 0) {
    lines.push('_No pull requests opened today._');
  } else {
    lines.push('| # | Title | Author | Created | Status |');
    lines.push('|---|---|---|---|---|');
    for (const pr of prs) {
      const status = pr.merged_at ? '✅ Merged' : pr.state === 'closed' ? '❌ Closed' : '🔄 Open';
      lines.push(`| [#${pr.number}](${pr.html_url}) | ${pr.title} | @${pr.user.login} | ${formatDate(pr.created_at)} | ${status} |`);
    }
  }
  lines.push('');
  
  // Vercel URLs & Repos affected
  const allVercelUrls = new Set();
  const allRepos = new Set();
  
  for (const pr of prs) {
    // Extract from PR body
    extractVercelUrls(pr.body).forEach(url => allVercelUrls.add(url));
    extractRepoReferences(pr.body).forEach(repo => allRepos.add(repo));
    
    // Extract from PR comments
    const comments = await fetchPRComments(pr.number);
    for (const comment of comments) {
      extractVercelUrls(comment.body).forEach(url => allVercelUrls.add(url));
      extractRepoReferences(comment.body).forEach(repo => allRepos.add(repo));
    }
  }
  
  // Vercel URLs
  lines.push('## Vercel Deployment URLs');
  lines.push('');
  if (allVercelUrls.size === 0) {
    lines.push('_No Vercel URLs found in today\'s PRs._');
  } else {
    lines.push('| URL | Status |');
    lines.push('|---|---|');
    for (const url of allVercelUrls) {
      lines.push(`| [${url}](${url}) | 🔗 Live |`);
    }
  }
  lines.push('');
  
  // Repositories affected
  lines.push('## Repositories Affected');
  lines.push('');
  if (allRepos.size === 0) {
    lines.push(`_Only ${ORG}/${REPO} affected today._`);
  } else {
    lines.push('| Repository |');
    lines.push('|---|');
    allRepos.forEach(repo => {
      lines.push(`| [${repo}](https://github.com/${repo}) |`);
    });
  }
  lines.push('');
  
  lines.push('---');
  lines.push('');
  lines.push('_This report is automatically generated by `.github/workflows/daily-wr-summary.yml`._');
  
  return lines.join('\n');
}

/**
 * Generate HTML report
 */
function generateHTMLReport(markdown, date) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Daily WR & PR Summary — ${date}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: #333;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
    }
    
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
      padding: 40px;
    }
    
    h1 {
      color: #667eea;
      margin-bottom: 10px;
      font-size: 2.5em;
    }
    
    h2 {
      color: #764ba2;
      margin-top: 30px;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 2px solid #f0f0f0;
    }
    
    .meta {
      color: #666;
      font-size: 0.9em;
      margin-bottom: 20px;
    }
    
    .summary {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
    }
    
    .summary ul {
      list-style: none;
      padding: 0;
    }
    
    .summary li {
      padding: 8px 0;
      font-size: 1.1em;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
      background: white;
    }
    
    th {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 12px;
      text-align: left;
      font-weight: 600;
    }
    
    td {
      padding: 12px;
      border-bottom: 1px solid #e0e0e0;
    }
    
    tr:hover {
      background: #f8f9fa;
    }
    
    a {
      color: #667eea;
      text-decoration: none;
      font-weight: 500;
    }
    
    a:hover {
      text-decoration: underline;
    }
    
    .no-data {
      color: #999;
      font-style: italic;
      padding: 20px;
      text-align: center;
    }
    
    .status-badge {
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 0.85em;
      font-weight: 600;
    }
    
    .status-merged { background: #d4edda; color: #155724; }
    .status-open { background: #cce5ff; color: #004085; }
    .status-closed { background: #f8d7da; color: #721c24; }
    
    hr {
      border: none;
      border-top: 2px solid #f0f0f0;
      margin: 30px 0;
    }
    
    footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #f0f0f0;
      color: #666;
      font-size: 0.9em;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="container">
${convertMarkdownToHTML(markdown)}
  </div>
</body>
</html>`;
  
  return html;
}

/**
 * Convert markdown to HTML (basic conversion)
 */
function convertMarkdownToHTML(markdown) {
  let html = markdown;
  
  // Headers
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  
  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  
  // Italic
  html = html.replace(/_(.+?)_/g, '<em>$1</em>');
  
  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
  
  // Code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  
  // Lists
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n)+/g, '<ul>$&</ul>');
  
  // Tables (convert markdown tables to HTML)
  html = html.replace(/\|(.+)\|\n\|[-:| ]+\|\n((?:\|.+\|\n?)+)/g, (match, header, rows) => {
    const headerCells = header.split('|').filter(Boolean).map(cell => 
      `<th>${cell.trim()}</th>`
    ).join('');
    
    const bodyRows = rows.trim().split('\n').map(row => {
      const cells = row.split('|').filter(Boolean).map(cell => 
        `<td>${cell.trim()}</td>`
      ).join('');
      return `<tr>${cells}</tr>`;
    }).join('\n');
    
    return `<table><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table>`;
  });
  
  // Horizontal rules
  html = html.replace(/^---$/gm, '<hr>');
  
  // Paragraphs
  html = html.replace(/^([^<\n].+)$/gm, '<p>$1</p>');
  
  // Clean up multiple consecutive <p> tags
  html = html.replace(/<\/p>\n<p>/g, '</p><p>');
  
  return html;
}

// ────────────────────────────────────────────────────────────────────────────
// Main Execution
// ────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log('📊 Generating daily WR & PR summary...\n');
  
  const today = getToday();
  const yesterday = getYesterday();
  
  console.log(`📅 Date: ${today}`);
  console.log(`🔍 Looking for activity since: ${yesterday}\n`);
  
  // Fetch data
  console.log('📥 Fetching issues...');
  const issues = await fetchIssuesSince(yesterday);
  console.log(`   Found ${issues.length} issue(s)\n`);
  
  console.log('📥 Fetching pull requests...');
  const prs = await fetchPRsSince(yesterday);
  console.log(`   Found ${prs.length} PR(s)\n`);
  
  // Generate reports
  console.log('📝 Generating markdown report...');
  const markdown = await generateMarkdownReport(today, issues, prs);
  
  console.log('🎨 Generating HTML report...');
  const html = generateHTMLReport(markdown, today);
  
  // Write files
  const summariesDir = path.join(__dirname, '../wr/summaries');
  if (!fs.existsSync(summariesDir)) {
    fs.mkdirSync(summariesDir, { recursive: true });
  }
  
  const markdownPath = path.join(summariesDir, `${today}.md`);
  const htmlPath = path.join(summariesDir, `${today}.html`);
  
  fs.writeFileSync(markdownPath, markdown, 'utf8');
  console.log(`✅ Markdown report saved: ${markdownPath}`);
  
  fs.writeFileSync(htmlPath, html, 'utf8');
  console.log(`✅ HTML report saved: ${htmlPath}`);
  
  // Output for GitHub Actions
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `markdown_path=${markdownPath}\n`);
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `html_path=${htmlPath}\n`);
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `date=${today}\n`);
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `issues_count=${issues.length}\n`);
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `prs_count=${prs.length}\n`);
  }
  
  console.log('\n✨ Daily summary generation complete!');
}

// Run
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

module.exports = {
  generateMarkdownReport,
  generateHTMLReport,
  fetchIssuesSince,
  fetchPRsSince
};
