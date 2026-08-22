#!/usr/bin/env node

import { execSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

export class GitHubApiError extends Error {
  constructor(message, extras = {}) {
    super(message);
    this.name = 'GitHubApiError';
    this.status = extras.status;
    this.url = extras.url;
  }
}

function log(msg) {
  console.log(`[Merge Prosecutor] ${msg}`);
}

export function githubHeaders(token, accept = 'application/vnd.github.v3+json') {
  return {
    Authorization: `token ${token}`,
    Accept: accept,
    'User-Agent': 'merge-prosecutor'
  };
}

/**
 * Parse GitHub's Link header for rel="next".
 * Why: comments endpoints paginate at 30/100 items; stopping at page 1
 * silently drops later review comments and looks like a clean pass.
 * If this fails: check that the mock/real response exposes headers.get('link').
 */
export function parseNextLink(linkHeader) {
  if (!linkHeader || typeof linkHeader !== 'string') return null;
  const parts = linkHeader.split(',');
  for (const part of parts) {
    const match = part.match(/<([^>]+)>\s*;\s*rel="next"/i);
    if (match) return match[1];
  }
  return null;
}

/**
 * Fail-closed paginated JSON GET. API errors throw GitHubApiError — they
 * must not become [] and look like "no comments".
 */
export async function fetchPaginatedJson(startUrl, { token, fetchImpl = fetch, perPage = 100 } = {}) {
  if (!token) {
    throw new GitHubApiError('GITHUB_TOKEN is required for GitHub API fetches');
  }

  const results = [];
  const first = new URL(startUrl);
  first.searchParams.set('per_page', String(perPage));
  first.searchParams.set('page', '1');

  let nextUrl = first.toString();
  let pages = 0;
  const maxPages = 50;

  while (nextUrl && pages < maxPages) {
    pages += 1;
    const response = await fetchImpl(nextUrl, { headers: githubHeaders(token) });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new GitHubApiError(
        `GitHub API ${response.status} ${response.statusText} for ${nextUrl}: ${body.slice(0, 200)}`,
        { status: response.status, url: nextUrl }
      );
    }

    const data = await response.json();
    if (!Array.isArray(data)) {
      throw new GitHubApiError(`GitHub API returned non-array JSON for ${nextUrl}`, { url: nextUrl });
    }
    results.push(...data);

    const headers = response.headers;
    const link = headers && typeof headers.get === 'function'
      ? headers.get('link')
      : null;
    const linkedNext = parseNextLink(link);
    if (linkedNext) {
      nextUrl = linkedNext;
      continue;
    }
    if (data.length === perPage) {
      const u = new URL(nextUrl);
      const currentPage = Number(u.searchParams.get('page') || '1');
      u.searchParams.set('page', String(currentPage + 1));
      nextUrl = u.toString();
      continue;
    }
    nextUrl = null;
  }

  return results;
}

export async function fetchPRComments(token, repo, prNumber, fetchImpl = fetch) {
  const url = `https://api.github.com/repos/${repo}/issues/${prNumber}/comments`;
  return fetchPaginatedJson(url, { token, fetchImpl });
}

export async function fetchPRReviewComments(token, repo, prNumber, fetchImpl = fetch) {
  const url = `https://api.github.com/repos/${repo}/pulls/${prNumber}/comments`;
  return fetchPaginatedJson(url, { token, fetchImpl });
}

/**
 * Fail-closed PR diff. A failed fetch or empty body must not become "" and
 * look like a clean pass (no conflicts, no duplicates, no unimplemented).
 */
export async function resolveDiff({ token, repo, prNumber, diffContent, fetchImpl = fetch }) {
  if (diffContent && String(diffContent).trim()) {
    return String(diffContent);
  }

  if (!token || !repo || !prNumber) {
    throw new GitHubApiError(
      'No DIFF_CONTENT and missing GITHUB_TOKEN / GITHUB_REPOSITORY / PR_NUMBER — refusing to pass on an empty diff'
    );
  }

  const url = `https://api.github.com/repos/${repo}/pulls/${prNumber}`;
  const response = await fetchImpl(url, {
    headers: githubHeaders(token, 'application/vnd.github.v3.diff')
  });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new GitHubApiError(
      `Failed to fetch PR diff: ${response.status} ${response.statusText} ${body.slice(0, 200)}`,
      { status: response.status, url }
    );
  }

  const text = await response.text();
  if (!text || !String(text).trim()) {
    throw new GitHubApiError('PR diff was empty — refusing to treat as a clean pass', { url });
  }
  return text;
}

export function computeLevenshtein(a, b) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));

  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[a.length][b.length];
}

export function detectDuplicatedBlocks(diffText) {
  // mathematical approach to find chunks that are too similar and added in a single diff
  // this looks for situations where 'current' and 'incoming' were both kept
  const additions = [];
  const lines = diffText.split('\n');
  let currentFile = '';

  for (const line of lines) {
    if (line.startsWith('+++ b/')) {
      currentFile = line.slice(6);
    } else if (line.startsWith('+') && !line.startsWith('+++')) {
      const content = line.slice(1).trim();
      if (content.length > 5) {
        additions.push({ file: currentFile, text: content });
      }
    }
  }

  const duplicates = [];
  // block length of 2 lines for testing flexibility
  for (let i = 0; i < additions.length - 3; i++) {
    const blockA = additions.slice(i, i + 2).map(a => a.text).join(' ');

    for (let j = i + 2; j < additions.length - 1; j++) {
      if (additions[i].file !== additions[j].file) continue;

      // don't compare the block against itself (ensure no overlap)
      if (j >= i + 2) {
        const blockB = additions.slice(j, j + 2).map(a => a.text).join(' ');
        const distance = computeLevenshtein(blockA, blockB);
        const maxLen = Math.max(blockA.length, blockB.length);

        // if blocks are 85% similar, flag as potential bad merge
        if (distance < maxLen * 0.15) {
          duplicates.push({
            file: additions[i].file,
            blockA,
            blockB,
            distance
          });
        }
      }
    }
  }

  return duplicates;
}

export function detectUnresolvedConflicts(diffText) {
  const conflictMarkers = [];
  const lines = diffText.split('\n');
  let currentFile = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('+++ b/')) {
      currentFile = line.slice(6);
    }

    if (line.startsWith('+<<<<<<<') || line.startsWith('+=======')) {
       conflictMarkers.push({ file: currentFile, line: line.slice(1) });
    }
  }
  return conflictMarkers;
}

/**
 * Language tag may be empty, mixed-case, or include +/# (c++, C#).
 * Fence opener must accept CRLF (`\r\n`) — the old `/```[a-z]*\n/` missed
 * both uppercase tags and Windows line endings.
 */
export const CODE_BLOCK_RE = /```[^\n`]*\r?\n([\s\S]*?)```/g;

export function extractCodeBlocks(body) {
  if (!body) return [];
  const blocks = [];
  const re = new RegExp(CODE_BLOCK_RE.source, 'g');
  let match;
  while ((match = re.exec(body)) !== null) {
    const suggestion = match[1].replace(/\r\n/g, '\n').trim();
    if (suggestion) blocks.push(suggestion);
  }
  return blocks;
}

/**
 * Exact line or tight Levenshtein — never String.includes.
 * Why: `aLine.includes(sLine)` flagged "log" inside "console.log" and any
 * short suggestion fragment that appeared as a substring.
 */
export function suggestionLineMatches(suggestionLine, addedLine) {
  if (suggestionLine === addedLine) return true;
  const maxLen = Math.max(suggestionLine.length, addedLine.length);
  if (maxLen === 0) return false;
  const distance = computeLevenshtein(suggestionLine, addedLine);
  return distance < maxLen * 0.10;
}

export function isHumanReviewer(comment) {
  const login = comment && comment.user && comment.user.login ? String(comment.user.login) : '';
  if (!login) return false;
  if (comment.user && comment.user.type === 'Bot') return false;
  if (/\[bot\]$/i.test(login)) return false;
  return true;
}

export function detectUnimplementedSuggestions(diffText, comments) {
  const additions = [];
  const lines = String(diffText || '').split('\n');

  for (const line of lines) {
    if (line.startsWith('+') && !line.startsWith('+++')) {
      additions.push(line.slice(1).trim());
    }
  }

  const unimplemented = [];

  for (const comment of comments) {
    if (!comment.body) continue;
    if (!isHumanReviewer(comment)) continue;

    const blocks = extractCodeBlocks(comment.body);
    for (const suggestion of blocks) {
      if (suggestion.length < 10) continue;

      const suggestionLines = suggestion.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      if (suggestionLines.length === 0) continue;

      let foundLines = 0;
      for (const sLine of suggestionLines) {
        let lineFound = false;
        for (const aLine of additions) {
          if (suggestionLineMatches(sLine, aLine)) {
            lineFound = true;
            break;
          }
        }
        if (lineFound) foundLines++;
      }

      const matchRatio = foundLines / suggestionLines.length;
      if (matchRatio < 0.9) {
        unimplemented.push({
          commentUrl: comment.html_url || "unknown",
          user: comment.user ? comment.user.login : "unknown",
          suggestion,
          matchRatio
        });
      }
    }
  }

  return unimplemented;
}

/**
 * Word-bounded dismissive phrases. Bare `leave it` without boundaries matched
 * "leave items" / "leave iteration". Keep the original intent (punt language).
 */
export const DISMISSIVE_REGEX = /\bnot my (error|bug|problem)\b|\bleave it\b|\bout of scope\b/i;

export function isDismissiveComment(body) {
  return Boolean(body) && DISMISSIVE_REGEX.test(body);
}

function createWR(title, issueContext, learnings, rootDir) {
  const wrDir = join(rootDir, 'wr');
  try {
    mkdirSync(wrDir, { recursive: true });
  } catch (e) {}

  const wrId = Math.floor(Math.random() * 100000);
  const wrPath = join(wrDir, `wr-${wrId}-prosecutor.md`);

  const templateContent = `# WR: ${title}

## Issue Context

${issueContext}

## Scope

Fix the merge errors and dismissive attitudes found by the Merge Prosecutor Action.

## Acceptance Criteria

- [ ] Change delivers the described behavior
- [ ] Tests updated / added where applicable
- [ ] Docs updated where applicable

## Learnings — What & Why

${learnings}
`;
  writeFileSync(wrPath, templateContent);
  log(`Created WR: ${wrPath}`);
}

export async function main(env = process.env, fetchImpl = fetch) {
  const token = env.GITHUB_TOKEN;
  const repo = env.GITHUB_REPOSITORY;
  const prNumber = env.PR_NUMBER;
  const testCmd = env.TEST_COMMAND;
  const workspaceDir = env.WORKSPACE_DIR || process.cwd();
  const providedDiff = env.DIFF_CONTENT || '';

  const diffContent = await resolveDiff({
    token,
    repo,
    prNumber,
    diffContent: providedDiff,
    fetchImpl
  });

  log("1. Checking for unresolved conflicts...");
  const conflicts = detectUnresolvedConflicts(diffContent);
  if (conflicts.length > 0) {
      log(`Found unresolved conflicts in ${conflicts.length} locations!`);
      const context = conflicts.map(c => `- ${c.file}: ${c.line}`).join('\n');
      createWR("Fix Unresolved Merge Conflicts", context, "Conflict markers were left in the codebase.", workspaceDir);
      process.exitCode = 1;
  }

  log("2. Checking for duplicated code blocks (bad merge)...");
  const duplicates = detectDuplicatedBlocks(diffContent);
  if (duplicates.length > 0) {
      log(`Found ${duplicates.length} potential duplicate blocks indicating keeping both current and incoming sides.`);
      const context = duplicates.slice(0, 5).map(d => `- ${d.file}: ${d.blockA}`).join('\n');
      createWR("Fix Duplicated Blocks from Bad Merge", context, "Merge resolution incorrectly kept both 'current' and 'incoming' logic instead of choosing one or refactoring.\n\nProblem created: This results in redundant code execution, duplicated logic, and potentially introduces syntax or runtime errors.", workspaceDir);
      process.exitCode = 1;
  }

  log("3. Testing system stability...");
  if (testCmd) {
      try {
          log(`Running: ${testCmd}`);
          execSync(testCmd, { cwd: workspaceDir, stdio: 'inherit' });
          log("Tests passed!");
      } catch (e) {
          log("Tests failed! The merge broke the system.");
          createWR("Fix Broken Tests after Merge", `Tests failed when running ${testCmd}.`, "The recent merge introduced regressions that were not caught.", workspaceDir);
          process.exitCode = 1;
      }
  }

  log("4. Checking for dismissive comments...");
  if (token && repo && prNumber) {
      const issueComments = await fetchPRComments(token, repo, prNumber, fetchImpl);
      const reviewComments = await fetchPRReviewComments(token, repo, prNumber, fetchImpl);

      const allComments = [...issueComments, ...reviewComments];

      const dismissiveComments = allComments.filter(c => isHumanReviewer(c) && isDismissiveComment(c.body));

      if (dismissiveComments.length > 0) {
          log(`Found ${dismissiveComments.length} dismissive comments.`);
          for (const c of dismissiveComments) {
             createWR(`Address Dismissive Comment from ${c.user.login}`, `Comment URL: ${c.html_url}\n\nBody: ${c.body}`, "Agents cannot dismiss bugs or tasks as 'out of scope' or 'not my bug' without filing a formal WR.", workspaceDir);
          }
          process.exitCode = 1;
      }

      log("5. Checking for unimplemented review suggestions...");
      const unimplemented = detectUnimplementedSuggestions(diffContent, allComments);
      if (unimplemented.length > 0) {
          log(`Found ${unimplemented.length} unimplemented code suggestions in comments.`);
          for (const u of unimplemented) {
              createWR(`Implement Code Suggestion from ${u.user}`, `Comment URL: ${u.commentUrl}\n\nSuggested Code:\n\`\`\`\n${u.suggestion}\n\`\`\`\n\nMatch Ratio found in PR: ${u.matchRatio.toFixed(2)}`, "A code review suggestion was ignored or missed before merging.", workspaceDir);
          }
          process.exitCode = 1;
      }
  }

  if (process.exitCode === 1) {
      log("Merge Prosecutor failed the PR.");
  } else {
      log("Merge Prosecutor passed.");
  }
}

// only run main if called directly
if (process.argv[1] && process.argv[1].endsWith('run-prosecutor.mjs')) {
    main().catch(err => {
        console.error(err);
        process.exit(1);
    });
}
