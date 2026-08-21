'use strict';

/**
 * Nothing in this repo may bill an LLM provider without an explicit opt-in.
 *
 * On 2026-08-21 the owner found ~$80 of OpenRouter spend in a day with nobody
 * touching the repository. The cause was never a price or a tier — it was call
 * volume that nobody held a total for. 46 scheduled workflows fired ~496
 * runs/day and ten of them called OpenRouter (#17849), and every pull request
 * fans out to a fleet of reviewer bots on top of that (#17850).
 *
 * The spend is currently zero for the wrong reason: the account sits at 402, so
 * every call fails free. **Topping up credits re-arms the whole burn.** The 402
 * is an outage that happens to look like a control — ask what would fail if it
 * were removed, and the answer is "the balance" (RVS-VERIFY-001).
 *
 * So every code path that POSTs to a paid LLM provider must consult the gate:
 * `REVVEL_LLM_ALLOW_CLOUD` must be exactly "1". `scripts/llm-spend-gate.js` for
 * JavaScript, `cloud_allowed()` in `scripts/local_llm.py` and the local
 * `_assert_cloud_allowed` helpers for Python — one variable, one decision, both
 * languages.
 *
 * This test discovers call sites rather than trusting a list, so a new file that
 * POSTs to a provider fails until it is gated or consciously named below.
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const REPO_ROOT = path.join(__dirname, '..');
const SCAN_DIRS = ['scripts', path.join('.github', 'scripts')];

/** A line that actually sends a request to a paid provider. */
const POSTS_TO_PROVIDER =
  /(hostname:\s*["']openrouter\.ai["']|openrouter\.ai\/api\/v1|OPENROUTER_HOST\s*=|OPENROUTER_URL\s*=)/;

/** Evidence that a file consults the gate, directly or by delegation. */
const CONSULTS_GATE =
  /(llm-spend-gate|REVVEL_LLM_ALLOW_CLOUD|assertCloudAllowed|cloud_allowed|_assert_cloud_allowed|require\(["']\.\/openrouter-routing["']\))/;

/**
 * Call sites that are NOT yet gated, named individually so the gap is visible
 * rather than implied. This list may only shrink — adding to it should be a
 * deliberate, reviewed act, not a way to get a red build green.
 *
 * Everything here is an inline `curl` inside a workflow's `run:` block rather
 * than a script, so gating them means editing fifteen separate shell blocks.
 * That is its own change (#17850 follow-up), not a drive-by in this one.
 */
const UNGATED_WORKFLOW_CURLS = [
  'agent-monitor.yml',
  'api-monitor.yml',
  'brain-dump-intake.yml',
  'free-llm-router.yml',
  'lane-canary.yml',
  'openhands-resolver.yml',
  'openrouter-agent.yml',
  'openrouter-instantiation-check.yml',
  'openrouter-key-reset.yml',
  'pdf-work-request-router.yml',
  'priority-router.yml',
  'ship-quality.yml',
  'swe-agent.yml',
  'wr-auto-classify.yml',
  'xai-review-oleg-fork.yml',
];

function scanFiles() {
  const found = [];
  for (const dir of SCAN_DIRS) {
    const abs = path.join(REPO_ROOT, dir);
    if (!fs.existsSync(abs)) continue;
    for (const name of fs.readdirSync(abs)) {
      if (!/\.(js|mjs|cjs|py)$/.test(name)) continue;
      if (name === 'llm-spend-gate.js') continue; // the gate itself
      found.push(path.join(dir, name));
    }
  }
  return found.sort();
}

test('every script that calls a paid LLM provider consults the spend gate', () => {
  const ungated = [];
  for (const rel of scanFiles()) {
    const source = fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8');
    const live = source
      .split('\n')
      .filter((l) => !/^\s*(#|\/\/|\*)/.test(l))
      .join('\n');
    if (!POSTS_TO_PROVIDER.test(live)) continue;
    if (CONSULTS_GATE.test(source)) continue;
    ungated.push(rel);
  }
  assert.deepStrictEqual(
    ungated,
    [],
    'These scripts POST to a paid LLM provider without consulting the spend ' +
      'gate, so they will bill the moment the account has credit again:\n  ' +
      ungated.join('\n  ') +
      "\n\nAdd `const { assertCloudAllowed } = require('./llm-spend-gate');` and " +
      'call it as the first statement of the requesting function (Python: copy ' +
      'the `_assert_cloud_allowed` helper).',
  );
});

test('the ungated workflow list only shrinks', () => {
  // A ratchet that names files, never a count — swapping one entry for another
  // must not pass unnoticed (RVS-VERIFY-001).
  const dir = path.join(REPO_ROOT, '.github', 'workflows');
  const actual = fs
    .readdirSync(dir)
    .filter((f) => /\.ya?ml$/.test(f))
    .filter((f) => {
      const live = fs
        .readFileSync(path.join(dir, f), 'utf8')
        .split('\n')
        .filter((l) => !/^\s*#/.test(l))
        .join('\n');
      return /openrouter\.ai\/api/.test(live) && !CONSULTS_GATE.test(live);
    })
    .sort();

  const added = actual.filter((f) => !UNGATED_WORKFLOW_CURLS.includes(f));
  assert.deepStrictEqual(
    added,
    [],
    'New ungated OpenRouter call sites appeared in workflows. Gate them rather ' +
      `than extending the list:\n  ${added.join('\n  ')}`,
  );

  const fixed = UNGATED_WORKFLOW_CURLS.filter((f) => !actual.includes(f));
  assert.deepStrictEqual(
    fixed,
    [],
    'These are listed as ungated but no longer are. Remove them from ' +
      `UNGATED_WORKFLOW_CURLS so the list keeps meaning what it says:\n  ${fixed.join('\n  ')}`,
  );
});

test('the gate opens only on exactly "1"', () => {
  const gate = require(path.join(REPO_ROOT, 'scripts', 'llm-spend-gate.js'));
  const original = process.env.REVVEL_LLM_ALLOW_CLOUD;
  try {
    for (const value of ['', 'true', 'yes', 'TRUE', '0', ' ', 'on']) {
      process.env.REVVEL_LLM_ALLOW_CLOUD = value;
      assert.strictEqual(
        gate.cloudAllowed(),
        false,
        `REVVEL_LLM_ALLOW_CLOUD=${JSON.stringify(value)} must NOT open the paid lane`,
      );
      assert.throws(
        () => gate.assertCloudAllowed('test'),
        gate.CloudSpendBlockedError,
        'a closed gate must throw the distinct error type, not a generic one',
      );
    }
    process.env.REVVEL_LLM_ALLOW_CLOUD = '1';
    assert.strictEqual(gate.cloudAllowed(), true);
    assert.doesNotThrow(() => gate.assertCloudAllowed('test'));
  } finally {
    if (original === undefined) delete process.env.REVVEL_LLM_ALLOW_CLOUD;
    else process.env.REVVEL_LLM_ALLOW_CLOUD = original;
  }
});

test('the refusal names the gate and the call site', () => {
  // A refusal nobody can act on becomes a mystery failure, and a mystery
  // failure gets "fixed" by removing the gate.
  const gate = require(path.join(REPO_ROOT, 'scripts', 'llm-spend-gate.js'));
  const original = process.env.REVVEL_LLM_ALLOW_CLOUD;
  process.env.REVVEL_LLM_ALLOW_CLOUD = '';
  try {
    gate.assertCloudAllowed('some-caller');
    assert.fail('expected a refusal');
  } catch (err) {
    assert.match(err.message, /REVVEL_LLM_ALLOW_CLOUD/, 'must name the gate');
    assert.match(err.message, /some-caller/, 'must name the call site');
    assert.match(err.message, /spend gate, not a bug/, 'must say it is deliberate');
  } finally {
    if (original === undefined) delete process.env.REVVEL_LLM_ALLOW_CLOUD;
    else process.env.REVVEL_LLM_ALLOW_CLOUD = original;
  }
});
