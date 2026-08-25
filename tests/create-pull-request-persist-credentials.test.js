'use strict';

// actions/checkout writes the job token into `http.extraheader` as an
// `AUTHORIZATION: basic` header. peter-evans/create-pull-request then supplies
// its own Authorization header, git sends both, and GitHub answers:
//
//   remote: Duplicate header: "Authorization"
//   fatal: ... The requested URL returned error: 400
//
// The job fails *after* the expensive work is done — in openrouter-coder that
// meant a paid OpenRouter call succeeded and its output was discarded.
// `persist-credentials: false` on the checkout is the documented fix.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');

const WORKFLOW_DIR = path.join(__dirname, '..', '.github', 'workflows');
const CPR = 'peter-evans/create-pull-request';

function stepsOf(job) {
  return Array.isArray(job && job.steps) ? job.steps : [];
}

function usesCreatePullRequest(job) {
  return stepsOf(job).some(s => String((s && s.uses) || '').includes(CPR));
}

function checkoutStepsOf(job) {
  return stepsOf(job).filter(s =>
    String((s && s.uses) || '').startsWith('actions/checkout')
  );
}

test(`every job running ${CPR} checks out with persist-credentials: false`, () => {
  const offenders = [];
  let audited = 0;

  for (const file of fs.readdirSync(WORKFLOW_DIR)) {
    if (!/\.ya?ml$/.test(file)) continue;

    const raw = fs.readFileSync(path.join(WORKFLOW_DIR, file), 'utf8');
    if (!raw.includes(CPR)) continue;

    let doc;
    try {
      doc = yaml.load(raw);
    } catch (err) {
      continue;
    }

    const jobs = (doc && doc.jobs) || {};
    for (const jobName of Object.keys(jobs)) {
      const job = jobs[jobName];
      if (!usesCreatePullRequest(job)) continue;

      const checkouts = checkoutStepsOf(job);
      if (checkouts.length === 0) continue;

      audited++;
      const persist =
        checkouts[0].with && checkouts[0].with['persist-credentials'];
      if (persist !== false) {
        offenders.push(`${file} -> job "${jobName}"`);
      }
    }
  }

  // CLAUDE.md rule 9: a guard that audits nothing is decoration. If the
  // detection above drifts, fail loudly rather than reporting a clean pass.
  assert.ok(audited > 0, 'guard audited no jobs — detection has drifted');
  assert.deepStrictEqual(
    offenders,
    [],
    `These jobs run ${CPR} but leave the checkout credential in place, so git ` +
      `sends a duplicate Authorization header and fails with 400:\n  ` +
      offenders.join('\n  ')
  );
});
