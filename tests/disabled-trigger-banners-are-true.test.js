'use strict';

/**
 * A banner saying a trigger is off, with nothing checking it, is decoration.
 *
 * Two workflows carried such a banner for months while the trigger it named was
 * live (#17871):
 *
 *   jules-pr-reviewer.yml  "SILENCED 2026-05-28 ... To re-enable auto-triggers
 *                          as-is: uncomment the pull_request: block below."
 *                          `pull_request:` was never commented. It ran on every
 *                          PR, polled a broken action 44 times over ~13 minutes,
 *                          and posted a red check.
 *
 *   semgrep.yml            "DISABLED 2026-07-16 ... Semgrep removed from
 *                          PR/push/schedule ... Manual run only via
 *                          workflow_dispatch." `pull_request:` was live, so it
 *                          kept duplicating CodeQL on every PR to main.
 *
 * Both were rewritten by `c8867736a`, which pushed 247 workflow files through a
 * YAML serializer. The tell is `workflow_dispatch: null` — a serializer artifact,
 * not something a person types. The banners survived; the state they described
 * did not.
 *
 * This test is the consumer. It **parses** the `on:` block rather than grepping,
 * because the entire failure mode is a banner that reads correctly sitting next
 * to a structure that does not match it — a grep for "DISABLED" finds both the
 * honest and the dishonest file.
 *
 * It keys on the *specific trigger a banner names*, not on the presence of a
 * banner. Keying on the banner alone would flag eight workflows whose
 * `COST FREEZE 2026-08-21` note disabled `schedule:` only and correctly keep
 * `push`/`pull_request` — and a guard that cries wolf on eight correct files
 * gets muted, which is how the original two survived.
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');

const WORKFLOWS = path.join(__dirname, '..', '.github', 'workflows');

/** Workflow -> triggers its own header claims are off. Name-pinned. */
const CLAIMS = {
  'jules-pr-reviewer.yml': ['pull_request'],
  'semgrep.yml': ['pull_request'],
  'recurse-ml.yml': ['pull_request', 'push'],
  'octopus-route.yml': ['issues'],
  'octopus-review-fallback.yml': ['issue_comment'],
};

/** The parsed `on:` mapping. `on` is YAML-truthy, so it can arrive as `true`. */
function triggersOf(file) {
  const doc = yaml.load(fs.readFileSync(file, 'utf8'));
  const on = (doc && (doc.on ?? doc[true])) || {};
  return typeof on === 'string' ? [on] : Array.isArray(on) ? on : Object.keys(on);
}

test('a workflow whose header disables a trigger does not carry that trigger', () => {
  const offenders = [];
  for (const [name, disabled] of Object.entries(CLAIMS)) {
    const file = path.join(WORKFLOWS, name);
    assert.ok(fs.existsSync(file), `${name} is gone — update CLAIMS deliberately.`);
    const live = triggersOf(file);
    for (const trigger of disabled) {
      if (live.includes(trigger)) {
        offenders.push(
          `.github/workflows/${name} says ${trigger} is disabled but still fires on it ` +
            `(live triggers: ${live.join(', ') || 'none'})`,
        );
      }
    }
  }
  assert.deepStrictEqual(
    offenders,
    [],
    'A banner claiming a trigger is off, next to that trigger being on, is worse ' +
      'than no banner: a reader trusts it and it is false.\n  ' + offenders.join('\n  '),
  );
});

test('each of these workflows still has a manual escape hatch', () => {
  // COMMENT-DONT-DELETE only holds if the lane can still be run deliberately.
  // Commenting the last trigger without leaving workflow_dispatch is a delete
  // wearing a comment's clothes.
  const offenders = [];
  for (const name of Object.keys(CLAIMS)) {
    const live = triggersOf(path.join(WORKFLOWS, name));
    if (!live.includes('workflow_dispatch')) {
      offenders.push(`.github/workflows/${name} has no workflow_dispatch (live: ${live.join(', ') || 'none'})`);
    }
  }
  assert.deepStrictEqual(offenders, [], offenders.join('\n  '));
});

test('the COST FREEZE workflows are not caught by this guard', () => {
  // Guards the guard against the false-positive class that would get it muted.
  // Eight workflows carry a COST FREEZE banner that disabled `schedule:` only;
  // their push/pull_request triggers are correct and must stay unflagged.
  const frozen = fs
    .readdirSync(WORKFLOWS)
    .filter((f) => f.endsWith('.yml'))
    .filter((f) => /COST FREEZE 2026-08-21/.test(fs.readFileSync(path.join(WORKFLOWS, f), 'utf8')));

  assert.ok(frozen.length > 0, 'No COST FREEZE workflows found — the freeze banner changed.');
  for (const name of frozen) {
    const live = triggersOf(path.join(WORKFLOWS, name));
    assert.ok(
      !live.includes('schedule'),
      `${name} carries the COST FREEZE banner but still has a schedule: trigger.`,
    );
    if (CLAIMS[name]) continue; // deliberately listed above for another reason
    // Nothing else to assert: their non-schedule triggers are legitimate, and
    // this loop exists to prove the guard leaves them alone.
  }
});
