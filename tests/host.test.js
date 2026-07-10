'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const yaml = require('yaml');

const REPO_ROOT = path.join(__dirname, '..');
const host = require(path.join(REPO_ROOT, 'scripts', 'host.js'));

const DEVICE_TREE = yaml.parse(fs.readFileSync(path.join(REPO_ROOT, 'config', 'device-tree.yml'), 'utf8'));
const VALID_KINDS = new Set((DEVICE_TREE.kinds || []).map((k) => k.name));

// ── Fixtures ─────────────────────────────────────────────────────────────────

function baseWr(overrides = {}) {
  return {
    wr_number: 15668,
    wr_title: 'feat(cuda) Host + device-tree + agent-contract schema',
    wr_url: 'https://github.com/midnghtsapphire/revvel-standards/issues/15668',
    labels: ['work-request'],
    body: '## Summary\n\nA one-Block WR with no explicit decomposition.',
    generated_at: '2026-07-10T22:00:00.000Z',
    generated_by: 'test',
    ...overrides,
  };
}

const MULTI_BLOCK_BODY = `## Summary

Ship the CUDA execution-model rollout.

## Blocks
- Block 1: Host + Device Tree + Agent Contract Schema
- Block 2: Watchdog + Code Verifier
- Block 3: Memory retrieval + Boot ROM injection
- Block 4: Docs for CUDA model and agent lineup

## Notes
Ignored trailing content.
`;

// ── Tests ────────────────────────────────────────────────────────────────────

test('device-tree.yml roles align with the schema role enum', () => {
  const schema = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'schemas/agent-contract.schema.json'), 'utf8'));
  const roleEnum = new Set(schema.$defs.block.properties.role.enum);
  for (const k of DEVICE_TREE.kinds || []) {
    assert.ok(roleEnum.has(k.role), `device-tree kind ${k.name} has role ${k.role} not in schema enum`);
  }
});

test('decompose: single-Block fallback when body has no ## Blocks section', () => {
  const contract = host.decompose(baseWr());
  assert.strictEqual(contract.contract_version, host.CONTRACT_VERSION);
  assert.strictEqual(contract.grid.wr_number, 15668);
  assert.strictEqual(contract.grid.checkpoint_gated, false);
  assert.strictEqual(contract.blocks.length, 1);
  assert.strictEqual(contract.blocks[0].id, 'block-1');
  assert.strictEqual(contract.blocks[0].threads.length, 1);
  assert.ok(VALID_KINDS.has(contract.blocks[0].threads[0].kind), 'thread kind must exist in device-tree.yml');
});

test('decompose: parses ## Blocks bullets into ordered Blocks', () => {
  const contract = host.decompose(baseWr({ body: MULTI_BLOCK_BODY }));
  assert.strictEqual(contract.blocks.length, 4);
  assert.deepStrictEqual(contract.blocks.map((b) => b.id), ['block-1', 'block-2', 'block-3', 'block-4']);
  // Names preserved
  assert.strictEqual(contract.blocks[0].name, 'Host + Device Tree + Agent Contract Schema');
  assert.strictEqual(contract.blocks[3].name, 'Docs for CUDA model and agent lineup');
});

test('decompose: classifier routes names to the right role/kind', () => {
  const contract = host.decompose(baseWr({ body: MULTI_BLOCK_BODY }));
  const kinds = contract.blocks.map((b) => b.threads[0].kind);
  const roles = contract.blocks.map((b) => b.role);
  // Block 2 mentions "Verifier" -> review lane
  assert.strictEqual(roles[1], 'review');
  assert.strictEqual(kinds[1], 'reviewer');
  // Block 4 mentions "Docs" -> docs lane
  assert.strictEqual(roles[3], 'docs');
  assert.strictEqual(kinds[3], 'doc-writer');
  // Every chosen kind must exist in the device tree
  for (const k of kinds) assert.ok(VALID_KINDS.has(k), `kind ${k} not in device-tree.yml`);
});

test('decompose: checkpoint-gated label sets flag AND wires depends_on chain', () => {
  const contract = host.decompose(baseWr({
    body: MULTI_BLOCK_BODY,
    labels: ['work-request', 'checkpoint-gated'],
  }));
  assert.strictEqual(contract.grid.checkpoint_gated, true);
  assert.deepStrictEqual(contract.blocks[0].depends_on, []);
  assert.deepStrictEqual(contract.blocks[1].depends_on, ['block-1']);
  assert.deepStrictEqual(contract.blocks[2].depends_on, ['block-2']);
  assert.deepStrictEqual(contract.blocks[3].depends_on, ['block-3']);
});

test('decompose: un-gated WR does NOT emit depends_on chain', () => {
  const contract = host.decompose(baseWr({ body: MULTI_BLOCK_BODY }));
  assert.strictEqual(contract.grid.checkpoint_gated, false);
  for (const b of contract.blocks) assert.deepStrictEqual(b.depends_on, []);
});

test('decompose: high-stakes and owner-review-per-block labels also enable gating', () => {
  const c1 = host.decompose(baseWr({ body: MULTI_BLOCK_BODY, labels: ['high-stakes'] }));
  const c2 = host.decompose(baseWr({ body: MULTI_BLOCK_BODY, labels: ['owner-review-per-block'] }));
  assert.strictEqual(c1.grid.checkpoint_gated, true);
  assert.strictEqual(c2.grid.checkpoint_gated, true);
});

test('decompose: phase:* label maps to grid.goal_phase', () => {
  const contract = host.decompose(baseWr({ labels: ['work-request', 'phase:build'] }));
  assert.strictEqual(contract.grid.goal_phase, 'build');
});

test('decompose: rejects malformed input', () => {
  assert.throws(() => host.decompose(null), /must be an object/);
  assert.throws(() => host.decompose({}), /wr_number/);
  assert.throws(() => host.decompose({ wr_number: 1 }), /wr_title/);
});

test('validate: single-Block output validates against schema', () => {
  const contract = host.decompose(baseWr());
  const check = host.validate(contract);
  assert.strictEqual(check.valid, true, JSON.stringify(check.errors));
});

test('validate: multi-Block checkpoint-gated output validates against schema', () => {
  const contract = host.decompose(baseWr({
    body: MULTI_BLOCK_BODY,
    labels: ['work-request', 'checkpoint-gated', 'phase:build'],
  }));
  const check = host.validate(contract);
  assert.strictEqual(check.valid, true, JSON.stringify(check.errors));
});

test('validate: rejects a contract with an unknown role', () => {
  const contract = host.decompose(baseWr());
  contract.blocks[0].role = 'not-a-real-role';
  const check = host.validate(contract);
  assert.strictEqual(check.valid, false);
});

test('validate: rejects a contract without at least one Thread per Block', () => {
  const contract = host.decompose(baseWr());
  contract.blocks[0].threads = [];
  const check = host.validate(contract);
  assert.strictEqual(check.valid, false);
});

test('extractBlockHints: tolerates bold and "of N" suffixes', () => {
  const hints = host.extractBlockHints('## Blocks\n- **Block 1 of 3**: Alpha\n- Block 2/3: Beta\n');
  assert.strictEqual(hints.length, 2);
  assert.deepStrictEqual(hints[0], { index: 1, name: 'Alpha' });
  assert.deepStrictEqual(hints[1], { index: 2, name: 'Beta' });
});

test('classifyBlockName: unknown domain falls through to builder', () => {
  const c = host.classifyBlockName('Something weird');
  assert.strictEqual(c.role, 'build');
  assert.strictEqual(c.kind, 'builder');
});
