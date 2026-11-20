#!/usr/bin/env node
/**
 * huge-delete-guard.js — fail a PR that removes a lot of work at once.
 *
 * Proofy security gate 1 of 4 (docs/security-gates/PLAN.md).
 *
 * Fails when the diff between the PR base and HEAD:
 *   - deletes more than HUGE_DELETE_MAX_LINES lines          (default 500)
 *   - deletes more than HUGE_DELETE_MAX_FILES files          (default 10)
 *   - removes a whole directory of >= HUGE_DELETE_MIN_DIR_FILES files
 *                                                            (default 3)
 *
 * Pure renames are not deletions (git -M). Lockfiles and minified files are
 * ignored for the LINE count only (regenerating them is routine); deleting one
 * still counts as a deleted file.
 *
 * Override: the PR carries the label `allow-huge-delete` (a human decision), or
 * ALLOW_HUGE_DELETE=true is set by a human in the job. The label is read from
 * the GitHub API using CIRCLE_PULL_REQUEST. A token (GITHUB_TOKEN / GH_TOKEN) is
 * used if present, but a public repo needs none. If the label cannot be read the
 * guard stays strict (fails closed) and says why.
 *
 * Node built-ins only. Never prints a token. Exit 0 = pass or overridden,
 * 1 = blocked, 2 = could not measure (also blocks: a gate that cannot measure
 * must not report "nothing deleted").
 *
 *   node scripts/security-gates/huge-delete-guard.js [--base <sha>] [--head <ref>]
 *
 * Env: HUGE_DELETE_MAX_LINES, HUGE_DELETE_MAX_FILES, HUGE_DELETE_MIN_DIR_FILES,
 *      BASE_SHA, ALLOW_HUGE_DELETE, CIRCLE_PULL_REQUEST, SECURITY_GATES_OUT.
 */
'use strict';

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const OVERRIDE_LABEL = 'allow-huge-delete';
const DEFAULTS = { maxLines: 500, maxFiles: 10, minDirFiles: 3 };
const LINE_COUNT_IGNORE = [
  /(^|\/)package-lock\.json$/,
  /(^|\/)yarn\.lock$/,
  /(^|\/)pnpm-lock\.yaml$/,
  /(^|\/)poetry\.lock$/,
  /(^|\/)Cargo\.lock$/,
  /\.min\.(js|css)$/,
];

function git(args, cwd) {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

/** Parse `git diff --numstat -z -M` into [{added, deleted, file, renamedFrom}]. */
function parseNumstat(out) {
  const parts = out.split('\0');
  const rows = [];
  for (let i = 0; i < parts.length; i++) {
    const head = parts[i];
    if (!head) continue;
    const m = /^(-|\d+)\t(-|\d+)\t(.*)$/.exec(head);
    if (!m) continue;
    const added = m[1] === '-' ? 0 : Number(m[1]);
    const deleted = m[2] === '-' ? 0 : Number(m[2]);
    if (m[3] === '') {
      // rename or copy: next two NUL fields are old and new path
      rows.push({ added, deleted, file: parts[i + 2], renamedFrom: parts[i + 1] });
      i += 2;
    } else {
      rows.push({ added, deleted, file: m[3], renamedFrom: null });
    }
  }
  return rows;
}

/** Paths whose status is D (a rename's old path is not a deletion). */
function parseDeletedPaths(out) {
  const parts = out.split('\0');
  const deleted = [];
  for (let i = 0; i < parts.length; i++) {
    const status = parts[i];
    if (!status) continue;
    if (status[0] === 'R' || status[0] === 'C') {
      i += 2;
    } else {
      const file = parts[++i];
      if (status[0] === 'D') deleted.push(file);
    }
  }
  return deleted;
}

/** Directories (top-most only) in which every base file is deleted. */
function findRemovedDirs(baseFiles, deletedPaths, minDirFiles) {
  const deletedSet = new Set(deletedPaths);
  const totals = new Map();
  const gone = new Map();
  for (const f of baseFiles) {
    const segs = f.split('/');
    for (let i = 1; i < segs.length; i++) {
      const dir = segs.slice(0, i).join('/');
      totals.set(dir, (totals.get(dir) || 0) + 1);
      if (deletedSet.has(f)) gone.set(dir, (gone.get(dir) || 0) + 1);
    }
  }
  const removed = [];
  for (const [dir, n] of totals) {
    if (n >= minDirFiles && gone.get(dir) === n) removed.push({ dir, files: n });
  }
  removed.sort((a, b) => a.dir.length - b.dir.length);
  const top = [];
  for (const r of removed) {
    if (!top.some((t) => r.dir === t.dir || r.dir.startsWith(`${t.dir}/`))) top.push(r);
  }
  return top;
}

function analyze({ base, head = 'HEAD', cwd = process.cwd(), limits = DEFAULTS }) {
  const numstat = parseNumstat(git(['diff', '--numstat', '-z', '-M', `${base}`, head], cwd));
  const deletedPaths = parseDeletedPaths(git(['diff', '--name-status', '-z', '-M', `${base}`, head], cwd));
  const baseFiles = git(['ls-tree', '-r', '--name-only', base], cwd).split('\n').filter(Boolean);

  const deletedLines = numstat
    .filter((r) => !LINE_COUNT_IGNORE.some((re) => re.test(r.file)))
    .reduce((n, r) => n + r.deleted, 0);
  const removedDirs = findRemovedDirs(baseFiles, deletedPaths, limits.minDirFiles);

  const reasons = [];
  if (deletedLines > limits.maxLines) {
    reasons.push(`${deletedLines} lines deleted (limit ${limits.maxLines})`);
  }
  if (deletedPaths.length > limits.maxFiles) {
    reasons.push(`${deletedPaths.length} files deleted (limit ${limits.maxFiles})`);
  }
  for (const d of removedDirs) {
    reasons.push(`whole directory removed: ${d.dir}/ (${d.files} files)`);
  }
  return { base, head, deletedLines, deletedFiles: deletedPaths, removedDirs, limits, reasons };
}

function limitsFromEnv(env) {
  const num = (v, d) => (v !== undefined && /^\d+$/.test(v) ? Number(v) : d);
  return {
    maxLines: num(env.HUGE_DELETE_MAX_LINES, DEFAULTS.maxLines),
    maxFiles: num(env.HUGE_DELETE_MAX_FILES, DEFAULTS.maxFiles),
    minDirFiles: num(env.HUGE_DELETE_MIN_DIR_FILES, DEFAULTS.minDirFiles),
  };
}

/** Returns { overridden: bool, why: string }. Never throws. */
async function resolveOverride(env, fetchImpl = globalThis.fetch) {
  if (env.ALLOW_HUGE_DELETE === 'true') {
    return { overridden: true, why: 'ALLOW_HUGE_DELETE=true was set by a human for this job' };
  }
  const pr = env.CIRCLE_PULL_REQUEST || '';
  const m = /github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/.exec(pr);
  if (!m) return { overridden: false, why: 'not a PR build, so no label to read' };
  const token = env.GITHUB_TOKEN || env.GH_TOKEN || '';
  const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'proofy-huge-delete-guard' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const base = env.GITHUB_API_URL || 'https://api.github.com';
  try {
    const res = await fetchImpl(`${base}/repos/${m[1]}/${m[2]}/issues/${m[3]}/labels?per_page=100`, { headers });
    if (!res.ok) {
      return {
        overridden: false,
        why: `could not read PR labels (HTTP ${res.status}); staying strict. A private repo needs GITHUB_TOKEN (read) in this job.`,
      };
    }
    const labels = (await res.json()).map((l) => l.name);
    return labels.includes(OVERRIDE_LABEL)
      ? { overridden: true, why: `PR carries the \`${OVERRIDE_LABEL}\` label` }
      : { overridden: false, why: `PR has no \`${OVERRIDE_LABEL}\` label` };
  } catch (err) {
    return { overridden: false, why: `could not read PR labels (${err.name}); staying strict` };
  }
}

function resolveBase(cwd, env, argBase) {
  if (argBase) return argBase;
  if (env.BASE_SHA) return env.BASE_SHA;
  const tryMergeBase = () => git(['merge-base', 'origin/main', 'HEAD'], cwd).trim();
  try {
    return tryMergeBase();
  } catch {
    // CircleCI checkouts can be shallow; same fetch policy-check uses.
    git(['fetch', 'origin', 'main', '--depth=200'], cwd);
    return tryMergeBase();
  }
}

function renderReport(result, override) {
  const lines = [];
  lines.push(`huge-delete-guard: base ${result.base.slice(0, 10)} -> ${result.head}`);
  lines.push(
    `  deleted lines: ${result.deletedLines} (limit ${result.limits.maxLines}), ` +
      `deleted files: ${result.deletedFiles.length} (limit ${result.limits.maxFiles}), ` +
      `whole dirs removed: ${result.removedDirs.length}`,
  );
  if (result.reasons.length === 0) {
    lines.push('  OK: nothing here looks like a mass deletion.');
    return lines.join('\n');
  }
  for (const r of result.reasons) lines.push(`  - ${r}`);
  for (const f of result.deletedFiles.slice(0, 25)) lines.push(`    deleted: ${f}`);
  if (result.deletedFiles.length > 25) lines.push(`    ... and ${result.deletedFiles.length - 25} more`);
  if (override.overridden) {
    lines.push(`  OVERRIDDEN: ${override.why}.`);
  } else {
    lines.push(`  BLOCKED. A human can approve this by adding the \`${OVERRIDE_LABEL}\` label to the PR and re-running the job.`);
    lines.push(`  (${override.why})`);
    lines.push('  Reminder: AGENTS.md says retire things by commenting them out in place, not by deleting.');
  }
  return lines.join('\n');
}

async function main(argv, env) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--base') args.base = argv[++i];
    else if (argv[i] === '--head') args.head = argv[++i];
  }
  const cwd = process.cwd();
  let result;
  try {
    const base = resolveBase(cwd, env, args.base);
    result = analyze({ base, head: args.head || 'HEAD', cwd, limits: limitsFromEnv(env) });
  } catch (err) {
    console.error(`huge-delete-guard: could not measure the diff: ${String(err.message).split('\n')[0]}`);
    console.error('This gate fails closed: a check that cannot measure must not report that nothing was deleted.');
    return 2;
  }
  const override = result.reasons.length ? await resolveOverride(env) : { overridden: false, why: 'nothing to override' };
  console.log(renderReport(result, override));
  const outDir = env.SECURITY_GATES_OUT || '/tmp/security-gates';
  try {
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(
      path.join(outDir, 'huge-delete.json'),
      JSON.stringify({ ...result, override }, null, 2),
    );
  } catch {
    /* report file is a convenience; the exit code is the gate */
  }
  return result.reasons.length && !override.overridden ? 1 : 0;
}

module.exports = { analyze, parseNumstat, parseDeletedPaths, findRemovedDirs, resolveOverride, limitsFromEnv, OVERRIDE_LABEL };

if (require.main === module) {
  main(process.argv.slice(2), process.env).then((code) => process.exit(code));
}
