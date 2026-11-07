// Browser copy of the pure Merge Prosecutor checks.
//
// Audrey Evans, 2026-11-06, PR #18276: the README already linked a live page
// at docs/merge-prosecutor/ and that page did not exist. This module is the
// math the page runs. It has no node: imports so a browser can load it.
// products/merge-prosecutor/action/run-prosecutor.mjs is the copy the
// GitHub Action executes. tests/demo-parity.test.js runs the same fixtures
// through both. If you change a threshold here, change it there too, or the
// page will prosecute a different merge than the job.
//
// What goes wrong if this file drifts: a person pastes a diff into the page,
// sees a pass, and the Action fails the pull request (or the reverse).

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

// Keep-both means two similar copies sit back-to-back in the added lines.
// A file-wide 2-line 85% scan is not that: it flags any reused idiom.
// PR #17899 failed on that wider scan. Consecutive (or one added line
// apart), at least 2 lines, distance under 15% of the longer block.
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

    if (line.startsWith('+<<<<<<<') || line.startsWith('+=======') || line.startsWith('+>>>>>>>')) {
      conflictMarkers.push({ file: currentFile, line: line.slice(1) });
    }
  }
  return conflictMarkers;
}

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

export function suggestionLineMatches(suggestionLine, addedLine) {
  if (suggestionLine === addedLine) return true;
  const maxLen = Math.max(suggestionLine.length, addedLine.length);
  if (maxLen === 0) return false;
  const distance = computeLevenshtein(suggestionLine, addedLine);
  return distance < maxLen * 0.10;
}

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
          commentUrl: comment.html_url || 'unknown',
          user: comment.user ? comment.user.login : 'unknown',
          suggestion,
          matchRatio
        });
      }
    }
  }

  return unimplemented;
}

export const DISMISSIVE_REGEX = /\bnot my (error|bug|problem)\b|\bleave it\b|\bout of scope\b/i;

export function isDismissiveComment(body) {
  return Boolean(body) && DISMISSIVE_REGEX.test(body);
}
