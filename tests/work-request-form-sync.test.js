#!/usr/bin/env node
'use strict';

/**
 * Keeps Work Request issue template dropdowns aligned with wr-auto-classify
 * allowed values so QA / contractors do not see spurious doc-vs-automation drift.
 *
 * Pure fs + regex — no npm deps required for this file.
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`PASS: ${name}`);
    passed++;
  } catch (e) {
    console.log(`FAIL: ${name}\n    ${e.stack || e.message}`);
    failed++;
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'assertion failed');
}

function sortedEq(a, b, label) {
  const as = [...a].sort();
  const bs = [...b].sort();
  assert(
    JSON.stringify(as) === JSON.stringify(bs),
    `${label}: expected ${JSON.stringify(bs)}, got ${JSON.stringify(as)}`
  );
}

/**
 * Parse GitHub issue form YAML dropdown options for a given field id.
 * Indentation-stable (does not rely on a single giant regex).
 */
function dropdownOptionsFromTemplate(content, id) {
  const marker = `id: ${id}`;
  const start = content.indexOf(marker);
  if (start < 0) {
    throw new Error(`dropdown id "${id}" not found in Work Request template`);
  }
  const slice = content.slice(start);
  const optHead = slice.indexOf('\n      options:');
  if (optHead < 0) {
    throw new Error(`"options:" block not found after id "${id}"`);
  }
  const afterOpts = slice.slice(optHead + '\n      options:'.length);
  const lines = afterOpts.split(/\r?\n/);
  const opts = [];
  for (const line of lines) {
    const om = line.match(/^\s{8}-\s+(.+)$/);
    if (om) {
      opts.push(om[1].trim());
      continue;
    }
    if (/^\s{4}validations:/.test(line)) break;
    if (/^\s{4}\w/.test(line) && !line.includes('-')) break;
  }
  if (opts.length === 0) {
    throw new Error(`No options parsed for id "${id}"`);
  }
  return opts;
}

test('Work Request Output Type options match wr-auto-classify DROPDOWN_FIELDS', () => {
  const tmplPath = path.join(REPO_ROOT, '.github', 'ISSUE_TEMPLATE', '00-work-request.yml');
  const tmpl = fs.readFileSync(tmplPath, 'utf8');
  const templateOpts = dropdownOptionsFromTemplate(tmpl, 'output_type');

  const wfPath = path.join(REPO_ROOT, '.github', 'workflows', 'wr-auto-classify.yml');
  const wf = fs.readFileSync(wfPath, 'utf8');
  const m = wf.match(/"Output Type":\s*\[([\s\S]*?)\]\s*,\s*\n\s*"Research Mode":/);
  assert(m, 'Could not extract Output Type list from wr-auto-classify.yml');
  const inner = m[1];
  const classifyOpts = [...inner.matchAll(/"([^"]+)"/g)].map((x) => x[1]);

  sortedEq(templateOpts, classifyOpts, 'Output Type option mismatch');
});

test('PDF pipeline batch dropdown exists with expected options', () => {
  const tmplPath = path.join(REPO_ROOT, '.github', 'ISSUE_TEMPLATE', '00-work-request.yml');
  const tmpl = fs.readFileSync(tmplPath, 'utf8');
  assert(tmpl.includes('id: pdf_pipeline_batch'), 'pdf_pipeline_batch id missing');
  const opts = dropdownOptionsFromTemplate(tmpl, 'pdf_pipeline_batch');
  sortedEq(opts, ['Autocreate 20', 'Autocreate 3', 'Not applicable'], 'PDF pipeline batch options');

  const wf = fs.readFileSync(path.join(REPO_ROOT, '.github', 'workflows', 'wr-auto-classify.yml'), 'utf8');
  assert(
    wf.includes('"Not applicable", "Autocreate 3", "Autocreate 20"'),
    'wr-auto-classify playbook guard missing pdf_batch_allowed set'
  );
  assert(
    fs.existsSync(path.join(REPO_ROOT, 'workflows', 'PDF_WR_PLAYBOOK.md')),
    'workflows/PDF_WR_PLAYBOOK.md missing'
  );
});

test('PDF_WR_PLAYBOOK links AUTOMATED_PRODUCT_PIPELINE and PDF shape', () => {
  const pb = fs.readFileSync(path.join(REPO_ROOT, 'workflows', 'PDF_WR_PLAYBOOK.md'), 'utf8');
  assert(pb.includes('AUTOMATED_PRODUCT_PIPELINE.md'), 'playbook should reference pipeline standard');
  assert(pb.includes('standards/shapes/PDF.md'), 'playbook should reference PDF shape');
});

if (failed > 0) {
  process.exit(1);
}
