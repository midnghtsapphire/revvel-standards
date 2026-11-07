#!/usr/bin/env node

import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
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

const KEEP_BOTH_MIN_LEN = 2;
const KEEP_BOTH_MAX_LEN = 16;
const KEEP_BOTH_MAX_GAP = 1;

/**
 * Keep-both means two similar copies sit back-to-back in the added lines
 * (conflict resolution kept current and incoming). A file-wide 2-line
 * 85% scan is not that: it flags any reused idiom in the same file.
 * Why this matters: wiring this action on the default-branch PR path
 * made that scan a real gate. PR #17899 failed `prosecute` on 8 hits
 * that were the fail-closed `response.text()` + `GitHubApiError` pair
 * used twice, plus repeated test fixtures — not a bad merge.
 * If this starts missing a real keep-both, check that the two copies
 * are consecutive (or one added line apart) and at least 2 lines each.
 */
function findConsecutiveKeepBoth(additions, start) {
  for (let gap = 0; gap <= KEEP_BOTH_MAX_GAP; gap++) {
    for (let len = KEEP_BOTH_MIN_LEN; len <= KEEP_BOTH_MAX_LEN; len++) {
      const j = start + len + gap;
      if (j + len > additions.length) break;
      if (additions[start].file !== additions[j].file) return null;

      const blockA = additions.slice(start, start + len).map((a) => a.text).join(' ');
      const blockB = additions.slice(j, j + len).map((a) => a.text).join(' ');
      const maxLen = Math.max(blockA.length, blockB.length);
      if (!maxLen) continue;
      const distance = computeLevenshtein(blockA, blockB);
      if (distance < maxLen * 0.15) {
        return {
          file: additions[start].file,
          blockA,
          blockB,
          distance
        };
      }
    }
  }
  return null;
}

export function detectDuplicatedBlocks(diffText) {
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
  const seen = new Set();
  for (let i = 0; i < additions.length - KEEP_BOTH_MIN_LEN; i++) {
    const hit = findConsecutiveKeepBoth(additions, i);
    if (!hit) continue;
    const key = `${hit.file}\n${hit.blockA}\n${hit.blockB}`;
    if (seen.has(key)) continue;
    seen.add(key);
    duplicates.push(hit);
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

    // >>>>>>> is the end marker. A resolution that left only the closer
    // used to pass, because the scan stopped at <<<<<<< and =======.
    if (line.startsWith('+<<<<<<<') || line.startsWith('+=======') || line.startsWith('+>>>>>>>')) {
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

/**
 * Markers the in-repo AI reviewers stamp onto their own comments.
 *
 * These reviewers post through a human PAT, so `user.type` is `User` and the
 * `[bot]` suffix never appears — they are indistinguishable from a person by
 * account alone. Without this check the prosecutor treats an AI's illustrative
 * snippet as a binding human review suggestion and blocks the merge.
 */
export const AI_REVIEWER_MARKERS = [
  '<!-- ai-pr-reviewer -->',
  '#ai-review-summary'
];

export function isAiReviewerComment(comment) {
  const body = comment && comment.body ? String(comment.body) : '';
  if (!body) return false;
  return AI_REVIEWER_MARKERS.some(marker => body.includes(marker));
}

export function isHumanReviewer(comment) {
  const login = comment && comment.user && comment.user.login ? String(comment.user.login) : '';
  if (!login) return false;
  if (comment.user && comment.user.type === 'Bot') return false;
  if (/\[bot\]$/i.test(login)) return false;
  if (isAiReviewerComment(comment)) return false;
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

/**
 * Stable id for one finding on one pull request.
 * Same inputs always return the same id, so a second Actions run
 * finds the issue already opened instead of filing another one.
 * Random ids (the old wr-${n}-prosecutor.md names) cannot do that:
 * every synchronize event minted a new file that the runner then deleted.
 */
export function findingFingerprint(parts) {
  return createHash('sha256')
    .update(parts.map((part) => String(part ?? '')).join('\u001f'))
    .digest('hex')
    .slice(0, 20);
}

export function workRequestIssueTitle(title, prNumber) {
  const cleaned = String(title || '').replace(/^\[WR\]\s*/i, '').trim();
  const suffix = prNumber ? ` (PR #${prNumber})` : '';
  return `[WR] ${cleaned}${suffix}`;
}

/**
 * Body shared by the runner markdown and the GitHub issue.
 * The call chain starts when an issue titled `[WR]` is opened
 * (START_HERE_CALL_CHAIN.md). A file under the job workspace is not that.
 * `mpkey` is a single search token on purpose: a `key: value` line is
 * parsed by GitHub search as a qualifier and the lookup 422s.
 */
export function renderWorkRequest({
  title,
  issueContext,
  learnings,
  fingerprint,
  repo,
  prNumber,
  issueUrl,
  issueError,
  forIssue
}) {
  const key = fingerprint ? `mpkey${fingerprint}` : 'mpkeylocal-only';
  const durable = [
    '## Where this Work Request lives',
    '',
    'Audrey Evans, 2026-11-06, on PR #18276: a file written inside the',
    'GitHub Actions runner is discarded when the job ends. That is why',
    'earlier runs could log "Created WR" and still leave no Work Request',
    'in the repository. The issue below is the copy that enters the call chain.',
    '',
    issueUrl
      ? `GitHub issue: ${issueUrl}`
      : (forIssue
        ? 'This GitHub issue is the Work Request. The runner file is not.'
        : 'GitHub issue: not opened on this run.'),
    issueError ? `Open failure: ${issueError}` : '',
    `Search token: ${key}`,
    `Repository: ${repo || 'unknown'} pull request #${prNumber || 'unknown'}.`,
    'If the issue is missing, open the Merge Prosecutor log and search for',
    '"WR issue create failed". Status 403 on a fork pull request means the',
    'default GITHUB_TOKEN is not allowed to open issues. A same-repo pull',
    'request with issues:write is the path that files the Work Request.',
    'Closing the issue without changing the diff does not turn the job green.'
  ].filter((line) => line !== '').join('\n');

  return `# WR: ${title}

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

${durable}
`;
}

/**
 * Runner-local markdown. Kept because the original action wrote it, and
 * because a laptop run with no token still needs a file the human can read.
 * It is not the Work Request of record. The GitHub issue is.
 * The id is the fingerprint when we have one, so a re-run overwrites the
 * same path instead of scattering random wr-NNNNN-prosecutor.md files.
 * The random id remains for a caller that has no fingerprint.
 */
function createWR(title, issueContext, learnings, rootDir, extras = {}) {
  const wrDir = join(rootDir, 'wr');
  try {
    mkdirSync(wrDir, { recursive: true });
  } catch (e) {
    // A silent catch made a read-only workspace look like success: the next
    // line used to log "Created WR" for a file that was never written.
    // What to check: WORKSPACE_DIR exists and is writable. The GitHub issue
    // is still attempted by fileWorkRequest after this returns null.
    log(`Local WR directory was not created (${e && e.message ? e.message : e}).`);
  }

  const fingerprint = extras.fingerprint;
  const wrId = fingerprint || String(Math.floor(Math.random() * 100000));
  const wrPath = join(wrDir, `wr-${wrId}-prosecutor.md`);
  const templateContent = renderWorkRequest({
    title,
    issueContext,
    learnings,
    fingerprint,
    repo: extras.repo,
    prNumber: extras.prNumber,
    issueUrl: extras.issueUrl,
    issueError: extras.issueError
  });

  try {
    writeFileSync(wrPath, templateContent);
    log(`Created local WR file (runner copy, not the call-chain issue): ${wrPath}`);
    return wrPath;
  } catch (e) {
    log(`Local WR file was not written (${e && e.message ? e.message : e}). Check WORKSPACE_DIR.`);
    return null;
  }
}

async function readResponseText(response) {
  if (response && typeof response.text === 'function') {
    return response.text();
  }
  return '';
}

/**
 * Look up an open issue that already carries this finding's token.
 * Search failure is not a pass and not a hard stop: the caller creates
 * the issue anyway. What to check if two issues appear for one finding:
 * the log line "WR search skipped" — the search API returned non-200
 * (fine-grained tokens and cold indexes do this) so dedup could not run.
 */
export async function findOpenWorkRequest({ token, repo, fingerprint, fetchImpl = fetch }) {
  const q = `repo:${repo} is:issue is:open mpkey${fingerprint}`;
  const url = `https://api.github.com/search/issues?q=${encodeURIComponent(q)}&per_page=5`;
  const response = await fetchImpl(url, { headers: githubHeaders(token) });
  if (!response.ok) {
    const body = await readResponseText(response);
    log(`WR search skipped (${response.status} ${response.statusText || ''}). ${String(body).slice(0, 160)}`);
    return null;
  }
  const data = await response.json();
  const items = data && Array.isArray(data.items) ? data.items : [];
  return items[0] || null;
}

export async function createWorkRequestIssue({ token, repo, title, body, fetchImpl = fetch }) {
  const url = `https://api.github.com/repos/${repo}/issues`;
  const response = await fetchImpl(url, {
    method: 'POST',
    headers: {
      ...githubHeaders(token),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ title, body })
  });
  const text = await readResponseText(response);
  if (!response.ok) {
    throw new GitHubApiError(
      `WR issue create failed: ${response.status} ${response.statusText || ''} ${String(text).slice(0, 200)}. The finding still fails the job. Status 403 on a fork pull request means the default GITHUB_TOKEN cannot open issues. Use a same-repo pull request, or a token with issues:write.`,
      { status: response.status, url }
    );
  }
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new GitHubApiError(
      `WR issue create returned non-JSON (${response.status}). Refusing to treat that as a filed Work Request.`,
      { status: response.status, url }
    );
  }
  if (!data || !data.html_url) {
    throw new GitHubApiError(
      'WR issue create returned no html_url. Refusing to treat that as a filed Work Request.',
      { status: response.status, url }
    );
  }
  return data;
}

/**
 * File the Work Request the action has always claimed to file.
 * Local markdown stays (the original behavior). The GitHub issue is what
 * START_HERE_CALL_CHAIN.md actually ignites. A failed create is returned,
 * not swallowed: the pull request is already red from the finding, and the
 * report comment repeats the API error so the log is not the only place it exists.
 */
export async function fileWorkRequest({
  title,
  issueContext,
  learnings,
  rootDir,
  token,
  repo,
  prNumber,
  kind,
  detailKey,
  fetchImpl = fetch
}) {
  const fingerprint = findingFingerprint([kind, repo, prNumber, detailKey, title]);
  const issueTitle = workRequestIssueTitle(title, prNumber);
  let issue = null;
  let issueError = null;

  if (!token || !repo) {
    issueError = new GitHubApiError(
      'No GITHUB_TOKEN or GITHUB_REPOSITORY — wrote a local WR file only. That file is not a GitHub issue and does not start the WR call chain.'
    );
    log(issueError.message);
  } else {
    try {
      const existing = await findOpenWorkRequest({ token, repo, fingerprint, fetchImpl });
      if (existing && existing.html_url) {
        issue = { html_url: existing.html_url, number: existing.number, created: false };
        log(`WR already open: ${existing.html_url}`);
      } else {
        const body = renderWorkRequest({
          title,
          issueContext,
          learnings,
          fingerprint,
          repo,
          prNumber,
          forIssue: true
        });
        const created = await createWorkRequestIssue({
          token,
          repo,
          title: issueTitle,
          body,
          fetchImpl
        });
        issue = { html_url: created.html_url, number: created.number, created: true };
        log(`Opened WR issue: ${created.html_url}`);
      }
    } catch (err) {
      issueError = err instanceof Error ? err : new GitHubApiError(String(err));
      log(issueError.message);
    }
  }

  const localPath = createWR(title, issueContext, learnings, rootDir, {
    fingerprint,
    repo,
    prNumber,
    issueUrl: issue && issue.html_url,
    issueError: issueError && issueError.message
  });

  return { fingerprint, localPath, issueTitle, issue, issueError };
}

export function prosecutionReportMarker(fingerprints) {
  return `<!-- merge-prosecutor-report:${fingerprints.slice().sort().join(',')} -->`;
}

/**
 * One comment on the pull request listing the issues that were opened.
 * Dedup is the marker. A later run with the same findings does not add
 * another comment. A run with a new finding has a new marker, so it posts.
 * Comment failure is logged and does not hide the red job. What to check:
 * pull-requests:write on the workflow token (fork PRs are read-only).
 */
export async function postProsecutionReport({
  token,
  repo,
  prNumber,
  filings,
  existingComments,
  fetchImpl = fetch
}) {
  if (!token || !repo || !prNumber || !filings || filings.length === 0) return null;
  const marker = prosecutionReportMarker(filings.map((filing) => filing.fingerprint));
  const already = (existingComments || []).some((comment) => comment && comment.body && comment.body.includes(marker));
  if (already) {
    log('Prosecution report comment already on the pull request. Not posting a second one.');
    return null;
  }

  const lines = filings.map((filing) => {
    if (filing.issue && filing.issue.html_url) {
      const verb = filing.issue.created ? 'opened' : 'already open';
      return `- ${filing.issueTitle} (${verb}): ${filing.issue.html_url}`;
    }
    const why = filing.issueError && filing.issueError.message
      ? filing.issueError.message
      : 'no issue url';
    return `- ${filing.issueTitle}: issue was not opened. ${why}`;
  });

  const body = [
    marker,
    '',
    'Merge Prosecutor failed this pull request.',
    '',
    ...lines,
    '',
    'The job stays red until the diff and the review comments are clean.',
    'Closing the Work Request without changing the diff does not turn the job green.',
    'The markdown file inside the runner workspace is discarded with the job.'
  ].join('\n');

  const url = `https://api.github.com/repos/${repo}/issues/${prNumber}/comments`;
  const response = await fetchImpl(url, {
    method: 'POST',
    headers: {
      ...githubHeaders(token),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ body })
  });
  const text = await readResponseText(response);
  if (!response.ok) {
    log(`Prosecution report comment was not posted: ${response.status} ${String(text).slice(0, 200)}. The Work Request issues above are unaffected. Check pull-requests:write. Fork pull requests cannot be commented on with the default token.`);
    return null;
  }
  log('Posted the prosecution report on the pull request.');
  return text;
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

  // Filings are collected and then one report comment is posted.
  // exitCode is set when the finding is real, before the network call,
  // so a failed issue create cannot turn a bad merge into a green job.
  const filings = [];
  const fileFinding = (spec) => fileWorkRequest({
    token,
    repo,
    prNumber,
    rootDir: workspaceDir,
    fetchImpl,
    ...spec
  });

  log("1. Checking for unresolved conflicts...");
  const conflicts = detectUnresolvedConflicts(diffContent);
  if (conflicts.length > 0) {
      log(`Found unresolved conflicts in ${conflicts.length} locations!`);
      process.exitCode = 1;
      const context = conflicts.map(c => `- ${c.file}: ${c.line}`).join('\n');
      filings.push(await fileFinding({
        kind: 'conflicts',
        detailKey: 'conflicts',
        title: 'Fix Unresolved Merge Conflicts',
        issueContext: context,
        learnings: 'Conflict markers were left in the codebase.'
      }));
  }

  log("2. Checking for duplicated code blocks (bad merge)...");
  const duplicates = detectDuplicatedBlocks(diffContent);
  if (duplicates.length > 0) {
      log(`Found ${duplicates.length} potential duplicate blocks indicating keeping both current and incoming sides.`);
      process.exitCode = 1;
      const context = duplicates.slice(0, 5).map(d => `- ${d.file}: ${d.blockA}`).join('\n');
      filings.push(await fileFinding({
        kind: 'duplicates',
        detailKey: 'duplicates',
        title: 'Fix Duplicated Blocks from Bad Merge',
        issueContext: context,
        learnings: "Merge resolution incorrectly kept both 'current' and 'incoming' logic instead of choosing one or refactoring.\n\nProblem created: This results in redundant code execution, duplicated logic, and potentially introduces syntax or runtime errors."
      }));
  }

  log("3. Testing system stability...");
  if (testCmd) {
      try {
          log(`Running: ${testCmd}`);
          execSync(testCmd, { cwd: workspaceDir, stdio: 'inherit' });
          log("Tests passed!");
      } catch (e) {
          log("Tests failed! The merge broke the system.");
          process.exitCode = 1;
          filings.push(await fileFinding({
            kind: 'tests',
            detailKey: 'tests',
            title: 'Fix Broken Tests after Merge',
            issueContext: `Tests failed when running ${testCmd}.`,
            learnings: 'The recent merge introduced regressions that were not caught.'
          }));
      }
  }

  log("4. Checking for dismissive comments...");
  let allComments = [];
  if (token && repo && prNumber) {
      const issueComments = await fetchPRComments(token, repo, prNumber, fetchImpl);
      const reviewComments = await fetchPRReviewComments(token, repo, prNumber, fetchImpl);

      allComments = [...issueComments, ...reviewComments];

      const dismissiveComments = allComments.filter(c => isHumanReviewer(c) && isDismissiveComment(c.body));

      if (dismissiveComments.length > 0) {
          log(`Found ${dismissiveComments.length} dismissive comments.`);
          process.exitCode = 1;
          for (const c of dismissiveComments) {
             filings.push(await fileFinding({
               kind: 'dismissive',
               detailKey: c.html_url || c.id || c.body,
               title: `Address Dismissive Comment from ${c.user.login}`,
               issueContext: `Comment URL: ${c.html_url}\n\nBody: ${c.body}`,
               learnings: "Agents cannot dismiss bugs or tasks as 'out of scope' or 'not my bug' without filing a formal WR."
             }));
          }
      }

      log("5. Checking for unimplemented review suggestions...");
      const unimplemented = detectUnimplementedSuggestions(diffContent, allComments);
      if (unimplemented.length > 0) {
          log(`Found ${unimplemented.length} unimplemented code suggestions in comments.`);
          process.exitCode = 1;
          for (const u of unimplemented) {
              filings.push(await fileFinding({
                kind: 'unimplemented',
                detailKey: `${u.commentUrl}\n${u.suggestion}`,
                title: `Implement Code Suggestion from ${u.user}`,
                issueContext: `Comment URL: ${u.commentUrl}\n\nSuggested Code:\n\`\`\`\n${u.suggestion}\n\`\`\`\n\nMatch Ratio found in PR: ${u.matchRatio.toFixed(2)}`,
                learnings: 'A code review suggestion was ignored or missed before merging.'
              }));
          }
      }

      await postProsecutionReport({
        token,
        repo,
        prNumber,
        filings,
        existingComments: allComments,
        fetchImpl
      });
  } else if (filings.length > 0) {
      log('No GITHUB_TOKEN / GITHUB_REPOSITORY / PR_NUMBER — findings fail the job, and no pull-request report was posted.');
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
