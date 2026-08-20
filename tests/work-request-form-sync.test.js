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

test('WR workflows accept BASIC WR issue type, work-request label, and title route tags', () => {
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
    assert(workflow.includes("labelSet.has('wr:new') && hasTitleRouteTag"), 'WR workflow must accept title-only wr:new route-tag intake');
    assert(workflow.includes("'basic wr'"), 'WR workflow must accept BASIC WR issue type');
    assert(workflow.includes('hasWrRouteTag'), 'WR workflow must detect title-only route tags');
    assert(workflow.includes('tool|tools'), 'WR workflow must accept #tool title route tags');
    assert(workflow.includes('app|apps'), 'WR workflow must accept #app title route tags');
    assert(
      workflow.includes('hasTitleRouteTag') &&
        workflow.includes('#(?:app|apps|tool|tools'),
      'WR workflow must accept title route tags'
    );
    assert(workflow.includes('#(app|web-app|tool|tools|pdf|docs?|documentation|api|cli|mcp|video|skill|skills|website)'),
      'WR workflow must accept title route tags like #app/#tools');
    // 2026-07-08: was pinned to `titleHasRouteTags`, an identifier that only
    // existed in a mangled duplicate block; the surviving extended-alias tier
    // is named `hasRouteTag`.
    assert(workflow.includes('const hasRouteTag ='), 'WR workflow must accept title-only route tags');
    assert(workflow.includes("'weekly-research'"), 'WR workflow must apply weekly-research label');
    assert(workflow.includes("'deep-research'"), 'WR workflow must apply deep-research label');
    assert(workflow.includes("'openrouter'"), 'WR workflow must apply openrouter label');
    assert(workflow.includes("'role:orchestrator'"), 'WR workflow must apply role:orchestrator label');
  }
});

test('WR auto-classify accepts title signals and infers output type from route tags', () => {
  const wf = fs.readFileSync(path.join(REPO_ROOT, '.github', 'workflows', 'wr-auto-classify.yml'), 'utf8');
  assert(
    wf.includes("contains(github.event.issue.labels.*.name, 'weekly-research')"),
    'wr-auto-classify must accept weekly-research label'
  );
  assert(
    wf.includes("startsWith(github.event.issue.title, '[WR]')"),
    'wr-auto-classify must accept [WR] title prefix'
  );
  assert(
    wf.includes("contains(format(' {0} ', github.event.issue.title), ' #app ')"),
    'wr-auto-classify must accept #app title route tags'
  );
  assert(
    wf.includes("contains(format(' {0} ', github.event.issue.title), ' #tool ')"),
    'wr-auto-classify must accept #tool title route tags'
  );
  assert(
    wf.includes('def infer_output_type_from_title_tags(title):'),
    'wr-auto-classify must infer Output Type from title route tags when the issue body is blank'
  );
});

test('OpenRouter auto-route accepts title-only route tags and infers Output Type from them', () => {
  const wf = fs.readFileSync(path.join(REPO_ROOT, '.github', 'workflows', 'openrouter-auto-route.yml'), 'utf8');
  assert(
    wf.includes("contains(github.event.issue.labels.*.name, 'work-request')"),
    'openrouter-auto-route must accept work-request labels'
  );
  assert(
    wf.includes("contains(format(' {0} ', github.event.issue.title), ' #app ')"),
    'openrouter-auto-route must accept #app title route tags'
  );
  assert(
    wf.includes("contains(format(' {0} ', github.event.issue.title), ' #tool ')"),
    'openrouter-auto-route must accept #tool title route tags'
  );
  assert(
    wf.includes("contains(format(' {0} ', github.event.issue.title), ' #skill ')"),
    'openrouter-auto-route must accept #skill title route tags'
  );
  // `tagMap` inside `inferTitleOutputType`, not `titleTagOutputTypeMap` (#17783).
  // The latter lived only in a dead duplicate stratum of a script that did not
  // parse and had never run.
  assert(
    wf.includes('const tagMap = {') && wf.includes('const inferTitleOutputType ='),
    'openrouter-auto-route must infer Output Type from title route tags when the issue body is blank'
  );
});

// Reconstructed 2026-07-08: this test's assertions were spliced into the one
// above (against the wrong workflow file) by an overlapping merge — the file
// did not parse and the gate sat red. See standards/GREEN_MAIN_STANDARD.md.
test('wr-auto-classify accepts title route tags and infers Output Type', () => {
  const wf = fs.readFileSync(path.join(REPO_ROOT, '.github', 'workflows', 'wr-auto-classify.yml'), 'utf8');
  assert(
    wf.includes("contains(format(' {0} ', github.event.issue.title), ' #app ')") &&
      wf.includes("contains(format(' {0} ', github.event.issue.title), ' #tool ')"),
    'wr-auto-classify must accept title route tags'
  );
  assert(
    wf.includes('TITLE_ROUTE_OUTPUT_TYPES') &&
      wf.includes('title-tag = inferred from a route tag in the issue title'),
    'wr-auto-classify must infer Output Type from title route tags'
  );
});

test('openrouter auto-route accepts WR labels and title route tags', () => {
  const wf = fs.readFileSync(path.join(REPO_ROOT, '.github', 'workflows', 'openrouter-auto-route.yml'), 'utf8');
  assert(
    wf.includes("contains(github.event.issue.labels.*.name, 'weekly-research')") &&
      wf.includes("contains(github.event.issue.labels.*.name, 'work-request')"),
    'openrouter-auto-route must accept WR labels'
  );
  assert(
    wf.includes("contains(format(' {0} ', github.event.issue.title), ' #app ')") &&
      wf.includes("contains(format(' {0} ', github.event.issue.title), ' #tool ')"),
    'openrouter-auto-route must accept title route tags'
  );
  // `inferTitleOutputType`, not `inferOutputTypeFromTitle` — see #17783.
  assert(
    wf.includes("startsWith(github.event.label.name, 'output-type:')") &&
      wf.includes('inferTitleOutputType'),
    'openrouter-auto-route must route from output-type labels or title tags when body is blank'
  );
});

// CONSOLIDATED 2026-07-08 (see standards/GREEN_MAIN_STANDARD.md): this span
// held six+ generations of the same title-route-tag tests, each generation
// spliced into the previous one by overlapping merges until the file no
// longer parsed. The tests below are the survivors, re-verified line by line
// against the CURRENT workflow implementations.

test('weekly-research accepts route-tagged title-only source intake', () => {
  const wf = fs.readFileSync(path.join(REPO_ROOT, '.github', 'workflows', 'weekly-research.yml'), 'utf8');
  assert(
    wf.includes('looksLikeTaggedSourceIntake') &&
      wf.includes('hasSourceUrl'),
    'weekly-research must detect route-tagged source-link intake as WR work'
  );
});

test('OpenRouter auto-route accepts normalized WR labels and output-type fallbacks', () => {
  const wf = fs.readFileSync(
    path.join(REPO_ROOT, '.github', 'workflows', 'openrouter-auto-route.yml'),
    'utf8'
  );

  assert(
    wf.includes("contains(github.event.issue.labels.*.name, 'work-request')"),
    'openrouter-auto-route must run after WR labels are normalized'
  );
  assert(
    wf.includes("contains(github.event.issue.labels.*.name, 'weekly-research')"),
    'openrouter-auto-route must accept weekly-research-labeled issues'
  );
  assert(
    wf.includes("label.startsWith('output-type:')"),
    'openrouter-auto-route must fall back to output-type:* labels'
  );
  assert(
    wf.includes('inferTitleOutputType'),
    'openrouter-auto-route must support title-tag Output Type inference for title-only intake'
  );
});

test('WR workflows infer routing from title tags for title-only intake', () => {
  const weeklyResearch = fs.readFileSync(
    path.join(REPO_ROOT, '.github', 'workflows', 'weekly-research.yml'),
    'utf8'
  );
  const wrPrCreation = fs.readFileSync(
    path.join(REPO_ROOT, '.github', 'workflows', 'wr-pr-creation.yml'),
    'utf8'
  );
  const wrAutoClassify = fs.readFileSync(
    path.join(REPO_ROOT, '.github', 'workflows', 'wr-auto-classify.yml'),
    'utf8'
  );
  const openrouterAutoRoute = fs.readFileSync(
    path.join(REPO_ROOT, '.github', 'workflows', 'openrouter-auto-route.yml'),
    'utf8'
  );

  assert(
    weeklyResearch.includes('const hasRouteTag ='),
    'weekly-research should treat title route tags as WR intake signals'
  );
  assert(
    wrPrCreation.includes('const hasRouteTag ='),
    'wr-pr-creation should treat title route tags as WR intake signals'
  );
  assert(
    wrAutoClassify.includes('infer_output_type_from_title') &&
      wrAutoClassify.includes('Title route tag inferred Output Type'),
    'wr-auto-classify should infer Output Type from title route tags when body is blank'
  );
  // Both strings here named a dead stratum (#17783): the function was
  // `inferOutputTypeFromTitle` and the log line was 'No Output Type section or
  // route tags found'. Neither could ever be reached — the script did not parse.
  assert(
    openrouterAutoRoute.includes('inferTitleOutputType') &&
      openrouterAutoRoute.includes('No Output Type found in issue body, labels, or title tags'),
    'openrouter-auto-route should infer Output Type from title route tags'
  );
});

test('WR auto-classify infers Output Type from title app/tool hints', () => {
  const wf = fs.readFileSync(path.join(REPO_ROOT, '.github', 'workflows', 'wr-auto-classify.yml'), 'utf8');
  assert(
    wf.includes('def infer_output_type_from_title_tags(title):'),
    'wr-auto-classify should infer output type from title hints when Output Type is missing'
  );
  assert(
    wf.includes('title_output_type = infer_output_type_from_title_tags(ISSUE_TITLE)'),
    'wr-auto-classify should compute a title-based Output Type hint'
  );
  assert(
    wf.includes('elif field == "Output Type" and title_output_type in allowed:'),
    'wr-auto-classify should use the title Output Type hint before fallback defaults'
  );
  assert(
    wf.includes('title-tag = inferred from a route tag in the issue title'),
    'wr-auto-classify should document title-tag as a classification source'
  );
});


test('Title route tags act as WR intake and Output Type signals for title-only issues', () => {
  const weeklyResearch = fs.readFileSync(
    path.join(REPO_ROOT, '.github', 'workflows', 'weekly-research.yml'),
    'utf8'
  );
  const autoClassify = fs.readFileSync(
    path.join(REPO_ROOT, '.github', 'workflows', 'wr-auto-classify.yml'),
    'utf8'
  );
  const autoRoute = fs.readFileSync(
    path.join(REPO_ROOT, '.github', 'workflows', 'openrouter-auto-route.yml'),
    'utf8'
  );

  assert(
    weeklyResearch.includes('const hasTitleRouteTag =') &&
      weeklyResearch.includes('#(?:app|apps|tool|tools'),
    'weekly-research must recognize #app/#tool title tags as WR intake signals'
  );
  // The trigger uses word-boundary matching — format(' {0} ', title) — so a
  // route tag only counts as a whole word. (A bare contains(title, '#app')
  // variant existed only in the mangled duplicate blocks removed 2026-07-08.)
  assert(
    autoClassify.includes("contains(format(' {0} ', github.event.issue.title), ' #app ')") &&
      autoClassify.includes("contains(format(' {0} ', github.event.issue.title), ' #tool ')"),
    'wr-auto-classify must run for title-only route tags'
  );
  assert(
    autoClassify.includes('def infer_output_type_from_title_tags(title):') &&
      autoClassify.includes('TITLE_TAG_OUTPUT_TYPE.get(f"#{tag}")') &&
      autoClassify.includes('"production-app"') &&
      autoClassify.includes('"desktop-tool"'),
    'wr-auto-classify must infer Output Type from #app/#tool title tags when the body is blank'
  );
  // `inferTitleOutputType`, not `inferOutputTypeFromTitle` (#17783). The latter
  // name lived only in the dead duplicate strata: that script had nine
  // concatenated versions of the routing decision and did not parse, so it had
  // never run. This assertion was green throughout — a name being present in
  // the source says nothing about whether the code around it executes.
  // Behaviour is covered by tests/openrouter-auto-route.test.js, which runs the
  // script against stub issues.
  assert(
    autoRoute.includes("contains(github.event.issue.labels.*.name, 'work-request')") &&
      autoRoute.includes("contains(format(' {0} ', github.event.issue.title), ' #app ')") &&
      autoRoute.includes("label.startsWith('output-type:')") &&
      autoRoute.includes('inferTitleOutputType(title)'),
    'openrouter-auto-route must accept title-tag WR intake and route from title/body/output-type label signals'
  );
});

test('WR routing workflows infer Output Type from title route tags', () => {
  const classify = fs.readFileSync(
    path.join(REPO_ROOT, '.github', 'workflows', 'wr-auto-classify.yml'),
    'utf8'
  );
  const route = fs.readFileSync(
    path.join(REPO_ROOT, '.github', 'workflows', 'openrouter-auto-route.yml'),
    'utf8'
  );
  const wrPr = fs.readFileSync(
    path.join(REPO_ROOT, '.github', 'workflows', 'wr-pr-creation.yml'),
    'utf8'
  );

  for (const workflow of [classify, route, wrPr]) {
    assert(workflow.includes('#tool') && workflow.includes('#tools'), 'must recognize #tool/#tools route tags');
    assert(workflow.includes('#app') && workflow.includes('#apps'), 'must recognize #app/#apps route tags');
    assert(
      workflow.includes('desktop-tool') && workflow.includes('production-app'),
      'must map tool/app title tags to canonical Output Type values'
    );
  }
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

  // wr:reset must be stripped after success (one-shot signal)
  assert(
    wrPrCreation.includes("name === 'wr:reset'"),
    'WR PR creation must remove wr:reset label after successful PR generation'
  );

  for (const label of [
    'wr:retrigger-attempts-1',
    'wr:retrigger-attempts-2',
    'wr:retrigger-attempts-3',
    'wr-stuck',
    'wr:reset',
  ]) {
    assertLabelDefinition(labelsYaml, label);
  }
});

test('wr:reset bypasses existing-PR guard and is allowed as a trigger label', () => {
  const wrPrCreation = fs.readFileSync(
    path.join(REPO_ROOT, '.github', 'workflows', 'wr-pr-creation.yml'),
    'utf8'
  );

  // wr:reset must appear in the COMPLETION_LABELS allowlist so labeled events
  // carrying it are not dropped as label noise before the check runs.
  assert(
    wrPrCreation.includes("'wr:reset'") &&
      wrPrCreation.includes('COMPLETION_LABELS'),
    'wr:reset must be included in the COMPLETION_LABELS trigger allowlist'
  );

  // The bypass block must reference wr:reset and the existing-PR variable
  // so operators can force a fresh PR even when a skeleton already exists.
  assert(
    wrPrCreation.includes("labelSet.has('wr:reset')") &&
      wrPrCreation.includes('wr:reset detected'),
    'wr:reset must bypass the existing-PR guard with a clear log message'
  );

  // wr:reset must count as a completion signal so should_create_pr becomes true
  // even when no other completion label is present.
  assert(
    wrPrCreation.includes("labelSet.has('wr:reset')"),
    'wr:reset must be treated as a completion signal in the isComplete check'
  );
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

test('WR PR creation maps current WR output types to ship-to-market labels', () => {
  const wrPrCreation = fs.readFileSync(
    path.join(REPO_ROOT, '.github', 'workflows', 'wr-pr-creation.yml'),
    'utf8'
  );

  const expectedMappings = {
    'production-app': 'deliver:app',
    'desktop-tool': 'deliver:app',
    'sellable-pdf': 'deliver:pdf',
    'technical-documentation': 'deliver:docs',
    'project-management-doc': 'deliver:docs',
    'internal-script-automation': 'deliver:cli',
    'cli-product': 'deliver:cli',
    'mcp-product': 'deliver:mcp',
    'api-product': 'deliver:api',
    'client-code-task': 'deliver:package',
    'invention-flow': 'deliver:docs',
  };

  for (const [outputType, deliverLabel] of Object.entries(expectedMappings)) {
    assert(
      wrPrCreation.includes(`'${outputType}': '${deliverLabel}'`),
      `WR PR creation must map ${outputType} to ${deliverLabel}`
    );
  }
  // 2026-07-08: the surviving title-tag fallback helper is named
  // `inferTitleOutputType` (the `inferOutputTypeFromTitle` arrow variant
  // lived only in the mangled duplicate blocks that were removed).
  assert(
    wrPrCreation.includes('const inferTitleOutputType = (title) => {') &&
      wrPrCreation.includes("inferTitleOutputType(issue.title || '')"),
    'WR PR creation must fall back to title route tags for deliver label inference'
  );
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
    'sellable_artifact_bundle',
    'purchase_validation',
    'blocker_rule',
  ]) {
    assert(!requiredFlagFromTemplate(tmpl, id), `${id} should be optional`);
  }
});

test('Work Request heavy template exposes sellable-artifact bundle and purchase validation fields', () => {
  const active = fs.readFileSync(
    path.join(REPO_ROOT, '.github', 'ISSUE_TEMPLATE', '00-work-request.yml'),
    'utf8'
  );

  // Explodable sellable ZIP delivery shape (unpacks into repo folders).
  assert(
    dropdownOptionsFromTemplate(active, 'delivery_shape').includes(
      'Explodable sellable ZIP (unpacks into repo folders)'
    ),
    'Delivery Shape must offer the explodable sellable ZIP option'
  );

  // Sellable Artifact Bundle field for the ZIP contents (files/prompts/skills/etc.).
  assert(
    active.includes('id: sellable_artifact_bundle') &&
      active.includes('label: Sellable Artifact Bundle'),
    'heavy WR template must expose a Sellable Artifact Bundle field'
  );

  // Purchase Validation field to rigorously prove it functions as purchased.
  assert(
    active.includes('id: purchase_validation') &&
      active.includes('label: Purchase Validation (functions-as-purchased)'),
    'heavy WR template must expose a Purchase Validation field'
  );

  // wr-preprocess must keep these canonical fields in sync so Jules parses them.
  const preprocess = fs.readFileSync(
    path.join(REPO_ROOT, 'scripts', 'wr-preprocess.js'),
    'utf8'
  );
  assert(
    preprocess.includes('"Sellable Artifact Bundle"') &&
      preprocess.includes('"Purchase Validation"'),
    'scripts/wr-preprocess.js CANONICAL_WR_FIELDS must include the new sellable-artifact fields'
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
