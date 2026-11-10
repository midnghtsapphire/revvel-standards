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

/** Exact through limit, otherwise limit+1. Two rows and a diagonal band avoid
 * allocating the legacy quadratic matrix for each threshold comparison.
 * Shared work accounting makes adversarial long near-matches fail closed with
 * an explicit error instead of monopolizing an unattended local executor.
 */
export function boundedLevenshtein(a, b, limit, budget = { remaining: 200000000 }) {
  if (!Number.isInteger(limit) || limit < 0) throw new Error('Edit limit must be a nonnegative integer');
  if (Math.abs(a.length - b.length) > limit) return limit + 1;
  if (a === b) return 0;
  // Equal edges cannot affect edit distance. Trimming declaration boilerplate
  // before band allocation avoids repeatedly visiting thousands of equal cells.
  let prefix = 0;
  while (prefix < Math.min(a.length, b.length) && a[prefix] === b[prefix]) prefix++;
  let endA = a.length;
  let endB = b.length;
  while (endA > prefix && endB > prefix && a[endA - 1] === b[endB - 1]) { endA--; endB--; }
  budget.remaining -= prefix + a.length - endA;
  if (budget.remaining < 0) throw new Error('Prosecutor comparison work budget exceeded; split the review packet, never treat this as a clean pass');
  a = a.slice(prefix, endA);
  b = b.slice(prefix, endB);
  if (!a.length) return b.length <= limit ? b.length : limit + 1;
  if (!b.length) return a.length <= limit ? a.length : limit + 1;
  // A substitution changes at most two character counts; insert/delete at
  // most one. Therefore ceil(histogram L1 / 2) is a rigorous LOWER bound on
  // edit distance. Rejecting only when it exceeds the limit cannot hide a hit.
  // Count UTF-16 code units, matching the exact legacy algorithm's semantics.
  budget.remaining -= a.length + b.length;
  if (budget.remaining < 0) throw new Error('Prosecutor comparison work budget exceeded; split the review packet, never treat this as a clean pass');
  const counts = new Map();
  for (let i = 0; i < a.length; i++) counts.set(a[i], (counts.get(a[i]) || 0) + 1);
  for (let i = 0; i < b.length; i++) counts.set(b[i], (counts.get(b[i]) || 0) - 1);
  let difference = 0;
  for (const count of counts.values()) difference += Math.abs(count);
  if (Math.ceil(difference / 2) > limit) return limit + 1;
  // Keep columns on the shorter string, minimizing retained row memory.
  if (b.length > a.length) [a, b] = [b, a];
  const overflow = limit + 1;
  let previous = new Uint32Array(b.length + 1);
  let current = new Uint32Array(b.length + 1);
  previous.fill(overflow);
  for (let j = 0; j <= Math.min(b.length, limit); j++) previous[j] = j;
  for (let i = 1; i <= a.length; i++) {
    const first = Math.max(1, i - limit);
    const last = Math.min(b.length, i + limit);
    budget.remaining -= last - first + 1;
    if (budget.remaining < 0) throw new Error('Prosecutor comparison work budget exceeded; split the review packet, never treat this as a clean pass');
    current[0] = i <= limit ? i : overflow;
    if (first > 1) current[first - 1] = overflow;
    if (last < b.length) current[last + 1] = overflow;
    let rowMinimum = current[0];
    for (let j = first; j <= last; j++) {
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      rowMinimum = Math.min(rowMinimum, current[j]);
    }
    if (rowMinimum > limit) return overflow;
    [previous, current] = [current, previous];
  }
  return Math.min(previous[b.length], overflow);
}

const KEEP_BOTH_MIN_LEN = 2;
const KEEP_BOTH_MAX_LEN = 16;
const KEEP_BOTH_MAX_GAP = 1;

/**
 * 2026-11-10, #18313: argparse registrations naturally repeat their type and
 * required/default boilerplate. Distinct option keys are distinct operations,
 * even when character similarity exceeds 85%. Recognize only whole, static
 * registration lines, including all leading option aliases. Unknown syntax
 * stays under the ordinary duplicate check; overlapping keys are never exempt.
 */
function argumentRegistrationKeys(lines) {
  const keys = new Set();
  for (const line of lines) {
    const call = line.match(/^([A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*)\.add_argument\((.*)\)\s*;?$/);
    if (!call) return null;
    let rest = call[2];
    let count = 0;
    while (true) {
      const literal = rest.match(/^\s*(['"])([-A-Za-z0-9_]+)\1\s*(?:,|$)/);
      if (!literal) break;
      keys.add(`${call[1]}:${literal[2]}`);
      count++;
      rest = rest.slice(literal[0].length);
    }
    if (!count) return null;
  }
  return keys;
}

function distinctArgumentRegistrations(linesA, linesB) {
  const a = argumentRegistrationKeys(linesA);
  const b = argumentRegistrationKeys(linesB);
  return a && b && ![...a].some(key => b.has(key));
}

function distinctAssertionCases(linesA, linesB) {
  if (linesA.join('\n') === linesB.join('\n')) return false;
  // Different expected observations in a sequence of assertions are separate
  // state checks, not evidence of duplicated application logic. Exact repeated
  // assertion blocks still qualify; enclosing executable copies still qualify.
  // Earlier only single-line assertions were recognized:
  // if ([...linesA, ...linesB].every(line => /^assert\.[A-Za-z]+\(/.test(line))) return true;
  // Expected-result objects can span lines. Only primitive key/value
  // continuations qualify; executable statements/calls remain analyzed.
  const primitiveFields = /^(?:[A-Za-z_$]\w*\s*:\s*(?:true|false|null|undefined|-?\d+(?:\.\d+)?|'[^'\\]*'|"[^"\\]*")\s*,?\s*)+$/;
  // A sliding window may start inside the expected object rather than at
  // assert.*. Distinct primitive records contain no executable operations.
  if ([...linesA, ...linesB].every(line => primitiveFields.test(line))) return true;
  if ([linesA, linesB].every(lines => /^assert\.[A-Za-z]+\(/.test(lines[0]) &&
    lines.every(line => /^assert\.[A-Za-z]+\(/.test(line) || primitiveFields.test(line)))) return true;
  // Python exception contexts can intentionally exercise distinct CLI options.
  // Require both full two-line cases and non-overlapping concrete flag keys.
  if (linesA.length !== 2 || linesB.length !== 2 ||
      !/^with self\.assertRaises\([^)]*\):$/.test(linesA[0]) || linesA[0] !== linesB[0]) return false;
  const flags = line => [...line.matchAll(/(['"])(--[A-Za-z0-9-]+)\1/g)].map(match => match[2]);
  const a = flags(linesA[1]);
  const b = flags(linesB[1]);
  return a.length && b.length && !a.some(flag => b.includes(flag));
}

// Retired 2026-11-10, #18313: this boolean lexer hid executable interpolation
// and tagged-template bodies. Keep its original text visible for review.
// function templateStateAfter(line, insideTemplate) {
//   let quote = null;
//   for (let i = 0; i < line.length; i++) {
//     const character = line[i];
//     if (character === '\\') { i++; continue; }
//     if (insideTemplate) { if (character === '`') insideTemplate = false; continue; }
//     if (quote) { if (character === quote) quote = null; continue; }
//     if (character === '"' || character === "'") { quote = character; continue; }
//     if (character === '/' && line[i + 1] === '/') break;
//     if (character === '`') insideTemplate = true;
//   }
//   return insideTemplate;
// }

function plainTemplateDataLines(lines) {
  const data = new Set();
  for (let start = 0; start < lines.length; start++) {
    // Prove the entire literal is untagged and interpolation-free before
    // exempting any line. Unknown syntax remains under executable analysis.
    const opening = lines[start].match(/^\+\s*(?:const|let|var)\s+[A-Za-z_$][\w$]*\s*=\s*`/);
    if (!opening) continue;
    let safe = true;
    let closed = false;
    let end = start;
    for (; end < lines.length && lines[end].startsWith('+') && !lines[end].startsWith('+++'); end++) {
      const line = lines[end];
      for (let i = end === start ? opening[0].length : 1; i < line.length; i++) {
        if (line[i] === '\\') { i++; continue; }
        if (line[i] === '$' && line[i + 1] === '{') safe = false;
        if (line[i] === '`') {
          closed = true;
          if (!/^\s*;?\s*$/.test(line.slice(i + 1))) safe = false;
          break;
        }
      }
      if (closed) break;
    }
    if (safe && closed && end > start) for (let index = start; index <= end; index++) data.add(index);
  }
  return data;
}

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
// Historical signature: function findConsecutiveKeepBoth(additions, start) {
function findConsecutiveKeepBoth(additions, start, budget) {
  for (let gap = 0; gap <= KEEP_BOTH_MAX_GAP; gap++) {
    for (let len = KEEP_BOTH_MIN_LEN; len <= KEEP_BOTH_MAX_LEN; len++) {
      const j = start + len + gap;
      if (j + len > additions.length) break;
      if (additions[start].file !== additions[j].file) return null;
      // Added lines separated by unchanged source or a new hunk are not two
      // adjacent merge copies. Also never bridge a retained comment archive.
      if (additions[start].segment !== additions[j + len - 1].segment) continue;

      // Preserve the original joined text below for evidence and similarity,
      // but retain line boundaries to recognize keyed declarations precisely.
      // const blockA = additions.slice(start, start + len).map((a) => a.text).join(' ');
      // const blockB = additions.slice(j, j + len).map((a) => a.text).join(' ');
      const linesA = additions.slice(start, start + len).map((a) => a.text);
      const linesB = additions.slice(j, j + len).map((a) => a.text);
      const blockA = linesA.join(' ');
      const blockB = linesB.join(' ');
      const maxLen = Math.max(blockA.length, blockB.length);
      if (!maxLen) continue;
      // Earlier keyed filter: if (distinctArgumentRegistrations(linesA, linesB)) continue;
      if (distinctArgumentRegistrations(linesA, linesB) || distinctAssertionCases(linesA, linesB)) continue;
      // Retired quadratic threshold comparison, 2026-11-10, #18313:
      // const distance = computeLevenshtein(blockA, blockB);
      const distance = boundedLevenshtein(blockA, blockB, Math.ceil(maxLen * 0.15) - 1, budget);
      // Historical fuzzy-only verdict: if (distance < maxLen * 0.15) {
      // Earlier keyed check was after expensive comparison:
      // if (distance < maxLen * 0.15 && !distinctArgumentRegistrations(linesA, linesB)) {
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

function validateJSONKeys(document, file) {
  const containers = [];
  for (let i = 0; i < document.length; i++) {
    const character = document[i];
    if (character === '{') containers.push(new Set());
    else if (character === '[') containers.push(null);
    else if (character === '}' || character === ']') containers.pop();
    else if (character === '"') {
      const start = i++;
      while (i < document.length) {
        if (document[i] === '\\') i += 2;
        else if (document[i] === '"') break;
        else i++;
      }
      let next = i + 1;
      while (/\s/.test(document[next] || '') && next < document.length) next++;
      if (document[next] === ':') {
        const key = JSON.parse(document.slice(start, i + 1));
        const keys = containers.at(-1);
        if (keys.has(key)) throw new Error(`Duplicate JSON object key ${JSON.stringify(key)} in ${file}`);
        keys.add(key);
      }
    }
  }
}

function completeJSONDataFiles(diffText) {
  const data = new Set();
  for (const section of diffText.split(/(?=^diff --git )/m)) {
    const file = section.match(/^\+\+\+ b\/(.+)$/m)?.[1];
    const lines = section.split('\n');
    const hunks = lines.filter(line => line.startsWith('@@ '));
    // Only complete new-file content can be classified from a patch. Partial
    // hunks never establish a document's language or bypass code analysis.
    const header = hunks.length === 1 && hunks[0].match(/^@@ -0,0 \+1(?:,(\d+))? @@/);
    if (!file || !header) continue;
    const body = lines.slice(lines.indexOf(hunks[0]) + 1).filter(line => line.startsWith('+')).map(line => line.slice(1));
    if (body.length !== Number(header[1] || 1)) continue;
    const document = body.join('\n');
    if (!/^\s*[\[{]/.test(document)) continue;
    try { JSON.parse(document); } catch { continue; }
    // JSON records are data, regardless of file path/extension. Key collisions
    // are a separate exact parser error, not a fuzzy executable duplicate.
    validateJSONKeys(document, file);
    data.add(file);
  }
  return data;
}

export function detectDuplicatedBlocks(diffText) {
  const additions = [];
  const lines = diffText.split('\n');
  const jsonDataFiles = completeJSONDataFiles(diffText);
  const templateDataLines = plainTemplateDataLines(lines);
  let currentFile = '';
  let segment = 0;
  let blockComment = false;
  // Historical state: let multilineTemplate = false;

  // Historical loop: for (const line of lines) {
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex];
    if (line.startsWith('+++ b/')) {
      currentFile = line.slice(6);
      segment++;
      blockComment = false;
      // Historical reset: multilineTemplate = false;
    } else if (line.startsWith('+') && !line.startsWith('+++')) {
      if (jsonDataFiles.has(currentFile)) continue;
      const content = line.slice(1).trim();
      // Template fixture payloads are string data, including deliberately bad
      // merges. Do not interpret that data as executing source. Single-line
      // templates stay in the source comparison; no test/file path is exempt.
      // const wasTemplate = multilineTemplate;
      // if (/\.[cm]?[jt]sx?$/.test(currentFile)) multilineTemplate = templateStateAfter(content, multilineTemplate);
      // if (wasTemplate || multilineTemplate) { segment++; continue; }
      if (/\.[cm]?[jt]sx?$/.test(currentFile) && templateDataLines.has(lineIndex)) { segment++; continue; }
      // 2026-11-10, PR #18348 discussion_r4529468829: ordinary documentation
      // does not interrupt executable adjacency. Explicit retired archives
      // remain excluded and retain their historical boundary.
      // Earlier overbroad rule retained:
      // 2026-11-10 #18313: owner-retained commented history is not executing
      // twice. Keep it in source but exclude full comment lines, breaking the
      // candidate segment so active copies across an archive never align.
      if (blockComment || /^(?:\/\/|#|\/\*|\*\/|\*(?:\s|$)|<!--)/.test(content)) {
        if (content.startsWith('/*') && !content.includes('*/')) blockComment = true;
        if (blockComment && content.includes('*/')) blockComment = false;
        // Retired 2026-11-10: segment++; // ordinary comments hid duplicates.
        // Retired 2026-11-10 review correction: bare words in ordinary prose
        // are not archive declarations (e.g. "Process retired tasks").
        // if (/\b(?:retired|retained history|historical implementation|REVVEL-DISABLED)\b/i.test(content)) segment++;
        const commentHeader = content.replace(/^(?:\/\/|#|\/\*\*?|\*|<!--)\s*/, '');
        if (/^(?:REVVEL-DISABLED\b|retired historical implementation\b|retained history\b|historical implementation\b)/i.test(commentHeader)) segment++;
        continue;
      }
      if (content.length > 5) {
        // Historical concatenation: additions.push({ file: currentFile, text: content });
        additions.push({ file: currentFile, text: content, segment });
      }
    } else {
      segment++;
      // A patch boundary/context gap does not prove the following source is
      // still inside this added comment. Never carry that assumption into a
      // different hunk and silently hide its executable additions.
      blockComment = false;
    }
  }

  const duplicates = [];
  const seen = new Set();
  const budget = { remaining: 200000000 };
  for (let i = 0; i < additions.length - KEEP_BOTH_MIN_LEN; i++) {
    // Historical call: const hit = findConsecutiveKeepBoth(additions, i);
    const hit = findConsecutiveKeepBoth(additions, i, budget);
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
// Historical signature: export function suggestionLineMatches(suggestionLine, addedLine) {
export function suggestionLineMatches(suggestionLine, addedLine, budget) {
  if (suggestionLine === addedLine) return true;
  const maxLen = Math.max(suggestionLine.length, addedLine.length);
  if (maxLen === 0) return false;
  // Retired quadratic threshold call, 2026-11-10 #18313:
  // const distance = computeLevenshtein(suggestionLine, addedLine);
  const distance = boundedLevenshtein(suggestionLine, addedLine, Math.ceil(maxLen * 0.10) - 1, budget);
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
  const budget = { remaining: 200000000 };
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
          // Historical call: if (suggestionLineMatches(sLine, aLine)) {
          if (suggestionLineMatches(sLine, aLine, budget)) {
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
export const DISMISSIVE_REGEX = /\bnot my (error|bug|problem|fault|code)\b|\bleave it\b|\bignore (it|this)\b|\bwon't fix\b|\bout of scope\b/i;

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
    // 2026-11-10, #18313: explicit local mode reuses these detectors through
    // HULL/owned execution; the historical GitHub adapter remains available.
    // Historical unconditional entrypoint retained: main().catch(err => {
    const execution = process.argv.includes('--local')
      ? import('./local-prosecution.mjs').then(async ({ localCLI }) => { process.exitCode = await localCLI(process.argv.slice(2)); })
      : main();
    execution.catch(err => {
        console.error(err);
        process.exit(1);
    });
}
