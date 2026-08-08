'use strict';

/**
 * Regression tests for WR #15861 — Terraform Lint Action integration.
 * Ensures the workflow stays wired to ShubhamTatvamasi/terraform-lint-action@v1
 * (SHA-pinned), installs Terraform first, and fails closed on lint errors.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const WORKFLOW = path.join(ROOT, '.github', 'workflows', 'terraform-lint.yml');
const SAMPLE_TF = path.join(ROOT, 'infrastructure', 'terraform', 'main.tf');
const PRODUCT_PKG = path.join(ROOT, 'products', 'terraform-lint-guard', 'package.json');

const ACTION_SHA = '7f0d5124b29cf2b76e2c87964e35329aa8900f67';
const ACTION_REPO = 'ShubhamTatvamasi/terraform-lint-action';

test('terraform-lint workflow file exists', () => {
  assert.ok(fs.existsSync(WORKFLOW), 'missing .github/workflows/terraform-lint.yml');
});

test('workflow declares name, triggers, and read permissions', () => {
  const yml = fs.readFileSync(WORKFLOW, 'utf8');
  assert.match(yml, /^name:\s*Terraform Lint\s*$/m);
  assert.match(yml, /^on:\s*$/m);
  assert.match(yml, /pull_request:/);
  assert.match(yml, /branches:\s*\[main\]/);
  assert.match(yml, /permissions:\s*\n\s*contents:\s*read/m);
  assert.doesNotMatch(yml, /continue-on-error:\s*true/, 'lint gate must fail closed');
});

test('workflow path-filters Terraform sources', () => {
  const yml = fs.readFileSync(WORKFLOW, 'utf8');
  assert.match(yml, /\*\*\/\*\.tf/);
  assert.match(yml, /\*\*\/\*\.tfvars/);
  assert.match(yml, /\*\*\/\*\.hcl/);
});

test('workflow installs Terraform before the lint action', () => {
  const yml = fs.readFileSync(WORKFLOW, 'utf8');
  assert.match(yml, /hashicorp\/setup-terraform@/);
  assert.match(yml, /terraform_wrapper:\s*false/);
  // Compare uses: lines only — comments may mention the action earlier.
  const usesLines = yml
    .split('\n')
    .map((line, i) => ({ line, i }))
    .filter(({ line }) => /^\s*uses:\s*\S+/.test(line));
  const setup = usesLines.find(({ line }) => line.includes('hashicorp/setup-terraform@'));
  const lint = usesLines.find(({ line }) => line.includes(`${ACTION_REPO}@`));
  assert.ok(setup, 'setup-terraform uses: line must be present');
  assert.ok(lint, 'lint action uses: line must be present');
  assert.ok(setup.i < lint.i, 'setup-terraform must run before the lint action');
});

test('lint action is SHA-pinned to tag v1', () => {
  const yml = fs.readFileSync(WORKFLOW, 'utf8');
  const re = new RegExp(
    `uses:\\s*${ACTION_REPO.replace(/\//g, '\\/')}@([0-9a-f]{40})\\s*#\\s*v1`
  );
  const m = yml.match(re);
  assert.ok(m, 'expected SHA-pinned uses: line with # v1 comment');
  assert.equal(m[1], ACTION_SHA, 'pin must match published v1 tag commit');
  // Floating tag without SHA must not appear as the sole ref
  assert.doesNotMatch(
    yml,
    new RegExp(`uses:\\s*${ACTION_REPO.replace(/\//g, '\\/')}@v1\\s*$`, 'm')
  );
});

test('sample Terraform module exists and is non-empty', () => {
  assert.ok(fs.existsSync(SAMPLE_TF), 'infrastructure/terraform/main.tf must exist');
  const body = fs.readFileSync(SAMPLE_TF, 'utf8');
  assert.ok(body.includes('terraform {'), 'sample must declare a terraform block');
  assert.ok(!/\t/.test(body), 'sample must not contain tabs');
  assert.ok(
    body.split('\n').every((line) => !/[ \t]+$/.test(line)),
    'sample must not have trailing whitespace'
  );
});

test('product package and tests ship with the bundle', () => {
  assert.ok(fs.existsSync(PRODUCT_PKG), 'products/terraform-lint-guard/package.json');
  const pkg = JSON.parse(fs.readFileSync(PRODUCT_PKG, 'utf8'));
  assert.equal(pkg.name, 'terraform-lint-guard');
  assert.match(pkg.scripts.dev, /3012/);
  assert.ok(
    fs.existsSync(path.join(ROOT, 'products', 'terraform-lint-guard', 'tests', 'lint.test.ts'))
  );
  assert.ok(
    fs.existsSync(path.join(ROOT, 'docs', 'terraform-lint-guard', 'index.html')),
    'live hub page required under docs/terraform-lint-guard/'
  );
});
