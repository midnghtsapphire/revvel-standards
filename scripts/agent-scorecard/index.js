#!/usr/bin/env node
'use strict';

/**
 * Fleet Trust Scorecard — orchestrator.
 *
 * Run once per agent PR (on merge / close, or on demand). It:
 *   1. gathers signals (CI result + the local detectors),
 *   2. scores the PR and EWMA-updates the agent's trust,
 *   3. appends to the durable ledger and regenerates the leaderboard,
 *   4. if the PR fell short, emits a remediation plan (corrective re-run →
 *      handoff → Claude escalation) for the workflow to act on.
 *
 * Inputs come from env so it is trivial to call from a workflow:
 *   AGENT, PR_NUMBER, PR_TITLE, CI_GREEN, RED_RUNS, TEST_FAILURES,
 *   BUILD_FAILURES, CODEQL_FINDINGS, TRIVY_FINDINGS, SCAFFOLDING_HITS,
 *   ROOT_JUNK_HITS, NON_CONVENTIONAL_COMMITS, OUT_OF_SCOPE_FILES,
 *   REVERTED_AFTER_MERGE, FORCE_AMENDS, LATENCY_MIN, REMEDIATION_ATTEMPT
 *   DIFF_FILE (path to unified diff), BODY_FILE (path to PR body),
 *   CHANGED_FILES (newline list), CROSS_MODEL=1 to enable the LLM review.
 */

const fs = require('fs');
const path = require('path');

const { prQualityScore, grade } = require('./score-engine');
const { findUnresolvedRefs } = require('./reference-resolver');
const { checkClaims } = require('./claim-checker');
const { review } = require('./cross-model-review');
const { planRemediation } = require('./remediate');
const ledger = require('./ledger');

const REPO_ROOT = path.join(__dirname, '../..');

function envInt(name, dflt = 0) {
  const v = process.env[name];
  if (v === undefined || v === '') return dflt;
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? dflt : n;
}
function envBool(name) {
  return /^(1|true|yes)$/i.test(process.env[name] || '');
}
function readFileMaybe(p) {
  try {
    return p && fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
  } catch {
    return '';
  }
}

function loadEnvKeys() {
  const keys = new Set();
  const text = readFileMaybe(path.join(REPO_ROOT, '.env.example'));
  for (const line of text.split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=/);
    if (m) keys.add(m[1]);
  }
  return keys;
}

function repoExists(relPath) {
  return fs.existsSync(path.join(REPO_ROOT, relPath));
}

function setOutput(key, value) {
  const out = process.env.GITHUB_OUTPUT;
  if (out) fs.appendFileSync(out, `${key}=${value}\n`);
}

async function main() {
  const agent = process.env.AGENT || 'unknown';
  const pr = envInt('PR_NUMBER', 0) || null;
  const diff = readFileMaybe(process.env.DIFF_FILE);
  const body = readFileMaybe(process.env.BODY_FILE);
  const changedFiles = (process.env.CHANGED_FILES || '')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
  const newFiles = (process.env.NEW_FILES || '')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);

  // Conventional-commit type from the PR title ("feat: ...", "fix(scope): ...").
  const titleType = (process.env.PR_TITLE || '').match(/^(\w+)(?:\([^)]*\))?!?:/);
  const prType = process.env.PR_TYPE || (titleType ? titleType[1].toLowerCase() : '');

  // Net-new capability = added files under the dirs where capability actually lives.
  const CAPABILITY_DIRS = /^(skills|products|engines|scripts|\.github\/workflows)\//;
  const newCapabilities = newFiles.filter((f) => CAPABILITY_DIRS.test(f)).length;

  // Local detectors (free, deterministic).
  const refs = findUnresolvedRefs({ diff, exists: repoExists, envKeys: loadEnvKeys() });
  const claims = checkClaims(body, changedFiles);

  // Cross-model adversarial review (only when explicitly enabled + keys present).
  let cross = { available: false, flagCount: 0, flags: [], summary: 'skipped' };
  if (envBool('CROSS_MODEL') && diff) {
    cross = await review({ title: process.env.PR_TITLE, body, diff });
  }

  const signals = {
    ciGreen: process.env.CI_GREEN === undefined ? true : envBool('CI_GREEN'),
    redRunsBeforeGreen: envInt('RED_RUNS'),
    testFailures: envInt('TEST_FAILURES'),
    buildFailures: envInt('BUILD_FAILURES'),
    codeqlFindings: envInt('CODEQL_FINDINGS'),
    trivyFindings: envInt('TRIVY_FINDINGS'),
    scaffoldingHits: envInt('SCAFFOLDING_HITS'),
    rootJunkHits: envInt('ROOT_JUNK_HITS'),
    nonConventionalCommits: envInt('NON_CONVENTIONAL_COMMITS'),
    outOfScopeFiles: envInt('OUT_OF_SCOPE_FILES'),
    revertedAfterMerge: envBool('REVERTED_AFTER_MERGE'),
    forceAmends: envInt('FORCE_AMENDS'),
    largeDiffNoTests: envBool('LARGE_DIFF_NO_TESTS'),
    unresolvedRefs: refs.count,
    unbackedClaims: claims.count,
    crossModelHallucinationFlags: cross.flagCount,
  };

  const { score, dimensions } = prQualityScore(signals);
  const hallucinationCount =
    signals.unresolvedRefs + signals.unbackedClaims + signals.crossModelHallucinationFlags;

  // Persist the score event, then recompute the leaderboard from the full ledger.
  ledger.appendEvent({
    type: 'score',
    agent,
    pr,
    quality: score,
    hallucination: hallucinationCount,
    latencyMin: process.env.LATENCY_MIN ? envInt('LATENCY_MIN') : undefined,
    prType,
    newCapabilities,
    dimensions,
    detail: { refs: refs.findings, claims: claims.findings, crossModel: cross.flags },
  });
  const agents = ledger.aggregate(ledger.readEvents());
  ledger.writeLeaderboard(agents);

  const agentNow = agents.get(agent);
  const trust = agentNow ? agentNow.trust : null;

  // Decide if remediation is warranted.
  const NEEDS_REMEDIATION = score < 60 || hallucinationCount > 0 || signals.ciGreen === false;
  let remediation = null;
  if (NEEDS_REMEDIATION) {
    remediation = planRemediation({
      agent,
      signals,
      attempt: envInt('REMEDIATION_ATTEMPT'),
    });
    const planPath = path.join(REPO_ROOT, 'wr/memory/last-remediation-plan.json');
    fs.writeFileSync(planPath, JSON.stringify(remediation, null, 2) + '\n');
  }

  // Console + workflow outputs.
  const g = trust != null ? grade(trust) : { letter: '?', label: 'n/a' };
  console.log(`📊 Scorecard for ${agent} PR#${pr ?? '—'}`);
  console.log(`   quality=${score}  trust=${trust ?? '—'} (${g.letter}/${g.label})  hallucinations=${hallucinationCount}`);
  if (refs.count) console.log(`   ⚠️ unresolved refs: ${refs.findings.map((f) => f.ref).join(', ')}`);
  if (claims.count) console.log(`   ⚠️ unbacked claims: ${claims.findings.map((f) => f.claim).join(', ')}`);
  if (cross.available) console.log(`   🔎 cross-model: ${cross.flagCount} flag(s) — ${cross.summary}`);
  if (remediation) console.log(`   🔧 remediation tier: ${remediation.tier}${remediation.handoffTo ? ` → ${remediation.handoffTo}` : ''}`);

  setOutput('quality', String(score));
  setOutput('trust', String(trust ?? ''));
  setOutput('hallucinations', String(hallucinationCount));
  setOutput('needs_remediation', String(Boolean(remediation)));
  if (remediation) {
    setOutput('remediation_tier', remediation.tier);
    if (remediation.handoffTo) setOutput('handoff_to', remediation.handoffTo);
  }

  return 0;
}

if (require.main === module) {
  main().then((code) => process.exit(code)).catch((err) => {
    console.error(`scorecard failed: ${err.stack || err.message}`);
    process.exit(1);
  });
}

module.exports = { main };
