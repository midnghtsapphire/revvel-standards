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
 * Workflows that reach openrouter.ai but CANNOT spend, with the endpoint that
 * makes that true. Only `/chat/completions` bills; `/models` and a bare
 * `/api/v1` reachability probe are free.
 *
 * This distinction matters in both directions. Gating these would break exactly
 * the monitoring you want when spend is the problem — `agent-monitor`,
 * `api-monitor` and `openrouter-instantiation-check` are how an outage gets
 * noticed, and `lane-canary` is explicitly a keyless probe. An earlier version
 * of this list lumped them in with the billing call sites, which overstated the
 * gap by five.
 */
const FREE_PROBE_WORKFLOWS = {
  'agent-monitor.yml': 'GET /api/v1/models — agent health probe',
  'api-monitor.yml': 'reachability of /api/v1, alongside api.github.com',
  'openrouter-key-reset.yml': 'GET /api/v1/models — validates a key',
  'openrouter-instantiation-check.yml': 'GET /api/v1/models — health probe',
  'lane-canary.yml': 'GET /api/v1/models — explicitly a keyless probe',
};

/**
 * Workflows that can bill and are NOT yet gated. Empty: all ten are gated.
 *
 * Kept as a name-pinned list rather than a count so that swapping one entry for
 * another cannot pass unnoticed (RVS-VERIFY-001). It may only shrink.
 */
const UNGATED_WORKFLOW_CURLS = [];

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
    .filter((f) => !Object.hasOwn(FREE_PROBE_WORKFLOWS, f))
    .filter((f) => {
      const live = fs
        .readFileSync(path.join(dir, f), 'utf8')
        .split('\n')
        .filter((l) => !/^\s*#/.test(l))
        .join('\n');
      // Only a completions call bills. A /models probe does not.
      const bills =
        /openrouter\.ai\/api\/v1\/chat\/completions/.test(live) ||
        /(LLM_BASE_URL|LLM__HTTP_CLIENT__API_URL):\s*["']?https:\/\/openrouter\.ai/.test(live);
      return bills && !CONSULTS_GATE.test(live);
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

test('a free probe that starts billing loses its exemption', () => {
  // The exemption is "this endpoint cannot spend", not "this file is trusted".
  // If one of these ever posts a completion, it must be gated like the rest.
  const dir = path.join(REPO_ROOT, '.github', 'workflows');
  const nowBilling = [];
  for (const [name, why] of Object.entries(FREE_PROBE_WORKFLOWS)) {
    const file = path.join(dir, name);
    if (!fs.existsSync(file)) {
      nowBilling.push(`${name}: exempted but the file no longer exists`);
      continue;
    }
    const live = fs
      .readFileSync(file, 'utf8')
      .split('\n')
      .filter((l) => !/^\s*#/.test(l))
      .join('\n');
    if (
      /openrouter\.ai\/api\/v1\/chat\/completions/.test(live) &&
      !CONSULTS_GATE.test(live)
    ) {
      nowBilling.push(`${name}: exempted as "${why}" but now posts a completion`);
    }
  }
  assert.deepStrictEqual(nowBilling, []);
});

/**
 * The class the URL scan cannot see.
 *
 * `tests/llm-spend-gate-coverage.test.js` originally looked for
 * `openrouter.ai/api` and reported full coverage. It was wrong: six workflows
 * hand an LLM API key to a **third-party action** that makes the call inside
 * its own code. No provider URL appears anywhere in those files, so the scan
 * saw nothing while the spend was entirely real —
 * `maxlim0/AI-PR-Reviewer`, `fridzema/ai-weekly-changelog-action`,
 * `sipyourdrink-ltd/bernstein`, `koki-develop/claude-renovate-review`,
 * `omnedia/panda-ops`, `maxlim0/actions-progci-fail`.
 *
 * The lesson generalises past this repo: a guard that greps for a *symptom*
 * (the URL) misses every path that reaches the same outcome another way. This
 * test asserts on the thing that actually predicts spend — **a paid credential
 * crossing into code we do not control.**
 */

/** Secrets whose presence means a call can be billed. */
const PAID_CREDENTIAL =
  /(OPENROUTER_API_KEY|ANTHROPIC_API_KEY|OPENAI_API_KEY|XAI_API_KEY|PERPLEXITY_API_KEY)/;

/** `uses:` refs that are ours or GitHub's, and so are covered elsewhere. */
const FIRST_PARTY =
  /^(\.\/|actions\/|github\/|docker:\/\/)/;

/**
 * Third-party actions that demonstrably do not consume an LLM credential —
 * they open PRs, push images, publish pages. Each is here because it was
 * checked, not because flagging it was inconvenient.
 */
const NON_LLM_ACTIONS = [
  'peter-evans/create-pull-request', // opens a PR with the diff; no model call
  'docker/login-action', // registry auth
  'docker/build-push-action', // image build
  'peaceiris/actions-gh-pages', // static publish
];

/**
 * A workflow is also covered when its LLM call goes through one of the scripts
 * gated in #17858 — the credential is in scope, but the spend decision happens
 * inside the script, not in the YAML.
 */
const INVOKES_GATED_SCRIPT =
  /(scripts\/openrouter-triage\.js|\.github\/scripts\/openrouter_coder\.py|scripts\/pr-auto-review\.js|scripts\/wr-fill-fields\.js|scripts\/openrouter-personas\.js)/;

test('a workflow handing a paid LLM credential to a third-party action is gated', () => {
  const dir = path.join(REPO_ROOT, '.github', 'workflows');
  const offenders = [];

  for (const name of fs.readdirSync(dir).filter((f) => /\.ya?ml$/.test(f))) {
    const source = fs.readFileSync(path.join(dir, name), 'utf8');
    const live = source
      .split('\n')
      .filter((l) => !/^\s*#/.test(l))
      .join('\n');

    if (!PAID_CREDENTIAL.test(live)) continue;
    if (CONSULTS_GATE.test(live)) continue;
    // The spend decision may live inside a script this workflow shells out to.
    if (INVOKES_GATED_SCRIPT.test(live)) continue;

    const thirdParty = [...live.matchAll(/uses:\s*([^\s#]+)/g)]
      .map((m) => m[1].replace(/^['"]|['"]$/g, ''))
      .filter((ref) => !FIRST_PARTY.test(ref))
      .filter((ref) => !NON_LLM_ACTIONS.some((a) => ref.startsWith(`${a}@`)));

    if (thirdParty.length === 0) continue;

    offenders.push(`${name} → ${[...new Set(thirdParty)].slice(0, 3).join(', ')}`);
  }

  assert.deepStrictEqual(
    offenders,
    [],
    'These workflows hand a paid LLM credential to a third-party action and are ' +
      'not gated. The action bills inside its own code, so no provider URL ' +
      'appears here and the URL scan cannot see it:\n  ' +
      offenders.join('\n  ') +
      "\n\nAdd `if: vars.REVVEL_LLM_ALLOW_CLOUD == '1'` to the step (AND it onto " +
      'any existing condition rather than replacing it).',
  );
});
