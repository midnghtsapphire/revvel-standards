'use strict';

/**
 * Every `actions/github-script` body in `.github/workflows/` must parse as
 * JavaScript (WR #17735).
 *
 * `ralph-loop.yml` carried this since it was written:
 *
 *     body: `... Verified on \\`${ref.slice(0, 7)}\\`: ...`
 *
 * Inside a YAML block scalar nothing is unescaped, so JS received `\\` — an
 * escaped backslash — followed by a *bare* backtick. That backtick closed the
 * template literal early, leaving `${ref.slice(0, 7)}` as loose code:
 *
 *     SyntaxError: Unexpected identifier '$'
 *
 * github-script compiles the body before it runs a single line, so the step
 * aborted every time. The job it lives in, `ralph-unblock`, is the one that
 * clears a `won't-merge` label after CI goes green — so PRs stayed blocked with
 * the failure buried in a step nobody reads.
 *
 * A syntax error costs a full CI cycle to discover and reveals nothing about
 * the change under test. This file finds them before the push.
 *
 * ## How the check has to be written
 *
 * Two things make a naive sweep report errors that are not there:
 *
 *   1. github-script wraps the body in an async function, so a top-level
 *      `await` is legal. Checking the body standalone reports
 *      `await is only valid in async functions` on perfectly good scripts.
 *   2. `${{ ... }}` is substituted by the Actions runner before JS parses,
 *      so it must be stubbed out rather than parsed.
 *
 * A sweep that skips either reported 4 errors here when there was 1.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const yaml = require('yaml');

const ROOT = path.join(__dirname, '..');
const WORKFLOWS = path.join(ROOT, '.github', 'workflows');

/**
 * Workflows with a github-script body that does not currently parse.
 *
 * This is a ratchet: it may only shrink, and only by name. Names, not a count —
 * a count lets one broken workflow be swapped for another with nothing failing
 * (see `actions-lint-workflow.test.js`, which was fixed for exactly that).
 *
 * Fixing one of these means deleting its name here in the same commit.
 */
const KNOWN_BROKEN = Object.freeze([
  // Empty, and it must stay that way. Every github-script body in
  // .github/workflows/ parses. A name added here is not a fix — fix the
  // workflow. The three that were listed are #17783, #17784, #17785.
]);

function workflowFiles() {
  return fs
    .readdirSync(WORKFLOWS)
    .filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'))
    .sort();
}

/** Every `with.script` body belonging to an `actions/github-script` step. */
function githubScriptBodies(file) {
  let doc;
  try {
    doc = yaml.parse(fs.readFileSync(path.join(WORKFLOWS, file), 'utf8'));
  } catch {
    return []; // YAML validity is check-workflow-yaml.test.js's job, not ours.
  }
  const bodies = [];
  for (const job of Object.values(doc?.jobs ?? {})) {
    for (const step of job?.steps ?? []) {
      const uses = typeof step?.uses === 'string' ? step.uses : '';
      const script = step?.with?.script;
      if (/^actions\/github-script[@/]/.test(uses) && typeof script === 'string') {
        bodies.push({ name: step.name ?? '(unnamed step)', script });
      }
    }
  }
  return bodies;
}

/** Returns the SyntaxError message, or null when the body parses. */
function syntaxErrorIn(script) {
  // The runner substitutes `${{ ... }}` before JS ever sees it.
  const src = script.replace(/\$\{\{[^}]*\}\}/g, '"__actions_expression__"');
  try {
    // github-script evaluates the body inside an async function; parsing it any
    // other way rejects a legal top-level `await`.
    new Function(`return (async () => {\n${src}\n})()`);
    return null;
  } catch (err) {
    return err.message;
  }
}

test('every actions/github-script body parses as JavaScript', () => {
  const broken = [];
  for (const file of workflowFiles()) {
    if (KNOWN_BROKEN.includes(file)) continue;
    for (const { name, script } of githubScriptBodies(file)) {
      const message = syntaxErrorIn(script);
      if (message) broken.push(`${file} — step "${name}": ${message}`);
    }
  }
  assert.deepEqual(
    broken,
    [],
    `github-script step(s) will abort before running a line:\n  ${broken.join('\n  ')}`,
  );
});

test('the known-broken list is a ratchet — it may only shrink, and only by name', () => {
  // Adding a name here is not a fix. If this fails because a workflow was newly
  // broken, fix the workflow; if it fails because one was fixed, delete its name.
  assert.deepEqual([...KNOWN_BROKEN].sort(), []);
});

test('fixing a workflow means deleting its name from the known-broken list', () => {
  const stillBroken = KNOWN_BROKEN.filter((file) =>
    githubScriptBodies(file).some(({ script }) => syntaxErrorIn(script)),
  );
  assert.deepEqual(
    KNOWN_BROKEN.filter((f) => !stillBroken.includes(f)),
    [],
    'a name left behind after its fix would quietly re-authorise breaking that workflow again',
  );
});

test('the sweep does not mistake a legal top-level await for an error', () => {
  // The false positive that made an earlier sweep report 4 errors instead of 1.
  assert.equal(syntaxErrorIn('const x = await github.rest.issues.get({});'), null);
});

test('the sweep does not try to parse an Actions expression as JavaScript', () => {
  assert.equal(syntaxErrorIn('const n = `${{ github.event.number }}`;'), null);
});

test('the sweep still catches the ralph-loop escape bug', () => {
  // The exact shape of the original defect, as JS received it.
  const message = syntaxErrorIn('const s = `on \\\\`${ref}\\\\`: done`;');
  assert.match(String(message), /Unexpected identifier/);
});
