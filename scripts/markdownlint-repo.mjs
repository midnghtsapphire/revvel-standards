#!/usr/bin/env node
// Single entry point for linting this repo's markdown.
//
// There used to be two gates that could not agree:
//
//   lint-md.yml      markdownlint-cli,  config_file: .markdownlint.yaml,
//                    ignore_path: .markdownlintignore
//   npm run lint     markdownlint-cli2, .markdownlint.jsonc, an inline glob list
//
// Two separate defects, one cause each:
//
//   Rules. Both CLIs auto-discover .markdownlint.jsonc from the repo root, and
//   that discovery beats an explicit --config. lint-md.yml named
//   .markdownlint.yaml and ran the jsonc. The yaml is now the only rule set and
//   the jsonc only points at it; tests/markdown-gates-agree.test.js keeps it so.
//
//   Scope. markdownlint-cli2 does not read .markdownlintignore at all, so
//   `npm run lint` linted 23 agent-transcript files the CI gate excludes and
//   reported 44,901 findings. Permanently red is the same as absent — and where
//   it was run it was laxer than CI, so it could call markdown clean that CI
//   would reject. The file set is derived here from .markdownlintignore, the
//   same file lint-md.yml passes as ignore_path, so widening the ignore file
//   widens both gates together.
//
// Usage: node scripts/markdownlint-repo.mjs [--fix]
// Exit code is markdownlint-cli2's: 0 only when there are no findings.

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function ignoreGlobs(root = repoRoot) {
  return fs
    .readFileSync(path.join(root, '.markdownlintignore'), 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((pattern) => `#${pattern}`);
}

export function lintArgs({ fix = false, root = repoRoot } = {}) {
  return [
    ...(fix ? ['--fix'] : []),
    '--config',
    path.join(root, '.markdownlint.yaml'),
    '**/*.md',
    ...ignoreGlobs(root),
  ];
}

export function runMarkdownlint({ fix = false, root = repoRoot } = {}) {
  const cli = path.join(root, 'node_modules', '.bin', 'markdownlint-cli2');
  if (!fs.existsSync(cli)) {
    return {
      status: 1,
      stderr: 'markdownlint-cli2 is not installed — run `npm ci` first.\n',
      stdout: '',
    };
  }
  return spawnSync(cli, lintArgs({ fix, root }), {
    cwd: root,
    encoding: 'utf8',
    timeout: 300_000,
    // A repo-wide lint of thousands of files can print more than the 1 MB
    // default; ENOBUFS would otherwise read as "failed to run" rather than
    // "found a lot".
    maxBuffer: 64 * 1024 * 1024,
  });
}

// Only run when invoked directly. Compare realpaths so the check survives a
// symlinked entry point — resolving only one side silently disables main().
const invokedDirectly = (() => {
  const argv1 = process.argv[1];
  if (!argv1) return false;
  try {
    return fs.realpathSync(argv1) === fs.realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
})();

if (invokedDirectly) {
  const result = runMarkdownlint({ fix: process.argv.includes('--fix') });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  process.exit(result.status === null ? 1 : result.status);
}
