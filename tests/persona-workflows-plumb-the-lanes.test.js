'use strict';

/**
 * #17868 gave `routedChat` a free-lane cascade — LM Studio, then keyless
 * Perplexity, then the billed OpenRouter lane. From CI it reached none of them.
 *
 * Every workflow that runs a persona passed exactly one variable:
 * `OPENROUTER_API_KEY`. So on a GitHub runner:
 *
 *   Layer 0  LMSTUDIO_ENDPOINT unset → defaults to http://127.0.0.1:1234/v1,
 *            which on a runner is the runner's own loopback, never the
 *            operator's laptop. Always unreachable.
 *   Layer 2  PERPLEXITY_API_KEY unset — fine, the lane is keyless by design.
 *   Layer 1  REVVEL_LLM_ALLOW_CLOUD unset → assertCloudAllowed throws.
 *
 * Result: `/dragnet` on a pull request could not succeed by any route. The
 * cascade existed and no workflow could reach it — the same producer-without-
 * consumer shape as the lane it was written to fix (RVS-VERIFY-001).
 *
 * A blanket rule would be wrong here: 44 workflows carry OPENROUTER_API_KEY and
 * several are deliberate free `/models` health probes that never chat. So this
 * test *discovers* the real consumers instead of guessing, by walking the
 * require graph of every node script a workflow executes and checking whether
 * it reaches `scripts/openrouter-routing.js`. A new workflow that starts
 * running a persona is caught automatically rather than quietly joining the
 * unconfigured set.
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.join(__dirname, '..');
const WORKFLOWS = path.join(REPO, '.github', 'workflows');
const CASCADE = path.join(REPO, 'scripts', 'openrouter-routing.js');

/** Env names a workflow must set for the cascade to have anywhere to go. */
const REQUIRED_ENV = ['LMSTUDIO_ENDPOINT', 'REVVEL_LLM_ALLOW_CLOUD'];

/** Relative requires in a script, resolved to absolute paths that exist. */
function localRequires(file) {
  let source;
  try {
    source = fs.readFileSync(file, 'utf8');
  } catch {
    return [];
  }
  const out = [];
  for (const match of source.matchAll(/require\(\s*["'](\.[^"']+)["']\s*\)/g)) {
    let resolved = path.resolve(path.dirname(file), match[1]);
    if (!fs.existsSync(resolved) && fs.existsSync(`${resolved}.js`)) resolved = `${resolved}.js`;
    if (fs.existsSync(resolved) && fs.statSync(resolved).isFile()) out.push(resolved);
  }
  return out;
}

/** Does `entry` reach the cascade through relative requires? */
function reachesCascade(entry) {
  const seen = new Set();
  const stack = [entry];
  while (stack.length) {
    const file = stack.pop();
    if (seen.has(file)) continue;
    seen.add(file);
    if (file === CASCADE) return true;
    stack.push(...localRequires(file));
  }
  return false;
}

/** Workflows that execute a node script which reaches the cascade. */
function workflowsRunningTheCascade() {
  const found = [];
  for (const name of fs.readdirSync(WORKFLOWS).filter((f) => f.endsWith('.yml'))) {
    const file = path.join(WORKFLOWS, name);
    const source = fs.readFileSync(file, 'utf8');
    const scripts = new Set();
    for (const match of source.matchAll(/node\s+(scripts\/[\w./-]+\.js)/g)) {
      scripts.add(path.join(REPO, match[1]));
    }
    for (const script of scripts) {
      if (fs.existsSync(script) && reachesCascade(script)) {
        found.push({ name, source, script: path.relative(REPO, script) });
        break;
      }
    }
  }
  return found;
}

test('the discovery actually finds workflows — it is not inert', () => {
  // If the regex or the require walk breaks, every assertion below passes
  // vacuously and the check this file exists for is gone.
  const found = workflowsRunningTheCascade();
  assert.ok(
    found.length > 0,
    'No workflow was found running a script that reaches scripts/openrouter-routing.js. ' +
      'Either the require walk broke or the `node scripts/...` pattern changed — ' +
      'either way the check below is now inert and must be repaired, not deleted.',
  );
});

test('every workflow that runs a persona plumbs the lane configuration', () => {
  const offenders = [];
  for (const { name, source, script } of workflowsRunningTheCascade()) {
    const missing = REQUIRED_ENV.filter((key) => !source.includes(`${key}:`));
    if (missing.length > 0) {
      offenders.push(
        `.github/workflows/${name} runs ${script}, which reaches routedChat, ` +
          `but never sets: ${missing.join(', ')}`,
      );
    }
  }

  assert.deepStrictEqual(
    offenders,
    [],
    'routedChat walks LM Studio → keyless Perplexity → OpenRouter. A workflow ' +
      'that sets none of the lane variables leaves Layer 0 pointing at the ' +
      "runner's own loopback and the paid lane refused by the spend gate, so " +
      'the persona cannot answer by any route:\n  ' + offenders.join('\n  '),
  );
});

test('LMSTUDIO_ENDPOINT is sourced from a secret, not hardcoded', () => {
  // The endpoint is a tunnel to the operator's machine. Hardcoding it in a
  // public workflow would publish a route to their laptop.
  const offenders = [];
  for (const { name, source } of workflowsRunningTheCascade()) {
    for (const line of source.split('\n')) {
      if (!/^\s*LMSTUDIO_ENDPOINT:/.test(line)) continue;
      if (!line.includes('secrets.') && !line.includes('vars.')) {
        offenders.push(`.github/workflows/${name}: ${line.trim()}`);
      }
    }
  }
  assert.deepStrictEqual(
    offenders,
    [],
    'LMSTUDIO_ENDPOINT must come from secrets (or vars), never a literal — it ' +
      "addresses the operator's own machine:\n  " + offenders.join('\n  '),
  );
});

/**
 * The two entry points that serve `/dragnet` on a pull request must be able to
 * run the free lane, not merely be configured for it.
 *
 * Layer 0 (LM Studio) is unreachable from a GitHub runner unless the operator
 * has published a tunnel — a runner cannot route to a laptop. So on CI the only
 * free lane left is Layer 2, and Layer 2 is the helallao/perplexity-ai Python
 * package. If it is not installed on the runner, both free lanes are gone and
 * the persona falls to the billed lane, which the spend gate refuses. That is
 * the exact state that made `/dragnet` unable to answer at all.
 *
 * Name-pinned deliberately: these two are the trigger surface a person types
 * `/dragnet` into. Requiring the install of all nine cascade workflows would be
 * wrong — several are batch jobs where paying is a legitimate choice.
 */
const DRAGNET_ENTRY_POINTS = ['persona-comment-trigger.yml', 'dragnet-ci-autofix.yml'];

test('the /dragnet entry points install the keyless bridge', () => {
  const offenders = [];
  for (const name of DRAGNET_ENTRY_POINTS) {
    const file = path.join(WORKFLOWS, name);
    assert.ok(fs.existsSync(file), `${name} is gone — update DRAGNET_ENTRY_POINTS deliberately.`);
    const source = fs.readFileSync(file, 'utf8');
    if (!source.includes('helallao/perplexity-ai')) {
      offenders.push(
        `.github/workflows/${name} runs a persona but never installs the keyless ` +
          'Perplexity bridge, so its only CI-reachable free lane cannot start.',
      );
    }
  }
  assert.deepStrictEqual(
    offenders,
    [],
    'On a runner, LM Studio is unreachable and the paid lane is gated — the ' +
      'keyless bridge is the only free lane left, and it has to be installed ' +
      'to run:\n  ' + offenders.join('\n  '),
  );
});

test('a failed bridge install degrades to the next lane instead of killing the job', () => {
  // Without continue-on-error a transient pip/network failure takes down the
  // whole persona run, turning a lane outage into a job outage.
  const offenders = [];
  for (const name of DRAGNET_ENTRY_POINTS) {
    const source = fs.readFileSync(path.join(WORKFLOWS, name), 'utf8');
    const idx = source.indexOf('Install no-key Perplexity bridge');
    if (idx === -1) continue;
    const step = source.slice(idx, idx + 700);
    if (!step.includes('continue-on-error: true')) {
      offenders.push(`.github/workflows/${name}: bridge install is not continue-on-error`);
    }
  }
  assert.deepStrictEqual(offenders, [], offenders.join('\n  '));
});
