'use strict';

/**
 * No `actions/github-script` body may interpolate a step or job output into the
 * JavaScript it runs (WR #17796 / #17801).
 *
 * The runner substitutes `${{ ... }}` as TEXT before the script is parsed. So
 * this:
 *
 *     const result = '${{ steps.publish.outputs.result }}';
 *
 * pastes whatever that step wrote into a JavaScript string literal. A single
 * quote ends the literal; a backtick or `${` does the same inside a template
 * literal, and the remainder is evaluated as code.
 *
 * These values are not constants. They are written by shell steps that echo
 * tool output into `$GITHUB_OUTPUT`:
 *
 *     PKG=$(node -p "require('./package.json').name + '@' + ...")
 *     echo "result=Published $PKG" >> $GITHUB_OUTPUT
 *
 * `package.json` is content from the branch being built, and publisher stderr
 * is not under our control either.
 *
 * The fix is to pass the value through `env:` and read it with `process.env` —
 * then it is data, and nothing parses it.
 *
 * ## What is allowed
 *
 * `github.*` context values (`github.repository`, `github.sha`, `github.run_id`)
 * stay. They are platform-controlled and cannot carry a quote or a backtick.
 * `secrets.*` are out of scope here — a secret belongs in `env:` for different
 * reasons (CLAUDE.md gotcha #4) and is checked elsewhere.
 *
 * The conversion ratchet from #17801 has been drained: every previously listed
 * workflow now uses `env:` / `process.env`. Do not re-introduce a name-pinned
 * allowlist — new offenders fail the tests below immediately.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const yaml = require('yaml');

const WORKFLOWS = path.join(__dirname, '..', '.github', 'workflows');

/** Expressions that may not be interpolated into a script body. */
const UNSAFE = /\$\{\{[^}]*\b(?:steps|needs|inputs|env|matrix)\./;

function scriptBodies() {
  const found = [];
  for (const file of fs.readdirSync(WORKFLOWS).filter((f) => /\.ya?ml$/.test(f))) {
    let doc;
    try {
      doc = yaml.parse(fs.readFileSync(path.join(WORKFLOWS, file), 'utf8'));
    } catch {
      continue; // YAML validity is check-workflow-yaml.test.js's job.
    }
    for (const [jobName, job] of Object.entries(doc?.jobs ?? {})) {
      for (const step of job?.steps ?? []) {
        const uses = typeof step?.uses === 'string' ? step.uses : '';
        if (!/^actions\/github-script[@/]/.test(uses)) continue;
        if (typeof step?.with?.script !== 'string') continue;
        found.push({ file, job: jobName, name: step.name ?? '(unnamed)', script: step.with.script, step });
      }
    }
  }
  return found;
}

test('no github-script body interpolates a step, job, or input value', () => {
  const offenders = scriptBodies()
    .filter(({ script }) => UNSAFE.test(script))
    .map(({ file, job, name }) => `${file} · ${job} · ${name}`);

  assert.deepEqual(
    offenders,
    [],
    'pass the value through `env:` and read it with process.env — ' +
      `interpolated here:\n  ${offenders.join('\n  ')}`,
  );
});

test('the platform context values that remain are the harmless ones', () => {
  // `github.*` is allowed; this pins WHY, so widening the rule to permit
  // `steps.*` again would have to argue with a named reason.
  const stillInterpolated = new Set();
  for (const { script } of scriptBodies()) {
    for (const m of script.matchAll(/\$\{\{\s*([^}\s]+)/g)) stillInterpolated.add(m[1]);
  }
  const notGithub = [...stillInterpolated].filter((e) => !/^github\./.test(e) && !/^secrets\./.test(e));
  assert.deepEqual(
    notGithub,
    [],
    'only github.* (platform-controlled) and secrets.* may remain interpolated',
  );
});

test('ship-to-market reads its delivery results from env', () => {
  // Positive shape guard from #17796 (RVS-VERIFY-001): "deleted the line"
  // cannot pass for "converted it". Pins the original demonstration conversion.
  const doc = yaml.parse(fs.readFileSync(path.join(WORKFLOWS, 'ship-to-market.yml'), 'utf8'));
  const withEnv = [];
  for (const [jobName, job] of Object.entries(doc.jobs ?? {})) {
    for (const step of job?.steps ?? []) {
      if (typeof step?.with?.script !== 'string') continue;
      if (!/process\.env\.[A-Z_]+/.test(step.with.script)) continue;
      assert.ok(
        step.env && Object.keys(step.env).length > 0,
        `${jobName} · ${step.name}: reads process.env but has no env: block, ` +
          'so every value is undefined and the step silently does nothing',
      );
      for (const varName of step.with.script.match(/process\.env\.([A-Z_]+)/g) ?? []) {
        const key = varName.replace('process.env.', '');
        if (key.startsWith('GITHUB_')) continue;
        assert.ok(
          key in step.env,
          `${jobName} · ${step.name}: reads ${key} which its env: block does not define`,
        );
      }
      withEnv.push(`${jobName} · ${step.name}`);
    }
  }
  assert.ok(withEnv.length >= 11, `expected the converted steps; found ${withEnv.length}`);
});

test('#17801 conversions read process.env and declare matching step env keys', () => {
  // Spot-check a few of the heaviest files from the drained ratchet so the
  // conversion cannot be gamed by deleting the unsafe line without wiring env.
  const samples = [
    'auto-error-handler.yml',
    'needs-action-router.yml',
    'openrouter-assignee.yml',
    'ralph-loop.yml',
    'weekly-research.yml',
  ];
  let checked = 0;
  for (const file of samples) {
    const doc = yaml.parse(fs.readFileSync(path.join(WORKFLOWS, file), 'utf8'));
    for (const [jobName, job] of Object.entries(doc.jobs ?? {})) {
      for (const step of job?.steps ?? []) {
        const uses = typeof step?.uses === 'string' ? step.uses : '';
        if (!/^actions\/github-script[@/]/.test(uses)) continue;
        if (typeof step?.with?.script !== 'string') continue;
        const refs = [...(step.with.script.match(/process\.env\.([A-Z][A-Z0-9_]*)/g) ?? [])]
          .map((r) => r.replace('process.env.', ''))
          .filter((k) => !k.startsWith('GITHUB_'));
        if (refs.length === 0) continue;
        assert.ok(
          step.env && Object.keys(step.env).length > 0,
          `${file} · ${jobName} · ${step.name}: reads process.env but has no env: block`,
        );
        for (const key of refs) {
          assert.ok(
            key in step.env,
            `${file} · ${jobName} · ${step.name}: reads ${key} which its env: block does not define`,
          );
          checked += 1;
        }
      }
    }
  }
  assert.ok(checked >= 20, `expected sample conversions; found ${checked} env refs`);
});
