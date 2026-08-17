#!/usr/bin/env node
'use strict';

/**
 * Contract tests for the Validate Tableau Format XAI marketplace template.
 * Guards the rollout pattern: parseable workflow, path filters, skip-not-fail
 * when assets are missing, pinned upstream action, and documented example guide.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const YAML = require('yaml');

const root = path.resolve(__dirname, '..');
const templateRel = 'templates/cicd/validate-tableau-format-xai.yml';
const guideRel = 'templates/cicd/tableau/example_style_guide.json';
const docsRel = 'docs/TABLEAU_FORMAT_XAI.md';
const readmeRel = 'templates/cicd/README.md';

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

test('tableau format template exists and parses as a workflow', () => {
  assert.ok(fs.existsSync(path.join(root, templateRel)), `${templateRel} must exist`);
  const doc = YAML.parse(read(templateRel));
  assert.equal(doc.name, 'Validate Tableau Format XAI');
  const on = doc.on || doc.true;
  assert.ok(on.pull_request, 'must trigger on pull_request');
  assert.ok(on.workflow_dispatch, 'must support workflow_dispatch');
  assert.ok(on.push, 'must support path-filtered push');
  assert.ok(doc.jobs?.validate, 'must define validate job');
  assert.equal(doc.jobs.validate['runs-on'], 'ubuntu-latest');
  assert.equal(doc.jobs.validate['timeout-minutes'], 20);
});

test('tableau format template path-filters Tableau assets and style guide', () => {
  const doc = YAML.parse(read(templateRel));
  const on = doc.on || doc.true;
  const prPaths = on.pull_request.paths || [];
  for (const needed of ['**/*.twb', '**/*.tds', 'style_guide/**']) {
    assert.ok(prPaths.includes(needed), `pull_request.paths must include ${needed}`);
  }
  const pushPaths = on.push.paths || [];
  assert.ok(pushPaths.includes('**/*.twb'), 'push.paths must include **/*.twb');
});

test('tableau format template pins upstream action and uploads artifacts', () => {
  const content = read(templateRel);
  const doc = YAML.parse(content);
  const sha40 = '[0-9a-f]{40}';

  assert.match(
    content,
    new RegExp(`uses:\\s*dsmdavid\\/action-test-tableau-format@${sha40}`),
    'must pin dsmdavid/action-test-tableau-format to a full commit SHA'
  );
  assert.match(
    content,
    /action-test-tableau-format@[0-9a-f]{40}\s*#\s*v0\.1\.6/,
    'must annotate the pin with # v0.1.6'
  );
  assert.match(
    content,
    /https:\/\/github\.com\/marketplace\/actions\/validate-tableau-format-xai/,
    'must cite the Marketplace listing'
  );
  assert.match(
    content,
    new RegExp(`uses:\\s*actions\\/checkout@${sha40}`),
    'must pin actions/checkout to a full commit SHA'
  );
  assert.match(
    content,
    new RegExp(`uses:\\s*actions\\/upload-artifact@${sha40}`),
    'must pin actions/upload-artifact to a full commit SHA'
  );

  const steps = doc.jobs.validate.steps || [];
  const validateStep = steps.find((s) => s.name === 'Validate Tableau format');
  assert.ok(validateStep, 'must include Validate Tableau format step');
  assert.match(
    String(validateStep.uses || ''),
    /^dsmdavid\/action-test-tableau-format@[0-9a-f]{40}$/
  );
  assert.equal(
    validateStep.with?.modified_files,
    '${{ steps.files.outputs.list }}'
  );
  assert.equal(
    validateStep.with?.path_to_json,
    '${{ steps.guide.outputs.path }}'
  );

  const upload = steps.find((s) => s.name === 'Upload validation outputs');
  assert.ok(upload, 'must upload validation outputs');
  assert.match(
    String(upload.uses || ''),
    /^actions\/upload-artifact@[0-9a-f]{40}$/
  );
  assert.equal(upload.with?.name, 'tableau-format-xai-outputs');
});

test('tableau format template skips cleanly when guide or files are missing', () => {
  const content = read(templateRel);
  assert.match(content, /::warning::No Tableau style guide found/);
  assert.match(content, /::notice::No Tableau workbook\/datasource files to validate/);
  assert.match(
    content,
    /if:\s*steps\.guide\.outputs\.ready == 'true' && steps\.files\.outputs\.ready == 'true'/
  );
  // Must not hard-fail the whole workflow solely because this standards repo
  // has no .twb assets — ready=false is the skip signal.
  assert.match(content, /echo "ready=false" >> "\$GITHUB_OUTPUT"/);
});

test('example style guide is valid JSON with required style keys', () => {
  assert.ok(fs.existsSync(path.join(root, guideRel)), `${guideRel} must exist`);
  const guide = JSON.parse(read(guideRel));
  for (const key of ['fonts', 'font-sizes', 'font-colors', 'all-colors', 'background-colors']) {
    assert.ok(Array.isArray(guide[key]), `${key} must be an array`);
    assert.ok(guide[key].length > 0, `${key} must not be empty`);
  }
});

test('docs and cicd README inventory the tableau marketplace action', () => {
  const docs = read(docsRel);
  assert.match(docs, /Validate Tableau Format XAI/);
  assert.match(docs, /dsmdavid\/action-test-tableau-format/);
  assert.match(docs, /v0\.1\.6/);
  assert.match(docs, /GitHub stars/i);
  assert.match(docs, /Monetization path/i);
  assert.match(docs, /Marketing \/ SEO keywords/i);
  assert.match(docs, /bcrant\/tableau-style-validator/);

  const readme = read(readmeRel);
  assert.match(readme, /validate-tableau-format-xai\.yml/);
  assert.match(readme, /dsmdavid\/action-test-tableau-format/);
  assert.match(readme, /TABLEAU_FORMAT_XAI\.md/);
});

test('template is not auto-enabled in this repo live workflows', () => {
  // Standards monorepo has no Tableau workbooks; live enablement would only
  // add noise. Downstream product repos copy the template deliberately.
  assert.ok(
    !fs.existsSync(path.join(root, '.github/workflows/validate-tableau-format-xai.yml')),
    'must remain template-only in revvel-standards'
  );
});

test('no ${{ }} template expansion inside run blocks (command injection)', () => {
  // Step outputs interpolated with ${{ }} directly inside `run` execute on the
  // runner — a PR adding a file named `$(cmd).twb` becomes code execution.
  // Outputs must flow through `env:` instead.
  const doc = YAML.parse(read(templateRel));
  for (const [jobName, job] of Object.entries(doc.jobs)) {
    for (const step of job.steps || []) {
      if (typeof step.run === 'string') {
        assert.ok(
          !step.run.includes('${{'),
          `job ${jobName} step "${step.name}" interpolates \${{ }} inside run`
        );
      }
    }
  }
});
