'use strict';

/**
 * Assigning @Copilot starts a Copilot coding-agent session, and those consume
 * PAID premium requests. **657 such sessions ran in this repository** before
 * anyone saw a bill — not because someone clicked 657 times, but because
 * workflows assigned Copilot automatically on every WR issue.
 *
 * This test exists because finding them by hand went wrong twice in one sitting:
 *
 *   1. A first sweep grepped for workflows *mentioning* Copilot and inspected
 *      the matches by eye. It found `weekly-research.yml` and concluded that was
 *      the only live path.
 *   2. `needs-action-router.yml` was in that same match list. Its Copilot
 *      assignment sits ~30 lines below a block that merely *reads* assignees,
 *      and the eye-check stopped at the read. It fires on `issues` too.
 *
 * So the check is mechanical, not visual: find every `addAssignees` call whose
 * assignee list contains Copilot, and require the enclosing step to consult the
 * gate. Labels are free and unaffected — only assignment spends.
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const yaml = require('yaml');

const WORKFLOW_DIR = path.join(__dirname, '..', '.github', 'workflows');
const GATE = 'REVVEL_ALLOW_COPILOT_ASSIGN';

/** A script that assigns Copilot, regardless of surrounding formatting. */
const ASSIGNS_COPILOT = /addAssignees\s*\(\s*\{[\s\S]*?assignees\s*:\s*\[[^\]]*['"]Copilot['"]/;

function workflowFiles() {
  return fs
    .readdirSync(WORKFLOW_DIR, { withFileTypes: true })
    .filter((e) => e.isFile() && /\.ya?ml$/.test(e.name))
    .map((e) => e.name)
    .sort();
}

/** Every inline script, as the runner receives it, with its step. */
function scriptSteps(source) {
  let doc;
  try {
    doc = yaml.parse(source);
  } catch {
    return [];
  }
  const out = [];
  for (const job of Object.values(doc?.jobs ?? {})) {
    for (const step of job?.steps ?? []) {
      const script = step?.with?.script;
      if (typeof script === 'string' && script.trim()) out.push({ step, script });
    }
  }
  return out;
}

test('no workflow assigns @Copilot without consulting the spend gate', () => {
  const offenders = [];
  for (const name of workflowFiles()) {
    const source = fs.readFileSync(path.join(WORKFLOW_DIR, name), 'utf8');
    for (const { step, script } of scriptSteps(source)) {
      if (!ASSIGNS_COPILOT.test(script)) continue;
      const gatedInScript = script.includes(GATE);
      const gatedInEnv = Object.hasOwn(step?.env ?? {}, GATE);
      if (gatedInScript && gatedInEnv) continue;
      offenders.push(
        `${name} → "${step?.name ?? '(unnamed)'}"` +
          `${gatedInScript ? '' : ' [gate missing from script]'}` +
          `${gatedInEnv ? '' : ' [gate not passed in step env]'}`,
      );
    }
  }
  assert.deepStrictEqual(
    offenders,
    [],
    'These steps assign @Copilot, which starts a PAID coding-agent session, ' +
      `without checking ${GATE}:\n  ${offenders.join('\n  ')}\n\n` +
      'Both halves are required — a script that reads the variable but is never ' +
      'passed it in `env:` is permanently shut, not gated.',
  );
});

test('the detector still finds the assignments it was written for', () => {
  // Guards the guard. If the assignment is reformatted such that the pattern
  // stops matching, this test passes forever over an empty set — which reads
  // exactly like "there are none". Both known call sites must stay visible.
  const seen = [];
  for (const name of workflowFiles()) {
    const source = fs.readFileSync(path.join(WORKFLOW_DIR, name), 'utf8');
    for (const { script } of scriptSteps(source)) {
      if (ASSIGNS_COPILOT.test(script)) seen.push(name);
    }
  }
  for (const expected of ['weekly-research.yml', 'needs-action-router.yml']) {
    assert.ok(
      seen.includes(expected),
      `${expected} assigns @Copilot but the detector no longer sees it. Either ` +
        'the assignment moved (update this expectation deliberately) or the ' +
        'pattern broke and the check above is now inert.',
    );
  }
});
