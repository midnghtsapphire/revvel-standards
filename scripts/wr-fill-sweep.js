#!/usr/bin/env node
'use strict';

/**
 * WR Field Filler — sweep helper.
 *
 * Given an environment configured with GH_TOKEN + GH_REPO, discover open
 * Work Request issues whose body still contains blank markers and print
 * their issue numbers, one per line, to stdout. The workflow uses this
 * output to drive per-issue fill jobs.
 *
 * Two entry points:
 *   node scripts/wr-fill-sweep.js                    -> scans open WR label set
 *   node scripts/wr-fill-sweep.js --issues 1,2,3     -> explicit list
 *
 * Design notes:
 * - Uses `gh` (already available in Actions runners) for the API call so
 *   we do not add another HTTP client dependency.
 * - Marks a WR as "needs filling" ONLY when at least one field is blank per
 *   the same isBlank() the filler itself uses. This keeps the sweep and the
 *   per-WR fill in strict agreement — a WR the sweep flags is a WR the
 *   filler will change.
 * - Idempotency: once a WR carries the `wr:fields-filled` label AND has no
 *   blank markers, the sweep skips it. If markers reappear (e.g. an owner
 *   edits and leaves a new blank), the sweep picks it up again.
 */

const { spawnSync } = require('child_process');
const path = require('path');
const filler = require(path.join(__dirname, 'wr-fill-fields.js'));

const REPO = process.env.GH_REPO || 'midnghtsapphire/revvel-standards';

// Argv-form invocation (no shell interpolation) so semgrep's
// detect-child-process rule stays green and there is no path for a caller to
// smuggle shell metacharacters into `gh`.
function gh(argv) {
  const result = spawnSync('gh', argv, { encoding: 'utf8', env: process.env });
  if (result.status !== 0) {
    const stderr = (result.stderr || '').trim();
    throw new Error(`gh ${argv.join(' ')} failed (exit ${result.status}): ${stderr}`);
  }
  return result.stdout;
}

function listOpenWrIssues() {
  // work-request is the canonical label added by the issue form. wr:reset,
  // wr:in-progress, and wr:new are the same lane; any WR that reaches the
  // filler will carry at least one of them.
  const raw = gh([
    'issue', 'list',
    '--repo', REPO,
    '--state', 'open',
    '--label', 'work-request',
    '--limit', '500',
    '--json', 'number,title,body,labels',
  ]);
  return JSON.parse(raw);
}

function fetchIssues(numbers) {
  const out = [];
  for (const n of numbers) {
    const raw = gh([
      'issue', 'view', String(n),
      '--repo', REPO,
      '--json', 'number,title,body,labels',
    ]);
    out.push(JSON.parse(raw));
  }
  return out;
}

/**
 * True when the issue body has at least one blank marker across the known
 * WR fields — the same rule the filler applies per field.
 */
function needsFilling(issue) {
  if (!issue || !issue.body) return false;
  const fields = filler.parseIssueBody(issue.body);
  // A WR the form dumped without ANY known headings (e.g. someone used a
  // different template) is not our lane; skip it.
  if (fields.length === 0) return false;
  return fields.some((f) => filler.isBlank(f.kind, f.value));
}

function parseArgs(argv) {
  const out = { issues: null };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--issues' && argv[i + 1]) {
      out.issues = argv[++i].split(',').map((s) => s.trim()).filter(Boolean).map(Number);
    }
  }
  return out;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const issues = args.issues && args.issues.length > 0
    ? fetchIssues(args.issues)
    : listOpenWrIssues();

  const needs = issues.filter(needsFilling);

  // Emit summary on stderr so the workflow can log it verbatim, and one
  // issue number per line on stdout for xargs-style consumption.
  process.stderr.write(`[wr-fill-sweep] scanned ${issues.length} WR(s); ${needs.length} need filling\n`);
  for (const i of needs) {
    process.stderr.write(`[wr-fill-sweep]   #${i.number} ${i.title.slice(0, 60)}\n`);
    process.stdout.write(`${i.number}\n`);
  }
}

module.exports = { needsFilling, listOpenWrIssues, fetchIssues };

if (require.main === module) main();
