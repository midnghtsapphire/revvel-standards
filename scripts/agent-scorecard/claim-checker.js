'use strict';

/**
 * Claim-vs-Diff Checker — catches the "confident liar" failure mode.
 *
 * Agents often state in the PR body that they did something they didn't: "added
 * tests", "updated the docs", "wired the new endpoint". This compares the
 * claims in the PR body against the list of files the diff actually changed and
 * flags claims with no supporting change. Pure logic — callers pass the body and
 * the changed-file list.
 */

const CLAIM_RULES = [
  {
    id: 'added-tests',
    // "added tests", "added a test", "with tests", "test coverage"
    re: /\b(add(?:ed|s|ing)?|wrote|include[ds]?|with)\b[^.\n]{0,40}\btests?\b/i,
    satisfiedBy: (files) =>
      files.some((f) => /(^|\/)(tests?|__tests__)\//i.test(f) || /\.(test|spec)\.[a-z]+$/i.test(f)),
    detail: 'claims tests were added, but no test file changed',
  },
  {
    id: 'updated-docs',
    re: /\b(updat(?:ed|es|ing)?|add(?:ed|s|ing)?|document(?:ed|s)?)\b[^.\n]{0,40}\b(docs?|documentation|readme)\b/i,
    satisfiedBy: (files) => files.some((f) => /\.md$/i.test(f) || /(^|\/)docs?\//i.test(f)),
    detail: 'claims docs were updated, but no .md/docs file changed',
  },
  {
    id: 'added-workflow',
    re: /\b(add(?:ed|s|ing)?|creat(?:ed|es|ing)?)\b[^.\n]{0,40}\b(workflow|github action|ci job)\b/i,
    satisfiedBy: (files) => files.some((f) => /\.github\/workflows\//i.test(f)),
    detail: 'claims a workflow was added, but nothing under .github/workflows/ changed',
  },
];

/**
 * @param {string} body  PR description text
 * @param {string[]} changedFiles  repo-relative paths changed by the PR
 * @returns {{count:number, findings:Array}}
 */
function checkClaims(body = '', changedFiles = []) {
  const text = String(body || '');
  const files = Array.isArray(changedFiles) ? changedFiles : [];
  const findings = [];

  for (const rule of CLAIM_RULES) {
    if (rule.re.test(text) && !rule.satisfiedBy(files)) {
      findings.push({ claim: rule.id, detail: rule.detail });
    }
  }

  return { count: findings.length, findings };
}

module.exports = { checkClaims, CLAIM_RULES };
