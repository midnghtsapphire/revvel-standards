#!/usr/bin/env node

/**
 * Perplexity Research Script
 *
 * Researches GitHub issues with Perplexity using a free, no-key-first strategy:
 *   1. PRIMARY (free): the no-key `helallao/perplexity-ai` Python bridge —
 *      anonymous Labs/Web access, no API key required.
 *   2. BACKUP: OpenRouter `perplexity/sonar-pro` when the no-key bridge is
 *      unavailable/rate-limited and OPENROUTER_API_KEY is present.
 *
 * 2026-05-21 (Claude): reconciled a botched merge that had concatenated two
 * separate implementations (duplicate `issueNumber`/`research` declarations,
 * a duplicate CONFIG.model, two `module.exports`, and a call to an undefined
 * `callPerplexity`). No capability was dropped — both the no-key bridge and the
 * OpenRouter backup are preserved; only the never-defined direct-key path was
 * removed. See docs/PERPLEXITY_NO_KEY_INTEGRATION.md.
 *
 * Usage:
 *   ISSUE_NUMBER=123 REPO=owner/repo node scripts/perplexity-research-issue.js
 *
 * Environment:
 *   ISSUE_NUMBER        - GitHub issue number to research (required)
 *   REPO                - Repository in format owner/repo (required)
 *   OPENROUTER_API_KEY  - Optional backup lane (perplexity/sonar-pro)
 */

const fs = require('fs');
const { execFileSync } = require('child_process');

// Configuration
const CONFIG = {
  model: 'sonar',                          // LabsClient model for the no-key bridge
  fallbackMode: 'auto',                    // Client.search mode inside the bridge
  // 2026-06-23: Use deep_search profile (Sonnet 3.5 + Fusion) for all research
  openrouterModel: 'deep_search',          // Uses deep_search profile in openrouter-routing.js
  maxTokens: 4000,
  temperature: 0.3,
  outputFile: '/tmp/perplexity-research.md',
};

// The keyless bridge lives in scripts/perplexity-no-key-bridge.js so this
// script and scripts/perplexity-lane.js share one copy (#17870). Two
// inline copies would drift, and the drift would be invisible until one
// of them silently stopped matching the installed Python package.
const { NO_KEY_BRIDGE, NO_KEY_INSTALL_HINT } = require('./perplexity-no-key-bridge');


async function main() {
  const issueNumber = process.env.ISSUE_NUMBER;
  const repo = process.env.REPO;
  const openrouterKey = process.env.OPENROUTER_API_KEY;

  if (!issueNumber) {
    throw new Error('Missing ISSUE_NUMBER');
  }
  if (!repo) {
    throw new Error('Missing REPO (format: owner/repo)');
  }

  console.log(`🔍 Researching issue #${issueNumber} in ${repo}...`);

  // Fetch issue details using gh CLI
  const issue = await fetchGitHubIssue(repo, issueNumber);

  // Build research prompt
  const prompt = buildResearchPrompt(issue);

  // Primary: free no-key bridge. Backup: OpenRouter perplexity/sonar-pro.
  let research;
  try {
    console.log('🤔 Asking Perplexity via the no-key bridge (primary, free)...');
    research = await callPerplexityNoKey(prompt);
  } catch (bridgeError) {
    console.warn(`⚠️ No-key bridge unavailable: ${bridgeError.message}`);
    if (!openrouterKey) {
      throw new Error(
        'No-key Perplexity bridge failed and no OPENROUTER_API_KEY backup is set. ' +
        `Install the bridge with: ${NO_KEY_INSTALL_HINT}`
      );
    }
    console.log('↩️ Falling back to OpenRouter perplexity/sonar-pro (backup)...');
    research = await callPerplexityViaOpenRouter(openrouterKey, prompt);
  }

  // Write research to file
  fs.writeFileSync(CONFIG.outputFile, research);
  console.log('✅ Research saved to', CONFIG.outputFile);

  // Post research comment to issue
  await postResearchComment(repo, issueNumber, research);

  console.log('✅ Research complete for issue #' + issueNumber);
}

function buildResearchPrompt(issue) {
  return `
You are the Revvel Standards research agent.

Research this GitHub issue and produce:
1. Concise diagnosis of the problem
2. Likely files/workflows involved
3. Current best-practice references
4. Implementation plan for the coding agent
5. Tests that should pass
6. Risks
7. Exact handoff prompt for the coding agent
8. Source URLs for any claims

Issue #${issue.number}: ${issue.title}
${issue.labels.length > 0 ? 'Labels: ' + issue.labels.join(', ') : ''}

Body:
${issue.body || '(No body)'}

${issue.comments.length > 0 ? 'Recent comments:\n' + issue.comments.map(c => `- ${c.author.login}: ${c.body.substring(0, 500)}`).join('\n\n') : ''}

Return your response in this format:
## Diagnosis
[Your analysis]

## Files Likely Involved
- [file list]

## Best Practices
- [references with URLs]

## Implementation Plan
1. [step]
2. [step]

## Tests
- [test names]

## Risks
- [risk]

## Code Agent Handoff
[Exact prompt for the coding agent]

## Sources
- [URL 1]
- [URL 2]
`;
}

/**
 * Primary lane: free no-key Perplexity via the helallao/perplexity-ai bridge.
 */
async function callPerplexityNoKey(prompt, execFileSyncImpl = execFileSync) {
  const output = execFileSyncImpl(
    'python3',
    ['-c', NO_KEY_BRIDGE, prompt, CONFIG.model, CONFIG.fallbackMode, NO_KEY_INSTALL_HINT],
    {
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024,
    }
  );

  const text = output.trim();
  if (!text) {
    throw new Error('No response returned from no-key Perplexity bridge.');
  }
  return text;
}

/**
 * Backup lane: route through OpenRouter using perplexity/sonar-pro.
 * Used when the no-key bridge fails but OPENROUTER_API_KEY is present.
 */
// 2026-06-23: Use deep_search profile for all OpenRouter research
const { callOpenRouter, ROUTING_PROFILES } = require('./openrouter-routing');

async function callPerplexityViaOpenRouter(openrouterKey, prompt) {
  // Get deep_search profile models (Sonnet 3.5 + Fusion)
  const profile = ROUTING_PROFILES.deep_search || { models: ['anthropic/claude-3.5-sonnet', 'openrouter/fusion'] };
  
  const messages = [
    {
      role: 'system',
      content: 'You are a source-grounded software automation research agent. Include source URLs when available. Be specific and actionable.'
    },
    {
      role: 'user',
      content: prompt
    }
  ];

  try {
    const result = await callOpenRouter({
      models: profile.models,
      messages: messages,
      max_tokens: CONFIG.maxTokens,
      temperature: CONFIG.temperature
    });
    return result.text;
  } catch (err) {
    throw new Error(`Deep search failed: ${err.message}`);
  }
}

async function fetchGitHubIssue(repo, issueNumber) {
  // Get issue details
  const issueData = JSON.parse(
    execFileSync(
      'gh',
      ['issue', 'view', String(issueNumber), '--repo', repo, '--json', 'title,body,labels,comments'],
      { encoding: 'utf8' }
    )
  );

  // Get recent commits that might be related
  let commits = [];
  try {
    const commitsData = execFileSync('git', ['log', '--oneline', '-10'], { encoding: 'utf8' });
    commits = commitsData.trim().split('\n').slice(0, 5);
  } catch (e) {
    // No commits available
  }

  return {
    number: parseInt(issueNumber),
    title: issueData.title,
    body: issueData.body,
    labels: issueData.labels.map(l => l.name),
    comments: issueData.comments || [],
    recentCommits: commits
  };
}

async function postResearchComment(repo, issueNumber, research) {
  const body = `## Perplexity Research Handoff

${research}

---
_Next: Label with \`wr:jules\` or \`wr:code\` to proceed_
`;

  // Write to temp file for gh CLI
  const tmpFile = '/tmp/perplexity-comment.md';
  fs.writeFileSync(tmpFile, body);

  execFileSync(
    'gh',
    ['issue', 'comment', String(issueNumber), '--repo', repo, '--body-file', tmpFile],
    { encoding: 'utf8' }
  );
}

// Run if executed directly
if (require.main === module) {
  main().catch(e => {
    console.error('Error:', e.message);
    process.exit(1);
  });
}

module.exports = {
  callPerplexityNoKey,
  callPerplexityViaOpenRouter,
  buildResearchPrompt,
  fetchGitHubIssue,
  postResearchComment,
};
