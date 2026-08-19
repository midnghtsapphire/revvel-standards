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

// Minimal JSONC reader: strip // line comments outside strings, then JSON.parse.
function readJsonc(file) {
  const text = fs.readFileSync(file, 'utf8');
  const out = [];
  let inString = false;
  let escaped = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (inString) {
      out.push(ch);
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      out.push(ch);
      continue;
    }
    if (ch === '/' && text[i + 1] === '/') {
      while (i < text.length && text[i] !== '\n') i += 1;
      out.push('\n');
      continue;
    }
    out.push(ch);
  }
  return JSON.parse(out.join(''));
}

test('.markdownlint.jsonc only defers to .markdownlint.yaml', () => {
  const config = readJsonc(jsoncPath);
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
