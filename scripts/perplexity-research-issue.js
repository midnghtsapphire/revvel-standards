#!/usr/bin/env node

/**
 * Perplexity Research Script
 * Researches GitHub issues using Perplexity Sonar API (direct) or via
 * OpenRouter's Perplexity models (no-API-key fallback when
 * PERPLEXITY_API_KEY is absent but OPENROUTER_API_KEY is present).
 *
 * Usage:
 *   PERPLEXITY_API_KEY=xxx ISSUE_NUMBER=123 REPO=owner/repo node scripts/perplexity-research-issue.js
 *   OPENROUTER_API_KEY=xxx ISSUE_NUMBER=123 REPO=owner/repo node scripts/perplexity-research-issue.js
 *
 * Environment:
 *   PERPLEXITY_API_KEY  - Perplexity API key (direct lane; preferred)
 *   OPENROUTER_API_KEY  - OpenRouter API key (no-API fallback via perplexity/sonar-pro)
 *   ISSUE_NUMBER        - GitHub issue number to research
 *   REPO                - Repository in format owner/repo
 */

const fs = require('fs');
const { execFileSync } = require('child_process');

// Configuration
const CONFIG = {
  model: 'sonar-pro',
  openrouterModel: 'perplexity/sonar-pro',
  fallbackModel: 'sonar-deep-research',
  outputFile: '/tmp/perplexity-research.md',
  maxTokens: 8000,
  temperature: 0.4
};

async function main() {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  const openrouterKey = process.env.OPENROUTER_API_KEY;
  const issueNumber = process.env.ISSUE_NUMBER;
  const repo = process.env.REPO;

  if (!apiKey && !openrouterKey) {
    throw new Error(
      'No research API key available. Set PERPLEXITY_API_KEY (direct Perplexity lane) ' +
      'or OPENROUTER_API_KEY (no-key Perplexity lane via OpenRouter perplexity/sonar-pro).'
    );
  }
  if (!issueNumber) {
    throw new Error('Missing ISSUE_NUMBER');
  }
  if (!repo) {
    throw new Error('Missing REPO (format: owner/repo)');
  }

  const lane = apiKey ? 'direct Perplexity API' : 'OpenRouter perplexity/sonar-pro (no-key lane)';
  console.log(`🔍 Researching issue #${issueNumber} in ${repo} via ${lane}...`);

  // Fetch issue details using gh CLI
  const issue = await fetchGitHubIssue(repo, issueNumber);

  // Build research prompt
  const prompt = buildResearchPrompt(issue);

  console.log('🤔 Asking Perplexity...');

  // Call Perplexity (direct) or OpenRouter (no-key fallback)
  const research = apiKey
    ? await callPerplexity(apiKey, prompt)
    : await callPerplexityViaOpenRouter(openrouterKey, prompt);

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

async function callPerplexity(apiKey, prompt) {
  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: CONFIG.model,
      messages: [
        {
          role: 'system',
          content: 'You are a source-grounded software automation research agent. Include source URLs when available. Be specific and actionable.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: CONFIG.maxTokens,
      temperature: CONFIG.temperature
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Perplexity API error (${response.status}): ${error}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || JSON.stringify(data, null, 2);
}

/**
 * No-key Perplexity lane: route through OpenRouter using perplexity/sonar-pro.
 * Used when PERPLEXITY_API_KEY is absent but OPENROUTER_API_KEY is present.
 */
async function callPerplexityViaOpenRouter(openrouterKey, prompt) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openrouterKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://github.com/midnghtsapphire/revvel-standards',
      'X-Title': 'revvel-standards mindmappr research'
    },
    body: JSON.stringify({
      model: CONFIG.openrouterModel,
      messages: [
        {
          role: 'system',
          content: 'You are a source-grounded software automation research agent. Include source URLs when available. Be specific and actionable.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: CONFIG.maxTokens,
      temperature: CONFIG.temperature
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter/Perplexity API error (${response.status}): ${error}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || JSON.stringify(data, null, 2);
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

module.exports = { callPerplexity, callPerplexityViaOpenRouter, buildResearchPrompt, fetchGitHubIssue };
