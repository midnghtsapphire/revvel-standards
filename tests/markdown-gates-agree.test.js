#!/usr/bin/env node
'use strict';

// The config lint-md.yml names must be the config lint-md.yml runs.
//
// It was not. Both markdownlint-cli (the CI gate, via
// nosborn/github-action-markdown-cli) and markdownlint-cli2 (`npm run lint`)
// auto-discover .markdownlint.jsonc from the repo root, and that discovery
// BEATS an explicit --config / config_file. lint-md.yml passes
// `config_file: .markdownlint.yaml`; the jsonc copy is what actually applied.
//
// Measured on artifacts/README.md with `--config .markdownlint.yaml` in all
// three cases:
//
//   jsonc holding the strict rule set   -> 17 findings
//   jsonc holding the lenient rule set  ->  0 findings
//   jsonc absent                        -> 17 findings
//
// So the yaml was inert. Its header claimed the repo mandated MD022, MD024 and
// MD032 and that "this gate must enforce them"; the gate enforced none of the
// three, and had it started to, that would have been a 572-file reformat plus
// 215 MD024 findings that markdownlint --fix cannot resolve — MD024 is off for
// a real reason, since docs repeat section headers across process entries by
// design.
//
// Same family as #17704 (`npm test || true`), #17714 (workflows opening PRs
// that claimed to close issues) and #17717 (a pre-push checklist that never
// ran the one red gate): an artifact that reports success without doing the
// work — here, a config file that documented an enforcement that never ran.
//
// The rules now live in .markdownlint.yaml where the workflow reads them, the
// jsonc only points at it, and these assertions stop a second rule set from
// growing back.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const jsoncPath = path.join(repoRoot, '.markdownlint.jsonc');

// Use the JSONC parser markdownlint-cli2 itself ships, rather than a
// hand-rolled one. The hand-rolled version stripped `//` comments but not
// `/* ... */`, so adding a block comment to the config would have failed this
// test for the wrong reason.
async function readJsonc(file) {
  const { default: jsoncParse } = await import('markdownlint-cli2/parsers/jsonc');
  return jsoncParse(fs.readFileSync(file, 'utf8'));
}

test('.markdownlint.jsonc only defers to .markdownlint.yaml', async () => {
  const config = await readJsonc(jsoncPath);
  assert.deepEqual(
    Object.keys(config),
    ['extends'],
    'the jsonc config must hold nothing but "extends" — any rule restated ' +
      'here can drift from .markdownlint.yaml, which is what CI enforces',
  );
  assert.equal(config.extends, '.markdownlint.yaml');
  assert.ok(
    fs.existsSync(path.join(repoRoot, config.extends)),
    `.markdownlint.jsonc extends ${config.extends}, which does not exist`,
  );
});

test('npm run lint goes through the shared entry point', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));
  for (const script of ['lint', 'lint:fix']) {
    assert.match(
      pkg.scripts[script],
      /scripts\/markdownlint-repo\.mjs/,
      `package.json "${script}" must call scripts/markdownlint-repo.mjs, so the ` +
        'local gate cannot carry its own file list',
    );
  }
});

test('the local gate derives its file set from .markdownlintignore', async () => {
  const mod = await import(
    require('node:url').pathToFileURL(
      path.join(repoRoot, 'scripts', 'markdownlint-repo.mjs'),
    ).href
  );
  const globs = mod.ignoreGlobs(repoRoot);
  const ignoreFile = fs.readFileSync(path.join(repoRoot, '.markdownlintignore'), 'utf8');

  // Every non-comment line in the ignore file becomes an exclusion, so the two
  // gates cannot disagree about scope.
  const expected = ignoreFile
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));
  assert.equal(globs.length, expected.length);
  assert.ok(expected.length > 0, '.markdownlintignore is empty — nothing to derive');

  // The directory that made the local gate permanently red must be covered.
  assert.ok(
    globs.includes('#docs/agents/**/transcripts/**'),
    'agent transcripts must stay excluded from both gates',
  );
});

test('no second markdownlint config can override the yaml', () => {
  // markdownlint-cli and markdownlint-cli2 both auto-discover these from the
  // repo root, ahead of an explicit --config. Any one of them reintroduces the
  // exact bug this test exists for.
  const shadowing = [
    '.markdownlintrc',
    '.markdownlint.json',
    '.markdownlint.yml',
    '.markdownlint.cjs',
    '.markdownlint.mjs',
    '.markdownlint-cli2.jsonc',
    '.markdownlint-cli2.yaml',
    '.markdownlint-cli2.cjs',
    '.markdownlint-cli2.mjs',
  ].filter((name) => fs.existsSync(path.join(repoRoot, name)));

  assert.deepEqual(
    shadowing,
    [],
    'these root config files are auto-discovered ahead of the --config that ' +
      'lint-md.yml passes, so they would silently replace .markdownlint.yaml',
  );
});

test('the local gate covers .markdown, which CI also lints', () => {
  // lint-md.yml passes `files: .` to markdownlint-cli, and that CLI expands a
  // directory to both *.md and *.markdown. Globbing only **/*.md left a
  // .markdown file checked by CI and invisible locally. Measured on a fixture:
  // markdownlint-cli on '.' reported 2 findings in sample.markdown;
  // markdownlint-cli2 with '**/*.md' linted 0 files.
  const args = require('node:child_process').spawnSync(
    process.execPath,
    [
      '-e',
      `import(${JSON.stringify(
        require('node:url').pathToFileURL(
          path.join(repoRoot, 'scripts', 'markdownlint-repo.mjs'),
        ).href,
      )}).then((m) => console.log(JSON.stringify(m.lintArgs({ root: ${JSON.stringify(repoRoot)} }))))`,
    ],
    { encoding: 'utf8' },
  );
  assert.equal(args.status, 0, args.stderr);
  const parsed = JSON.parse(args.stdout);
  assert.ok(parsed.includes('**/*.md'), 'the .md glob is missing');
  assert.ok(
    parsed.includes('**/*.markdown'),
    'the .markdown glob is missing — CI lints those files and the local gate would not',
  );
});

test('the local gate runs the cli through node, not the unix shim', () => {
  // node_modules/.bin/markdownlint-cli2 is an extensionless shell script.
  // Spawning it directly fails on Windows even when the package is installed.
  const src = fs.readFileSync(
    path.join(repoRoot, 'scripts', 'markdownlint-repo.mjs'),
    'utf8',
  );
  assert.match(
    src,
    /spawnSync\(\s*process\.execPath/,
    'the cli must be launched with process.execPath so it works off-Unix',
  );
  assert.doesNotMatch(
    src,
    /'\.bin'/,
    'do not spawn node_modules/.bin shims directly',
  );
  assert.match(
    src,
    /result\.error/,
    'a spawn failure must be reported, not exited on silently',
  );
});
