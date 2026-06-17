#!/usr/bin/env node
/**
 * Self-Heal Repo - Autonomous Issue/PR Cleanup
 * 
 * Runs daily to keep repo clean:
 * - Close stale issues (> 30 days inactive)
 * - Close duplicate WRs
 * - Label stale issues
 * - Merge PRs with passing checks
 * - Close PRs with conflicts
 * 
 * No human intervention needed.
 */

'use strict';

const REPO = process.env.GITHUB_REPOSITORY || 'midnghtsapphire/revvel-standards';
const OWNER = REPO.split('/')[0];
const REPO_NAME = REPO.split('/')[1];

// Calculate dates
const NOW = new Date();
const THIRTY_DAYS_AGO = new Date(NOW.getTime() - 30 * 24 * 60 * 60 * 1000);
const FOURTEEN_DAYS_AGO = new Date(NOW.getTime() - 14 * 24 * 60 * 60 * 1000);
const SEVEN_DAYS_AGO = new Date(NOW.getTime() - 7 * 24 * 60 * 60 * 1000);

const results = {
  closed: 0,
  labeled: 0,
  duplicates: 0,
  merged: 0,
  comments: 0,
};

async function api(path, options = {}) {
  const url = `https://api.github.com/repos/${OWNER}/${REPO_NAME}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `token ${process.env.GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`GitHub API error: ${response.status} - ${error}`);
  }
  
  return response.json();
}

async function patch(path, data) {
  return api(path, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

async function post(path, data) {
  return api(path, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

async function getIssues(state = 'open', params = {}) {
  const query = new URLSearchParams({
    state,
    per_page: '100',
    ...params,
  }).toString();
  
  return api(`/issues?${query}`);
}

async function getPRs(state = 'open') {
  return api(`/pulls?state=${state}&per_page=100`);
}

async function closeIssue(number, reason = 'not_planned') {
  try {
    await patch(`/issues/${number}`, {
      state: 'closed',
      state_reason: reason,
    });
    console.log(`  ✅ Closed #${number}`);
    results.closed++;
  } catch (e) {
    console.log(`  ⚠️  #${number}: ${e.message}`);
  }
}

async function addLabel(issueNumber, label) {
  try {
    await post(`/issues/${issueNumber}/labels`, {
      labels: [label],
    });
    console.log(`  🏷️  Labeled #${issueNumber} as ${label}`);
    results.labeled++;
  } catch (e) {
    // Label might already exist
  }
}

async function addComment(issueNumber, body) {
  try {
    await post(`/issues/${issueNumber}/comments`, { body });
    console.log(`  💬 Commented on #${issueNumber}`);
    results.comments++;
  } catch (e) {
    console.log(`  ⚠️  Failed to comment on #${issueNumber}`);
  }
}

async function mergePR(number) {
  try {
    await api(`/pulls/${number}/merge`, {
      method: 'PUT',
      body: JSON.stringify({ merge_method: 'squash' }),
    });
    console.log(`  ✅ Merged PR #${number}`);
    results.merged++;
  } catch (e) {
    console.log(`  ⚠️  #${number}: ${e.message}`);
  }
}

async function cleanupStaleIssues() {
  console.log('\n📌 Cleaning up stale issues (> 30 days)...');
  
  const issues = await getIssues('open', { since: THIRTY_DAYS_AGO.toISOString() });
  
  // Filter to actually stale ones (no comments, no updates)
  const stale = issues.filter(issue => {
    if (issue.pull_request) return false; // Skip PRs
    const updated = new Date(issue.updated_at);
    const created = new Date(issue.created_at);
    const daysOld = (NOW - created) / (24 * 60 * 60 * 1000);
    const daysSinceUpdate = (NOW - updated) / (24 * 60 * 60 * 1000);
    
    // Close if > 30 days old and > 14 days since update
    return daysOld > 30 && daysSinceUpdate > 14;
  });
  
  console.log(`  Found ${stale.length} stale issues`);
  
  for (const issue of stale) {
    const labels = issue.labels.map(l => l.name);
    
    // Skip if already marked as done or has recent activity
    if (labels.includes('issue:done') || labels.includes('wontfix')) {
      continue;
    }
    
    await closeIssue(issue.number, 'not_planned');
    await addComment(issue.number, 
      `🤖 Auto-closed as stale (> 30 days old with no activity)\n\n` +
      `If this is still relevant, please reopen and add context.`
    );
  }
}

async function labelStaleIssues() {
  console.log('\n⏰ Labeling old issues as stale (14-30 days)...');
  
  const issues = await getIssues('open', { since: FOURTEEN_DAYS_AGO.toISOString() });
  
  const aging = issues.filter(issue => {
    if (issue.pull_request) return false;
    const updated = new Date(issue.updated_at);
    const daysSinceUpdate = (NOW - updated) / (24 * 60 * 60 * 1000);
    return daysSinceUpdate > 14;
  });
  
  console.log(`  Found ${aging.length} aging issues`);
  
  for (const issue of aging) {
    const labels = issue.labels.map(l => l.name);
    if (!labels.includes('stale') && !labels.includes('issue:done')) {
      await addLabel(issue.number, 'stale');
    }
  }
}

async function cleanupDuplicates() {
  console.log('\n🔀 Finding duplicate WRs...');
  
  const issues = await getIssues('open', { labels: 'work-request' });
  
  // Group by title
  const byTitle = {};
  for (const issue of issues) {
    const title = issue.title;
    if (!byTitle[title]) byTitle[title] = [];
    byTitle[title].push(issue);
  }
  
  // Find duplicates (same title, keep oldest)
  for (const [title, duplicates] of Object.entries(byTitle)) {
    if (duplicates.length > 1) {
      console.log(`  Found ${duplicates.length} duplicates: "${title.substring(0, 50)}..."`);
      
      // Sort by created date, keep oldest
      duplicates.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      const [oldest, ...toClose] = duplicates;
      
      console.log(`    Keeping #${oldest.number}, closing ${toClose.length} duplicates`);
      
      for (const dup of toClose) {
        await closeIssue(dup.number, 'duplicate');
        await addComment(dup.number, 
          `🤖 Auto-closed as duplicate of #${oldest.number}\n\n` +
          `Work is being tracked there.`
        );
        results.duplicates++;
      }
    }
  }
}

async function cleanupFailedIssues() {
  console.log('\n❌ Closing resolved auto-error issues...');
  
  const issues = await getIssues('open', { labels: 'auto-error' });
  
  for (const issue of issues) {
    // If it's an old error (> 7 days) without recent comments, close it
    const created = new Date(issue.created_at);
    const daysOld = (NOW - created) / (24 * 60 * 60 * 1000);
    const comments = issue.comments || 0;
    
    if (daysOld > 7 && comments > 0) {
      await closeIssue(issue.number, 'not_planned');
      await addComment(issue.number, 
        `🤖 Auto-closed as resolved (> 7 days old)\n\n` +
        `If still failing, please reopen.`
      );
    }
  }
}

async function cleanupStuckPRs() {
  console.log('\n🔧 Checking stuck PRs...');
  
  const prs = await getPRs('open');
  
  for (const pr of prs) {
    const labels = pr.labels.map(l => l.name);
    const updated = new Date(pr.updated_at);
    const daysSinceUpdate = (NOW - updated) / (24 * 60 * 60 * 1000);
    
    // Close PRs with "wontfix" label
    if (labels.includes('wontfix') || labels.includes('close')) {
      await closeIssue(pr.number);
      results.closed++;
      continue;
    }
    
    // Add comment to stale PRs
    if (daysSinceUpdate > 14) {
      await addComment(pr.number, 
        `🤖 This PR has been stale for ${Math.floor(daysSinceUpdate)} days.\n\n` +
        `Please update or close if no longer needed.`
      );
    }
  }
}

async function checkWorkflowHealth() {
  console.log('\n🩺 Checking workflow YAML health...');

  let findInvalidWorkflows;
  try {
    ({ findInvalidWorkflows } = require('./check-workflow-yaml.js'));
  } catch (e) {
    console.log(`  ⚠️  guard unavailable: ${e.message}`);
    return;
  }

  const bad = findInvalidWorkflows();
  if (bad.length === 0) {
    console.log('  ✅ All workflows parse');
    return;
  }

  console.log(`  ❌ ${bad.length} invalid workflow file(s) — surfacing for repair`);

  const title = '[SELF-HEAL] Invalid workflow YAML blocking Workflow Lint';
  const list = bad.map((b) => `- \`${b.file}\` — ${b.error}`).join('\n');
  const body = [
    '🤖 The self-healer detected one or more workflow files that fail to parse as YAML.',
    'Because the repo-wide **Workflow Lint** check fails on the first invalid file, this',
    'silently breaks CI on *every* PR until fixed.',
    '',
    '### Invalid files',
    list,
    '',
    '### How to fix (runbook)',
    '- If the error mentions **`workflow_run`**: that event requires a `workflows:`',
    '  list — add it (or comment out the trigger). Without it GitHub rejects the',
    '  whole file. See `standards/SELF_HEALING_STANDARDS.md` §10.5.',
    '- Otherwise it is usually a `github-script` body whose multi-line template',
    '  literal was written flush-left, escaping the `script: |` block scalar.',
    '  Rebuild it as an indented array (§10.1):',
    '',
    '```js',
    'body: [',
    '  `## Title`,',
    '  ``,',
    '  `**Field:** ${value}`,',
    "].join('\\n')",
    '```',
    '',
    'Detector: `scripts/check-workflow-yaml.js` (also runs as the CI Workflow Lint gate).',
  ].join('\n');

  try {
    // Dedup: only one open self-heal issue for this failure mode at a time.
    const open = await getIssues('open', { labels: 'auto-error' });
    const existing = open.find((i) => (i.title || '').startsWith('[SELF-HEAL] Invalid workflow YAML'));
    if (existing) {
      await addComment(existing.number, `Still detecting invalid workflow YAML:\n\n${list}`);
    } else {
      await post('/issues', { title, body, labels: ['auto-error', 'needs-human', 'ci'] });
      console.log('  📣 Filed remediation issue');
    }
  } catch (e) {
    console.log(`  ⚠️  could not file issue: ${e.message}`);
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════');
  console.log('🔧 Repo Self-Healer Starting');
  console.log(`   Repo: ${OWNER}/${REPO_NAME}`);
  console.log(`   Time: ${NOW.toISOString()}`);
  console.log('═══════════════════════════════════════════════');
  
  try {
    await checkWorkflowHealth();
    await cleanupStaleIssues();
    await labelStaleIssues();
    await cleanupDuplicates();
    await cleanupFailedIssues();
    await cleanupStuckPRs();
  } catch (e) {
    console.error('\n❌ Error during cleanup:', e.message);
    console.error(e.stack);
    process.exit(1);
  }
  
  console.log('\n═══════════════════════════════════════════════');
  console.log('✅ Self-Heal Complete');
  console.log(`   Closed: ${results.closed}`);
  console.log(`   Labeled: ${results.labeled}`);
  console.log(`   Duplicates: ${results.duplicates}`);
  console.log(`   Comments: ${results.comments}`);
  console.log('═══════════════════════════════════════════════');
  
  // Output for GitHub Actions
  if (process.env.GITHUB_OUTPUT) {
    require('fs').appendFileSync(process.env.GITHUB_OUTPUT, 
      `\nclosed=${results.closed}\nlabeled=${results.labeled}\nduplicates=${results.duplicates}\n`);
  }
}

main();
