'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const yaml = require('yaml');

const REPO_ROOT = path.join(__dirname, '..');
const filler = require(path.join(REPO_ROOT, 'scripts', 'wr-fill-fields.js'));

// ── Fixtures ─────────────────────────────────────────────────────────────────

const BLANK_WR_BODY = `### Output Type (required)

production-app

### PDF pipeline batch

None

### Research Mode

None

### Delivery Mode

None

### Lifecycle Mode

None

### Commercial Mode

None

### Assign To / Decision Team

None

### Summary

_No response_

### Objective

Wire in the OpenHands PR review GitHub Action so every PR is reviewed automatically. Ship the workflow file plus the required secret name registration.

### Required Bundle

_No response_

### Definition of Done

_No response_

### Do Not Under-Scope

_No response_

### Explicit Exclusions

_No response_

### Delivery Shape

None

### Sellable Artifact Bundle

_No response_

### Purchase Validation (functions-as-purchased)

_No response_

### Expected Scope

_No response_

### Validation Expectations

_No response_

### Blocker Rule

_No response_

### Acknowledgements

- [ ] This WR defines a bundled outcome, not just a minimum acceptable patch.
- [ ] Explicitly requested secondary items should not be silently deferred.
- [ ] If the PR is partial, the blocker must be documented.
- [ ] The PR should reflect the WR's required bundle and definition of done.
- [ ] After implementation, open a PR and continue the loop (reset routing labels / trigger downstream workflows) instead of stopping at the issue.
`;

// ── Tests ────────────────────────────────────────────────────────────────────

test('defaults YAML lists every field from the issue form (source-of-truth alignment)', () => {
  const defs = filler.loadDefaults();
  const form = yaml.parse(fs.readFileSync(path.join(REPO_ROOT, '.github/ISSUE_TEMPLATE/00-work-request.yml'), 'utf8'));
  const formHeadings = form.body
    .filter((b) => ['dropdown', 'input', 'textarea', 'checkboxes'].includes(b.type))
    .map((b) => b.attributes.label);
  const defsHeadings = defs.fields.map((f) => f.heading);
  const missing = formHeadings.filter((h) => !defsHeadings.includes(h));
  const extra = defsHeadings.filter((h) => !formHeadings.includes(h));
  assert.deepStrictEqual(missing, [], `defaults YAML is missing fields present on the form: ${missing.join(', ')}`);
  assert.deepStrictEqual(extra, [], `defaults YAML has fields not on the form: ${extra.join(', ')}`);
});

test('defaults YAML dropdown "allowed" lists match issue-form option lists', () => {
  const defs = filler.loadDefaults();
  const form = yaml.parse(fs.readFileSync(path.join(REPO_ROOT, '.github/ISSUE_TEMPLATE/00-work-request.yml'), 'utf8'));
  for (const b of form.body) {
    if (b.type !== 'dropdown') continue;
    const spec = defs.fields.find((f) => f.heading === b.attributes.label);
    assert.ok(spec, `defaults YAML must define ${b.attributes.label}`);
    assert.deepStrictEqual(spec.allowed, b.attributes.options,
      `allowed list for "${b.attributes.label}" is out of sync with the issue form`);
  }
});

test('isBlank flags _No response_, None, TBD, TODO, empty', () => {
  assert.strictEqual(filler.isBlank('textarea', '_No response_'), true);
  assert.strictEqual(filler.isBlank('dropdown', 'None'), true);
  assert.strictEqual(filler.isBlank('textarea', 'TBD'), true);
  assert.strictEqual(filler.isBlank('textarea', 'TODO'), true);
  assert.strictEqual(filler.isBlank('input', ''), true);
  assert.strictEqual(filler.isBlank('input', '   '), true);
  assert.strictEqual(filler.isBlank('textarea', 'Real content.'), false);
  assert.strictEqual(filler.isBlank('dropdown', 'production-app'), false);
});

test('isBlank treats unticked checkboxes as blank', () => {
  const empty = '- [ ] item one\n- [ ] item two';
  const ticked = '- [x] item one\n- [ ] item two';
  assert.strictEqual(filler.isBlank('checkboxes', empty), true);
  assert.strictEqual(filler.isBlank('checkboxes', ticked), false);
});

test('parseIssueBody rebuilds an ordered field list for the blank WR fixture', () => {
  const fields = filler.parseIssueBody(BLANK_WR_BODY);
  const headings = fields.map((f) => f.heading);
  // Sanity: at least 20 known fields present (all fields from the form)
  assert.ok(headings.length >= 20, `expected at least 20 fields, got ${headings.length}`);
  assert.strictEqual(headings[0], 'Output Type (required)');
  assert.strictEqual(headings[headings.length - 1], 'Acknowledgements');
  // Round-trip: rendering the parsed fields produces content covering every heading.
  const rendered = filler.renderIssueBody(fields);
  for (const h of headings) assert.ok(rendered.includes(`### ${h}`), `render is missing "${h}"`);
});

test('fillDeterministic fills every non-LLM blank field from the fixture', () => {
  const fields = filler.parseIssueBody(BLANK_WR_BODY);
  const result = filler.fillDeterministic({ title: '[WR] wire OpenHands PR review action', fields });

  const bh = (h) => result.filled.find((f) => f.heading === h);
  // Output Type was already set, unchanged
  assert.strictEqual(bh('Output Type (required)').value, 'production-app');
  // PDF pipeline batch: production-app -> "*" branch -> "Not applicable"
  assert.strictEqual(bh('PDF pipeline batch').value, 'Not applicable');
  // Research Mode: production-app -> "deepresearch"
  assert.strictEqual(bh('Research Mode').value, 'deepresearch');
  // Delivery Mode: production-app -> "build-direct"
  assert.strictEqual(bh('Delivery Mode').value, 'build-direct');
  // Lifecycle Mode: derived default new-build
  assert.strictEqual(bh('Lifecycle Mode').value, 'new-build');
  // Commercial Mode: production-app -> "saas-app"
  assert.strictEqual(bh('Commercial Mode').value, 'saas-app');
  // Assign To: always orchestrator
  assert.strictEqual(bh('Assign To / Decision Team').value, 'orchestrator');
  // Summary: derived from title (strips [WR] and leading /coder token)
  assert.strictEqual(bh('Summary').value, 'wire OpenHands PR review action');
  // Delivery Shape: production-app -> One PR preferred...
  assert.strictEqual(bh('Delivery Shape').value, 'One PR preferred, split only if blocked');
  // Sellable Artifact Bundle: production-app -> "N/A — not a sellable artifact ..."
  assert.match(bh('Sellable Artifact Bundle').value, /not a sellable artifact/i);
  // Expected Scope: production-app -> "1 shippable app ..."
  assert.match(bh('Expected Scope').value, /1 shippable app/i);
  // Blocker Rule: always fallback
  assert.match(bh('Blocker Rule').value, /WR-BLOCKER/);
  // Acknowledgements: all ticked
  const ackValue = bh('Acknowledgements').value;
  const tickedCount = (ackValue.match(/-\s*\[x\]/g) || []).length;
  assert.strictEqual(tickedCount, 5, 'all 5 acknowledgement checkboxes should be ticked by default');
});

test('fillDeterministic leaves LLM-refinement fields for the LLM pass', () => {
  const fields = filler.parseIssueBody(BLANK_WR_BODY);
  const result = filler.fillDeterministic({ title: '[WR] wire OpenHands PR review action', fields });
  const llmPending = result.changes.filter((c) => c.source === 'llm-pending').map((c) => c.heading);
  assert.ok(llmPending.includes('Objective') === false, 'Objective was already filled in fixture');
  // Fields whose default_by is llm in the YAML AND blank in fixture:
  for (const h of ['Required Bundle', 'Definition of Done', 'Do Not Under-Scope', 'Explicit Exclusions', 'Validation Expectations']) {
    assert.ok(llmPending.includes(h), `${h} should be pending LLM refinement`);
  }
});

test('fillWithLlm with WR_LLM disabled fills LLM-pending fields from fallback strings', async () => {
  const fields = filler.parseIssueBody(BLANK_WR_BODY);
  const det = filler.fillDeterministic({ title: '[WR] wire OpenHands PR review action', fields });
  const prev = process.env.WR_LLM;
  process.env.WR_LLM = '0';
  try {
    const out = await filler.fillWithLlm({
      title: '[WR] wire OpenHands PR review action',
      fields: det.filled,
      filledMap: det.filledMap,
      log: () => {},
    });
    const bh = (h) => out.filled.find((f) => f.heading === h);
    assert.match(bh('Required Bundle').value, /Implementation code, tests, docs/i);
    assert.match(bh('Definition of Done').value, /npm test/i);
    assert.match(bh('Do Not Under-Scope').value, /explicitly requested/i);
    assert.match(bh('Explicit Exclusions').value, /out of scope/i);
    assert.match(bh('Validation Expectations').value, /workflows:validate/i);
    // Sources should say fallback
    for (const c of out.changes) assert.match(c.source, /fallback/);
  } finally {
    if (prev === undefined) delete process.env.WR_LLM; else process.env.WR_LLM = prev;
  }
});

test('end-to-end fill() (WR_LLM=0) produces a body with no blank markers left', async () => {
  const prev = process.env.WR_LLM;
  process.env.WR_LLM = '0';
  try {
    const result = await filler.fill({
      title: '[WR] wire OpenHands PR review action',
      body: BLANK_WR_BODY,
      log: () => {},
    });
    for (const marker of filler.BLANK_MARKERS) {
      if (!marker) continue;
      assert.ok(!result.body.includes(`\n${marker}\n`), `filled body still contains blank marker "${marker}"`);
    }
    // Every field must appear as a heading in the output.
    const defs = filler.loadDefaults();
    for (const f of defs.fields) {
      assert.ok(result.body.includes(`### ${f.heading}`), `missing heading "${f.heading}"`);
    }
    // Every ack must be ticked.
    assert.match(result.body, /- \[x\] After implementation, open a PR/);
  } finally {
    if (prev === undefined) delete process.env.WR_LLM; else process.env.WR_LLM = prev;
  }
});

test('output_type=sellable-pdf routes PDF batch, delivery shape, and artifact bundle correctly', () => {
  const body = BLANK_WR_BODY.replace('production-app', 'sellable-pdf');
  const fields = filler.parseIssueBody(body);
  const result = filler.fillDeterministic({ title: '[WR] a sellable PDF', fields });
  const bh = (h) => result.filled.find((f) => f.heading === h);
  assert.strictEqual(bh('PDF pipeline batch').value, 'Autocreate 3');
  assert.strictEqual(bh('Commercial Mode').value, 'digital-product');
  assert.strictEqual(bh('Delivery Shape').value, 'Explodable sellable ZIP (unpacks into repo folders)');
  assert.match(bh('Sellable Artifact Bundle').value, /PDF file/i);
  assert.match(bh('Purchase Validation \(functions-as-purchased\)').value, /storefront/i);
});

test('renderIssueBody round-trips through parseIssueBody with the same field set', () => {
  const fields = filler.parseIssueBody(BLANK_WR_BODY);
  const rendered = filler.renderIssueBody(fields);
  const reparsed = filler.parseIssueBody(rendered);
  assert.deepStrictEqual(reparsed.map((f) => f.heading), fields.map((f) => f.heading));
});

test('filled output passes the wr-lint rule 12 forbidden-placeholder scan', async () => {
  const prev = process.env.WR_LLM;
  process.env.WR_LLM = '0';
  try {
    const result = await filler.fill({
      title: '[WR] wire OpenHands PR review action',
      body: BLANK_WR_BODY,
      log: () => {},
    });
    // These are the exact patterns rule 12 forbids
    const forbidden = [
      /\bTBD\b/,
      /\bTODO\b/,
      /_No response_/,
      /N\/A\s*[—-]\s*pending Jules refinement/i,
      /pending refinement/i,
    ];
    for (const re of forbidden) {
      assert.ok(!re.test(result.body), `filled body must not contain ${re}`);
    }
  } finally {
    if (prev === undefined) delete process.env.WR_LLM; else process.env.WR_LLM = prev;
  }
});
