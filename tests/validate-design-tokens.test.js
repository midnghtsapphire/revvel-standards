'use strict';

// Regression tests for the greenfield UI design-token gate
// (scripts/validate-design-tokens.js). The old workflow step only echoed a
// warning when tokens.json was missing — a green job with a broken token file
// (CLAUDE.md gotcha #6). These tests pin the hard-gate behavior: the committed
// tokens.json must validate, every violation class must be reported, and the
// generated CSS/Tailwind handoff artifacts must round-trip token values.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const {
  validateTokens,
  generateCssVariables,
  generateTailwindTheme,
  REQUIRED_GROUPS,
} = require('../scripts/validate-design-tokens.js');

const ROOT = path.join(__dirname, '..');

function validDoc() {
  return {
    name: 'test-tokens',
    version: '1.0.0',
    tokens: {
      color: {
        'bg-primary': { value: '#090d16', type: 'color' },
        'accent-brand': { value: '#ec4899', type: 'color' },
      },
      spacing: {
        xs: { value: '4px', type: 'dimension' },
        md: { value: '1.5rem', type: 'dimension' },
      },
      radii: {
        sm: { value: '4px', type: 'dimension' },
      },
    },
  };
}

test('committed tokens.json passes validation', () => {
  const doc = JSON.parse(fs.readFileSync(path.join(ROOT, 'tokens.json'), 'utf8'));
  assert.deepEqual(validateTokens(doc), []);
});

test('a well-formed document produces no violations', () => {
  assert.deepEqual(validateTokens(validDoc()), []);
});

test('non-object documents are rejected', () => {
  for (const doc of [null, [], 'tokens', 42]) {
    const errors = validateTokens(doc);
    assert.equal(errors.length, 1, `expected one violation for ${JSON.stringify(doc)}`);
  }
});

test('missing name/version/tokens are each reported', () => {
  const errors = validateTokens({});
  assert.ok(errors.some((e) => e.includes('"name"')), errors.join('; '));
  assert.ok(errors.some((e) => e.includes('"version"')), errors.join('; '));
  assert.ok(errors.some((e) => e.includes('"tokens"')), errors.join('; '));
});

test('every required group must be present and non-empty', () => {
  for (const group of REQUIRED_GROUPS) {
    const missing = validDoc();
    delete missing.tokens[group];
    assert.ok(
      validateTokens(missing).some((e) => e.includes(`"${group}"`)),
      `missing group ${group} must be flagged`
    );

    const empty = validDoc();
    empty.tokens[group] = {};
    assert.ok(
      validateTokens(empty).some((e) => e.includes(`"${group}" must not be empty`)),
      `empty group ${group} must be flagged`
    );
  }
});

test('non-hex color values are rejected', () => {
  const doc = validDoc();
  doc.tokens.color['bg-primary'].value = 'red';
  const errors = validateTokens(doc);
  assert.ok(errors.some((e) => e.includes('not a valid hex color')), errors.join('; '));
});

test('3-, 6-, and 8-digit hex colors are all accepted', () => {
  const doc = validDoc();
  doc.tokens.color['bg-primary'].value = '#abc';
  doc.tokens.color['accent-brand'].value = '#aabbccdd';
  assert.deepEqual(validateTokens(doc), []);
});

test('invalid dimensions are rejected', () => {
  for (const bad of ['4', '4em', '-4px', 'px', '4 px']) {
    const doc = validDoc();
    doc.tokens.spacing.xs.value = bad;
    assert.ok(
      validateTokens(doc).some((e) => e.includes('not a valid px/rem dimension')),
      `dimension "${bad}" must be flagged`
    );
  }
});

test('wrong token types are rejected', () => {
  const doc = validDoc();
  doc.tokens.color['bg-primary'].type = 'dimension';
  doc.tokens.radii.sm.type = 'color';
  const errors = validateTokens(doc);
  assert.ok(errors.some((e) => e.includes('must have type "color"')), errors.join('; '));
  assert.ok(errors.some((e) => e.includes('must have type "dimension"')), errors.join('; '));
});

test('non-kebab-case token names are rejected', () => {
  const doc = validDoc();
  doc.tokens.spacing['Bad Name'] = { value: '4px', type: 'dimension' };
  const errors = validateTokens(doc);
  assert.ok(errors.some((e) => e.includes('kebab-case')), errors.join('; '));
});

test('tokens missing value or type are reported', () => {
  const doc = validDoc();
  doc.tokens.color['bg-primary'] = { type: 'color' };
  doc.tokens.spacing.xs = { value: '4px' };
  doc.tokens.radii.sm = 'not-an-object';
  const errors = validateTokens(doc);
  assert.ok(errors.some((e) => e.includes('missing a string "value"')), errors.join('; '));
  assert.ok(errors.some((e) => e.includes('missing a string "type"')), errors.join('; '));
  assert.ok(errors.some((e) => e.includes('must be an object')), errors.join('; '));
});

test('value and type violations on the same token are both reported', () => {
  const doc = validDoc();
  doc.tokens.color['bg-primary'] = { type: 'dimension' };
  const errors = validateTokens(doc).filter((e) => e.includes('"color.bg-primary"'));
  assert.ok(errors.some((e) => e.includes('missing a string "value"')), errors.join('; '));
  assert.ok(errors.some((e) => e.includes('must have type "color"')), errors.join('; '));
});

test('generateCssVariables emits a namespaced variable for every token', () => {
  const doc = validDoc();
  const css = generateCssVariables(doc);
  assert.ok(css.startsWith('/* Generated from tokens.json'));
  assert.ok(css.includes(':root {'));
  assert.ok(css.includes('--color-bg-primary: #090d16;'));
  assert.ok(css.includes('--spacing-md: 1.5rem;'));
  assert.ok(css.includes('--radii-sm: 4px;'));
});

test('generateTailwindTheme maps groups to Tailwind theme.extend keys', () => {
  const theme = generateTailwindTheme(validDoc());
  assert.equal(theme.theme.extend.colors['bg-primary'], '#090d16');
  assert.equal(theme.theme.extend.spacing.md, '1.5rem');
  assert.equal(theme.theme.extend.borderRadius.sm, '4px');
});

test('ui-audit-logger workflow runs the validator as a hard gate', () => {
  const workflow = fs.readFileSync(
    path.join(ROOT, '.github', 'workflows', 'ui-audit-logger.yml'),
    'utf8'
  );
  assert.ok(
    workflow.includes('node scripts/validate-design-tokens.js'),
    'workflow must invoke scripts/validate-design-tokens.js'
  );
  assert.ok(
    !workflow.includes('Warning: tokens.json missing'),
    'soft echo-only token check must not come back'
  );
});
