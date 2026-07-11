'use strict';

// Invariant tests for .github/workflows/devin-reminders.yml (WR #15675).
//
// The Devin Reminders workflow has hard structural requirements that are
// easy to break in a refactor and impossible to catch in review at a glance:
// the storage artifact only works if all four actions live in ONE file, the
// third-party action must stay pinned to a full commit SHA (single-author
// policy, docs/THIRD_PARTY_ACTION_AUDIT.md), and the secret gate is what
// keeps the 30-minute cron from flooding agent-monitor with failures when
// DEVIN_API_KEY is unset. Lock all of that in here.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const yaml = require('yaml');

const WF_PATH = path.join(__dirname, '..', '.github', 'workflows', 'devin-reminders.yml');
const raw = fs.readFileSync(WF_PATH, 'utf8');
const doc = yaml.parse(raw);

test('devin-reminders.yml parses and declares name + triggers', () => {
  assert.ok(doc.name, 'missing name');
  // yaml parses bare `on:` as the boolean key true
  const on = doc.on || doc.true;
  assert.ok(on, 'missing on: trigger');
  assert.ok(on.schedule, 'missing schedule trigger (cron fires due reminders)');
  assert.ok(on.workflow_dispatch, 'missing workflow_dispatch trigger');
  const options = on.workflow_dispatch.inputs.action.options;
  assert.deepStrictEqual(
    [...options].sort(),
    ['cancel', 'cron', 'list', 'put'],
    'dispatch action choice must cover all four reminder operations'
  );
});

test('all four reminder operations live in this single workflow file', () => {
  // Artifact storage (devin-reminders-list) is per-workflow: splitting jobs
  // into other files would silently break reminder persistence.
  const jobs = doc.jobs;
  for (const job of ['list-reminders', 'create-new-reminder', 'cancel-reminders', 'process-reminders-due']) {
    assert.ok(jobs[job], `missing job: ${job}`);
  }
  for (const action of ['list', 'put', 'cancel', 'cron']) {
    assert.ok(raw.includes(`action: '${action}'`), `missing reminder action: ${action}`);
  }
});

test('devin-reminders-action is pinned to a full commit SHA', () => {
  const uses = raw.match(/uses:\s*aaronsteers\/devin-reminders-action@(\S+)/g) || [];
  assert.ok(uses.length >= 4, 'expected the action in all four operation jobs');
  for (const line of uses) {
    const ref = line.split('@')[1];
    assert.match(ref, /^[0-9a-f]{40}$/, `action ref must be a 40-char commit SHA, got: ${ref}`);
  }
});

test('every operation job is gated on the DEVIN_API_KEY secret via the gate job', () => {
  assert.ok(doc.jobs.gate, 'missing gate job');
  for (const job of ['list-reminders', 'create-new-reminder', 'cancel-reminders', 'process-reminders-due']) {
    const j = doc.jobs[job];
    assert.strictEqual(j.needs, 'gate', `${job} must depend on the gate job`);
    assert.ok(
      String(j.if).includes("needs.gate.outputs.has-token == 'true'"),
      `${job} must skip when DEVIN_API_KEY is unset (failure-spam guard)`
    );
  }
});

test('uses the repo-standard DEVIN_API_KEY secret and a concurrency group', () => {
  assert.ok(raw.includes('secrets.DEVIN_API_KEY'), 'must use the repo-standard DEVIN_API_KEY secret');
  assert.ok(!raw.includes('DEVIN_AI_API_KEY'), 'upstream README secret name must be mapped to DEVIN_API_KEY');
  assert.ok(doc.concurrency && doc.concurrency['cancel-in-progress'] === false,
    'needs a non-cancelling concurrency group to serialize reminder mutations');
});

test('no untrusted event fields are interpolated into run: blocks', () => {
  // Workflow-injection guard (CLAUDE.md gotcha #4): dispatch inputs and
  // event payload fields must flow through `with:`/`env:`, never directly
  // into a shell script.
  const runBlocks = raw.split(/\n\s+run:/).slice(1).map(b => b.split('\n\n')[0]);
  for (const block of runBlocks) {
    assert.ok(!/\$\{\{\s*(github\.event|inputs)\./.test(block),
      `run: block interpolates an untrusted expression:\n${block}`);
  }
});
