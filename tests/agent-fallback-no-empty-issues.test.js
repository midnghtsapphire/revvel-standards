#!/usr/bin/env node
'use strict';

// A monitoring issue with every field blank is not a record of anything.
//
// `agent-fallback.yml` files a `[AUTO-FALLBACK]` issue when OpenRouter fails
// over to another agent. Thirteen of them accumulated looking like this:
//
//   title: [AUTO-FALLBACK] OpenRouter →  (#)
//   body:  OpenRouter was unavailable or failed. Automatically failed over to .
//          **Original task:** #
//          **Agent used:**
//          **Success:**
//          No action required — fallback is working as designed.
//
// Every interpolation was empty, and the body told the reader there was
// nothing to do. They were nonetheless open, permanent, and labelled p1.
//
// The cause was the step condition:
//
//   if: steps.result.outputs.agent != 'openrouter' && ... != 'none'
//
// which excludes the two known non-fallback values and nothing else — so an
// EMPTY agent satisfies both halves and the step runs with no data. The guard
// enumerated what to skip instead of requiring what it needed.
//
// Both the condition and the script body are pinned below, because either
// alone leaves the other free to regress.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');

const WORKFLOW = path.join(__dirname, '..', '.github/workflows/agent-fallback.yml');

function fileIssueStep() {
  const doc = yaml.load(fs.readFileSync(WORKFLOW, 'utf8'));
  for (const job of Object.values(doc.jobs || {})) {
    const step = (job.steps || []).find((s) => /create fallback event issue/i.test(s.name || ''));
    if (step) return step;
  }
  throw new Error('the fallback-issue step must exist');
}

/** Run the step's inline script with mocks. Returns what it tried to create. */
function runScript(script, env) {
  const created = [];
  const warnings = [];
  const summary = [];
  const github = { rest: { issues: { create: async (args) => { created.push(args); return { data: {} }; } } } };
  const core = {
    warning: (m) => warnings.push(String(m)),
    info() {},
    summary: { addRaw(t) { summary.push(String(t)); return this; }, write() { return Promise.resolve(); } },
  };
  const context = { repo: { owner: 'o', repo: 'r' } };
  const body = `return (async () => {\n${script}\n})();`;
  // eslint-disable-next-line no-new-func
  const fn = new Function('github', 'context', 'core', 'process', body);
  return fn(github, context, core, { env }).then(() => ({ created, warnings, summary }));
}

test('the step condition requires an agent, not merely a non-matching one', () => {
  const cond = String(fileIssueStep().if);
  assert.match(
    cond.replace(/\s+/g, ' '),
    /outputs\.agent\s*!=\s*''/,
    "the condition must reject an empty agent — excluding only 'openrouter' and " +
      "'none' lets an empty string through, which is how 13 blank issues were filed"
  );
});

test('an empty agent files nothing and says so', async () => {
  const script = fileIssueStep().with.script;
  const { created, warnings } = await runScript(script, {
    AGENT: '', ORIGINAL_ISSUE: '', TASK_SUCCESS: '',
  });

  assert.deepEqual(created, [], 'no issue may be filed without an agent');
  assert.equal(warnings.length, 1, 'the skipped event must still be visible in the run log');
  assert.match(warnings[0], /not filing/i);
});

test('whitespace-only metadata counts as empty', async () => {
  // `${{ }}` interpolation of a missing output can yield blanks rather than a
  // truly empty string; a check on falsiness alone would let that through.
  const script = fileIssueStep().with.script;
  const { created } = await runScript(script, {
    AGENT: '   ', ORIGINAL_ISSUE: '  ', TASK_SUCCESS: '',
  });
  assert.deepEqual(created, [], 'blank-padded metadata is still no metadata');
});

test('a missing issue number alone is enough to refuse', async () => {
  const script = fileIssueStep().with.script;
  const { created } = await runScript(script, {
    AGENT: 'openhands', ORIGINAL_ISSUE: '', TASK_SUCCESS: 'true',
  });
  assert.deepEqual(created, [], 'an issue that cannot name the task it describes is not worth filing');
});

test('a real fallback event still files a populated issue', async () => {
  // The inverse. A guard that refused everything would pass every test above
  // while silently disabling the monitoring this workflow exists to provide.
  const script = fileIssueStep().with.script;
  const { created } = await runScript(script, {
    AGENT: 'openhands', ORIGINAL_ISSUE: '4242', TASK_SUCCESS: 'true',
  });

  assert.equal(created.length, 1, 'a genuine fallback event must still be recorded');
  const issue = created[0];
  assert.match(issue.title, /\[AUTO-FALLBACK\] OpenRouter → Openhands \(#4242\)/);
  assert.doesNotMatch(issue.title, /→\s+\(#\)/, 'the title must never render with empty slots');
  assert.match(issue.body, /\*\*Agent used:\*\* openhands/);
  assert.match(issue.body, /\*\*Original task:\*\* #4242/);
});
