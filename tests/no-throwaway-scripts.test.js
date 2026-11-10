'use strict';

/**
 * Guards against throwaway/one-shot scripts being committed to the repo root.
 *
 * It's easy to run a quick local script to patch a workflow or lockfile and
 * accidentally commit it to the root of the repository. This has happened
 * multiple times recently (e.g., `update_uv_lock.py`, `patch_ossar.js`).
 *
 * This test enforces that the repo root only contains explicitly allowed
 * JavaScript, Python, and Shell scripts. Any permanent tooling should be
 * placed in `scripts/` or a dedicated package/directory.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

// #18313, 2026-11-10: owner requires retiring in place, never deleting source.
// A banner alone cannot exempt executable junk: every remaining nonblank line
// must be a language-appropriate line comment. Python docstrings are executable
// statements, and block comments are deliberately not accepted by this rule.
function isFullyCommentedRetiredArchive(source, filename) {
  const prefix = filename.endsWith('.js') ? '//' : '#';
  const lines = source.split(/\r?\n/).filter(line => line.trim());
  return lines.length > 0 &&
    lines[0].startsWith(`${prefix} RETIRED `) &&
    /^\d{4}-\d{2}-\d{2} by \S+/.test(lines[0].slice(`${prefix} RETIRED `.length)) &&
    lines.every(line => line.trimStart().startsWith(prefix));
}

test('retirement archive exemption rejects executable code under a forged banner', () => {
  assert.equal(isFullyCommentedRetiredArchive('# RETIRED 2026-11-10 by Codex - #18313\n# original source\n', 'old.py'), true);
  assert.equal(isFullyCommentedRetiredArchive('# RETIRED 2026-11-10 by Codex - #18313\nprint("still active")\n', 'old.py'), false);
  assert.equal(isFullyCommentedRetiredArchive('// RETIRED 2026-11-10 by Codex - #18313\nconsole.log("active");', 'old.js'), false);
  assert.equal(isFullyCommentedRetiredArchive('# ordinary comment only', 'old.py'), false);
});

test('No throwaway scripts in repo root', () => {
  const files = fs.readdirSync(ROOT).filter(f => {
    const p = path.join(ROOT, f);
    return fs.statSync(p).isFile();
  });

  const scriptFiles = files.filter(f => f.endsWith('.js') || f.endsWith('.py') || f.endsWith('.sh'));

  // Explicitly allowlisted root scripts.
  // Do NOT add scripts here unless they fundamentally must live at the root
  // (e.g., specific entry points). Tooling goes in `scripts/`.
  const allowlist = new Set([
    'fix-zizmor.js',
    'fix-semgrep.js',
    'hub-registry.js',
    'agent-creator-data.js'
  ]);

  // Previous rule: const illegal = scriptFiles.filter(f => !allowlist.has(f));
  // Keep rejecting all active root scripts while allowing retained, inert
  // owner-requested archives. This does not add any new executable allowlist.
  const illegal = scriptFiles.filter(f => !allowlist.has(f) &&
    !isFullyCommentedRetiredArchive(fs.readFileSync(path.join(ROOT, f), 'utf8'), f));

  assert.deepEqual(
    illegal,
    [],
    'Throwaway scripts found at repo root. Use scripts/ directory for tools, or remove one-shot migration scripts before merging.'
  );
});
