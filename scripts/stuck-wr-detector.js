'use strict';

function getLabelNames(labels) {
  return (labels || [])
    .map((label) => (typeof label === 'string' ? label : label.name))
    .filter(Boolean);
}

function getIssueBaseTitle(issue) {
  return (issue.title || '').replace(/^\[WR\]\s*/i, '').trim();
}

function extractPrNumbersFromText(text) {
  const numbers = new Set();
  const body = text || '';
  const patterns = [
    /\bPR:\s*#(\d+)\b/gi,
    /\bpull request\s*#(\d+)\b/gi,
    /\/pull\/(\d+)\b/gi,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(body)) !== null) {
      numbers.add(Number(match[1]));
    }
  }

  return [...numbers];
}

function referencesIssue(text, issueNumber) {
  return new RegExp(
    String.raw`\b(closes|fixes|resolves|issue)\s+#${issueNumber}\b|\(#${issueNumber}\)|\b#${issueNumber}\b`,
    'i'
  ).test(text || '');
}

function hasIssueBranchRef(pr, issueNumber) {
  const headRef = pr.head && pr.head.ref ? pr.head.ref : '';
  return new RegExp(String.raw`(^|[/_-])issue-${issueNumber}($|[-_/])`, 'i').test(headRef);
}

function isAssociatedPr(issue, pr) {
  if (!pr || pr.state === 'closed') return false;

  const issueNumber = issue.number;
  if (hasIssueBranchRef(pr, issueNumber)) return true;

  const prBody = pr.body || '';
  if (referencesIssue(prBody, issueNumber)) return true;

  const prLabels = getLabelNames(pr.labels);
  const looksLikeWrPr =
    prLabels.includes('weekly-research') || prLabels.includes('wr:in-progress');
  if (looksLikeWrPr && referencesIssue(`${pr.title || ''}\n${prBody}`, issueNumber)) {
    return true;
  }

  return false;
}

async function listOpenPullRequests(github, owner, repo) {
  const params = { owner, repo, state: 'open', per_page: 100 };
  if (typeof github.paginate === 'function') {
    return github.paginate(github.rest.pulls.list, params);
  }

  const response = await github.rest.pulls.list(params);
  return response.data || response;
}

async function listIssueComments(github, owner, repo, issueNumber) {
  const params = { owner, repo, issue_number: issueNumber, per_page: 100 };
  if (typeof github.paginate === 'function') {
    return github.paginate(github.rest.issues.listComments, params);
  }

  const response = await github.rest.issues.listComments(params);
  return response.data || response;
}

async function getPullRequest(github, owner, repo, pullNumber) {
  const response = await github.rest.pulls.get({
    owner,
    repo,
    pull_number: pullNumber,
  });
  return response.data || response;
}

async function findAssociatedPr({ github, owner, repo, issue, core = console }) {
  const openPrs = await listOpenPullRequests(github, owner, repo);
  const directMatch = openPrs.find((pr) => isAssociatedPr(issue, pr));
  if (directMatch) {
    return directMatch;
  }

  const comments = await listIssueComments(github, owner, repo, issue.number);
  const mentionedPrNumbers = comments.flatMap((comment) =>
    extractPrNumbersFromText(comment.body || '')
  );

  for (const prNumber of [...new Set(mentionedPrNumbers)]) {
    try {
      const pr = await getPullRequest(github, owner, repo, prNumber);
      if (pr && pr.state === 'open') {
        return pr;
      }
    } catch (error) {
      if (core.notice) {
        core.notice(`Could not inspect PR #${prNumber} mentioned on #${issue.number}: ${error.message}`);
      }
    }
  }

  return null;
}

module.exports = {
  extractPrNumbersFromText,
  findAssociatedPr,
  getIssueBaseTitle,
  hasIssueBranchRef,
  isAssociatedPr,
  referencesIssue,
};
