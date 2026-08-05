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
const DATE_OVERRIDE = process.env.DATE_OVERRIDE; // Support date override from workflow

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
 * Supports DATE_OVERRIDE environment variable for testing
 */
function getToday() {
  if (DATE_OVERRIDE) {
    return DATE_OVERRIDE;
  }
  const date = new Date();
  return date.toISOString().split('T')[0];
}

/**
 * Get yesterday's date in YYYY-MM-DD format
 * Returns the date before getToday()
 */
function getYesterday() {
  const today = getToday();
  const date = new Date(today + 'T00:00:00Z');
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().split('T')[0];
}

/**
 * Format ISO timestamp to readable format in UTC
 */
function formatDate(isoString) {
  const date = new Date(isoString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'UTC'
  }) + ' UTC';
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
 * Only matches when preceded by whitespace or repo: to avoid false matches
 */
function extractRepoReferences(text) {
  if (!text) return [];
  // Match owner/repo but only when preceded by whitespace, 'repo:', '@', or start of string
  // This avoids matching URLs like example.com/path
  const repoPattern = /(?:^|[\s@]|repo:)([a-zA-Z0-9-]+\/[a-zA-Z0-9._-]+)(?=[\s,.\)]|$)/g;
  const matches = [];
  let match;
  while ((match = repoPattern.exec(text)) !== null) {
    const repo = match[1];
    // Exclude if it looks like a URL (contains a dot in the owner part)
    if (!repo.split('/')[0].includes('.')) {
      matches.push(repo);
    }
  }
  return [...new Set(matches)];
}

// ────────────────────────────────────────────────────────────────────────────
// Data Fetching
// ────────────────────────────────────────────────────────────────────────────

/**
 * Fetch issues created since a given date using Search API for accurate created_at filtering
 */
async function fetchIssuesSince(since) {
  try {
    // Use Search API to filter by created date accurately
    const query = `repo:${ORG}/${REPO} is:issue created:>=${since}`;
    
    // Use paginate to get all results
    const issues = await octokit.paginate(octokit.rest.search.issuesAndPullRequests, {
      q: query,
      sort: 'created',
      order: 'desc',
      per_page: 100
    });
    
    // Filter out pull requests (search API can return both)
    return issues.filter(issue => !issue.pull_request);
  } catch (error) {
    console.error('❌ Error fetching issues:', error.message);
    return [];
  }
}

/**
 * Fetch pull requests created since a given date using Search API for accurate created_at filtering
 */
async function fetchPRsSince(since) {
  try {
    // Use Search API to filter by created date accurately
    const query = `repo:${ORG}/${REPO} is:pr created:>=${since}`;
    
    // Use paginate to get all results
    const results = await octokit.paginate(octokit.rest.search.issuesAndPullRequests, {
      q: query,
      sort: 'created',
      order: 'desc',
      per_page: 100
    });
    
    // Defensive filter: ensure only PRs are returned (items with pull_request property)
    return results.filter(item => item.pull_request).map(pr => ({ ...pr, merged_at: pr.pull_request.merged_at }));
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
  
  // Extract from PR bodies first
  for (const pr of prs) {
    extractVercelUrls(pr.body).forEach(url => allVercelUrls.add(url));
    extractRepoReferences(pr.body).forEach(repo => allRepos.add(repo));
  }
  
  // Fetch comments for all PRs concurrently with a concurrency limit
  const CONCURRENCY_LIMIT = 5;
  const prComments = new Map();
  
  for (let i = 0; i < prs.length; i += CONCURRENCY_LIMIT) {
    const batch = prs.slice(i, i + CONCURRENCY_LIMIT);
    const commentPromises = batch.map(pr => 
      fetchPRComments(pr.number).then(comments => [pr.number, comments])
    );
    const results = await Promise.all(commentPromises);
    results.forEach(([prNumber, comments]) => {
      prComments.set(prNumber, comments);
    });
  }
  
  // Extract URLs and repos from comments
  for (const pr of prs) {
    const comments = prComments.get(pr.number) || [];
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
 * Escape HTML special characters to prevent XSS
 */
function escapeHtml(text) {
  if (!text) return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };
  return text.toString().replace(/[&<>"']/g, m => map[m]);
}

/**
 * Convert markdown to HTML with proper escaping
 * Strategy: Escape all user content first, then apply HTML formatting to safe patterns
 */
function convertMarkdownToHTML(markdown) {
  const lines = markdown.split('\n');
  const processedLines = [];
  let inTable = false;
  let inList = false;
  const listItems = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Headers
    if (line.match(/^# (.+)$/)) {
      const text = line.match(/^# (.+)$/)[1];
      processedLines.push(`<h1>${escapeHtml(text)}</h1>`);
      continue;
    }
    if (line.match(/^## (.+)$/)) {
      const text = line.match(/^## (.+)$/)[1];
      processedLines.push(`<h2>${escapeHtml(text)}</h2>`);
      continue;
    }
    if (line.match(/^### (.+)$/)) {
      const text = line.match(/^### (.+)$/)[1];
      processedLines.push(`<h3>${escapeHtml(text)}</h3>`);
      continue;
    }
    
    // Horizontal rules
    if (line === '---') {
      processedLines.push('<hr>');
      continue;
    }
    
    // Tables
    if (line.match(/^\|.*\|$/)) {
      if (!inTable && i + 1 < lines.length && lines[i + 1].match(/^\|[-:| ]+\|$/)) {
        // Table header
        inTable = true;
        const cells = line.split('|').filter(Boolean);
        const headerCells = cells.map(cell => `<th>${escapeHtml(cell.trim())}</th>`).join('');
        processedLines.push(`<table><thead><tr>${headerCells}</tr></thead><tbody>`);
        i++; // Skip separator line
        continue;
      } else if (inTable) {
        // Table row
        const cells = line.split('|').filter(Boolean);
        const rowCells = cells.map(cell => {
          // Process inline markdown in cells (bold, italic, links, code)
          let cellContent = escapeHtml(cell.trim());
          // Convert markdown links: [text](url) → <a> tags
          cellContent = cellContent.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text, url) => {
            return `<a href="${url}" target="_blank" rel="noopener noreferrer">${text}</a>`;
          });
          cellContent = cellContent.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
          cellContent = cellContent.replace(/_(.+?)_/g, '<em>$1</em>');
          cellContent = cellContent.replace(/`([^`]+)`/g, '<code>$1</code>');
          return `<td>${cellContent}</td>`;
        }).join('');
        processedLines.push(`<tr>${rowCells}</tr>`);
        continue;
      }
    } else if (inTable) {
      // End of table
      processedLines.push('</tbody></table>');
      inTable = false;
    }
    
    // Lists
    if (line.match(/^- (.+)$/)) {
      if (!inList) {
        inList = true;
      }
      const text = line.match(/^- (.+)$/)[1];
      // Process inline markdown in list items
      let listContent = escapeHtml(text);
      listContent = listContent.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      listContent = listContent.replace(/(^|\s)_([^_]+)_(?=\s|$|[.,;:!?)])/g, '$1<em>$2</em>');
      listContent = listContent.replace(/`([^`]+)`/g, '<code>$1</code>');
      listItems.push(`<li>${listContent}</li>`);
      continue;
    } else if (inList) {
      // End of list
      processedLines.push('<ul>' + listItems.join('') + '</ul>');
      listItems.length = 0;
      inList = false;
    }
    
    // Links (full line or inline)
    let processedLine = line;
    processedLine = processedLine.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text, url) => {
      return `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(text)}</a>`;
    });
    
    // If line wasn't processed and contains content, escape and wrap in paragraph
    if (processedLine === line && line.trim() !== '' && !line.match(/^<[^>]+>/)) {
      let content = escapeHtml(line);
      // Apply inline formatting
      content = content.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      content = content.replace(/(^|\s)_([^_]+)_(?=\s|$|[.,;:!?)])/g, '$1<em>$2</em>');
      content = content.replace(/`([^`]+)`/g, '<code>$1</code>');
      processedLines.push(`<p>${content}</p>`);
    } else if (processedLine !== line) {
      // Links were processed, wrap if needed
      if (!processedLine.match(/^<[^>]+>/)) {
        processedLines.push(`<p>${processedLine}</p>`);
      } else {
        processedLines.push(processedLine);
      }
    } else if (line.trim() === '') {
      processedLines.push('');
    }
  }
  
  // Close any open lists or tables
  if (inList && listItems.length > 0) {
    processedLines.push('<ul>' + listItems.join('') + '</ul>');
  }
  if (inTable) {
    processedLines.push('</tbody></table>');
  }
  
  return processedLines.join('\n');
}

// ────────────────────────────────────────────────────────────────────────────
// Main Execution
// ────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log('📊 Generating daily WR & PR summary...\n');
  
  const today = getToday();
  
  console.log(`📅 Date: ${today}`);
  console.log(`🔍 Looking for activity since midnight today (${today} 00:00 UTC)\n`);
  
  // Fetch data - use today as cutoff for true 24-hour window
  console.log('📥 Fetching issues...');
  const issues = await fetchIssuesSince(today);
  console.log(`   Found ${issues.length} issue(s)\n`);
  
  console.log('📥 Fetching pull requests...');
  const prs = await fetchPRsSince(today);
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
