'use strict';

/**
 * The `uses:` examples in product READMEs must be copy-pasteable.
 *
 * `products/merge-prosecutor/README.md` shipped a usage block that was a
 * keep-both merge of two different examples:
 *
 *     - uses: actions/checkout@11bd719...  # v4.2.2
 *     - uses: midnghtsapphire/revvel-standards/products/merge-prosecutor@main
 *     - uses: actions/checkout@11bd719...  # v4.2.2
 *     - uses: ./products/merge-prosecutor
 *       with:
 *         github-token: ...
 *
 * Two variants — the remote form an outside consumer needs, and the local
 * `./products/...` form that only resolves inside this repo — were both kept,
 * along with both checkouts. The single `with:` block landed on the local
 * variant, so the remote step declared none of the three inputs `action.yml`
 * marks `required: true`.
 *
 * Anyone copying that into their own repo got a workflow that fails twice:
 * the prosecutor step errors on missing required inputs, and the
 * `./products/merge-prosecutor` path does not exist outside revvel-standards.
 * The README is the marketplace-facing doc, so this was the first thing a
 * paying user would try.
 *
 * Nothing caught it, and the gap is instructive:
 *
 *   - `actionlint` and `tests/action-refs-are-resolvable.test.js` read
 *     `.github/workflows` and `.github/actions`. Neither opens a README, so a
 *     broken workflow living inside a fenced block is invisible to both.
 *   - `markdownlint` validates prose and fence structure, not the YAML inside
 *     a fence.
 *   - `merge-prosecutor` itself prosecutes keep-both merges — but it reads the
 *     PR diff, and this landed before the action was wired onto the
 *     default-branch PR path.
 *
 * So the product built to catch keep-both merges shipped one in its own
 * install instructions.
 *
 * Both assertions below derive from `action.yml` rather than from a copy of
 * the expected text: the required-input list is read out of the action at test
 * time, so adding a required input makes a stale README fail here instead of
 * silently disagreeing with it (RVS-VERIFY-001 — the check has to be able to
 * fail for the real reason, not just count to the number it was told).
 *
 * Scope: this validates the shape of the example, not that the pinned SHAs or
 * `@main` refs resolve on GitHub. That is still
 * `workflow-action-ref-audit.yml`'s job and needs the network.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const PRODUCTS = path.join(ROOT, 'products');

/** Fenced ```yaml / ```yml blocks in a markdown file, with start line numbers. */
function yamlBlocks(markdown) {
  const blocks = [];
  const lines = markdown.split('\n');
  let open = null;
  lines.forEach((line, i) => {
    const fence = line.match(/^\s*```\s*(ya?ml)\s*$/i);
    if (fence && !open) {
      open = { startLine: i + 1, body: [] };
      return;
    }
    if (open && /^\s*```\s*$/.test(line)) {
      blocks.push({ startLine: open.startLine, body: open.body.join('\n') });
      open = null;
      return;
    }
    if (open) open.body.push(line);
  });
  return blocks;
}

/**
 * Steps in a fenced workflow example.
 *
 * Line-oriented rather than a real YAML parse: the repo has no yaml parser at
 * the root, and these blocks are simple `- uses:` lists. A step runs from its
 * `- uses:`/`- name:` line until the next list item at the same indent.
 */
function parseSteps(block) {
  const lines = block.split('\n');
  const steps = [];
  let current = null;

  for (const line of lines) {
    const item = line.match(/^(\s*)- (\S.*)$/);
    if (item) {
      const [, indent, rest] = item;
      // A new list item at step indentation closes the previous step. Deeper
      // list items (a `with:` value that is a list) belong to the open step.
      if (current && indent.length <= current.indent) {
        steps.push(current);
        current = null;
      }
      if (!current) {
        current = { indent: indent.length, uses: null, withKeys: [], inWith: false };
        const uses = rest.match(/^uses:\s*(\S+)/);
        if (uses) current.uses = uses[1];
        continue;
      }
    }
    if (!current) continue;

    const uses = line.match(/^\s*uses:\s*(\S+)/);
    if (uses) { current.uses = uses[1]; continue; }
    if (/^\s*with:\s*$/.test(line)) { current.inWith = true; continue; }
    if (current.inWith) {
      const key = line.match(/^\s*([A-Za-z0-9_-]+):/);
      // Any other top-level step key ends the `with:` mapping.
      if (key && /^\s{0,10}(name|uses|run|if|env|id|shell|continue-on-error|timeout-minutes):/.test(line)) {
        current.inWith = false;
      } else if (key) {
        current.withKeys.push(key[1]);
      }
    }
  }
  if (current) steps.push(current);
  return steps;
}

/** Inputs an action declares with `required: true`. */
function requiredInputs(actionYmlPath) {
  const src = fs.readFileSync(actionYmlPath, 'utf8');
  const section = src.match(/^inputs:\n([\s\S]*?)^(?:runs|outputs|branding):/m);
  if (!section) return [];

  const required = [];
  let currentInput = null;
  for (const line of section[1].split('\n')) {
    const name = line.match(/^ {2}([A-Za-z0-9_-]+):\s*$/);
    if (name) { currentInput = name[1]; continue; }
    if (currentInput && /^ {4}required:\s*true\s*$/.test(line)) {
      required.push(currentInput);
      currentInput = null;
    }
  }
  return required;
}

/** Product directories that ship both an action.yml and a README. */
function productActions() {
  if (!fs.existsSync(PRODUCTS)) return [];
  return fs
    .readdirSync(PRODUCTS, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => ({
      name: e.name,
      readme: path.join(PRODUCTS, e.name, 'README.md'),
      actionYml: path.join(PRODUCTS, e.name, 'action.yml'),
    }))
    .filter((p) => fs.existsSync(p.readme) && fs.existsSync(p.actionYml));
}

test('product README examples do not use the same action twice in one job', () => {
  const offences = [];

  for (const product of productActions()) {
    const markdown = fs.readFileSync(product.readme, 'utf8');
    for (const block of yamlBlocks(markdown)) {
      const seen = new Map();
      for (const step of parseSteps(block.body)) {
        if (!step.uses) continue;
        // Compare on the action identity, not the pinned ref: the same action
        // at two different SHAs is the same keep-both mistake.
        const action = step.uses.split('@')[0];
        if (seen.has(action)) {
          offences.push(
            `${path.relative(ROOT, product.readme)}:${block.startLine} uses ${action} twice ` +
            `— a keep-both merge of two examples leaves a duplicate step`
          );
        }
        seen.set(action, true);
      }
    }
  }

  assert.deepEqual(offences, [], `duplicate \`uses:\` in README examples:\n${offences.join('\n')}`);
});

test('product README examples supply every required input of their own action', () => {
  const offences = [];
  const products = productActions();
  assert.ok(products.length > 0, 'expected at least one product with an action.yml and a README');

  for (const product of products) {
    const required = requiredInputs(product.actionYml);
    if (required.length === 0) continue;

    const markdown = fs.readFileSync(product.readme, 'utf8');
    let invocations = 0;

    for (const block of yamlBlocks(markdown)) {
      for (const step of parseSteps(block.body)) {
        if (!step.uses) continue;
        // Both the in-repo form (`./products/x`) and the consumer form
        // (`owner/repo/products/x@ref`) point at this product's action.
        const target = step.uses.split('@')[0].replace(/\/+$/, '');
        if (!new RegExp(`(^\\./|/)products/${product.name}$`).test(target)) continue;

        invocations += 1;
        const missing = required.filter((input) => !step.withKeys.includes(input));
        if (missing.length > 0) {
          offences.push(
            `${path.relative(ROOT, product.readme)}:${block.startLine} \`uses: ${step.uses}\` ` +
            `omits required input(s): ${missing.join(', ')}`
          );
        }
      }
    }

    assert.ok(
      invocations > 0,
      `${path.relative(ROOT, product.readme)} documents no \`uses:\` example for ` +
      `products/${product.name} — the install instructions cannot be validated`
    );
  }

  assert.deepEqual(offences, [], `README examples missing required inputs:\n${offences.join('\n')}`);
});
