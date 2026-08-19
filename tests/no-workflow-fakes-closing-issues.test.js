#!/usr/bin/env node
'use strict';

// A workflow must not claim to close an issue it did not work on.
//
// jules-coding-agent.yml fired on any issue comment containing "/jules", ran
//
//     echo "Running Jules coding agent for issue #..."
//     # Agent logic would go here
//
// then wrote `.jules/issue-N.md` containing a single timestamp line, committed
// it as "chore(jules): stub for #N", opened a PR whose body read "Closes #N",
// and added `wr:pr-open` to the issue. Merging one of those would have
// auto-closed a real issue having changed nothing. It left the branches
// jules/issue-17456, jules/issue-17537 and — from an unguarded empty input —
// jules/issue- on the remote.
//
// It is disabled now (RVS-AGENT-001 stub; real Jules runs live in
// jules-invoke.yml). These guards keep the shape from coming back anywhere,
// because the failure is not specific to that file: any workflow that writes
// `Closes #N` into a PR it opens is asserting completed work, and that
// assertion has to be earned by something.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');

const WF_DIR = path.join(__dirname, '..', '.github/workflows');

function workflows() {
  return fs
    .readdirSync(WF_DIR)
    .filter((f) => /\.ya?ml$/.test(f))
    .map((f) => {
      const raw = fs.readFileSync(path.join(WF_DIR, f), 'utf8');
      let doc = null;
      try {
        doc = yaml.load(raw);
      } catch {
        /* structural validity is covered elsewhere */
      }
      return { file: f, raw, doc };
    });
}

/** A job that can never run cannot open anything. */
function liveJobs(doc) {
  return Object.entries(doc?.jobs || {}).filter(([, job]) => job && job.if !== false);
}

function runSteps(doc) {
  return liveJobs(doc).flatMap(([jobName, job]) =>
    (job.steps || []).map((s) => ({ jobName, name: s.name || '(unnamed)', run: String(s?.run || '') }))
  );
}

test('jules-coding-agent.yml is disabled and cannot fire on a comment', () => {
  const wf = workflows().find((w) => w.file === 'jules-coding-agent.yml');
  assert.ok(wf, 'the file must remain as an RVS-AGENT-001 stub, not be deleted');

  const on = wf.doc?.on ?? wf.doc?.[true];
  assert.ok(
    !on || !Object.prototype.hasOwnProperty.call(on, 'issue_comment'),
    'the issue_comment trigger fired on ANY comment containing "/jules" — it must not return'
  );
  assert.equal(liveJobs(wf.doc).length, 0, 'every job must remain if:false');
  assert.match(wf.raw, /^# REVVEL-DISABLED \|/m, 'must carry the RVS-AGENT-001 header');
});

test('no live workflow step opens a PR body claiming Closes #N from an unguarded input', () => {
  // The specific shape that manufactured tracker state: a PR body asserting it
  // closes an issue, in a step that also does the "work". Legitimate uses of
  // `Closes #` live in PR templates and docs, not in a `gh pr create` body
  // built from a workflow input.
  const offenders = [];
  for (const { file, doc } of workflows()) {
    for (const step of runSteps(doc)) {
      if (!/gh pr create/.test(step.run)) continue;
      if (!/--body[^\n]*Closes #/.test(step.run)) continue;
      offenders.push(`${file} :: ${step.jobName} :: ${step.name}`);
    }
  }

  assert.deepEqual(
    offenders,
    [],
    'these steps open a PR asserting it closes an issue; the assertion must be\n' +
      'earned by a real change, not written by the step that opened the PR:\n' +
      offenders.map((o) => `  ${o}`).join('\n')
  );
});

test('no live workflow commits a placeholder and calls it work', () => {
  // `git add -A` plus a commit message announcing a stub is the tell. This
  // caught the second, duplicate PR path in the same job.
  const offenders = [];
  for (const { file, doc } of workflows()) {
    for (const step of runSteps(doc)) {
      if (/git commit[^\n]*\bstub\b/i.test(step.run)) {
        offenders.push(`${file} :: ${step.jobName} :: ${step.name} (commits a stub)`);
      }
    }
  }

  assert.deepEqual(offenders, [], 'a commit that names itself a stub is not work:\n' + offenders.join('\n'));
});

test('no live workflow builds a git ref from an unguarded issue-number input', () => {
  // `BRANCH="jules/issue-${{ inputs.issue_number }}"` with no guard produced
  // the branch `jules/issue-` when dispatched without an input — the same
  // empty-interpolation defect as the blank [AUTO-FALLBACK] issues (#17710).
  const offenders = [];
  for (const { file, doc, raw } of workflows()) {
    for (const step of runSteps(doc)) {
      // Match through shell indirection, not just direct interpolation. The
      // original wrote `BRANCH="jules/issue-${{ inputs.issue_number }}"` and
      // then used `"$BRANCH"`, so a pattern requiring the interpolation to sit
      // next to `checkout -b` missed the very bug it cites — a guard that
      // cannot catch its own example. Require both facts in the same step
      // instead: an input is interpolated, and the step creates or pushes a ref.
      const usesInput = /\$\{\{\s*inputs\.[A-Za-z_]+\s*\}\}/.test(step.run);
      const makesRef = /git checkout -b|git push[^\n]*origin/.test(step.run);
      if (!usesInput || !makesRef) continue;
      // A guard anywhere in the file that rejects the empty case is enough.
      if (/if:\s*[^\n]*inputs\.[A-Za-z_]+\s*!=\s*''/.test(raw)) continue;
      offenders.push(`${file} :: ${step.jobName} :: ${step.name}`);
    }
  }

  assert.deepEqual(
    offenders,
    [],
    'these steps build a git ref from a workflow input with no non-empty guard,\n' +
      'so a dispatch with no input creates a ref with an empty slot:\n' +
      offenders.map((o) => `  ${o}`).join('\n')
  );
});
