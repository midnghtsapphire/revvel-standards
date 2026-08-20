'use strict';

/**
 * No `actions/github-script` body may interpolate a step or job output into the
 * JavaScript it runs (WR #17796).
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
 * `ship-to-market.yml` carried ten such bodies. The fix, already demonstrated
 * in that file's `deliver-extension` job before this sweep, is to pass the
 * value through `env:` and read it with `process.env` — then it is data, and
 * nothing parses it.
 *
 * ## What is allowed
 *
 * `github.*` context values (`github.repository`, `github.sha`, `github.run_id`)
 * stay. They are platform-controlled and cannot carry a quote or a backtick.
 * `secrets.*` are out of scope here — a secret belongs in `env:` for different
 * reasons (CLAUDE.md gotcha #4) and is checked elsewhere.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const yaml = require('yaml');

const WORKFLOWS = path.join(__dirname, '..', '.github', 'workflows');

/** Expressions that may not be interpolated into a script body. */
const UNSAFE = /\$\{\{[^}]*\b(?:steps|needs|inputs|env|matrix)\./;

/**
 * Workflows that still interpolate, awaiting conversion — #17801.
 *
 * A ratchet: it may only shrink, and only by name. Converting a workflow means
 * deleting its name here in the same commit, and a test below fails if a name
 * is left behind after its fix. Adding a name is not a fix.
 *
 * `ship-to-market.yml` is deliberately absent: its ten bodies were converted in
 * the commit that added this file, which is what proves the rule is followable.
 */
const AWAITING_CONVERSION = Object.freeze([
  'auto-deploy-to-stores.yml',
  'auto-error-handler.yml',
  'eeat-trust-cron.yml',
  'needs-action-router.yml',
  'openrouter-assignee.yml',
  'ralph-loop.yml',
  'stuck-check-watchdog.yml',
  'ui-creation-engine.yml',
  'weekly-research.yml',
  'wr-pr-creation.yml',
]);

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
        found.push({ file, job: jobName, name: step.name ?? '(unnamed)', script: step.with.script });
      }
    }
  }
  return found;
}

test('no github-script body interpolates a step, job, or input value', () => {
  const offenders = scriptBodies()
    .filter(({ file }) => !AWAITING_CONVERSION.includes(file))
    .filter(({ script }) => UNSAFE.test(script))
    .map(({ file, job, name }) => `${file} · ${job} · ${name}`);

  assert.deepEqual(
    offenders,
    [],
    'pass the value through `env:` and read it with process.env — ' +
      `interpolated here:\n  ${offenders.join('\n  ')}`,
  );
});

test('the conversion ratchet may only shrink, and only by name', () => {
  // A count would let one unconverted workflow be swapped for another with
  // nothing failing (RVS-VERIFY-001 §6, and the hole fixed in #17782).
  assert.ok(AWAITING_CONVERSION.length > 0, 'when empty, delete the ratchet and this test');
  assert.deepEqual(
    [...AWAITING_CONVERSION],
    [...AWAITING_CONVERSION].sort(),
    'keep the list sorted so a diff shows what changed',
  );
  assert.equal(
    new Set(AWAITING_CONVERSION).size,
    AWAITING_CONVERSION.length,
    'no duplicates',
  );
  assert.ok(
    !AWAITING_CONVERSION.includes('ship-to-market.yml'),
    'ship-to-market.yml is converted; listing it would re-permit the pattern there',
  );
});

test('converting a workflow means deleting its name from the ratchet', () => {
  const bodiesByFile = new Map();
  for (const body of scriptBodies()) {
    if (!bodiesByFile.has(body.file)) bodiesByFile.set(body.file, []);
    bodiesByFile.get(body.file).push(body);
  }
  const alreadyClean = AWAITING_CONVERSION.filter(
    (file) => !(bodiesByFile.get(file) ?? []).some(({ script }) => UNSAFE.test(script)),
  );
  assert.deepEqual(
    alreadyClean,
    [],
    'these are converted — remove their names, or the pattern is quietly re-permitted there',
  );
});

test('the platform context values that remain are the harmless ones', () => {
  // `github.*` is allowed; this pins WHY, so widening the rule to permit
  // `steps.*` again would have to argue with a named reason.
  const stillInterpolated = new Set();
  for (const { script } of scriptBodies().filter(
    ({ file }) => !AWAITING_CONVERSION.includes(file),
  )) {
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
  // The ten bodies this sweep converted. Asserting the positive shape as well
  // as the absence, so "deleted the line" cannot pass for "converted it".
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

/**
 * Every name a script reads from `process.env` must actually be set.
 *
 * The conversion is a claim: "this value now travels as data." Nothing was
 * checking the claim outside `ship-to-market.yml`, so deleting one `env:` key
 * left the script reading `undefined` — no interpolation, no error, no output,
 * green everywhere. RVS-VERIFY-001: a guard that only checks the *absence* of
 * the old pattern passes a conversion that silently does nothing.
 *
 * Effective env is workflow-level + job-level + step-level, in that order, plus
 * the names the runner provides itself.
 */
/**
 * The names the runner sets itself, enumerated.
 *
 * This was `/^(GITHUB_|RUNNER_|ACTIONS_|CI$|HOME$|PATH$)/`, and a prefix is
 * wrong here in a way that matters: GitHub does NOT export every `GITHUB_*`
 * name. `GITHUB_TOKEN` is not a default variable — it reaches a step only via
 * an explicit `env:` — and `GITHUB_RUN_URL` does not exist at all. The prefix
 * accepted both, so the guard passed two live reads of `undefined` (#17827
 * review). It also meant a typo in any `GITHUB_*` binding was unfalsifiable.
 *
 * From the GitHub Actions default-variables table. Adding a name here is a
 * claim that the runner sets it; check the docs before doing so.
 */
const RUNNER_PROVIDED = new Set([
  'CI', 'HOME', 'PATH',
  'GITHUB_ACTION', 'GITHUB_ACTION_PATH', 'GITHUB_ACTION_REPOSITORY',
  'GITHUB_ACTIONS', 'GITHUB_ACTOR', 'GITHUB_ACTOR_ID', 'GITHUB_API_URL',
  'GITHUB_BASE_REF', 'GITHUB_ENV', 'GITHUB_EVENT_NAME', 'GITHUB_EVENT_PATH',
  'GITHUB_GRAPHQL_URL', 'GITHUB_HEAD_REF', 'GITHUB_JOB', 'GITHUB_OUTPUT',
  'GITHUB_PATH', 'GITHUB_REF', 'GITHUB_REF_NAME', 'GITHUB_REF_PROTECTED',
  'GITHUB_REF_TYPE', 'GITHUB_REPOSITORY', 'GITHUB_REPOSITORY_ID',
  'GITHUB_REPOSITORY_OWNER', 'GITHUB_REPOSITORY_OWNER_ID',
  'GITHUB_RETENTION_DAYS', 'GITHUB_RUN_ATTEMPT', 'GITHUB_RUN_ID',
  'GITHUB_RUN_NUMBER', 'GITHUB_SERVER_URL', 'GITHUB_SHA',
  'GITHUB_STEP_SUMMARY', 'GITHUB_TRIGGERING_ACTOR', 'GITHUB_WORKFLOW',
  'GITHUB_WORKFLOW_REF', 'GITHUB_WORKFLOW_SHA', 'GITHUB_WORKSPACE',
  'RUNNER_ARCH', 'RUNNER_DEBUG', 'RUNNER_NAME', 'RUNNER_OS', 'RUNNER_TEMP',
  'RUNNER_TOOL_CACHE',
]);

/**
 * A name can be defined for later steps without any `env:` block:
 *
 *   - a `run:` step writing it to `$GITHUB_ENV`, either `NAME=value` or the
 *     heredoc form `NAME<<EOF` used for multi-line values, or
 *   - a `github-script` step calling `core.exportVariable('NAME', ...)`.
 *
 * Both are real definitions and both were false positives on the first draft of
 * this guard — `anti-scaffolding-enforcer.yml` uses one of each. A check that
 * fails correct code is one people learn to ignore (#17787), so it has to know
 * about every mechanism, not just `env:`.
 */
function namesDefinedBy(steps) {
  const names = new Set();
  for (const step of steps) {
    if (typeof step?.run === 'string') {
      for (const line of step.run.split('\n')) {
        if (!/GITHUB_ENV/.test(line)) continue;
        const m = /(?:^|["'\s])([A-Za-z_][A-Za-z0-9_]*)\s*(?:=|<<)/.exec(line);
        if (m) names.add(m[1]);
      }
    }
    const script = step?.with?.script;
    if (typeof script === 'string') {
      for (const m of script.matchAll(
        /core\.exportVariable\(\s*['"`]([A-Za-z_][A-Za-z0-9_]*)['"`]/g,
      )) {
        names.add(m[1]);
      }
    }
  }
  return names;
}


/** Names a workflow document's scripts read but nothing binds, as strings. */
function unboundReads(doc, file = '(fixture)') {
  const missing = [];
  {
    const workflowEnv = Object.keys(doc?.env ?? {});

    for (const [jobName, job] of Object.entries(doc?.jobs ?? {})) {
      const jobEnv = Object.keys(job?.env ?? {});
      const steps = job?.steps ?? [];
      steps.forEach((step, index) => {
        if (typeof step?.with?.script !== 'string') return;
        // ORDER MATTERS. `$GITHUB_ENV` and `core.exportVariable` reach only
        // SUBSEQUENT steps, so a definition below this one does not define it
        // here. The first draft scanned the whole job and so passed a script
        // reading `undefined` whenever a later step happened to export the same
        // name (#17827 review). A step's own `env:` is its own, hence
        // `slice(0, index)` plus this step's block.
        const defined = new Set([
          ...workflowEnv, ...jobEnv,
          ...namesDefinedBy(steps.slice(0, index)),
          ...Object.keys(step?.env ?? {}),
        ]);
        // Drop whole-line `//` comments: a commented-out read is not a read,
        // and a REVVEL-DISABLED block quoting the code it disabled would
        // otherwise be reported as a live undefined binding. Only lines that
        // START with `//` go — cutting at an inline `//` would truncate a
        // string containing `https://` and could hide a real read after it.
        const live = step.with.script
          .split('\n')
          .filter((l) => !/^\s*\/\//.test(l))
          .join('\n');
        for (const ref of live.match(/process\.env\.([A-Za-z_][A-Za-z0-9_]*)/g) ?? []) {
          const key = ref.replace('process.env.', '');
          if (RUNNER_PROVIDED.has(key) || defined.has(key)) continue;
          missing.push(`${file} · ${jobName} · ${step.name ?? '(unnamed)'} · ${key}`);
        }
      });
    }
  }
  return missing;
}

test('every process.env name a script reads is defined somewhere', () => {
  const missing = [];
  for (const file of fs.readdirSync(WORKFLOWS).filter((f) => /\.ya?ml$/.test(f))) {
    let doc;
    try {
      doc = yaml.parse(fs.readFileSync(path.join(WORKFLOWS, file), 'utf8'));
    } catch {
      continue;
    }
    missing.push(...unboundReads(doc, file));
  }

  assert.deepEqual(
    missing,
    [],
    'these scripts read a name nothing defines, so the value is undefined and ' +
      `the step silently does nothing:\n  ${missing.join('\n  ')}`,
  );
});

/**
 * The two holes a reviewer found in the first draft of the guard above
 * (#17827). Both are about the guard's own logic, so both are asserted on
 * synthetic documents: the repo happening to contain an example today is not
 * the same as the rule being enforced tomorrow.
 */

test('a name exported by a LATER step does not count as defined', () => {
  // `$GITHUB_ENV` writes and `core.exportVariable` reach only SUBSEQUENT steps.
  // The first draft scanned the whole job, so a later export made an earlier
  // read of `undefined` look bound.
  const later = {
    jobs: {
      j: {
        steps: [
          { name: 'reads', uses: 'actions/github-script@v9.0.0',
            with: { script: 'core.info(process.env.LATER_ONLY);' } },
          { name: 'exports', run: 'echo "LATER_ONLY=x" >> "$GITHUB_ENV"' },
        ],
      },
    },
  };
  assert.deepEqual(
    unboundReads(later),
    ['(fixture) · j · reads · LATER_ONLY'],
    'the export happens after the read, so the read gets undefined',
  );

  // The same two steps the other way round is correct and must pass.
  const earlier = {
    jobs: {
      j: {
        steps: [
          { name: 'exports', run: 'echo "EARLY=x" >> "$GITHUB_ENV"' },
          { name: 'reads', uses: 'actions/github-script@v9.0.0',
            with: { script: 'core.info(process.env.EARLY);' } },
        ],
      },
    },
  };
  assert.deepEqual(unboundReads(earlier), [], 'a definition above the read binds it');
});

test('GITHUB_TOKEN is not treated as a name the runner provides', () => {
  // The allowlist was the prefix /^GITHUB_/, which is wrong in the one place
  // it matters: GITHUB_TOKEN is NOT a default variable — it reaches a step only
  // through an explicit `env:` — and GITHUB_RUN_URL does not exist at all. The
  // prefix accepted both, so two live reads of `undefined` passed, and a typo
  // in any GITHUB_* binding was unfalsifiable.
  const doc = {
    jobs: {
      j: {
        steps: [{
          name: 'reads', uses: 'actions/github-script@v9.0.0',
          with: { script: 'require("child_process").execSync("x", { env: { GITHUB_TOKEN: process.env.GITHUB_TOKEN } });' },
        }],
      },
    },
  };
  assert.deepEqual(doc.jobs.j.steps[0].env ?? {}, {}, 'fixture has no env: block');
  assert.deepEqual(unboundReads(doc), ['(fixture) · j · reads · GITHUB_TOKEN']);

  // Bound explicitly, it passes — the rule is "bind it", not "never read it".
  doc.jobs.j.steps[0].env = { GITHUB_TOKEN: '${{ secrets.GITHUB_TOKEN }}' };
  assert.deepEqual(unboundReads(doc), []);

  // And a name the runner genuinely does set needs no binding.
  const workspace = {
    jobs: { j: { steps: [{ name: 'r', uses: 'actions/github-script@v9.0.0',
      with: { script: 'core.info(process.env.GITHUB_WORKSPACE);' } }] } },
  };
  assert.deepEqual(unboundReads(workspace), []);
});

test('a commented-out read is not a read', () => {
  // A REVVEL-DISABLED block quotes the code it disabled. Reporting that as a
  // live undefined binding would fail the commit that does the quarantining.
  const doc = {
    jobs: { j: { steps: [{ name: 'r', uses: 'actions/github-script@v9.0.0',
      with: { script: '// const x = process.env.GONE;\ncore.info("ok");' } }] } },
  };
  assert.deepEqual(unboundReads(doc), []);

  // Only WHOLE-LINE comments are dropped. Cutting at an inline `//` would
  // truncate a string containing `https://` and could hide a real read.
  const inline = {
    jobs: { j: { steps: [{ name: 'r', uses: 'actions/github-script@v9.0.0',
      with: { script: 'const u = "https://x/" + process.env.STILL_LIVE;' } }] } },
  };
  assert.deepEqual(unboundReads(inline), ['(fixture) · j · r · STILL_LIVE']);
});
