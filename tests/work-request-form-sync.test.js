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

function requiredFlagFromTemplate(content, id) {
  const marker = `id: ${id}`;
  const start = content.indexOf(marker);
  if (start < 0) {
    throw new Error(`field id "${id}" not found in template`);
  }
  const slice = content.slice(start);
  const match = slice.match(/\n\s{4}validations:\n\s{6}required:\s*(true|false)\b/);
  if (!match) {
    throw new Error(`required validation flag not found for "${id}"`);
  }
  return match[1] === 'true';
}

function labelsFromTemplate(content) {
  const start = content.indexOf('\nlabels:\n');
  if (start < 0) {
    throw new Error('labels block not found in template');
  }

  const lines = content.slice(start + '\nlabels:\n'.length).split(/\r?\n/);
  const labels = [];
  for (const line of lines) {
    const match = line.match(/^\s{2}-\s+(.+)$/);
    if (match) {
      labels.push(match[1].trim().replace(/^['"]|['"]$/g, ''));
      continue;
    }
    if (line.trim()) break;
  }
  return labels;
}

function assertLabelDefinition(labelsYaml, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`- name: (?:"${escaped}"|'${escaped}'|${escaped})\\n`);
  assert(pattern.test(labelsYaml), `.github/labels.yml missing canonical label definition for "${label}"`);
}

test('active Work Request templates stay in sync with portable template copies', () => {
  const pairs = [
    ['00-work-request.yml', '00-work-request.yml'],
    ['10-openhands-system-wr.yml', '10-openhands-system-wr.yml'],
  ];

  for (const [activeName, portableName] of pairs) {
    const active = fs.readFileSync(
      path.join(REPO_ROOT, '.github', 'ISSUE_TEMPLATE', activeName),
      'utf8'
    );
    const portable = fs.readFileSync(
      path.join(REPO_ROOT, 'templates', 'issue-template', portableName),
      'utf8'
    );
    assert(active === portable, `${activeName} must match templates/issue-template/${portableName}`);
  }
});

test('Work Request templates apply canonical WR routing labels', () => {
  const primary = fs.readFileSync(
    path.join(REPO_ROOT, '.github', 'ISSUE_TEMPLATE', '00-work-request.yml'),
    'utf8'
  );
  const quick = fs.readFileSync(
    path.join(REPO_ROOT, '.github', 'ISSUE_TEMPLATE', '10-openhands-system-wr.yml'),
    'utf8'
  );
  const labelsYaml = fs.readFileSync(path.join(REPO_ROOT, '.github', 'labels.yml'), 'utf8');

  const canonicalWrLabels = [
    'work-request',
    'weekly-research',
    'wr:in-progress',
    'deep-research',
    'openrouter',
    'role:orchestrator',
  ];

  for (const label of canonicalWrLabels) {
    assert(labelsFromTemplate(primary).includes(label), `primary WR template missing ${label}`);
    assert(labelsFromTemplate(quick).includes(label), `quick WR template missing ${label}`);
    assertLabelDefinition(labelsYaml, label);
  }

  for (const label of ['quick', 'OpenHands']) {
    assert(labelsFromTemplate(quick).includes(label), `quick WR template missing ${label}`);
    assertLabelDefinition(labelsYaml, label);
  }
});

test('WR templates allow title-only intake for orchestrator-filled routing', () => {
  const templates = [
    fs.readFileSync(
      path.join(REPO_ROOT, '.github', 'ISSUE_TEMPLATE', '00-work-request.yml'),
      'utf8'
    ),
    fs.readFileSync(
      path.join(REPO_ROOT, '.github', 'ISSUE_TEMPLATE', '10-openhands-system-wr.yml'),
      'utf8'
    ),
  ];

  for (const template of templates) {
    assert(
      template.includes('Title-only intake is allowed.'),
      'WR template must document title-only intake'
    );
    // 2026-05-21 (Claude): title-only intake allows the orchestrator to fill the
    // rest, but Output Type stays required (you must declare what to build).
    // So at most one field — output_type — may be required; no other body field.
    const requiredCount = (template.match(/required:\s*true/g) || []).length;
    assert(
      requiredCount <= 1,
      'WR templates must not require body fields beyond Output Type'
    );
    if (requiredCount === 1) {
      assert(
        requiredFlagFromTemplate(template, 'output_type'),
        'the only required WR field may be output_type'
      );
    }
  }
});

test('WR workflows accept BASIC WR issue type and work-request label', () => {
  const wrPrCreation = fs.readFileSync(
    path.join(REPO_ROOT, '.github', 'workflows', 'wr-pr-creation.yml'),
    'utf8'
  );
  const weeklyResearch = fs.readFileSync(
    path.join(REPO_ROOT, '.github', 'workflows', 'weekly-research.yml'),
    'utf8'
  );

  for (const workflow of [wrPrCreation, weeklyResearch]) {
    assert(workflow.includes("labelSet.has('work-request')"), 'WR workflow must accept work-request label');
    assert(workflow.includes("'basic wr'"), 'WR workflow must accept BASIC WR issue type');
    assert(workflow.includes("'weekly-research'"), 'WR workflow must apply weekly-research label');
    assert(workflow.includes("'deep-research'"), 'WR workflow must apply deep-research label');
    assert(workflow.includes("'openrouter'"), 'WR workflow must apply openrouter label');
    assert(workflow.includes("'role:orchestrator'"), 'WR workflow must apply role:orchestrator label');
  }
});

test('WR auto-classify accepts title and weekly-research signals when blank WR labels lag', () => {
  const wf = fs.readFileSync(path.join(REPO_ROOT, '.github', 'workflows', 'wr-auto-classify.yml'), 'utf8');
  assert(
    wf.includes("contains(github.event.issue.labels.*.name, 'weekly-research')"),
    'wr-auto-classify must accept weekly-research label'
  );
  assert(
    wf.includes("startsWith(github.event.issue.title, '[WR]')"),
    'wr-auto-classify must accept [WR] title prefix'
  );
});

test('WR PR creation waits for research completion and ignores PR comments', () => {
  const wrPrCreation = fs.readFileSync(
    path.join(REPO_ROOT, '.github', 'workflows', 'wr-pr-creation.yml'),
    'utf8'
  );

  assert(
    wrPrCreation.includes("!(github.event_name == 'issue_comment' &&"),
    'WR PR creation must negate pull-request issue_comment events at the workflow gate'
  );
  assert(
    wrPrCreation.includes("github.event.issue.pull_request"),
    'WR PR creation must ignore pull-request issue_comment events'
  );
  assert(
    wrPrCreation.includes("labelSet.has('research:complete')"),
    'WR PR creation must treat research:complete as a creation signal'
  );
  assert(
    wrPrCreation.includes("commentBody.includes('Research packet:')"),
    'WR PR creation must treat research packet comments as research-ready signals'
  );
});

test('WR PR creation mirrors deep research labels onto the generated PR', () => {
  const wrPrCreation = fs.readFileSync(
    path.join(REPO_ROOT, '.github', 'workflows', 'wr-pr-creation.yml'),
    'utf8'
  );

  assert(
    wrPrCreation.includes("label === 'deep-research'"),
    'Generated WR PRs must inherit the deep-research label'
  );
  assert(
    wrPrCreation.includes("label.startsWith('research:')"),
    'Generated WR PRs must inherit research lane labels'
  );
});

test('WR PR creation uses an existing template and clears recovered stuck labels', () => {
  const wrPrCreation = fs.readFileSync(
    path.join(REPO_ROOT, '.github', 'workflows', 'wr-pr-creation.yml'),
    'utf8'
  );
  const labelsYaml = fs.readFileSync(path.join(REPO_ROOT, '.github', 'labels.yml'), 'utf8');

  assert(
    fs.statSync(path.join(REPO_ROOT, 'wr', 'WR_TEMPLATE_FULL.md')).isFile(),
    'Canonical full WR template must exist'
  );
  assert(
    wrPrCreation.includes('wr/WR_TEMPLATE_FULL.md') &&
      wrPrCreation.includes('wr/WR_TEMPLATE_BASIC.md'),
    'WR PR creation must use existing WR template paths'
  );
  assert(
    wrPrCreation.includes('ISSUE_BODY: ${{ needs.detect-completion.outputs.issue_body }}'),
    'WR PR creation must pass the issue body into document generation'
  );
  assert(
    wrPrCreation.includes("name.startsWith('wr:retrigger-attempts-')") &&
      wrPrCreation.includes("name === 'lifecycle:stuck'") &&
      wrPrCreation.includes("name === 'wr-stuck'"),
    'WR PR creation must clear auto-healer stuck labels after a PR is created'
  );

  for (const label of [
    'wr:retrigger-attempts-1',
    'wr:retrigger-attempts-2',
    'wr:retrigger-attempts-3',
    'wr-stuck',
  ]) {
    assertLabelDefinition(labelsYaml, label);
  }
});

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
    /if\s+final\.get\("Output Type"\)\s*==\s*"sellable-pdf"\s*:\s*\n\s*pdf_batch_raw\s*=\s*parse_form_section\(/.test(wf),
    'wr-auto-classify should only parse PDF pipeline batch for sellable-pdf requests'
  );
  assert(
    /if\s+final\.get\("Output Type"\)\s*==\s*"sellable-pdf"\s+and\s+pdf_batch_raw\s*:/.test(wf),
    'wr-auto-classify should only evaluate PDF pipeline batch values for sellable-pdf requests'
  );
  assert(
    fs.existsSync(path.join(REPO_ROOT, 'workflows', 'PDF_WR_PLAYBOOK.md')),
    'workflows/PDF_WR_PLAYBOOK.md missing'
  );
});

test('Work Request heavy template keeps only Output Type required', () => {
  const tmplPath = path.join(REPO_ROOT, '.github', 'ISSUE_TEMPLATE', '00-work-request.yml');
  const tmpl = fs.readFileSync(tmplPath, 'utf8');

  assert(requiredFlagFromTemplate(tmpl, 'output_type'), 'output_type should remain required');

  for (const id of [
    'pdf_pipeline_batch',
    'research_mode',
    'delivery_mode',
    'lifecycle_mode',
    'commercial_mode',
    'summary',
    'objective',
    'required_bundle',
    'definition_of_done',
    'do_not_under_scope',
    'delivery_shape',
    'blocker_rule',
  ]) {
    assert(!requiredFlagFromTemplate(tmpl, id), `${id} should be optional`);
  }
});

test('PDF_WR_PLAYBOOK links AUTOMATED_PRODUCT_PIPELINE and PDF shape', () => {
  const pb = fs.readFileSync(path.join(REPO_ROOT, 'workflows', 'PDF_WR_PLAYBOOK.md'), 'utf8');
  assert(pb.includes('AUTOMATED_PRODUCT_PIPELINE.md'), 'playbook should reference pipeline standard');
  assert(pb.includes('standards/shapes/PDF.md'), 'playbook should reference PDF shape');
});

if (failed > 0) {
  process.exit(1);
}
