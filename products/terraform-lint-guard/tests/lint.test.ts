/**
 * lint.test.ts — unit tests for Terraform Lint Guard fmt heuristics.
 * Run: npm test  (tsx tests/lint.test.ts)
 */

import assert from 'node:assert/strict';
import {
  SAMPLE_BAD_TF,
  SAMPLE_GOOD_TF,
  alignAssignments,
  buildLintCsv,
  buildLintMarkdown,
  lintTerraformSource,
} from '../app/lib/fmt-check';

// ── clean sample passes ─────────────────────────────────────────────────────
{
  const result = lintTerraformSource(SAMPLE_GOOD_TF);
  assert.equal(result.ok, true, 'clean sample must pass');
  assert.equal(result.summary.errors, 0, 'clean sample must have zero errors');
  assert.ok(result.summary.lines > 0, 'clean sample must scan lines');
}

// ── dirty sample fails ──────────────────────────────────────────────────────
{
  const result = lintTerraformSource(SAMPLE_BAD_TF);
  assert.equal(result.ok, false, 'dirty sample must fail');
  assert.ok(result.summary.errors > 0, 'dirty sample must report errors');
  const rules = new Set(result.findings.map((f) => f.rule));
  assert.ok(rules.has('equals-spacing'), 'dirty sample should flag equals-spacing');
}

// ── empty input ─────────────────────────────────────────────────────────────
{
  const result = lintTerraformSource('');
  assert.equal(result.ok, false);
  assert.equal(result.findings[0]?.rule, 'empty-input');
}

// ── tabs and trailing whitespace ────────────────────────────────────────────
{
  const result = lintTerraformSource('variable "x" {\n\ttype = string   \n}\n');
  const rules = result.findings.map((f) => f.rule);
  assert.ok(rules.includes('no-tabs'), 'tabs must be flagged');
  assert.ok(rules.includes('no-trailing-whitespace'), 'trailing whitespace must be flagged');
}

// ── align equals across a block ─────────────────────────────────────────────
{
  const src = ['locals {', '  a = 1', '  longer = 2', '}'].join('\n');
  const result = lintTerraformSource(src);
  assert.ok(
    result.findings.some((f) => f.rule === 'align-equals'),
    'misaligned equals in a block must be flagged'
  );
  const aligned = alignAssignments(src);
  assert.ok(aligned.includes('a      = 1'), `expected aligned key padding, got:\n${aligned}`);
  assert.ok(aligned.includes('longer = 2'), `expected longer key kept, got:\n${aligned}`);
}

// ── apply formattedHint clears equals-spacing ───────────────────────────────
{
  const dirty = 'type=string\n';
  const first = lintTerraformSource(dirty);
  assert.equal(first.ok, false);
  assert.ok(first.formattedHint, 'formattedHint should be provided on failure');
  const second = lintTerraformSource(first.formattedHint!);
  assert.equal(second.summary.errors, 0, 'hint should clear equals-spacing errors');
}

// ── markdown + csv exporters ────────────────────────────────────────────────
{
  const result = lintTerraformSource(SAMPLE_BAD_TF);
  const md = buildLintMarkdown(result, { filename: 'main.tf', checkedAt: '2026-01-01T00:00:00.000Z' });
  assert.ok(md.includes('# Terraform Lint Report'));
  assert.ok(md.includes('main.tf'));
  assert.ok(md.includes('FAIL'));
  const csv = buildLintCsv(result);
  assert.ok(csv.startsWith('line,column,severity,rule,message'));
  assert.ok(csv.split('\n').length > 1);
}

// ── good path exporters ─────────────────────────────────────────────────────
{
  const result = lintTerraformSource(SAMPLE_GOOD_TF);
  const md = buildLintMarkdown(result, { filename: 'ok.tf' });
  assert.ok(md.includes('PASS'));
  assert.ok(md.includes('No formatting issues'));
}

console.log('terraform-lint-guard tests: all passed');
