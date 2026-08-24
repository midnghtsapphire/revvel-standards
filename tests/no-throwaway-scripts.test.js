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

  const illegal = scriptFiles.filter(f => !allowlist.has(f));

  assert.deepEqual(
    illegal,
    [],
    'Throwaway scripts found at repo root. Use scripts/ directory for tools, or remove one-shot migration scripts before merging.'
  );
});
