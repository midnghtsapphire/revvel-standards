#!/usr/bin/env node

/**
 * Perplexity Research Script
 * Researches GitHub issues using the no-key helallao/perplexity-ai fork
 * 
 * Usage:
 *   ISSUE_NUMBER=123 REPO=owner/repo node scripts/perplexity-research-issue.js
 * 
 * Environment:
 *   ISSUE_NUMBER - GitHub issue number to research
 *   REPO - Repository in format owner/repo
 *   PERPLEXITY_PYTHON - Optional Python executable override (default: python3)
 *   PERPLEXITY_MODEL - Optional no-key Labs model (default: sonar)
 */

const fs = require('fs');
const { execFileSync, spawn } = require('child_process');

// Configuration
const CONFIG = {
  provider: 'helallao/perplexity-ai',
  providerUrl: 'https://github.com/helallao/perplexity-ai',
  model: process.env.PERPLEXITY_MODEL || 'sonar',
  outputFile: '/tmp/perplexity-research.md',
  timeoutMs: Number(process.env.PERPLEXITY_TIMEOUT_MS || 120000),
  pythonExecutable: process.env.PERPLEXITY_PYTHON || process.env.PYTHON || 'python3',
};

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

  console.log('🤔 Asking Perplexity through no-key provider ' + CONFIG.provider + '...');

  // Call the no-key Perplexity fork. The workflow installs it from GitHub.
  const research = await callPerplexity(prompt);

  // Write research to file
  fs.writeFileSync(CONFIG.outputFile, research);
  console.log('✅ Research saved to', CONFIG.outputFile);

  // Post research comment to issue
  await postResearchComment(repo, issueNumber, research);

  console.log('✅ Research complete for issue #' + issueNumber);
}

const PYTHON_RESEARCH_BRIDGE = String.raw`
import json
import sys
import traceback

payload = json.loads(sys.stdin.read())
prompt = payload["prompt"]
model = payload.get("model") or "sonar"
errors = []

def answer_from(value):
    if value is None:
        return ""
    if isinstance(value, str):
        return value
    if isinstance(value, dict):
        for key in ("answer", "output", "text", "content"):
            candidate = value.get(key)
            if isinstance(candidate, str) and candidate.strip():
                return candidate
        return json.dumps(value, ensure_ascii=False)
    return str(value)

try:
    from perplexity.labs import LabsClient

    labs = LabsClient()
    labs_response = labs.ask(prompt, model=model)
    answer = answer_from(labs_response)
    if answer.strip():
        print(json.dumps({
            "provider": "helallao/perplexity-ai",
            "mode": "labs",
            "model": model,
            "answer": answer,
        }))
        sys.exit(0)
    errors.append("LabsClient returned an empty response")
except Exception as exc:
    errors.append("LabsClient failed: " + str(exc))

try:
    from perplexity import Client

    web_response = Client().search(prompt, mode="auto")
    answer = answer_from(web_response)
    if answer.strip():
        print(json.dumps({
            "provider": "helallao/perplexity-ai",
            "mode": "web-auto",
            "model": "auto",
            "answer": answer,
        }))
        sys.exit(0)
    errors.append("Client.search returned an empty response")
except Exception as exc:
    errors.append("Client.search failed: " + str(exc))

print(json.dumps({
    "error": "No-key Perplexity research failed",
    "details": errors,
    "traceback": traceback.format_exc(),
}), file=sys.stderr)
sys.exit(1)
`;

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

async function callPerplexity(promptOrApiKey, maybePrompt, options = {}) {
  const prompt = maybePrompt || promptOrApiKey;
  const runner = options.runner || runNoKeyPerplexity;
  const result = await runner(prompt, options);
  return normalizeResearchResult(result);
}

function normalizeResearchResult(result) {
  if (typeof result === 'string') {
    return result;
  }
  if (result && typeof result.answer === 'string' && result.answer.trim()) {
    const provider = result.provider || CONFIG.provider;
    const mode = result.mode || 'unknown';
    const model = result.model || CONFIG.model;
    return `${result.answer.trim()}

---
_Research provider: ${provider} (${mode}, ${model}); no official Perplexity API key used._`;
  }
  return JSON.stringify(result, null, 2);
}

function runNoKeyPerplexity(prompt, options = {}) {
  const pythonExecutable = options.pythonExecutable || CONFIG.pythonExecutable;
  const timeoutMs = options.timeoutMs || CONFIG.timeoutMs;
  const model = options.model || CONFIG.model;

  return new Promise((resolve, reject) => {
    const child = spawn(pythonExecutable, ['-c', PYTHON_RESEARCH_BRIDGE], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: process.env,
    });

    let stdout = '';
    let stderr = '';
    let settled = false;
    const timer = setTimeout(() => {
      settled = true;
      child.kill('SIGTERM');
      reject(new Error(`No-key Perplexity research timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(error);
    });
    child.on('close', (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (code !== 0) {
        reject(new Error(buildNoKeyFailureMessage(code, stderr, stdout)));
        return;
      }

      try {
        const parsed = parseLastJsonLine(stdout);
        resolve(parsed);
      } catch (error) {
        reject(new Error(`No-key Perplexity returned unparseable output: ${error.message}\n${stdout}`));
      }
    });

    child.stdin.write(JSON.stringify({ prompt, model }));
    child.stdin.end();
  });
}

function parseLastJsonLine(stdout) {
  const lines = stdout.trim().split('\n').filter(Boolean);
  for (const line of lines.reverse()) {
    try {
      return JSON.parse(line);
    } catch (error) {
      // Ignore log lines emitted by dependencies.
    }
  }
  throw new Error('no JSON payload found');
}

function buildNoKeyFailureMessage(code, stderr, stdout) {
  const installHint = [
    `No-key Perplexity provider exited with code ${code}.`,
    `Install with: python -m pip install "perplexity-api @ git+${CONFIG.providerUrl}.git@main"`,
    'This integration intentionally avoids Emailnator/account generation and does not require PERPLEXITY_API_KEY.',
  ].join(' ');
  const details = [stderr.trim(), stdout.trim()].filter(Boolean).join('\n');
  return details ? `${installHint}\n${details}` : installHint;
}

async function fetchGitHubIssue(repo, issueNumber) {
  // Get issue details
  const issueData = JSON.parse(
    execFileSync('gh', [
      'issue',
      'view',
      String(issueNumber),
      '--repo',
      repo,
      '--json',
      'title,body,labels,comments',
    ], { encoding: 'utf8' })
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

  execFileSync('gh', [
    'issue',
    'comment',
    String(issueNumber),
    '--repo',
    repo,
    '--body-file',
    tmpFile,
  ], { encoding: 'utf8' });
}

// Run if executed directly
if (require.main === module) {
  main().catch(e => {
    console.error('Error:', e.message);
    process.exit(1);
  });
}

module.exports = {
  CONFIG,
  callPerplexity,
  buildNoKeyFailureMessage,
  buildResearchPrompt,
  fetchGitHubIssue,
  normalizeResearchResult,
  parseLastJsonLine,
  runNoKeyPerplexity,
};