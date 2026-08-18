#!/usr/bin/env node
'use strict';

// The suite that gates `main` must be able to fail.
//
// ci-error-prevention.yml is the only workflow that runs the full `npm test`
// on a push to main, and it ran it as:
//
//     run: npm test || true
//
// so main could go red and no check anywhere would say so. Three regressions
// landed that way in a single day, each green on its own PR because what it
// broke lived outside its diff:
//
//   #17044  prioritize-stars.yml left unparseable, 13 AGENTS.md product rows
//           and a registry entry deleted
//   #17687  the AGENT_PR_TOKEN || GITHUB_TOKEN fallback deleted
//   #17000  204 action pins dropped, 7 of them full-SHA pins
//
// All three were found by a human running the suite on a clean checkout hours
// later, not by CI. CLAUDE.md gotcha 6 is exactly this: an exit code must
// reflect the postcondition, not whether the process finished.
//
// This guard is deliberately narrow. Plenty of `|| true` in this repo is
// legitimate — git-fetch fallbacks, best-effort comments, link checkers, and
// a smoke test whose real assertion follows. What must never be swallowed is
// the test suite itself.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');

const WF_DIR = path.join(__dirname, '..', '.github/workflows');

/** @returns {{file: string, job: string, step: string, run: string}[]} */
function stepsRunningTheSuite() {
  const out = [];
  for (const name of fs.readdirSync(WF_DIR)) {
    if (!/\.ya?ml$/.test(name)) continue;
    let doc;
    try {
      doc = yaml.load(fs.readFileSync(path.join(WF_DIR, name), 'utf8'));
    } catch {
      continue; // structural validity is covered by ci-status-accuracy.test.js
    }
    for (const [jobName, job] of Object.entries(doc?.jobs || {})) {
      for (const step of job?.steps || []) {
        const run = String(step?.run || '');
        // `npm test` as its own command, not `npm test:something`.
        if (/(^|[\n;&|])\s*npm test\b(?!:)/.test(run)) {
          out.push({ file: name, job: jobName, step: step.name || '(unnamed)', run, raw: step, jobObj: job });
        }
      }
    }
  }
  return out;
}

test('some workflow actually runs the full suite', () => {
  const steps = stepsRunningTheSuite();
  assert.ok(
    steps.length > 0,
    'no workflow runs `npm test` — the suite would gate nothing at all'
  );
});

test('no workflow swallows the exit code of npm test', () => {
  const offenders = stepsRunningTheSuite().filter(({ run }) =>
    /npm test\s*(\|\|\s*(true|:|exit 0)|;\s*true\b)/.test(run)
  );

  assert.deepEqual(
    offenders.map((o) => `${o.file} :: ${o.job} :: ${o.step}`),
    [],
    'these steps run `npm test` but discard its result, so the suite cannot fail:\n' +
      offenders.map((o) => `  ${o.file} -> ${o.run.trim()}`).join('\n')
  );
});

test('an npm test step may only be continue-on-error if its result is consumed', () => {
  // `continue-on-error` is not automatically the same defect as `|| true`.
  // self-heal-pr.yml uses it deliberately so a failure on a self-heal branch
  // becomes a PR comment instead of hard-blocking the self-heal workflow —
  // and the following step reads `steps.tests.outcome`, so the result is
  // surfaced rather than discarded. That is reporting, not swallowing.
  //
  // It IS the same defect when nothing reads the outcome: the step cannot
  // fail and nobody is told. So the rule is about whether the result is
  // consumed, not about the keyword.
  const offenders = stepsRunningTheSuite()
    .filter(({ raw }) => raw['continue-on-error'] === true)
    .filter(({ raw, file, job }) => {
      const id = raw.id;
      if (!id) return true; // no id => nothing can reference it
      const doc = yaml.load(fs.readFileSync(path.join(WF_DIR, file), 'utf8'));
      const body = JSON.stringify(doc.jobs[job]);
      // Does any later expression read this step's outcome/conclusion?
      return !new RegExp(`steps\\.${id}\\.(outcome|conclusion)`).test(body);
    });

  assert.deepEqual(
    offenders.map((o) => `${o.file} :: ${o.job} :: ${o.step}`),
    [],
    'these steps run `npm test` with continue-on-error and nothing reads the result,\n' +
      'so a red suite passes silently:\n' +
      offenders.map((o) => `  ${o.file} -> ${o.job}`).join('\n')
  );
});

test('no job running the suite is marked continue-on-error', () => {
  // Copilot caught this hole in review. GitHub Actions supports
  // `jobs.<job>.continue-on-error` as well as the step-level form, and the
  // job-level one makes the whole workflow succeed even when the step fails.
  // A guard that only inspected steps would stay green while the gate was
  // silenced one level up — the same defect this file exists to prevent,
  // hiding inside the file that prevents it.
  const offenders = stepsRunningTheSuite().filter(
    ({ jobObj }) => jobObj && jobObj['continue-on-error'] === true
  );

  assert.deepEqual(
    offenders.map((o) => `${o.file} :: ${o.job}`),
    [],
    'these JOBS run `npm test` with continue-on-error, so a red suite yields a green workflow'
  );
});

test('the suite actually runs for a push to main, conditions included', () => {
  // Copilot caught this in review: a push trigger on the workflow proves only
  // that the workflow fires, not that this job and step execute for that
  // event. A workflow with both `push` and `pull_request` triggers plus
  // `if: github.event_name == 'pull_request'` on the job or the step would
  // satisfy a trigger-only assertion while never testing main at all — a
  // guard that passes without establishing the thing it names, which is the
  // exact defect this file was written to stop.
  //
  // So: the workflow must trigger on push to main AND neither the job nor the
  // step may carry a condition that excludes push events.
  const excludesPush = (cond) => {
    if (cond === undefined || cond === null) return false;
    const c = String(cond);
    // Conditions that pin execution to a non-push event.
    return /event_name\s*==\s*'(?!push)/.test(c) || /event_name\s*!=\s*'push'/.test(c);
  };

  const onMain = stepsRunningTheSuite().filter(({ file, raw, jobObj }) => {
    const doc = yaml.load(fs.readFileSync(path.join(WF_DIR, file), 'utf8'));
    const on = doc?.on ?? doc?.[true]; // YAML 1.1 parses bare `on:` as boolean true

    // `on` has three legal shapes and only one of them may be property-read.
    // Jules caught the bug in review: for the array form (`on: [pull_request]`)
    // `typeof on === 'object'` is true and `on.push` resolves to
    // Array.prototype.push — a truthy function whose `.branches` is undefined,
    // so `branches.length === 0` read as "every branch" and a workflow that
    // never touches main satisfied this assertion. That is this file's own
    // failure mode reproduced inside the guard against it. The two string/null
    // forms (`on: push` and a bare `push:` key with no filters) were the
    // mirror-image false negative.
    const onMap = on && typeof on === 'object' && !Array.isArray(on) ? on : null;
    const triggersPush =
      on === 'push' ||
      (Array.isArray(on) && on.includes('push')) ||
      (onMap !== null && Object.prototype.hasOwnProperty.call(onMap, 'push'));
    if (!triggersPush) return false;

    // Only the map form carries filters. `push:` with nothing under it parses
    // as null and means every branch, same as the string and array forms.
    const pushCfg = (onMap && onMap.push) || {};
    const branches = pushCfg.branches || [];
    const ignored = pushCfg['branches-ignore'] || [];
    if (ignored.includes('main')) return false;
    const coversMain =
      branches.length === 0 || branches.some((b) => b === 'main' || b === '*' || b === '**');
    if (!coversMain) return false;
    // The job and the step must both be reachable on a push event.
    return !excludesPush(jobObj?.if) && !excludesPush(raw?.if);
  });

  assert.ok(
    onMain.length > 0,
    'no workflow runs the full suite for a push to main with the job and step ' +
      'actually reachable on that event; a red main would go unreported'
  );
});
