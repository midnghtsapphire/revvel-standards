'use strict';

/**
 * Decisions and the workflows they govern must agree.
 *
 * Why this exists, and why it does NOT live beside any one workflow:
 *
 * D014 restored the RecurseML lane and shipped its own guard in
 * tests/recurse-ml-workflow.test.js. #17740 — branched from a `main` that
 * predated D014 — then reverted the whole commit, taking the workflow, the
 * DECISIONS.md row, the audit line AND the guard with it. The guard could not
 * catch its own deletion, so the reversal of an explicit owner instruction
 * landed on `main` silently and stayed there.
 *
 * A per-feature test cannot survive a wholesale revert of the feature. What
 * survives is a check that spans decisions, because a stale branch reverting
 * one workflow leaves this table's OTHER rows asserting a state the tree no
 * longer has. It also fails on the partial case a wholesale revert cannot
 * produce but a hand-edit easily can: turning a workflow's triggers off while
 * the decision that turned them on is still recorded, or vice versa.
 *
 * Add a row here whenever a decision turns a workflow's automatic triggers on
 * or off. That is the whole maintenance burden, and it is what makes the next
 * silent reversal fail a test instead of going unnoticed.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const yaml = require('yaml');

const ROOT = path.join(__dirname, '..');
const DECISIONS = path.join(ROOT, 'DECISIONS.md');
const WORKFLOWS = path.join(ROOT, '.github', 'workflows');

// A decision that changed a workflow's trigger state, and the state it requires.
// `autoTriggers: true`  → the workflow must run automatically (pull_request/push)
// `autoTriggers: false` → it must run only on demand (workflow_dispatch)
const GOVERNED = [
  {
    id: 'D006',
    workflow: 'bito-ai.yml',
    autoTriggers: false,
    why: 'Bito was cut from the review fleet — key absent, silent no-op on every PR',
  },
  {
    // Was D014/autoTriggers:true until 2026-08-21. D016 reverses the trigger
    // restoration on cost grounds — NOT on D014's evidence, which stands: the
    // RecurseML GitHub App reports independently of this workflow, which is
    // exactly why cutting these triggers does not remove the red check (#17872).
    // Without RECURSE_ML_API_KEY the workflow lane no-ops, so it was spending
    // runner time to produce nothing.
    id: 'D016',
    workflow: 'recurse-ml.yml',
    autoTriggers: false,
    why: 'RecurseML workflow lane cut for waste — it no-ops without the secret, '
      + 'while the GitHub App (the mechanism that actually reports) is untouched',
  },
  {
    id: 'D016',
    workflow: 'octopus-route.yml',
    autoTriggers: false,
    why: 'Octopus route cut — the hosted account is out of credits, so the lane '
      + 'burned runner time for nothing',
  },
  {
    id: 'D016',
    workflow: 'octopus-review-fallback.yml',
    autoTriggers: false,
    why: 'Octopus fallback cut — same out-of-credits reason; the bot comment on '
      + 'PRs comes from the GitHub App, not this workflow',
  },
  {
    id: 'D015',
    workflow: 'ossar.yml',
    autoTriggers: false,
    why: 'OSSAR retired — reported a launcher crash as a security finding',
  },
];

const AUTO_TRIGGERS = ['pull_request', 'push', 'schedule'];

function triggersOf(workflow) {
  const file = path.join(WORKFLOWS, workflow);
  assert.ok(fs.existsSync(file), `${workflow} must exist — decisions reference it`);
  const doc = yaml.parse(fs.readFileSync(file, 'utf8'));
  // yaml parses a bare `on:` key as the boolean true
  return doc.on ?? doc[true] ?? {};
}

for (const { id, workflow, autoTriggers, why } of GOVERNED) {
  test(`${id} is still recorded in DECISIONS.md`, () => {
    const decisions = fs.readFileSync(DECISIONS, 'utf8');
    assert.match(
      decisions,
      new RegExp(`^\\|\\s*${id}\\s*\\|`, 'm'),
      `${id} governs ${workflow} (${why}). If the row is gone, either the `
        + 'decision was reverted without being recorded, or a stale branch '
        + 'clobbered it — which is exactly how D014 was lost.',
    );
  });

  test(`${workflow} matches what ${id} decided`, () => {
    const on = triggersOf(workflow);
    const present = AUTO_TRIGGERS.filter((t) => t in on);

    if (autoTriggers) {
      assert.ok(
        present.length > 0,
        `${id} enabled automatic triggers on ${workflow}, but it now has none. `
          + `${why}. Either the workflow was reverted while the decision stands, `
          + 'or the decision needs reversing on the record first.',
      );
    } else {
      assert.deepEqual(
        present,
        [],
        `${id} disabled automatic triggers on ${workflow}, but ${present.join(', ')} `
          + `is back. ${why}. Re-enabling requires reversing the decision on the `
          + 'record, not just editing the workflow.',
      );
      assert.ok(
        'workflow_dispatch' in on,
        `${workflow} must stay runnable on demand (RVS-AGENT-001: disable, don't delete)`,
      );
    }
  });
}

test('every governed workflow is still present, not deleted', () => {
  // COMMENT-DONT-DELETE: a retired workflow is disabled, never removed. A
  // missing file means the decision record now points at nothing.
  for (const { workflow } of GOVERNED) {
    assert.ok(
      fs.existsSync(path.join(WORKFLOWS, workflow)),
      `${workflow} is referenced by a decision and must not be deleted`,
    );
  }
});
