'use strict';

// Tests for the daily diagnostic audit cron:
// scripts/daily-diagnostic-audit.js + .github/workflows/daily-diagnostic-audit.yml
// See standards/AUDIT_AND_SELF_HEALING_PLAYBOOK.md for the methodology this
// script grounds its diagnostic prompt in.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const yaml = require('yaml');

const REPO_ROOT = path.join(__dirname, '..');
const workflowPath = path.join(REPO_ROOT, '.github', 'workflows', 'daily-diagnostic-audit.yml');

const {
  parseGitLogNameOnly,
  filterInScope,
  buildSystemPrompt,
  buildUserPrompt,
  parseDiagnosticResponse,
  isActionableDiagnosis,
  renderWrTitle,
  renderWrBody,
  renderCoderComment,
  loadPlaybookContext,
  loadDiagnosticModels,
  LEARNINGS_PLACEHOLDER,
  SCOPE_GLOBS,
  WR_LABELS,
  WR_ASSIGNEES,
} = require('../scripts/daily-diagnostic-audit.js');

// ── scope selection (pure parts) ────────────────────────────────────────────

test('parseGitLogNameOnly dedupes and strips blank lines from git log output', () => {
  const raw = [
    '',
    'scripts/foo.js',
    '.github/workflows/bar.yml',
    '',
    'scripts/foo.js', // duplicate across two commits
    '  ', // whitespace-only line
    'README.md',
    '',
  ].join('\n');

  const result = parseGitLogNameOnly(raw);
  assert.deepStrictEqual(result, ['scripts/foo.js', '.github/workflows/bar.yml', 'README.md']);
});

test('parseGitLogNameOnly handles empty/undefined input', () => {
  assert.deepStrictEqual(parseGitLogNameOnly(''), []);
  assert.deepStrictEqual(parseGitLogNameOnly(null), []);
  assert.deepStrictEqual(parseGitLogNameOnly(undefined), []);
});

test('filterInScope keeps only .github/workflows/*.yml and scripts/*.js', () => {
  const files = [
    'scripts/foo.js',
    '.github/workflows/bar.yml',
    'README.md',
    'docs/SYSTEM_MAP.md',
    'wr/WR_TEMPLATE_BASIC.md',
    'scripts/nested/baz.js', // not directly under scripts/ — still matches startsWith
    '.github/workflows/nested/qux.yml',
    'scripts/foo.ts', // wrong extension
    '.github/actions/foo/action.yml', // wrong dir
  ];
  const result = filterInScope(files);
  assert.deepStrictEqual(result, [
    'scripts/foo.js',
    '.github/workflows/bar.yml',
    'scripts/nested/baz.js',
    '.github/workflows/nested/qux.yml',
  ]);
});

test('SCOPE_GLOBS only covers workflow YAML and scripts JS (bounded blast radius)', () => {
  assert.deepStrictEqual(SCOPE_GLOBS, [
    { dir: '.github/workflows/', ext: '.yml' },
    { dir: 'scripts/', ext: '.js' },
  ]);
});

// ── prompt construction ─────────────────────────────────────────────────────

test('buildSystemPrompt embeds the playbook context and demands JSON-only output', () => {
  const prompt = buildSystemPrompt('CATALOG-MARKER-XYZ');
  assert.match(prompt, /CATALOG-MARKER-XYZ/);
  assert.match(prompt, /issueFound/);
  assert.match(prompt, /proposedFix/);
  assert.match(prompt, /confidence/);
  assert.match(prompt, /No clear fix/);
  assert.match(prompt, /invent a file, line, or behavior/i);
});

test('buildSystemPrompt instructs the model not to manufacture issues', () => {
  const prompt = buildSystemPrompt('x');
  assert.match(prompt, /do not manufacture an issue/i);
});

test('buildUserPrompt lists in-scope files and embeds their content', () => {
  const scopeFiles = [
    { path: 'scripts/foo.js', content: 'console.log("hi");' },
    { path: '.github/workflows/bar.yml', content: 'name: bar' },
  ];
  const prompt = buildUserPrompt(scopeFiles, { sinceHours: 48 });
  assert.match(prompt, /last 48 hours/);
  assert.match(prompt, /scripts\/foo\.js/);
  assert.match(prompt, /console\.log\("hi"\);/);
  assert.match(prompt, /\.github\/workflows\/bar\.yml/);
});

test('buildUserPrompt truncates when the overall prompt budget is exceeded', () => {
  const bigContent = 'x'.repeat(1000);
  const scopeFiles = Array.from({ length: 50 }, (_, i) => ({
    path: `scripts/file${i}.js`,
    content: bigContent,
  }));
  const prompt = buildUserPrompt(scopeFiles, { sinceHours: 48, maxPromptChars: 2000 });
  assert.ok(prompt.length < 6000, 'prompt should be bounded, not include all 50 files verbatim');
  assert.match(prompt, /remaining files omitted/);
});

// ── response parsing/validation ─────────────────────────────────────────────

test('parseDiagnosticResponse parses a clean JSON object', () => {
  const text = JSON.stringify({
    issueFound: true,
    file: 'scripts/foo.js',
    line: '42',
    patternCategory: 'missing allowError',
    diagnosis: 'foo() has no try/catch around the API call',
    proposedFix: 'wrap the call in try/catch',
    confidence: 'high',
    reasoning: 'crashes the whole sweep on one transient error',
  });
  const result = parseDiagnosticResponse(text);
  assert.strictEqual(result.valid, true);
  assert.strictEqual(result.diagnosis.issueFound, true);
  assert.strictEqual(result.diagnosis.file, 'scripts/foo.js');
  assert.strictEqual(result.diagnosis.confidence, 'high');
});

test('parseDiagnosticResponse strips a ```json fence', () => {
  const text = '```json\n' + JSON.stringify({ issueFound: false }) + '\n```';
  const result = parseDiagnosticResponse(text);
  assert.strictEqual(result.valid, true);
  assert.strictEqual(result.diagnosis.issueFound, false);
});

test('parseDiagnosticResponse rejects unparseable text', () => {
  const result = parseDiagnosticResponse('not json at all');
  assert.strictEqual(result.valid, false);
  assert.match(result.error, /unparseable/);
});

test('parseDiagnosticResponse rejects empty response', () => {
  assert.strictEqual(parseDiagnosticResponse('').valid, false);
  assert.strictEqual(parseDiagnosticResponse(null).valid, false);
});

test('parseDiagnosticResponse rejects a response missing issueFound', () => {
  const result = parseDiagnosticResponse(JSON.stringify({ diagnosis: 'x' }));
  assert.strictEqual(result.valid, false);
  assert.match(result.error, /issueFound/);
});

test('parseDiagnosticResponse normalizes an invalid confidence value to "low"', () => {
  const result = parseDiagnosticResponse(JSON.stringify({ issueFound: true, confidence: 'extremely sure' }));
  assert.strictEqual(result.valid, true);
  assert.strictEqual(result.diagnosis.confidence, 'low');
});

// ── actionability gate ──────────────────────────────────────────────────────

test('isActionableDiagnosis requires issueFound + medium/high confidence + non-empty diagnosis', () => {
  assert.strictEqual(
    isActionableDiagnosis({ issueFound: true, confidence: 'high', diagnosis: 'real bug' }),
    true,
  );
  assert.strictEqual(
    isActionableDiagnosis({ issueFound: true, confidence: 'medium', diagnosis: 'real bug' }),
    true,
  );
});

test('isActionableDiagnosis rejects issueFound=false', () => {
  assert.strictEqual(
    isActionableDiagnosis({ issueFound: false, confidence: 'high', diagnosis: 'x' }),
    false,
  );
});

test('isActionableDiagnosis rejects low confidence (a wrong fix is worse than none)', () => {
  assert.strictEqual(
    isActionableDiagnosis({ issueFound: true, confidence: 'low', diagnosis: 'x' }),
    false,
  );
});

test('isActionableDiagnosis rejects an empty diagnosis string', () => {
  assert.strictEqual(
    isActionableDiagnosis({ issueFound: true, confidence: 'high', diagnosis: '   ' }),
    false,
  );
  assert.strictEqual(isActionableDiagnosis(null), false);
});

// ── WR rendering ─────────────────────────────────────────────────────────────

function sampleDiagnosis(overrides = {}) {
  return {
    issueFound: true,
    file: 'scripts/example.js',
    line: '10',
    patternCategory: 'missing allowError',
    diagnosis: 'example() has no try/catch around a network call',
    proposedFix: 'wrap the call in try/catch and log a warning on failure',
    confidence: 'high',
    reasoning: 'a single transient failure crashes the whole sweep',
    ...overrides,
  };
}

test('renderWrTitle includes the diagnosis summary and file', () => {
  const title = renderWrTitle(sampleDiagnosis());
  assert.match(title, /^\[WR\] Daily Diagnostic Audit:/);
  assert.match(title, /scripts\/example\.js/);
});

test('renderWrBody substitutes every {TOKEN} in WR_TEMPLATE_BASIC.md', () => {
  const template = fs.readFileSync(path.join(REPO_ROOT, 'wr', 'WR_TEMPLATE_BASIC.md'), 'utf8');
  const body = renderWrBody({
    template,
    diagnosis: sampleDiagnosis(),
    scopeFiles: ['scripts/example.js'],
    sinceHours: 48,
    repoFull: 'midnghtsapphire/revvel-standards',
    repoUrl: 'https://github.com/midnghtsapphire/revvel-standards',
    today: '2026-07-13',
    runUrl: 'https://github.com/midnghtsapphire/revvel-standards/actions/runs/123',
  });
  assert.doesNotMatch(body, /\{[A-Z_]+\}/, 'no raw {TOKEN} should remain');
  assert.match(body, /## Proposed Fix/);
  assert.match(body, /example\(\) has no try\/catch/);
  assert.match(body, /wrap the call in try\/catch/);
  assert.match(body, /Machine-generated starting point/);
});

test('renderWrBody appends Learnings section when the template lacks the placeholder', () => {
  const templateWithoutLearnings = [
    '# WR: {TITLE}',
    '## Issue Context',
    '{ISSUE_BODY}',
    '## Summary',
    '{SUMMARY}',
    '## Objective',
    '{OBJECTIVE}',
    '## Required Bundle',
    '{REQUIRED_BUNDLE}',
    '## Definition of Done',
    '{DEFINITION_OF_DONE}',
    '## Validation',
    '{VALIDATION}',
    '## Blockers',
    '{BLOCKERS}',
  ].join('\n\n');

  const body = renderWrBody({
    template: templateWithoutLearnings,
    diagnosis: sampleDiagnosis(),
    scopeFiles: ['scripts/example.js'],
    sinceHours: 48,
    repoFull: 'midnghtsapphire/revvel-standards',
    repoUrl: 'https://github.com/midnghtsapphire/revvel-standards',
    today: '2026-07-13',
    runUrl: 'https://example.test/run/1',
  });

  assert.match(body, /## Learnings — What & Why/);
  assert.match(body, /AUDIT_AND_SELF_HEALING_PLAYBOOK\.md/);
  assert.match(body, /verify the proposed fix/i);
});

test('renderWrBody substitutes the real Learnings placeholder when the template has it', () => {
  const templateWithLearnings = [
    '# WR: {TITLE}',
    '## Issue Context',
    '{ISSUE_BODY}',
    '## Summary',
    '{SUMMARY}',
    '## Objective',
    '{OBJECTIVE}',
    '## Required Bundle',
    '{REQUIRED_BUNDLE}',
    '## Definition of Done',
    '{DEFINITION_OF_DONE}',
    '## Validation',
    '{VALIDATION}',
    '## Blockers',
    '{BLOCKERS}',
    '## Learnings — What & Why',
    LEARNINGS_PLACEHOLDER,
  ].join('\n\n');

  const body = renderWrBody({
    template: templateWithLearnings,
    diagnosis: sampleDiagnosis(),
    scopeFiles: ['scripts/example.js'],
    sinceHours: 48,
    repoFull: 'midnghtsapphire/revvel-standards',
    repoUrl: 'https://github.com/midnghtsapphire/revvel-standards',
    today: '2026-07-13',
    runUrl: 'https://example.test/run/1',
  });

  assert.doesNotMatch(body, new RegExp(LEARNINGS_PLACEHOLDER.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  // Should appear exactly once (substituted, not duplicated by the append fallback).
  const occurrences = (body.match(/## Learnings — What & Why/g) || []).length;
  assert.strictEqual(occurrences, 1);
});

test('renderCoderComment addresses the implementing agent and references Proposed Fix', () => {
  const comment = renderCoderComment();
  assert.match(comment, /For the implementing agent/);
  assert.match(comment, /Proposed Fix/);
  assert.match(comment, /Learnings — What & Why/);
  assert.match(comment, /don't apply blindly/i);
});

// ── playbook grounding ───────────────────────────────────────────────────────

test('loadPlaybookContext returns non-empty content whether or not the live playbook file exists', () => {
  const context = loadPlaybookContext();
  assert.ok(typeof context === 'string' && context.length > 0);
  assert.match(context, /Self-Healing Correction Pattern Catalog|Pattern Catalog/);
});

// ── model routing ────────────────────────────────────────────────────────────

test('loadDiagnosticModels resolves the review profile from agent-models.yml', () => {
  const models = loadDiagnosticModels();
  assert.ok(Array.isArray(models) && models.length >= 1);
  const config = yaml.parse(fs.readFileSync(path.join(REPO_ROOT, '.github', 'agent-models.yml'), 'utf8'));
  assert.strictEqual(models[0], config.profiles.review.primary);
});

// ── WR metadata ──────────────────────────────────────────────────────────────

test('WR_LABELS and WR_ASSIGNEES match the constraints in the originating WR', () => {
  assert.deepStrictEqual(WR_LABELS, ['work-request', 'auto-diagnosed']);
  assert.deepStrictEqual(WR_ASSIGNEES, ['oaudrey']);
});

test('auto-diagnosed label is registered in .github/labels.yml', () => {
  const labelsDoc = yaml.parse(fs.readFileSync(path.join(REPO_ROOT, '.github', 'labels.yml'), 'utf8'));
  const found = labelsDoc.labels.find((l) => l.name === 'auto-diagnosed');
  assert.ok(found, 'auto-diagnosed label must be defined in .github/labels.yml');
  assert.ok(found.axis, 'auto-diagnosed label must carry an axis');
});

// ── workflow wiring ──────────────────────────────────────────────────────────

test('workflow has schedule + workflow_dispatch triggers and narrow permissions', () => {
  const workflow = yaml.parse(fs.readFileSync(workflowPath, 'utf8'));
  const triggers = workflow.on || workflow[true]; // yaml parses bare `on:` as boolean true
  // COST FREEZE 2026-08-21: the schedule is commented out in the workflow,
  // preserved in place (RVS-AGENT-001) rather than deleted. ~496 scheduled
  // runs/day across 46 workflows drove the Actions bill on a repo with no
  // product traffic. tests/no-scheduled-workflows.test.js is the guard that
  // keeps it off; this assertion is inverted to match that decision, so a
  // silent re-enable fails here too.
  assert.strictEqual(triggers.schedule, undefined, 'schedule must stay frozen (cost freeze)');
  assert.match(
    fs.readFileSync(workflowPath, 'utf8'),
    /^\s*#\s*schedule:/m,
    'the frozen schedule must remain in the file, commented, so it can be restored',
  );
  assert.ok(triggers.workflow_dispatch !== undefined, 'workflow_dispatch trigger present');
  assert.strictEqual(workflow.permissions.contents, 'read');
  assert.strictEqual(workflow.permissions.issues, 'write');
  assert.strictEqual(workflow.permissions['pull-requests'], undefined, 'must never need PR write — never opens a PR');
});

test('workflow schedule does not collide exactly with self-healing.yml or repo-self-healer.yml', () => {
  const workflow = yaml.parse(fs.readFileSync(workflowPath, 'utf8'));
  const cronExpr = workflow.on?.schedule?.[0]?.cron;
  // Frozen (cost freeze): nothing to collide with. The check still stands for
  // the day the schedule is restored.
  if (cronExpr === undefined) return;

  const selfHealing = yaml.parse(
    fs.readFileSync(path.join(REPO_ROOT, '.github', 'workflows', 'self-healing.yml'), 'utf8'),
  );
  const repoSelfHealer = yaml.parse(
    fs.readFileSync(path.join(REPO_ROOT, '.github', 'workflows', 'repo-self-healer.yml'), 'utf8'),
  );

  // A workflow with no schedule (quiet mode) cannot collide.
  for (const other of [selfHealing, repoSelfHealer]) {
    const cron = other.on?.schedule?.[0]?.cron;
    if (cron !== undefined) assert.notStrictEqual(cronExpr, cron);
  }
});

test('workflow uses the ADMIN_GITHUB_TOKEN-with-fallback pattern (CLAUDE.md gotcha #2)', () => {
  const raw = fs.readFileSync(workflowPath, 'utf8');
  assert.match(raw, /ADMIN_GITHUB_TOKEN\s*!=\s*''\s*&&\s*secrets\.ADMIN_GITHUB_TOKEN\s*\|\|\s*secrets\.GITHUB_TOKEN/);
});

test('workflow checks out with fetch-depth: 0 so the 48h scope scan can see history', () => {
  const workflow = yaml.parse(fs.readFileSync(workflowPath, 'utf8'));
  const steps = workflow.jobs.diagnose.steps;
  const checkoutStep = steps.find((s) => (s.uses || '').startsWith('actions/checkout'));
  assert.ok(checkoutStep, 'checkout step present');
  assert.strictEqual(checkoutStep.with['fetch-depth'], 0);
});

test('workflow has a bounded timeout-minutes', () => {
  const workflow = yaml.parse(fs.readFileSync(workflowPath, 'utf8'));
  assert.ok(typeof workflow.jobs.diagnose['timeout-minutes'] === 'number');
  assert.ok(workflow.jobs.diagnose['timeout-minutes'] <= 30);
});
