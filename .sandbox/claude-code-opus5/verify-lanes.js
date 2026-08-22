'use strict';
// Verifies .github/agent-models.yml after the 2026-08-21 Opus 5 roll-forward.
//
// Why this exists: the repo's own drift test (tests/controller-core.test.js)
// only checks the *controller chain* against the SSOT denylist. It does not
// check the profiles in agent-models.yml itself, so a denylisted model or a
// fallback-less profile could land in the YAML and every test would stay
// green. This script closes that gap for the lanes touched by this change.
//
// Run: node .sandbox/claude-code-opus5/verify-lanes.js
// Exit 0 = clean. Exit 1 = a violation to fix before opening the PR.
// If it fails on a model you just added, check that model is not matched by a
// denylist pattern in agent-models.yml before assuming the script is wrong.

const fs = require('fs');
const path = require('path');
const YAML = require('yaml');

const repoRoot = path.join(__dirname, '..', '..');
const ssot = YAML.parse(
  fs.readFileSync(path.join(repoRoot, '.github', 'agent-models.yml'), 'utf8'),
);

// Mirror the denylist->RegExp translation used by controller-core.test.js so
// the two cannot disagree about what "denylisted" means.
const denyRes = (ssot.denylist || []).map(
  (d) =>
    new RegExp(
      '^' +
        String(d.pattern)
          .replace(/[.+^${}()|[\]\\]/g, '\\$&')
          .replace(/\*/g, '.*') +
        '$',
    ),
);

let violations = 0;

for (const [name, profile] of Object.entries(ssot.profiles || {})) {
  // Agent-runner profiles (jules, devin, circleci) have no primary/fallback —
  // they delegate to an external platform. Skip them, don't flag them.
  if (!profile.primary) {
    console.log(`  ${name.padEnd(16)} (external runner — no model pins)`);
    continue;
  }

  if (!profile.fallback) {
    console.log(`  !! NO FALLBACK: ${name} — house rule requires one`);
    violations += 1;
  }

  for (const model of [profile.primary, profile.fallback].filter(Boolean)) {
    for (const re of denyRes) {
      if (re.test(model)) {
        console.log(`  !! DENYLISTED: ${model} in profile "${name}" (${re})`);
        violations += 1;
      }
    }
  }

  console.log(
    `  ${name.padEnd(16)} ${profile.primary}  ->  ${profile.fallback || '-'}`,
  );
}

// The reviewer must not be the same model as the coder — that separation is
// the entire reason the review profile exists.
const coder = ssot.profiles?.code_patch?.primary;
const reviewer = ssot.profiles?.review?.primary;
if (coder && reviewer && coder === reviewer) {
  console.log(`\n  !! coder and reviewer are both ${coder} — twins must differ`);
  violations += 1;
}

console.log(
  violations
    ? `\nFAIL: ${violations} violation(s)`
    : '\nOK: no denylist violations, every routed profile has a fallback, coder != reviewer',
);

process.exit(violations ? 1 : 0);
