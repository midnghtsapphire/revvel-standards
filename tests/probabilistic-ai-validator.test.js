'use strict';

/**
 * WR-16972 — Probabilistic AI response validation (Python-CUDA layer).
 *
 * Grounding gate: the validator's offline --self-test must pass. Deterministic,
 * no network, no API keys — same pattern as tests/wr-4600-harvest.test.js.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const VALIDATOR = path.join(
  ROOT,
  'scripts',
  'python_cuda',
  'probabilistic_validator.py'
);
const README = path.join(ROOT, 'scripts', 'python_cuda', 'README.md');
const INIT = path.join(ROOT, 'scripts', 'python_cuda', '__init__.py');
const SKILL = path.join(
  ROOT,
  'skills',
  'probabilistic-orchestration',
  'SKILL.md'
);

test('python_cuda package files exist', () => {
  assert.ok(fs.existsSync(VALIDATOR), 'probabilistic_validator.py missing');
  assert.ok(fs.existsSync(INIT), '__init__.py missing');
  assert.ok(fs.existsSync(README), 'README.md missing');
});

test('probabilistic_validator.py --self-test passes (pure-function contract)', () => {
  const py = process.env.PYTHON || 'python3';
  let out;
  try {
    out = execFileSync(py, [VALIDATOR, '--self-test'], {
      encoding: 'utf8',
      cwd: ROOT,
      timeout: 30_000,
    });
  } catch (err) {
    assert.fail(
      'probabilistic_validator self-test failed:\n' +
        (err.stdout || '') +
        (err.stderr || '')
    );
  }
  assert.match(
    out,
    /probabilistic_validator self-test: (\d+)\/\1 passed/,
    out
  );
});

test('CLI validates well-formed JSON against a schema', () => {
  const py = process.env.PYTHON || 'python3';
  const schema = JSON.stringify({
    type: 'object',
    required: ['price', 'in_stock'],
    properties: {
      price: { type: 'number', minimum: 0 },
      in_stock: { type: 'boolean' },
    },
  });
  const out = execFileSync(
    py,
    [
      VALIDATOR,
      '--validate-json',
      '{"price": 12.5, "in_stock": true}',
      '--schema-json',
      schema,
    ],
    { encoding: 'utf8', cwd: ROOT, timeout: 15_000 }
  );
  const payload = JSON.parse(out);
  assert.equal(payload.ok, true);
  assert.equal(payload.data.price, 12.5);
  assert.equal(payload.data.in_stock, true);
});

test('CLI rejects type-mismatched AI output (probabilistic failure path)', () => {
  const py = process.env.PYTHON || 'python3';
  const schema = JSON.stringify({
    type: 'object',
    required: ['price', 'in_stock'],
    properties: {
      price: { type: 'number' },
      in_stock: { type: 'boolean' },
    },
  });
  let exitCode = 0;
  let stdout = '';
  let stderr = '';
  try {
    stdout = execFileSync(
      py,
      [
        VALIDATOR,
        '--validate-json',
        '{"price": "forty-five dollars", "in_stock": "yes"}',
        '--schema-json',
        schema,
      ],
      { encoding: 'utf8', cwd: ROOT, timeout: 15_000 }
    );
  } catch (err) {
    exitCode = err.status;
    // Parse JSON from stdout only — stderr is diagnostics, not payload.
    stdout = err.stdout || '';
    stderr = err.stderr || '';
  }
  assert.equal(
    exitCode,
    2,
    `expected exit 2 on schema failure, got ${exitCode}: stdout=${stdout} stderr=${stderr}`
  );
  const payload = JSON.parse(stdout);
  assert.equal(payload.ok, false);
  assert.ok(payload.errors.length >= 1);
});

test('skill docs point at the Python-CUDA implementation', () => {
  const skill = fs.readFileSync(SKILL, 'utf8');
  assert.match(skill, /python_cuda|probabilistic_validator/);
  const readme = fs.readFileSync(README, 'utf8');
  assert.match(readme, /Defensive prompting|Self-correction|Graceful degradation/i);
  assert.match(readme, /WR-16972|#16972/);
});
