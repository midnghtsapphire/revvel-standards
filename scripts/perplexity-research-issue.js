#!/usr/bin/env node

/**
 * Perplexity Research Script
 * Researches GitHub issues using the no-key helallao/perplexity-ai bridge.
 * 
 * Usage:
 *   ISSUE_NUMBER=123 REPO=owner/repo node scripts/perplexity-research-issue.js
 * 
 * Environment:
 *   ISSUE_NUMBER - GitHub issue number to research
 *   REPO - Repository in format owner/repo
 */

const fs = require('fs');
const { execFileSync } = require('child_process');

// Configuration
const CONFIG = {
  model: 'sonar',
  fallbackMode: 'auto',
  outputFile: '/tmp/perplexity-research.md',
};

const NO_KEY_INSTALL_HINT =
  'python3 -m pip install "perplexity-api @ git+https://github.com/helallao/perplexity-ai.git@main"';

const NO_KEY_BRIDGE = `
import sys

prompt = sys.argv[1]
labs_model = sys.argv[2]
fallback_mode = sys.argv[3]
install_hint = sys.argv[4]

try:
    from perplexity import LabsClient, Client
except Exception as exc:
    raise SystemExit(
        f"Missing no-key Perplexity dependency ({exc}). Install with: {install_hint}"
    )

def normalize(value):
    if isinstance(value, str):
        return value.strip()

    if isinstance(value, dict):
        for key in ("output", "answer", "text", "content"):
            candidate = value.get(key)
            if isinstance(candidate, str) and candidate.strip():
                return candidate.strip()

        chunks = value.get("chunks")
        if isinstance(chunks, list):
            parts = []
            for chunk in chunks:
                if not isinstance(chunk, dict):
                    continue
                for key in ("text", "answer", "content"):
                    candidate = chunk.get(key)
                    if isinstance(candidate, str) and candidate.strip():
                        parts.append(candidate.strip())
                        break
            if parts:
                return "\\n".join(parts).strip()

    return ""

labs_error = ""
response_text = ""

try:
    response_text = normalize(LabsClient().ask(prompt, model=labs_model))
except Exception as exc:
    labs_error = str(exc)

if not response_text:
    try:
        response_text = normalize(Client().search(prompt, mode=fallback_mode))
    except Exception as exc:
        if labs_error:
            raise SystemExit(
                f"LabsClient failed: {labs_error}; Client.search failed: {exc}"
            )
        raise SystemExit(f"Client.search failed: {exc}")

if not response_text:
    if labs_error:
        raise SystemExit(
            f"No response returned from no-key Perplexity bridge. LabsClient detail: {labs_error}"
        )
    raise SystemExit("No response returned from no-key Perplexity bridge.")

print(response_text)
`;

async function main() {
  const issueNumber = process.env.ISSUE_NUMBER;
  const repo = process.env.REPO;

  if (!issueNumber) {
    throw new Error('Missing ISSUE_NUMBER');
  }
  if (!repo) {
    throw new Error('Missing REPO (format: owner/repo)');
  }

  console.log('🔍 Researching issue #' + issueNumber + ' in ' + repo + '...');

  // Fetch issue details using gh CLI
  const issue = await fetchGitHubIssue(repo, issueNumber);

  // Build research prompt
  const prompt = buildResearchPrompt(issue);

  console.log('🤔 Asking Perplexity (no-key bridge)...');

  // Call Perplexity through the no-key bridge
  const research = await callPerplexityNoKey(prompt);

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

module.exports = { callPerplexityNoKey, buildResearchPrompt, fetchGitHubIssue };
