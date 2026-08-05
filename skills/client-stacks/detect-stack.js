#!/usr/bin/env node
'use strict';

/*
 * client-stacks / detect-stack.js — client stack profiler.
 *
 * Point this at ANY client repo (or backend checkout) and it produces a
 * stack profile: language, framework, test runner, CI system, package
 * manager — plus the matched lane pack from skills/client-stacks/stacks/
 * so the coding lane can emit idiomatic code and run the CLIENT'S verify
 * commands (their tests, not ours).
 *
 * This is the outward-facing sibling of skills/project-router/detect.py:
 * project-router routes OUR repos to OUR shape standards; detect-stack
 * routes a CLIENT repo to a polyglot lane. Zero dependencies (stdlib only)
 * so it can run anywhere — including inside a client's CI with no install
 * step. If detection is ambiguous the profile lists every scored candidate
 * (all_scores) so a human can override the lane choice.
 *
 * Usage:
 *   node detect-stack.js <path-to-client-repo>          # human-readable
 *   node detect-stack.js <path-to-client-repo> --json   # machine-readable
 */

const fs = require('fs');
const path = require('path');

const STACKS_DIR = path.join(__dirname, 'stacks');

// Detection order doubles as the tie-breaker: earlier = stronger claim.
const PRIORITY = ['dotnet', 'java', 'python', 'typescript', 'php', 'go', 'ruby'];

function exists(root, ...names) {
  return names.some((n) => fs.existsSync(path.join(root, n)));
}

// Shallow recursive search-by-extension (depth-limited so a giant client
// monorepo doesn't make detection slow; 3 levels catches src/Project/*.csproj).
function findByExt(root, exts, depth = 3) {
  const out = [];
  const walk = (dir, level) => {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      // Skip dependency/VCS dirs; keep .github so CI detection still works.
      if (e.isDirectory() && (e.name === 'node_modules' || e.name === 'vendor' || (e.name.startsWith('.') && e.name !== '.github'))) continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (level < depth) walk(p, level + 1);
      } else if (exts.some((x) => e.name.endsWith(x))) {
        out.push(p);
      }
    }
  };
  walk(root, 0);
  return out;
}

function read(root, name) {
  try {
    return fs.readFileSync(path.join(root, name), 'utf8');
  } catch {
    return '';
  }
}

function readJson(root, name) {
  try {
    return JSON.parse(read(root, name));
  } catch {
    return null;
  }
}

// CI detection is stack-independent: it tells the integration tier which
// checks the client-style PR must pass (see docs/CLIENT_ENGAGEMENT_KIT.md).
function detectCi(root) {
  if (fs.existsSync(path.join(root, '.github', 'workflows'))) return 'github-actions';
  if (exists(root, 'azure-pipelines.yml', 'azure-pipelines.yaml')) return 'azure-pipelines';
  if (exists(root, '.gitlab-ci.yml')) return 'gitlab-ci';
  if (fs.existsSync(path.join(root, '.circleci', 'config.yml'))) return 'circleci';
  if (exists(root, 'Jenkinsfile')) return 'jenkins';
  if (exists(root, 'bitbucket-pipelines.yml')) return 'bitbucket-pipelines';
  return 'none-detected';
}

function loadLane(stack) {
  try {
    return JSON.parse(fs.readFileSync(path.join(STACKS_DIR, `${stack}.json`), 'utf8'));
  } catch {
    return null;
  }
}

function detect(root) {
  root = path.resolve(root);
  const scores = Object.fromEntries(PRIORITY.map((s) => [s, 0]));
  const matched = Object.fromEntries(PRIORITY.map((s) => [s, []]));
  const hit = (stack, points, why) => {
    scores[stack] += points;
    matched[stack].push(why);
  };

  // --- .NET / C# ---
  const csproj = findByExt(root, ['.csproj', '.sln', '.slnx', '.fsproj']);
  if (csproj.length) hit('dotnet', 3, `.csproj/.sln present (${path.basename(csproj[0])})`);
  if (exists(root, 'global.json', 'nuget.config', 'NuGet.config', 'Directory.Build.props')) {
    hit('dotnet', 2, 'global.json / nuget.config / Directory.Build.props');
  }
  if (findByExt(root, ['.cs']).length) hit('dotnet', 1, 'C# sources');

  // --- Java / JVM ---
  if (exists(root, 'pom.xml')) hit('java', 3, 'pom.xml (Maven)');
  if (exists(root, 'build.gradle', 'build.gradle.kts', 'settings.gradle', 'settings.gradle.kts')) {
    hit('java', 3, 'build.gradle (Gradle)');
  }
  if (findByExt(root, ['.java', '.kt']).length) hit('java', 1, 'Java/Kotlin sources');

  // --- Python ---
  if (exists(root, 'pyproject.toml', 'setup.py', 'setup.cfg')) hit('python', 3, 'pyproject.toml / setup.py');
  if (exists(root, 'requirements.txt', 'Pipfile', 'poetry.lock', 'uv.lock')) hit('python', 2, 'requirements/Pipfile/lockfile');
  if (findByExt(root, ['.py']).length) hit('python', 1, 'Python sources');

  // --- TypeScript / JavaScript ---
  const pkg = readJson(root, 'package.json');
  if (pkg) hit('typescript', 2, 'package.json');
  if (exists(root, 'tsconfig.json')) hit('typescript', 2, 'tsconfig.json');
  if (findByExt(root, ['.ts', '.tsx']).length) hit('typescript', 1, 'TS sources');

  // --- PHP ---
  if (exists(root, 'composer.json')) hit('php', 3, 'composer.json');
  if (exists(root, 'artisan')) hit('php', 2, 'artisan (Laravel)');
  if (findByExt(root, ['.php']).length) hit('php', 1, 'PHP sources');

  // --- Go ---
  if (exists(root, 'go.mod')) hit('go', 3, 'go.mod');
  if (findByExt(root, ['.go']).length) hit('go', 1, 'Go sources');

  // --- Ruby ---
  if (exists(root, 'Gemfile')) hit('ruby', 3, 'Gemfile');
  if (exists(root, 'config.ru', 'Rakefile')) hit('ruby', 1, 'config.ru / Rakefile');

  const best = PRIORITY.reduce((a, b) => (scores[b] > scores[a] ? b : a));
  const detected = scores[best] > 0 ? best : 'unknown';
  const lane = detected === 'unknown' ? null : loadLane(detected);

  // Framework refinement per stack — coarse but enough to pick prompt-pack
  // hints; the lane pack carries the idiomatic details.
  let framework = lane ? lane.default_framework : 'unknown';
  if (detected === 'dotnet') {
    const proj = csproj.filter((f) => f.endsWith('.csproj')).map((f) => {
      try { return fs.readFileSync(f, 'utf8'); } catch { return ''; }
    }).join('\n');
    if (/Microsoft\.NET\.Sdk\.Web/.test(proj)) framework = 'aspnetcore';
    else if (proj) framework = 'dotnet-sdk';
  } else if (detected === 'typescript' && pkg) {
    const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
    if (deps.next) framework = 'nextjs';
    else if (deps.express) framework = 'express';
    else if (deps.react) framework = 'react';
  } else if (detected === 'python') {
    const reqs = read(root, 'requirements.txt') + read(root, 'pyproject.toml');
    if (/django/i.test(reqs)) framework = 'django';
    else if (/fastapi/i.test(reqs)) framework = 'fastapi';
    else if (/flask/i.test(reqs)) framework = 'flask';
  } else if (detected === 'php') {
    if (exists(root, 'artisan')) framework = 'laravel';
  }

  return {
    root,
    stack: detected,
    language: lane ? lane.language : 'unknown',
    framework,
    package_manager: lane ? lane.package_manager : 'unknown',
    test_runner: lane ? lane.test_runner : 'unknown',
    ci: detectCi(root),
    score: scores[best] || 0,
    matched: matched[best] || [],
    all_scores: Object.fromEntries(Object.entries(scores).filter(([, v]) => v > 0)),
    lane: lane
      ? { file: `skills/client-stacks/stacks/${detected}.json`, verify: lane.verify, prompt_pack: lane.prompt_pack }
      : null,
  };
}

function main() {
  const args = process.argv.slice(2).filter((a) => a !== '--json');
  const asJson = process.argv.includes('--json');
  const root = args[0] || '.';
  const result = detect(root);

  if (asJson) {
    console.log(JSON.stringify(result, null, 2));
    return 0;
  }

  console.log(`Detected stack:  ${result.stack} (${result.language}, score ${result.score})`);
  console.log(`Framework:       ${result.framework}`);
  console.log(`Package manager: ${result.package_manager}`);
  console.log(`Test runner:     ${result.test_runner}`);
  console.log(`CI:              ${result.ci}`);
  console.log('Matched signals:');
  for (const w of result.matched) console.log(`  - ${w}`);
  if (result.lane) {
    console.log(`\nLane pack: ${result.lane.file}`);
    console.log("Verify (client's own commands):");
    for (const c of result.lane.verify) console.log(`  $ ${c}`);
  }
  return 0;
}

if (require.main === module) {
  process.exit(main());
}

module.exports = { detect, detectCi, PRIORITY };
