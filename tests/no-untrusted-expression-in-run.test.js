#!/usr/bin/env node
'use strict';

// User-controlled values must reach a script through `env:`, never through
// `${{ }}`.
//
// `${{ }}` is template substitution performed BEFORE the script runs. The
// surrounding quotes are part of the substituted output, not a boundary the
// expansion respects, so a value containing a quote closes the literal and the
// remainder executes — in bash and in github-script alike. Being inside a
// string literal is what makes the pattern exploitable, not what prevents it.
//
// zizmor alert 3380 caught one instance in auto-branch-update.yml. The
// security-fleet @exprwatch sweep (#17644) then found 33, of which 16 carried
// values an actor supplies:
//
//   inputs.error_message   free text on a dispatch
//   inputs.task            free text
//   inputs.url             free text
//   inputs.repo            free text
//   inputs.channel         free text
//   inputs.target_state    free text
//   inputs.required_agents free text
//   inputs.issue_number    declared `string` in several workflows
//   join(labels.*.name)    label names, settable by anyone who can label
//
// Each now arrives via the step's `env:` and is read as `$VAR` (shell) or
// `process.env.VAR` (github-script).
//
// The remaining ~17 findings are deliberately left: `repository.default_branch`,
// `pull_request.base.ref`, `head.sha`, `github.event.before` and friends are
// server-controlled, and `inputs.x == 'y'` is evaluated by Actions to a boolean
// before it ever reaches the shell. This guard targets the values an attacker
// can actually choose.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');

const WF_DIR = path.join(__dirname, '..', '.github/workflows');

// Known-remaining instances, as `file :: expression`.
//
// This is a ratchet, not an ignore list: it may only SHRINK. The @exprwatch
// sweep reported 33 findings by matching `github.event.inputs.*`; this guard
// also catches the bare `inputs.*` form, which is the same value in a
// workflow_dispatch context, and so sees considerably more. Fixing every one in
// a single change would produce a diff nobody can review, so the batch that
// closed the 16 attacker-influenceable findings from the sweep landed first and
// the remainder is counted here rather than quietly tolerated.
//
// To remove an entry: move the expression into the step's `env:` and read it as
// `$VAR` in a run: block or `process.env.VAR` in a github-script block, then
// delete the line. Adding an entry is not allowed — that is what the guard is
// for.
const KNOWN_REMAINING = new Set([
  'api-rate-limit-handler.yml :: ${{ inputs.agent_used }}',
  'api-rate-limit-handler.yml :: ${{ inputs.error_message }}',
  'api-rate-limit-handler.yml :: ${{ inputs.failed_workflow }}',
  'auto-error-handler.yml :: ${{ inputs.attempted_fixes }}',
  'auto-error-handler.yml :: ${{ inputs.error_context }}',
  'auto-error-handler.yml :: ${{ inputs.error_message }}',
  'auto-error-handler.yml :: ${{ inputs.error_type }}',
  'auto-error-handler.yml :: ${{ inputs.workflow_run_id }}',
  'bulk-close-failure-spam.yml :: ${{ inputs.dry_run }}',
  'bulk-close-failure-spam.yml :: ${{ inputs.max_to_close }}',
  'chaosmender.yml :: ${{ github.event.inputs.file_issues }}',
  'eeat-trust-cron.yml :: ${{ inputs.dry_run && \'✅ Yes\' || \'❌ No\' }}',
  'fork-audit-bot.yml :: ${{ inputs.config_path }}',
  'fork-audit-bot.yml :: ${{ inputs.dry_run }}',
  'gumloop-pdf-pipeline.yml :: ${{ inputs.keywords }}',
  'gumloop-pdf-pipeline.yml :: ${{ inputs.niche }}',
  'gumloop-pdf-pipeline.yml :: ${{ inputs.output_name }}',
  'jules-coding-agent.yml :: ${{ inputs.issue_number }}',
  'mabl.yml :: ${{ inputs.app-url }}',
  'mabl.yml :: ${{ inputs.continue-on-failure }}',
  'mabl.yml :: ${{ inputs.plan-labels }}',
  'openrouter-assignee.yml :: ${{ github.event.inputs.dry_run || \'false\' }}',
  'patch-agent.yml :: ${{ inputs.issue_number }}',
  'research-module.yml :: ${{ inputs.output_file }}',
  'research-module.yml :: ${{ inputs.question }}',
  'reset-self-heal-issue.yml :: ${{ inputs.issue_number }}',
  'run-human-testing-api.yml :: ${{ inputs.app_name }}',
  'run-human-testing-api.yml :: ${{ inputs.output_file }}',
  'run-human-testing-api.yml :: ${{ inputs.target_url }}',
  'run-human-testing-api.yml :: ${{ inputs.test_scenarios }}',
  'stuck-check-watchdog.yml :: ${{ github.event.inputs.dry_run == \'true\' }}',
  'ui-creation-engine.yml :: ${{ inputs.business }}',
  'ui-creation-engine.yml :: ${{ inputs.industry }}',
  'ui-creation-engine.yml :: ${{ inputs.issue_number }}',
  'ui-creation-engine.yml :: ${{ inputs.location }}',
  'ui-creation-engine.yml :: ${{ inputs.platform }}',
  'ui-creation-engine.yml :: ${{ inputs.services }}',
]);

// Expressions whose value an actor can choose.
const UNTRUSTED = [
  /\$\{\{\s*(?:github\.event\.)?inputs\.[A-Za-z_]+[^}]*\}\}/,
  /\$\{\{\s*join\([^)]*labels\.\*[^)]*\)\s*\}\}/,
  /\$\{\{\s*github\.event\.(?:issue|pull_request|comment)\.(?:title|body)[^}]*\}\}/,
];

// Actions evaluates a comparison to true/false before the shell sees it, so
// `inputs.dry_run == 'true'` cannot carry a payload.
const BOOLEAN_COMPARISON = /\$\{\{\s*[^}]*\b(?:==|!=)\s*'[^']*'\s*\}\}/;

function offendingExpressions(body) {
  const out = [];
  for (const line of String(body).split('\n')) {
    for (const m of line.matchAll(/\$\{\{[^}]*\}\}/g)) {
      const expr = m[0];
      if (BOOLEAN_COMPARISON.test(expr)) continue;
      if (UNTRUSTED.some((re) => re.test(expr))) out.push(expr.trim());
    }
  }
  return out;
}

function liveSteps() {
  const out = [];
  for (const file of fs.readdirSync(WF_DIR)) {
    if (!/\.ya?ml$/.test(file)) continue;
    let doc;
    try {
      doc = yaml.load(fs.readFileSync(path.join(WF_DIR, file), 'utf8'));
    } catch {
      continue; // structural validity is covered elsewhere
    }
    for (const [jobName, job] of Object.entries(doc?.jobs || {})) {
      if (!job || job.if === false) continue; // disabled stubs cannot run
      for (const step of job.steps || []) {
        out.push({
          file,
          jobName,
          name: step?.name || '(unnamed)',
          shell: String(step?.run || ''),
          js: String(step?.with?.script || ''),
        });
      }
    }
  }
  return out;
}

test('the scan is not vacuous', () => {
  // Guards the guard: if the workflow directory stops being read, every
  // assertion below passes by inspecting nothing.
  const steps = liveSteps();
  assert.ok(steps.length > 100, `expected to inspect many steps, saw ${steps.length}`);
  assert.ok(
    steps.some((s) => s.shell) && steps.some((s) => s.js),
    'expected both shell run: blocks and github-script script: blocks in scope'
  );
});

test('no shell run: block interpolates an attacker-controlled expression', () => {
  const offenders = liveSteps()
    .flatMap((s) => offendingExpressions(s.shell).map((e) => ({ s, e })))
    .filter(({ s, e }) => !KNOWN_REMAINING.has(`${s.file} :: ${e}`))
    .map(({ s, e }) => `${s.file} :: ${s.jobName} :: ${s.name} -> ${e}`);

  assert.deepEqual(
    offenders,
    [],
    'pass these through the step\'s env: and read $VAR instead — a quote in the\n' +
      'value closes the shell string and the rest executes:\n' +
      offenders.map((o) => `  ${o}`).join('\n')
  );
});

test('no github-script script: block interpolates an attacker-controlled expression', () => {
  // Same defect, different interpreter. `const x = '${{ inputs.task }}'` breaks
  // out of the JS string literal exactly as it breaks out of a shell one.
  const offenders = liveSteps()
    .flatMap((s) => offendingExpressions(s.js).map((e) => ({ s, e })))
    .filter(({ s, e }) => !KNOWN_REMAINING.has(`${s.file} :: ${e}`))
    .map(({ s, e }) => `${s.file} :: ${s.jobName} :: ${s.name} -> ${e}`);

  assert.deepEqual(
    offenders,
    [],
    'pass these through the step\'s env: and read process.env.VAR instead:\n' +
      offenders.map((o) => `  ${o}`).join('\n')
  );
});

test('the known-remaining list only shrinks', () => {
  // Without this the list outlives the problem. An entry that has since been
  // fixed keeps a slot open, so the same expression can be reintroduced later
  // and the guard will wave it through — the list quietly becomes the ignore
  // list it was written not to be.
  const live = new Set();
  for (const s of liveSteps()) {
    for (const e of offendingExpressions(s.shell)) live.add(`${s.file} :: ${e}`);
    for (const e of offendingExpressions(s.js)) live.add(`${s.file} :: ${e}`);
  }
  const fixed = [...KNOWN_REMAINING].filter((k) => !live.has(k));

  assert.deepEqual(
    fixed,
    [],
    'these are no longer present; delete them from KNOWN_REMAINING in this file:\n' +
      fixed.map((f) => `  ${f}`).join('\n')
  );
});

test('env: is still allowed to carry the expression', () => {
  // The inverse. A guard that rejected the expression everywhere would force
  // the value to be dropped rather than handled safely, and `env:` is exactly
  // where it belongs — the runner sets it as a variable, never as code.
  const withEnv = liveSteps().filter((s) => s.shell || s.js).length;
  assert.ok(withEnv > 0, 'expected script-bearing steps to exist');

  const doc = yaml.load(fs.readFileSync(path.join(WF_DIR, 'ship-to-market.yml'), 'utf8'));
  const step = Object.values(doc.jobs)
    .flatMap((j) => j.steps || [])
    .find((s) => /parse delivery labels/i.test(s?.name || ''));
  assert.ok(step, 'the reference step must exist');
  assert.match(
    String(step.env?.PR_LABELS || ''),
    /join\(github\.event\.pull_request\.labels/,
    'the expression belongs in env:, which this guard must not forbid'
  );
  assert.match(String(step.run), /\$\{PR_LABELS\}/, 'and the run: block must read the variable');
});
