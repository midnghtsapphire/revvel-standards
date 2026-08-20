'use strict';

/**
 * `openrouter-auto-route.yml` must actually run (WR #17783).
 *
 * The step that applies `output-type:` and agent labels to incoming issues had
 * never executed. `actions/github-script` compiles the body before running a
 * line, and the body did not parse:
 *
 *   SyntaxError: Identifier 'title' has already been declared
 *
 * That was the first error JavaScript reported, not the only one. #17783
 * described it as one botched edit leaving a duplicate line. It was nine:
 *
 *   inferOutputTypeFromTitle      declared 4×
 *   inferOutputTypeFromTitleTags  declared 2×
 *   inferTitleOutputType          declared 2×
 *   inferredFromTitle             declared 2×
 *   outputType                    declared 10×
 *
 * plus several `if (...) {` blocks left unterminated where one attempt ran
 * straight into the next. Successive agents each appended a new version of the
 * routing decision without removing the previous one — and because the file
 * never executed, nothing ever contradicted them. A workflow that cannot start
 * cannot disagree with you.
 *
 * The reconstruction keeps the LAST stratum: it is the only one that flows into
 * the routing table below it, it reads all three signal sources, and its tag map
 * is the only one whose outputs all exist as keys in that table.
 *
 * These tests execute the shipped script against stub issues, so what is
 * verified is the routing this workflow really performs.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const yaml = require('yaml');

const WORKFLOW = path.join(__dirname, '..', '.github', 'workflows', 'openrouter-auto-route.yml');

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

/** Run the shipped script against a stub issue; returns the labels it applied. */
async function route(issue) {
  const applied = [];
  const logs = [];
  const github = {
    rest: {
      issues: {
        get: async () => ({ data: issue }),
        addLabels: async ({ labels }) => { applied.push(...labels); },
      },
    },
  };
  const core = {
    info: (m) => logs.push(m),
    warning: (m) => logs.push(`WARN ${m}`),
    notice: (m) => logs.push(m),
    summary: {
      addHeading() { return this; },
      addRaw() { return this; },
      async write() {},
    },
  };
  const context = { repo: { owner: 'o', repo: 'r' }, payload: { issue: { number: issue.number } } };

  // eslint-disable-next-line no-new-func
  const fn = new Function('github', 'core', 'context', `return (async () => {\n${script()}\n})();`);
  await fn(github, core, context);
  return { applied, logs };
}

const issue = (over) => ({ number: 1, title: '[WR] thing', body: '', labels: [], ...over });

test('the script parses — it is compiled before a line of it runs', () => {
  // The whole defect. github-script wraps the body in an async function, so a
  // top-level await is legal; parsing it any other way reports false errors.
  assert.doesNotThrow(() => {
    // eslint-disable-next-line no-new-func
    new Function(`return (async () => {\n${script()}\n})();`);
  });
});

test('the Output Type section in the body is the first signal', async () => {
  const { applied } = await route(issue({ body: '### Output Type\n\nproduction-app\n' }));
  assert.deepEqual(applied, ['swe-fix', 'bito-ai']);
});

test('a mirrored output-type: label is the second signal', async () => {
  const { applied } = await route(
    issue({ body: 'no section', labels: [{ name: 'output-type:sellable-pdf' }] }),
  );
  assert.deepEqual(applied, ['noimosai', 'fix-me', 'bito-ai']);
});

test('a title route tag is the third signal', async () => {
  const { applied } = await route(issue({ title: '[WR] build a thing #api', body: 'no section' }));
  assert.deepEqual(applied, ['swe-fix', 'bito-ai']);
});

test('product-shaped tags win over generic tool tags', async () => {
  // The surviving stratum documents this priority; the earlier ones did not
  // have it, and one of them resolved #tool before #app.
  const { applied } = await route(issue({ title: '[WR] thing #tool #app', body: 'no section' }));
  assert.deepEqual(applied, ['swe-fix', 'bito-ai'], '#app must win over #tool');
});

test('no signal at all routes nothing', async () => {
  const { applied, logs } = await route(issue({ body: 'nothing here' }));
  assert.deepEqual(applied, []);
  assert.match(logs.join('\n'), /skipping route/);
});

test('every output type the tag map can produce exists in the routing table', () => {
  // A tag mapping to a key the table lacks routes to `bito-ai` only — the issue
  // is silently under-routed rather than failing.
  const src = script();
  const tagMap = /const tagMap = \{([\s\S]*?)\};/.exec(src);
  assert.ok(tagMap, 'the tag map must be present');
  const produced = [...tagMap[1].matchAll(/:\s*'([^']+)'/g)].map((m) => m[1]);
  assert.ok(produced.length > 0);

  const table = /const routingTable = \{([\s\S]*?)\};/.exec(src);
  assert.ok(table, 'the routing table must be present');
  const keys = [...table[1].matchAll(/'([^']+)':/g)].map((m) => m[1]);

  const missing = [...new Set(produced)].filter((t) => !keys.includes(t));
  assert.deepEqual(missing, [], `tag map produces types the routing table has no entry for`);
});
