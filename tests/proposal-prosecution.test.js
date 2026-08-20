'use strict';

/**
 * `proposal-prosecution.yml` must run, and must say where the logs are (#17784).
 *
 * Two defects, one of which no parser will ever catch.
 *
 * ## 1. A ternary with no else branch
 *
 *     const issueNumber = context.eventName === 'workflow_dispatch'
 *       ? Number(context.payload.inputs.issue_number)
 *       ? parseInt(context.payload.inputs.issue_number, 10)
 *       : context.payload.issue.number;
 *
 * `A ? B ? C : D` parses as `A ? (B ? C : D)`, so the OUTER conditional never
 * received its `:` branch:
 *
 *     SyntaxError: Unexpected token ';'
 *
 * github-script compiles the body before running a line, so the step aborted
 * every time. The prosecution comment has never been posted. Two versions of
 * the dispatch parse had been left side by side.
 *
 * ## 2. A duplicate `body` key
 *
 *     body: `Proposal prosecution complete. See run: ${runUrl}`,
 *     body: 'Prosecution findings: automated review complete. See workflow logs.',
 *
 * A duplicate key in an object literal is **legal JavaScript** — the second
 * silently wins. No syntax check will ever flag it, which is why it needs its
 * own assertion here. Fixing defect 1 alone would have shipped a comment that
 * says "see workflow logs" without saying where they are, and the run link that
 * was clearly intended would have been dropped silently.
 *
 * That is the whole lesson: a guard that only proves the file parses does not
 * prove the file is right.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const yaml = require('yaml');

const WORKFLOW = path.join(
  __dirname, '..', '.github', 'workflows', 'proposal-prosecution.yml',
);

function script() {
  const doc = yaml.parse(fs.readFileSync(WORKFLOW, 'utf8'));
  const bodies = [];
  for (const job of Object.values(doc.jobs ?? {})) {
    for (const step of job.steps ?? []) {
      if (typeof step?.with?.script === 'string') bodies.push(step.with.script);
    }
  }
  assert.equal(bodies.length, 1, 'expected exactly one github-script step');
  return bodies[0];
}

/** Run the shipped script; returns the comment it posted, or the failure. */
async function run(payload, eventName) {
  let comment = null;
  let failure = null;
  const github = {
    rest: { issues: { createComment: async (args) => { comment = args; } } },
  };
  const core = {
    setFailed: (m) => { failure = m; },
    info() {}, warning() {}, notice() {},
  };
  const context = {
    eventName,
    payload,
    repo: { owner: 'midnghtsapphire', repo: 'revvel-standards' },
    serverUrl: 'https://github.com',
    runId: 12345,
  };
  // eslint-disable-next-line no-new-func
  const fn = new Function('github', 'core', 'context', `return (async () => {\n${script()}\n})();`);
  await fn(github, core, context);
  return { comment, failure };
}

test('the script parses — it is compiled before a line of it runs', () => {
  assert.doesNotThrow(() => {
    // eslint-disable-next-line no-new-func
    new Function(`return (async () => {\n${script()}\n})();`);
  });
});

test('an issue-labelled run comments on that issue', async () => {
  const { comment, failure } = await run({ issue: { number: 42 } }, 'issues');
  assert.equal(failure, null);
  assert.equal(comment.issue_number, 42);
});

test('a workflow_dispatch run parses the issue number from its input', async () => {
  const { comment } = await run({ inputs: { issue_number: '4242' } }, 'workflow_dispatch');
  assert.equal(comment.issue_number, 4242);
});

test('the dispatch input tolerates what people actually type', async () => {
  // '#77' is the case #17794 advertised and never tested: the comment said it
  // was handled, the array said '77abc', and `parseInt('#77', 10)` is NaN — so
  // the guard rejected the input the docs promised. Copilot and Jules both
  // caught it. Every advertised form is now in the list.
  for (const input of ['77', ' 77 ', '#77', ' #77 ', '77abc']) {
    const { comment, failure } = await run({ inputs: { issue_number: input } }, 'workflow_dispatch');
    assert.equal(failure, null, `should not fail on ${JSON.stringify(input)}`);
    assert.equal(comment.issue_number, 77, `input: ${JSON.stringify(input)}`);
  }
});

test('an unusable dispatch input fails loudly instead of posting to /issues/NaN', async () => {
  for (const input of ['', 'not-a-number', undefined]) {
    const { comment, failure } = await run({ inputs: { issue_number: input } }, 'workflow_dispatch');
    assert.equal(comment, null, `should not comment for ${JSON.stringify(input)}`);
    assert.match(String(failure), /Could not resolve an issue number/);
  }
});

test('the comment carries the run URL', async () => {
  // The defect this catches is invisible to every syntax check: the object
  // literal had TWO `body` keys, and the second — which drops the link — wins.
  const { comment } = await run({ issue: { number: 42 } }, 'issues');
  assert.match(
    comment.body,
    /https:\/\/github\.com\/midnghtsapphire\/revvel-standards\/actions\/runs\/12345/,
    'a comment saying "see workflow logs" without linking them is worse than none',
  );
});

test('createComment is passed exactly one body key', () => {
  // Belt and braces on the same defect, read from the source: a second `body`
  // added later would still produce a link-bearing comment in the test above if
  // it happened to be first, so assert the shape as well as the behaviour.
  const src = script();
  const call = /createComment\(\{([\s\S]*?)\}\);/.exec(src);
  assert.ok(call, 'the createComment call must be present');
  const bodyKeys = [...call[1].matchAll(/^\s*body:/gm)];
  assert.equal(bodyKeys.length, 1, 'a duplicate key is legal JS — the last one silently wins');
});
