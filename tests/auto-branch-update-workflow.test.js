#!/usr/bin/env node
'use strict';

// Regression guard for .github/workflows/auto-branch-update.yml.
//
// The workflow merges main into every open PR branch on each push to main.
// Two defects made it corrupt stacked pull requests:
//
//   1. `concurrency.group` was keyed on `github.run_id`, which is unique per
//      run. The group therefore never serialised anything, so rapid pushes to
//      main ran concurrently and each merged+pushed the same branches. That
//      produced the long chains of "Merge remote-tracking branch 'origin/main'"
//      commits seen on #17653 (11) and #17592 (31).
//
//   2. It selected PRs with `pulls.list({ base: 'main' })`, so a stack parent
//      (base main) had main merged into it while its child (base = the parent
//      branch) was never touched. The two levels drifted apart and collided as
//      an add/add conflict on the same WR file — the failure resolved in
//      #17653/#17657 and #17592/#17600.
//
// Stacked PRs are updated by rebasing onto the latest base, never by merge.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const yaml = require('yaml');

const root = path.resolve(__dirname, '..');
const workflowPath = path.join(root, '.github/workflows/auto-branch-update.yml');

const raw = fs.readFileSync(workflowPath, 'utf8');
const wf = yaml.parse(raw);

test('concurrency group is static so overlapping runs serialise', () => {
  const group = wf.concurrency && wf.concurrency.group;
  assert.ok(group, 'expected a concurrency.group');

  // A group containing run_id is unique per run and never queues anything.
  assert.doesNotMatch(
    String(group),
    /run_id/,
    'concurrency.group must not be keyed on github.run_id — that defeats the group'
  );

  // Nothing else that varies per run is acceptable either.
  assert.doesNotMatch(String(group), /run_number|run_attempt|github\.sha/);
});

test('the collect step is the only place targets are chosen', () => {
  const collect = wf.jobs['update-pr-branches'].steps.find((s) => s.id === 'collect');
  assert.ok(collect, 'expected a step with id `collect`');
  assert.ok(collect.with && collect.with.script, 'expected an inline github-script body');
});

test('stack parents and stacked children are excluded from merging', () => {
  const collect = wf.jobs['update-pr-branches'].steps.find((s) => s.id === 'collect');
  const script = collect.with.script;

  // The workflow must look at every open PR, not just base:main, or it cannot
  // know which branches are stack parents.
  assert.doesNotMatch(
    script,
    /pulls\.list\(\{[^}]*base:\s*'main'/s,
    'listing only base:main PRs hides stacks — fetch all open PRs and filter'
  );
  assert.match(script, /paginate/, 'expected pagination over all open PRs');

  // It must build the set of branches that other open PRs are based on...
  assert.match(script, /stackParents/, 'expected a set of stack parent branches');
  assert.match(
    script,
    /stackParents\.has\(pr\.head\.ref\)/,
    'expected stack parents to be skipped'
  );

  // ...and skip any PR that is itself stacked on something other than main.
  assert.match(
    script,
    /pr\.base\.ref\s*!==\s*'main'/,
    'expected PRs stacked on a non-main base to be skipped'
  );
});

test('drafts are still skipped', () => {
  const collect = wf.jobs['update-pr-branches'].steps.find((s) => s.id === 'collect');
  assert.match(collect.with.script, /pr\.draft/, 'draft PRs must not be force-updated');
});

test('token selection keeps the AGENT_PR_TOKEN fallback and stays parseable', () => {
  // `secrets.X != '' && secrets.X || secrets.Y` is valid GitHub expression
  // syntax, but the runner-side expression parser used by the actions-lint
  // check reports it as an undeclared secret named after the whole
  // expression. `secrets.X || secrets.Y` is equivalent — an unset secret is
  // the empty string, which is falsy — and parses cleanly.
  assert.doesNotMatch(
    raw,
    /secrets\.\w+\s*!=\s*''/,
    "avoid the `secrets.X != '' && ...` idiom; `secrets.X || secrets.Y` is equivalent"
  );

  // CLAUDE.md gotcha 3: the default GITHUB_TOKEN does not trigger downstream
  // workflows, so the AGENT_PR_TOKEN preference must survive any rewrite.
  const tokenRefs = raw.match(/\$\{\{\s*secrets\.AGENT_PR_TOKEN\s*\|\|\s*secrets\.GITHUB_TOKEN\s*\}\}/g);
  assert.ok(
    tokenRefs && tokenRefs.length === 2,
    'expected both the checkout token and the github-script token to prefer AGENT_PR_TOKEN'
  );
});

test('no template expansion inside the github-script body', () => {
  // zizmor template-injection (alert 3380). `${{ }}` is substituted as text
  // before the script executes, so interpolating a dispatch input directly
  // into JS lets a crafted value close the string literal and run arbitrary
  // code under a token with `contents: write`. Values must arrive via env.
  const collect = wf.jobs['update-pr-branches'].steps.find((s) => s.id === 'collect');
  assert.doesNotMatch(
    collect.with.script,
    /\$\{\{/,
    'pass values through `env:` and read them with process.env, never `${{ }}` in the script body'
  );
  assert.match(collect.env.INPUT_PR_NUMBER, /inputs\.pr_number/);
  assert.match(collect.with.script, /process\.env\.INPUT_PR_NUMBER/);
});

test('workflow_dispatch input is read through the inputs context', () => {
  // `github.event.inputs` is the legacy spelling and is flagged as undeclared
  // by the actions-lint check. `inputs.<name>` is the documented context for
  // workflow_dispatch and is likewise empty on push events, so the collect
  // step's "no PR number supplied" branch behaves identically.
  assert.doesNotMatch(raw, /github\.event\.inputs\./, 'use the `inputs.` context');
  assert.match(raw, /\$\{\{\s*inputs\.pr_number\s*\}\}/);

  // The input must still be declared, or the dispatch path silently breaks.
  assert.ok(wf.on.workflow_dispatch.inputs.pr_number, 'pr_number must stay declared');
});

test('conflicting merges abort instead of pushing', () => {
  // The merge step aborts and leaves conflicts for a human; it must never push
  // a half-resolved tree.
  assert.match(raw, /git merge --abort/, 'expected conflicting merges to abort');
  const mergeStep = wf.jobs['update-pr-branches'].steps.find(
    (s) => typeof s.run === 'string' && s.run.includes('TARGETS')
  );
  assert.ok(mergeStep, 'expected the merge step');
  assert.match(mergeStep.run, /hasConflicts/, 'expected an explicit conflict guard');
});
