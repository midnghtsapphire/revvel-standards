#!/usr/bin/env python3
"""Scoped, reproducible additions for the owner-authorized no-destroy draft PR."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
HEADER = 'REVVEL-DISABLED | AGENT: security-specialist | MODEL: runtime-unspecified | WR: security-no-destroy-20261115 | DATE: 2026-11-15 | STATUS: REPLACED'

def retire(old, reason, prefix='//'):
    return f'{prefix} {HEADER}\n{prefix} REASON: {reason}\n' + ''.join(prefix + ' ' + line + '\n' for line in old.splitlines()) + f'{prefix} REVVEL-DISABLED-END\n'

def replace_once(text, old, new, reason, prefix='//'):
    assert text.count(old) == 1, old[:100]
    return text.replace(old, retire(old, reason, prefix) + new, 1)

p = ROOT / 'scripts/no-destroy-guard.js'
s = p.read_text()
s = s.replace('const LOCKFILE_RE', '// 2026-11-15 owner rule: all paths are protected against file deletion; labels never bypass.\nconst LOCKFILE_RE', 1)
s = replace_once(s, '''  if (allowDestroy) {
    return { fail: false, reasons: ["`allow-destroy` label present — guard intentionally skipped."] };
  }''', '', 'Owner forbids destructive changes; allowDestroy is retained only as an inert compatibility argument.')
s = s.replace('function evaluateDiff(files, { protectedPrefixes, maxDeleted, allowDestroy }) {', '''// 2026-11-15: additive global limits retain the old protected-path limit as a stricter layer.
function evaluateDiff(files, {
  protectedPrefixes = DEFAULT_PROTECTED.split(','), maxDeleted = 400, allowDestroy,
  maxGlobalDeleted = 1000, replacementRatio = 0.8, minReplacementLines = 20,
} = {}) {''', 1)
s = s.replace('  const reasons = [];', '''  const reasons = [];
  if (!Array.isArray(files)) throw new Error('Diff must be an array');
  for (const [name, value] of Object.entries({ maxDeleted, maxGlobalDeleted, minReplacementLines })) {
    if (!Number.isSafeInteger(value) || value < 1) throw new Error(`Invalid ${name}`);
  }
  if (!Number.isFinite(replacementRatio) || replacementRatio <= 0 || replacementRatio > 1) {
    throw new Error('Invalid replacementRatio');
  }
  let globalDeleted = 0;''', 1)
s = replace_once(s, '''    if (!inProtected(f.path)) continue;
    if (f.status === "D") deletedFiles.push(f.path);
    if (!LOCKFILE_RE.test(f.path)) protectedDeleted += Number(f.deleted) || 0;''', '''    if (typeof f.path !== 'string' || !f.path || !/^[AMDT]$/.test(f.status)) {
      throw new Error('Missing or unsupported diff path/status');
    }
    if (f.status === 'D') deletedFiles.push(f.path);
    if (f.status === 'T') reasons.push(`Changes existing file type: ${JSON.stringify(f.path)}.`);
    if (f.added === '-' || f.deleted === '-') {
      if (f.status !== 'A') reasons.push(`Cannot quantify existing binary change: ${JSON.stringify(f.path)}.`);
      continue;
    }
    if (!/^\\d+$/.test(String(f.added)) || !/^\\d+$/.test(String(f.deleted))) {
      throw new Error('Invalid diff line counts');
    }
    const deleted = Number(f.deleted);
    if (!Number.isSafeInteger(deleted) || !Number.isSafeInteger(Number(f.added))) {
      throw new Error('Unsafe diff line counts');
    }
    globalDeleted += deleted; // Includes lockfiles and every directory.
    if (inProtected(f.path) && !LOCKFILE_RE.test(f.path)) protectedDeleted += deleted;
    if (f.beforeLines !== undefined && (!Number.isSafeInteger(f.beforeLines) || f.beforeLines < 0)) {
      throw new Error('Invalid baseline line count');
    }
    if (f.status !== 'D' && f.beforeLines >= minReplacementLines && deleted / f.beforeLines >= replacementRatio) {
      reasons.push(`Replaces or strips ${deleted}/${f.beforeLines} baseline lines in ${JSON.stringify(f.path)} (ratio limit ${replacementRatio}).`);
    }''', 'The previous loop skipped every unprotected path and silently coerced malformed counts.')
s = replace_once(s, '    reasons.push(`Deletes ${deletedFiles.length} existing file(s) under protected paths:`);', '    reasons.push(`Deletes ${deletedFiles.length} existing file(s) anywhere in the repository:`);', 'File deletion is prohibited globally, not only in product directories.')
s = replace_once(s, '    deletedFiles.slice(0, 20).forEach((p) => reasons.push(`  - ${p}`));', '    deletedFiles.slice(0, 20).forEach((p) => reasons.push(`  - ${JSON.stringify(p)}`));', 'Escape newlines/control characters so a Git filename cannot inject log annotations.')
s = s.replace('  return { fail: reasons.length > 0, reasons };', '''  if (globalDeleted > maxGlobalDeleted) {
    reasons.push(`Removes ${globalDeleted} lines repository-wide (limit ${maxGlobalDeleted}).`);
  }
  return { fail: reasons.length > 0, reasons };''', 1)
start = s.index('function readDiff(baseSha) {')
end = s.index('\nfunction main()', start)
old = s[start:end]
new = r'''// Git is invoked directly, never through a shell; PR blobs are read as DATA.
// --no-ext-diff/--no-textconv prohibit executable drivers. --no-renames deliberately
// exposes a rename as deletion + addition because the owner prohibits file loss.
function git(args, cwd) {
  return execFileSync('git', args, {
    cwd, maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function resolveCommit(ref, cwd) {
  if (typeof ref !== 'string' || !ref || ref.startsWith('-') || /[\x00-\x20]/.test(ref)) {
    throw new Error('Missing or invalid commit reference');
  }
  const sha = git(['rev-parse', '--verify', '--end-of-options', `${ref}^{commit}`], cwd).toString('ascii').trim();
  if (!/^[a-f0-9]{40,64}$/.test(sha)) throw new Error('Invalid resolved commit');
  return sha;
}

function nulRecords(buffer) {
  if (buffer.length && buffer[buffer.length - 1] !== 0) throw new Error('Unterminated Git path data');
  // Invalid UTF-8 paths fail closed, rather than combining two distinct byte paths.
  const text = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  return text ? text.slice(0, -1).split('\0') : [];
}

function countLines(buffer) {
  let n = 0;
  for (const byte of buffer) if (byte === 10) n++;
  return n + (buffer.length && buffer[buffer.length - 1] !== 10 ? 1 : 0);
}

function readDiff(baseSha, headSha = 'HEAD', { cwd } = {}) {
  const base = resolveCommit(baseSha, cwd);
  const head = resolveCommit(headSha, cwd);
  const baseline = git(['merge-base', base, head], cwd).toString('ascii').trim();
  if (!/^[a-f0-9]{40,64}$/.test(baseline)) throw new Error('No valid merge base');
  const args = ['diff', '--no-ext-diff', '--no-textconv', '--no-renames'];
  const nameStatus = nulRecords(git([...args, '--name-status', '-z', baseline, head, '--'], cwd));
  const numstat = nulRecords(git([...args, '--numstat', '-z', baseline, head, '--'], cwd));
  const status = new Map();
  if (nameStatus.length % 2) throw new Error('Malformed name-status data');
  for (let i = 0; i < nameStatus.length; i += 2) {
    const code = nameStatus[i];
    const filename = nameStatus[i + 1];
    if (!/^[AMDT]$/.test(code) || !filename || status.has(filename)) throw new Error('Unsupported Git status');
    status.set(filename, code);
  }
  const files = [];
  for (const record of numstat) {
    const first = record.indexOf('\t');
    const second = record.indexOf('\t', first + 1);
    if (first <= 0 || second <= first + 1) throw new Error('Malformed numstat data');
    const added = record.slice(0, first);
    const deleted = record.slice(first + 1, second);
    const filename = record.slice(second + 1); // tabs/newlines in the path stay intact
    if (!status.has(filename)) throw new Error('Diff status/count mismatch');
    const code = status.get(filename);
    status.delete(filename);
    const beforeLines = code === 'A' ? 0 : countLines(git(['cat-file', 'blob', `${baseline}:${filename}`], cwd));
    files.push({ path: filename, added, deleted, status: code, beforeLines });
  }
  if (status.size) throw new Error('Diff omitted changed files');
  return files;
}

function positiveInteger(value, fallback, name) {
  if (value === undefined) return fallback;
  if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value))) throw new Error(`Invalid ${name}`);
  return Number(value);
}
'''
s = replace_once(s, old, new, 'Whitespace-splitting Git paths was unsafe; explicit merge-base and NUL records fail closed.')
s = replace_once(s, '''    console.log("::warning::BASE_SHA not set — no-destroy guard skipped.");
    return 0;''', '''    console.error('No-Destroy Guard: BASE_SHA is required; no baseline means no successful check.');
    return 1;''', 'Missing baseline must never appear as a passing check.')
s = replace_once(s, '''  const maxDeleted = Math.max(1, parseInt(process.env.MAX_DELETED || "400", 10) || 400);
  const allowDestroy = (process.env.ALLOW_DESTROY || "").toLowerCase() === "true";

  const files = readDiff(baseSha);
  const { fail, reasons } = evaluateDiff(files, { protectedPrefixes, maxDeleted, allowDestroy });''', '''  const maxDeleted = positiveInteger(process.env.MAX_DELETED, 400, 'MAX_DELETED');
  const maxGlobalDeleted = positiveInteger(process.env.MAX_GLOBAL_DELETED, 1000, 'MAX_GLOBAL_DELETED');
  const minReplacementLines = positiveInteger(process.env.MIN_REPLACEMENT_LINES, 20, 'MIN_REPLACEMENT_LINES');
  const replacementRatio = process.env.REPLACEMENT_RATIO === undefined ? 0.8 : Number(process.env.REPLACEMENT_RATIO);
  const files = readDiff(baseSha, process.env.HEAD_SHA || 'HEAD');
  const { fail, reasons } = evaluateDiff(files, {
    protectedPrefixes, maxDeleted, maxGlobalDeleted, minReplacementLines, replacementRatio,
  });''', 'Strict threshold validation; ALLOW_DESTROY is not read and cannot bypass owner policy.')
s = replace_once(s, '''      "\\nIf this removal is intentional, add the `allow-destroy` label to the PR and re-run.\\n" +
      "Otherwise, change the approach to EDIT existing files with minimal diffs instead of replacing them."''', '''      '\\nNo label bypass is permitted. Preserve the original work with dated comments and additive changes.\\n' +
      'Owner review is required; agents must never merge their own PRs.' ''', 'The legacy remediation instructed agents to violate the no-delete owner rule.')
s = replace_once(s, '    console.error("no-destroy-guard error:", e.message);', "    console.error('no-destroy-guard error: baseline/diff evaluation failed; check Git refs and threshold configuration.');", 'Do not echo arbitrary Git stderr or filename content into annotations.')
s = replace_once(s, 'module.exports = { evaluateDiff };', 'module.exports = { evaluateDiff, readDiff, main, countLines };', 'Export Git integration and CLI logic for real-repository regression tests.')
s = s.replace(' * Env:\n', ''' * 2026-11-15 controlling behavior: global file-loss block, global 1000-line
 * deletion budget (including lockfiles), 80% replacement/loss on files >=20
 * baseline lines, and the retained protected 400-line budget. The old bypass
 * description above is historical only; neither a label nor env overrides policy.
 * HEAD_SHA defaults to HEAD locally. Missing baseline and Git errors fail closed.
 * MAX_GLOBAL_DELETED, MIN_REPLACEMENT_LINES, REPLACEMENT_RATIO configure heuristics.
 * These are tripwires, not proof of intent or universal destruction detection.
 *
 * Env:\n''', 1)
p.write_text(s)

p = ROOT / 'tests/no-destroy-guard.test.js'
s = p.read_text()
for name in ['ignores deletions outside protected paths', 'allow-destroy label overrides the guard']:
    start = s.index(f'test("{name}"')
    end = s.index('\n});', start) + len('\n});')
    s = replace_once(s, s[start:end], '', 'Owner global no-delete/no-bypass policy supersedes this legacy expected pass.')
s = s.replace('console.log(`\\nTest Summary:', '''test("blocks deletion outside protected paths", () => {
  assert.strictEqual(evaluateDiff([{ path: 'docs/old.md', added: '0', deleted: '1', status: 'D' }], opts).fail, true);
});

test("allow-destroy remains inert", () => {
  assert.strictEqual(evaluateDiff([{ path: 'products/foo/page.tsx', added: '0', deleted: '9999', status: 'D' }], { ...opts, allowDestroy: true }).fail, true);
});

test("global deletion budget includes unprotected paths and lockfiles", () => {
  assert.strictEqual(evaluateDiff([{ path: 'package-lock.json', added: '1', deleted: '1001', status: 'M' }], opts).fail, true);
});

test("whole-file replacement is detected globally", () => {
  assert.strictEqual(evaluateDiff([{ path: 'scripts/tool.js', added: '20', deleted: '20', beforeLines: 20, status: 'M' }], opts).fail, true);
});

test("invalid counts fail closed", () => {
  assert.throws(() => evaluateDiff([{ path: 'docs/old.md', added: '0', deleted: 'NaN', status: 'M' }], opts));
});

console.log(`\\nTest Summary:''', 1)
p.write_text(s)

p = ROOT / '.github/workflows/no-destroy-guard.yml'
s = p.read_text()
s = s.replace('# `allow-destroy` label. See scripts/no-destroy-guard.js.', '# `allow-destroy` label. See scripts/no-destroy-guard.js.\n# 2026-11-15: the override above is retired history. No label may bypass this check.\n# Global loss/replacement tripwires execute only BASE scripts; HEAD blobs are data.', 1)
s = replace_once(s, '''      - uses: actions/checkout@v7
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v7
        with:
          node-version: '22' ''', '', 'Unused exact block', '#') if False else s
s = replace_once(s, '''      - uses: actions/checkout@v7
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v7
        with:
          node-version: '22' ''', '', 'Unused exact block', '#') if False else s
old = s[s.index('      - uses: actions/checkout@v7'):]
new = '''      # Real upstream commit SHAs resolved via gh api on 2026-11-15.
      - uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4
        with:
          ref: ${{ github.event.pull_request.base.sha }}
          fetch-depth: 0
          persist-credentials: false
      - uses: actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4
        with:
          node-version: '22'
      - name: Fetch PR commit as data only
        env:
          PR_NUMBER: ${{ github.event.pull_request.number }}
          HEAD_SHA: ${{ github.event.pull_request.head.sha }}
        run: |
          set -euo pipefail
          [[ "$PR_NUMBER" =~ ^[1-9][0-9]*$ ]]
          [[ "$HEAD_SHA" =~ ^[a-f0-9]{40}$ ]]
          git fetch --no-tags origin "refs/pull/$PR_NUMBER/head"
          test "$(git rev-parse FETCH_HEAD)" = "$HEAD_SHA"
      - name: Block destructive diffs
        env:
          BASE_SHA: ${{ github.event.pull_request.base.sha }}
          HEAD_SHA: ${{ github.event.pull_request.head.sha }}
        run: node scripts/no-destroy-guard.js
'''
s = replace_once(s, old, new, 'Unpinned actions and PR checkout would permit security-script self-bypass; checkout BASE only.', '#')
p.write_text(s)
