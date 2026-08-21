#!/usr/bin/env node

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

function log(msg) {
  console.log(`[Merge Prosecutor] ${msg}`);
}

async function fetchPRComments(token, repo, prNumber) {
  const url = `https://api.github.com/repos/${repo}/issues/${prNumber}/comments`;
  const response = await fetch(url, {
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'merge-prosecutor'
    }
  });
  if (!response.ok) {
    log(`Failed to fetch issue comments: ${response.statusText}`);
    return [];
  }
  return response.json();
}

async function fetchPRReviewComments(token, repo, prNumber) {
  const url = `https://api.github.com/repos/${repo}/pulls/${prNumber}/comments`;
  const response = await fetch(url, {
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'merge-prosecutor'
    }
  });
  if (!response.ok) {
    log(`Failed to fetch PR review comments: ${response.statusText}`);
    return [];
  }
  return response.json();
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

export function detectUnimplementedSuggestions(diffText, comments) {
  // Extract all additions from the diff
  const additions = [];
  const lines = diffText.split('\n');

  for (const line of lines) {
    if (line.startsWith('+') && !line.startsWith('+++')) {
      additions.push(line.slice(1).trim());
    }
  }
  const addedText = additions.join('\n');

  const unimplemented = [];

  for (const comment of comments) {
    if (!comment.body) continue;

    // Look for markdown code blocks in the comment body
    const codeBlockRegex = /```[a-z]*\n([\s\S]*?)```/gi;
    let match;
    while ((match = codeBlockRegex.exec(comment.body)) !== null) {
      const suggestion = match[1].trim();
      if (suggestion.length < 10) continue; // Skip very small snippets

      // Calculate distance between suggestion and segments of addedText
      // A simple heuristic: check if any line of the suggestion appears in the additions
      // with a low Levenshtein distance, or just use substring inclusion for simplicity/math approach.

      // mathematical approach: Check if the suggestion is largely present in the added text
      // We will check if lines in the suggestion are mostly found in the additions.
      const suggestionLines = suggestion.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      if (suggestionLines.length === 0) continue;

      let foundLines = 0;
      for (const sLine of suggestionLines) {
        // check if this line is close to any added line
        let lineFound = false;
        for (const aLine of additions) {
          if (aLine.includes(sLine)) {
             lineFound = true;
             break;
          }
          const maxLen = Math.max(sLine.length, aLine.length);
          if (maxLen > 0) {
            const distance = computeLevenshtein(sLine, aLine);
            // reduce fuzziness from 20% to 10% to prevent matching e.g. console.log to console.error
            if (distance < maxLen * 0.10) {
               lineFound = true;
               break;
            }
          }
        }
        if (lineFound) foundLines++;
      }

      // Check if the suggestion implies something very specific that shouldn't just be considered "found"
      // If we find 90%+ match it's probably implemented
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

async function main() {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPOSITORY;
  const prNumber = process.env.PR_NUMBER;
  const testCmd = process.env.TEST_COMMAND;
  const workspaceDir = process.env.WORKSPACE_DIR || process.cwd();
  let diffContent = process.env.DIFF_CONTENT || '';

  if (!diffContent && token && repo && prNumber) {
     const url = `https://api.github.com/repos/${repo}/pulls/${prNumber}`;
     const response = await fetch(url, {
         headers: {
             'Authorization': `token ${token}`,
             'Accept': 'application/vnd.github.v3.diff',
             'User-Agent': 'merge-prosecutor'
         }
     });
     if (response.ok) {
         diffContent = await response.text();
     } else {
         log(`Failed to fetch diff: ${response.statusText}`);
     }
  }

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
      const issueComments = await fetchPRComments(token, repo, prNumber);
      const reviewComments = await fetchPRReviewComments(token, repo, prNumber);

      const allComments = [...issueComments, ...reviewComments];

      const dismissiveRegex = /not my (error|bug|problem)|leave it|out of scope|not my error leave it/i;

      const dismissiveComments = allComments.filter(c => c.body && dismissiveRegex.test(c.body));

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
