'use strict';

/**
 * A `github-script` block written as a YAML **folded** scalar (`script: >`)
 * joins its lines onto one. A `//` line comment inside it therefore comments
 * out everything after it on the folded line — including the code it was
 * describing.
 *
 * This is not hypothetical. Adding a four-line `//` comment above two `const`
 * declarations in `priority-router.yml` produced:
 *
 *     ReferenceError: useOpenRouter is not defined
 *
 * on every pull request. The diff looked correct, `actionlint` passed, the YAML
 * parsed, and the workflow file read fine to a human. The defect only exists
 * *after* YAML folding, which is a step nobody reads.
 *
 * So this test does what review cannot: it parses each workflow, extracts every
 * inline `script:` exactly as the runner will receive it, and runs it through
 * `node --check`. It also rejects `//` comments in folded scalars outright,
 * because a syntax check alone would pass a script whose logic had been
 * silently commented away.
 *
 * Use a block comment in a folded scalar, or write the block as `script: |`.
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const yaml = require('yaml');

const WORKFLOW_DIR = path.join(__dirname, '..', '.github', 'workflows');

function workflowFiles() {
  return fs
    .readdirSync(WORKFLOW_DIR, { withFileTypes: true })
    .filter((e) => e.isFile() && /\.ya?ml$/.test(e.name))
    .map((e) => e.name)
    .sort();
}

/** Every inline `script:` in a workflow, as the runner will receive it. */
function inlineScripts(source) {
  let doc;
  try {
    doc = yaml.parse(source);
  } catch {
    return []; // workflows:validate owns malformed YAML
  }
  const out = [];
  for (const [jobName, job] of Object.entries(doc?.jobs ?? {})) {
    for (const step of job?.steps ?? []) {
      const script = step?.with?.script;
      if (typeof script === 'string' && script.trim()) {
        out.push({ jobName, stepName: step.name ?? '(unnamed)', script });
      }
    }
  }
  return out;
}

/** Names of files whose `script:` blocks are folded scalars. */
function usesFoldedScript(source) {
  return /^\s*script:\s*>/m.test(source);
}

test('no folded line comment swallows the code that follows it', () => {
  // Precision matters here. YAML folds only lines at the block's base
  // indentation; a more-indented comment keeps its own newline and is harmless,
  // and several workflows rely on that. So the check is not "does a // appear"
  // — it is "does executable code survive on the same line AFTER a //", which
  // is the actual defect and nothing else.
  const CODE_AFTER_COMMENT =
    /\b(const|let|var|await|return|function|if\s*\(|for\s*\(|while\s*\()/;
  const offenders = [];
  for (const name of workflowFiles()) {
    const source = fs.readFileSync(path.join(WORKFLOW_DIR, name), 'utf8');
    if (!usesFoldedScript(source)) continue;
    for (const { stepName, script } of inlineScripts(source)) {
      for (const line of script.split('\n')) {
        const at = line.indexOf('//');
        if (at === -1) continue;
        if (/https?:$/.test(line.slice(0, at + 1))) continue; // a URL, not a comment
        if (!CODE_AFTER_COMMENT.test(line.slice(at + 2))) continue;
        offenders.push(`${name} → "${stepName}": ${line.trim().slice(0, 100)}`);
        break;
      }
    }
  }
  assert.deepStrictEqual(
    offenders,
    [],
    'In a `script: >` block YAML folds lines together, so a `//` comment ' +
      'comments out the code that follows it on the folded line. Use ' +
      `/* ... */ or switch the block to \`script: |\`:\n  ${offenders.join('\n  ')}`,
  );
});

test('every inline github-script block is syntactically valid JavaScript', () => {
  const failures = [];
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gh-script-'));
  try {
    for (const name of workflowFiles()) {
      const source = fs.readFileSync(path.join(WORKFLOW_DIR, name), 'utf8');
      for (const [i, { stepName, script }] of inlineScripts(source).entries()) {
        const file = path.join(tmp, `${name.replace(/\W/g, '_')}-${i}.js`);
        // `${{ ... }}` is substituted by Actions before the script runs, so it
        // is not valid JS here. Replace it with a literal so the check tests the
        // JavaScript rather than the templating.
        const substituted = script.replace(/\$\{\{[^}]*\}\}/g, '"__ACTIONS_EXPR__"');
        // github-script runs the body inside an async function.
        fs.writeFileSync(file, `(async () => {\n${substituted}\n})();\n`);
        try {
          execFileSync('node', ['--check', file], { stdio: 'pipe' });
        } catch (err) {
          const detail = (err.stderr?.toString() ?? '').split('\n').slice(0, 3).join(' ').trim();
          failures.push(`${name} → "${stepName}": ${detail.slice(0, 160)}`);
        }
      }
    }
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  assert.deepStrictEqual(
    failures,
    [],
    'These inline scripts do not parse as JavaScript after YAML processing. ' +
      'The workflow file may still look fine — the defect appears only once ' +
      `YAML has folded or dedented the block:\n  ${failures.join('\n  ')}`,
  );
});
