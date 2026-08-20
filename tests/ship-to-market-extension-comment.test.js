'use strict';

/**
 * `ship-to-market.yml`'s extension-delivery comment must run, and must read its
 * values as data (WR #17785).
 *
 * The `deliver-extension` job's "Comment result" step declared both variables
 * twice:
 *
 *     const chrome = process.env.CHROME || '';
 *     const vscode = process.env.VSCODE || '';
 *     const chrome = `${{ steps.chrome.outputs.result }}` || '';
 *     const vscode = `${{ steps.vscode.outputs.result }}` || '';
 *
 *     SyntaxError: Identifier 'chrome' has already been declared
 *
 * github-script compiles the body before running a line, so the step aborted
 * every time. It is `if: always()`, so it was meant to report failures too — and
 * never has.
 *
 * ## Why deleting the *other* two would also have compiled
 *
 * This is the part worth guarding. Either deletion fixes the syntax error, and
 * only one is correct.
 *
 * The runner substitutes `${{ ... }}` as TEXT before the JavaScript is parsed,
 * so the interpolated pair pastes a step output directly inside a template
 * literal. A backtick or a `${` in that value ends the literal and the rest is
 * evaluated as code. These particular values are built from `package.json` and
 * from publisher stderr:
 *
 *     PKG=$(node -p "require('./package.json').name + '@' + ...")
 *     echo "result=Published $PKG to VS Code Marketplace" >> $GITHUB_OUTPUT
 *
 * The step's `env:` block already passes both values as data. So the fix is not
 * "remove a duplicate" — it is "keep the `process.env` pair, delete the
 * interpolated one." A test that only asserted "no duplicate declarations"
 * would pass on the wrong fix.
 *
 * Broader sweep — 13 other bodies in this file interpolate `${{ }}` — is #17796.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const yaml = require('yaml');

const WORKFLOW = path.join(__dirname, '..', '.github', 'workflows', 'ship-to-market.yml');

function commentStep() {
  const doc = yaml.parse(fs.readFileSync(WORKFLOW, 'utf8'));
  const job = doc.jobs['deliver-extension'];
  assert.ok(job, 'the deliver-extension job must exist');
  const step = (job.steps ?? []).find(
    (s) => typeof s?.with?.script === 'string' && /comment result/i.test(s.name || ''),
  );
  assert.ok(step, 'the extension "Comment result" step must exist');
  return step;
}

/** Run the shipped script; returns the comment posted, or null. */
async function run(env) {
  let comment = null;
  const github = {
    rest: { issues: { createComment: async (args) => { comment = args; } } },
  };
  const context = {
    repo: { owner: 'o', repo: 'r' },
    payload: { pull_request: { number: 7 } },
  };
  const saved = { CHROME: process.env.CHROME, VSCODE: process.env.VSCODE };
  Object.assign(process.env, { CHROME: '', VSCODE: '', ...env });
  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function(
      'github', 'context',
      `return (async () => {\n${commentStep().with.script}\n})();`,
    );
    await fn(github, context);
  } finally {
    Object.assign(process.env, saved);
  }
  return comment;
}

test('the script parses — it is compiled before a line of it runs', () => {
  assert.doesNotThrow(() => {
    // eslint-disable-next-line no-new-func
    new Function(`return (async () => {\n${commentStep().with.script}\n})();`);
  });
});

test('a successful publish is reported', async () => {
  const comment = await run({ CHROME: 'Published thing@1.0.0 to Chrome Web Store' });
  assert.match(comment.body, /✅ \*\*Chrome\*\*/);
  assert.match(comment.body, /thing@1\.0\.0/);
});

test('a skipped channel is reported as a warning, not a success', async () => {
  // Both channels. Checking only one lets the other's SKIPPED test be removed
  // and reported as ✅ — mutation-tested, and it escaped exactly that way.
  const vscodeOnly = await run({ VSCODE: 'SKIPPED — add VSCE_TOKEN secret' });
  assert.match(vscodeOnly.body, /⚠️ \*\*VS Code\*\*/);
  assert.doesNotMatch(vscodeOnly.body, /✅/);

  const chromeOnly = await run({ CHROME: 'SKIPPED — no Chrome extension' });
  assert.match(chromeOnly.body, /⚠️ \*\*Chrome\*\*/);
  assert.doesNotMatch(chromeOnly.body, /✅/);

  // A publish that worked and one that was skipped must not both read the same.
  const mixed = await run({
    CHROME: 'Published thing@1.0.0 to Chrome Web Store',
    VSCODE: 'SKIPPED — add VSCE_TOKEN secret',
  });
  assert.match(mixed.body, /✅ \*\*Chrome\*\*/);
  assert.match(mixed.body, /⚠️ \*\*VS Code\*\*/);
});

test('nothing to report posts nothing', async () => {
  assert.equal(await run({}), null);
});

test('the values are read from process.env, not interpolated into the script', () => {
  // The whole point. Deleting the other duplicate pair also fixes the syntax
  // error, compiles cleanly, and leaves the injectable form in place.
  const step = commentStep();

  assert.match(step.with.script, /process\.env\.CHROME/);
  assert.match(step.with.script, /process\.env\.VSCODE/);

  assert.doesNotMatch(
    step.with.script,
    /\$\{\{[^}]*steps\.[^}]*\}\}/,
    'a step output pasted into a template literal is evaluated as code if it contains a backtick',
  );

  // env: is what makes reading from process.env possible; without it the fix
  // silently yields two empty strings and the step posts nothing, forever.
  assert.equal(step.env?.CHROME, '${{ steps.chrome.outputs.result }}');
  assert.equal(step.env?.VSCODE, '${{ steps.vscode.outputs.result }}');
});

test('each variable is declared exactly once', () => {
  const src = commentStep().with.script;
  for (const name of ['chrome', 'vscode']) {
    const declarations = [...src.matchAll(new RegExp(`^\\s*const ${name}\\b`, 'gm'))];
    assert.equal(declarations.length, 1, `${name} must be declared once`);
  }
});
