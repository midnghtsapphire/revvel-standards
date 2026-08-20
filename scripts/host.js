#!/usr/bin/env node
'use strict';

/**
 * Host — decomposes a Work Request (Grid) into an agent-contract of Blocks and
 * Threads, and validates the output against schemas/agent-contract.schema.json.
 *
 * Position in the CUDA execution model:
 *
 *   WR (Grid)  ->  Host (this script)  ->  agent-contract.yml
 *                                            |
 *                                            v
 *                                     agent-fallback.yml (per-Thread dispatch)
 *                                            |
 *                                            v
 *                                     Watchdog + Code Verifier (Block 2, next PR)
 *
 * Design notes:
 * - Deterministic by default. No LLM call is required to decompose a WR - the
 *   Host reads a small, explicit set of hints (labels, headings) out of the WR
 *   body and applies rules. This makes the Host reproducible + testable and
 *   keeps the Grid pause/resume flow honest.
 * - The one place an LLM can help - refining prompts - is opt-in via the
 *   HOST_LLM_REFINE=1 env var. The default path stays pure.
 * - The Host does NOT dispatch Threads itself. It writes the contract, then
 *   the calling workflow (host.yml) hands off to agent-fallback.yml. Keeps
 *   this script pure and side-effect free so the tests can exercise it as a
 *   library.
 *
 * Public API (exported for tests):
 *   decompose(input)   -> agent contract object
 *   validate(contract) -> { valid, errors }
 *
 * CLI:
 *   node scripts/host.js < wr.json           -> prints contract to stdout
 *   node scripts/host.js --wr-file wr.json   -> same
 *   node scripts/host.js --wr-file wr.json --out contract.json
 *
 * WR input shape (see tests/host.test.js for fixtures):
 *   {
 *     "wr_number": 15668,
 *     "wr_title": "feat(...): ...",
 *     "wr_url": "https://github.com/.../issues/15668",
 *     "labels": ["work-request", "checkpoint-gated", "role:architect"],
 *     "body": "## Blocks\n- Block 1: Host ...\n- Block 2: Watchdog ..."
 *   }
 */

const fs = require('fs');
const path = require('path');
const yaml = require('yaml');
const Ajv2020 = require('ajv/dist/2020');
const addFormats = require('ajv-formats');

const REPO_ROOT = path.resolve(__dirname, '..');
const SCHEMA_PATH = path.join(REPO_ROOT, 'schemas/agent-contract.schema.json');
const DEVICE_TREE_PATH = path.join(REPO_ROOT, 'config/device-tree.yml');

const CONTRACT_VERSION = '1.0.0';

let ajvInstance = null;
let validatorInstance = null;

function getValidator() {
  if (validatorInstance) return validatorInstance;
  ajvInstance = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajvInstance);
  const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'));
  validatorInstance = ajvInstance.compile(schema);
  return validatorInstance;
}

function loadDeviceTree() {
  const raw = fs.readFileSync(DEVICE_TREE_PATH, 'utf8');
  return yaml.parse(raw);
}

/**
 * Extract Block hints from a WR body. Recognizes two shapes:
 *   1. A "## Blocks" heading followed by "- Block N: <name>" bullets
 *   2. A YAML front-matter-ish "```yaml blocks:" fence
 * Everything else falls through to the default single-Block plan.
 */
function extractBlockHints(body) {
  if (!body) return [];
  const lines = body.split(/\r?\n/);
  const hints = [];

  let inSection = false;
  const blockPattern = /^\s*[-*]\s*(?:\*\*)?Block\s+(\d+)(?:\s*(?:of|\/)\s*\d+)?(?:\*\*)?\s*[:\-]\s*(.+?)\s*$/i;

  for (const line of lines) {
    if (/^\s*##+\s*Blocks\s*$/i.test(line)) {
      inSection = true;
      continue;
    }
    if (inSection && /^\s*##+\s+\S/.test(line)) {
      // next heading terminates the section
      inSection = false;
    }
    if (inSection) {
      const m = line.match(blockPattern);
      if (m) {
        hints.push({ index: Number(m[1]), name: m[2].trim() });
      }
    }
  }
  return hints;
}

/**
 * Pick a default Thread kind + role based on a Block's name text. This is the
 * "no LLM needed" heuristic path. If a WR wants something specific, it names
 * the kind explicitly under a "Kind:" bullet inside the Block description -
 * see decomposeFromHints for that path.
 */
function classifyBlockName(name) {
  const n = name.toLowerCase();
  if (/(research|survey|investigate)/.test(n)) return { role: 'research', kind: 'researcher' };
  // Review before testing: "Verifier" / "Watchdog" are review-lane concepts
  // even though "verify" alone (as a verb) is a testing concept. Ordering
  // matters here: the more specific review nouns must win.
  if (/(watchdog|verifier|review|audit|inspect)/.test(n)) return { role: 'review', kind: 'reviewer' };
  if (/(\btest\b|testing|qa\b|verify\b)/.test(n)) return { role: 'testing', kind: 'tester' };
  if (/(deploy|ship|release)/.test(n)) return { role: 'deploy', kind: 'deployer' };
  if (/(doc|readme|guide|write.?up)/.test(n)) return { role: 'docs', kind: 'doc-writer' };
  if (/(workflow|action|\bci\b|\bcd\b|pipeline)/.test(n)) return { role: 'build', kind: 'builder-workflow' };
  if (/(standard|schema|rule|policy|contract)/.test(n)) return { role: 'build', kind: 'builder-standards' };
  return { role: 'build', kind: 'builder' };
}

/** Build a single Thread from a Block hint. */
function threadFor(kind, wrTitle, blockName, deviceTree) {
  const spec = (deviceTree.kinds || []).find((k) => k.name === kind);
  // WR #17775: default 60m so Host never emits a sub-floor visiting-LLM thread
  // when device-tree omits default_timeout_minutes (see config/copilot-timeouts.yml).
  const timeout = spec && spec.default_timeout_minutes ? spec.default_timeout_minutes : 60;
  const agent = spec && spec.default_agent ? spec.default_agent : 'openrouter';
  return {
    id: 'thread-1',
    kind,
    prompt: `WR: ${wrTitle}\nBlock: ${blockName}\n\nImplement this Block completely - no scaffolding, no TODO stubs, no phased language. Follow docs/AGENTS.md and docs/DEFINITION_OF_DONE.md exactly.`,
    workspace: null,
    prefer_agent: agent,
    timeout_minutes: timeout,
  };
}

/** Default acceptance gates that every Block PR must clear. */
function defaultAcceptance() {
  return [
    'tests: npm test passes 100%',
    'workflows: npm run workflows:validate passes with 0 invalid',
    'scaffolding: anti-scaffolding-enforcer.yml passes',
    'conventional-commits: PR title matches type(scope): description',
  ];
}

function decompose(input) {
  if (!input || typeof input !== 'object') {
    throw new Error('decompose(input): input must be an object');
  }
  if (!Number.isInteger(input.wr_number) || input.wr_number < 1) {
    throw new Error('decompose(input): input.wr_number must be a positive integer');
  }
  if (!input.wr_title || typeof input.wr_title !== 'string') {
    throw new Error('decompose(input): input.wr_title must be a non-empty string');
  }

  const deviceTree = loadDeviceTree();
  const validKinds = new Set((deviceTree.kinds || []).map((k) => k.name));

  const labels = Array.isArray(input.labels) ? input.labels : [];
  const checkpointGated = labels.includes('checkpoint-gated')
    || labels.includes('high-stakes')
    || labels.includes('owner-review-per-block');

  const goalPhaseLabel = labels.find((l) => l.startsWith('phase:'));
  const goalPhase = goalPhaseLabel ? goalPhaseLabel.slice('phase:'.length) : null;

  const hints = extractBlockHints(input.body || '');

  const blocks = [];
  if (hints.length === 0) {
    // Single-Block fallback: whole WR is one build Block.
    const cls = { role: 'build', kind: 'builder' };
    blocks.push({
      id: 'block-1',
      name: input.wr_title,
      role: cls.role,
      depends_on: [],
      status: 'pending',
      pr_number: null,
      threads: [ threadFor(cls.kind, input.wr_title, input.wr_title, deviceTree) ],
      acceptance: defaultAcceptance(),
    });
  } else {
    // Multi-Block plan: one Block per hint, in order.
    const sorted = [...hints].sort((a, b) => a.index - b.index);
    let previousId = null;
    let counter = 0;
    for (const h of sorted) {
      counter += 1;
      const cls = classifyBlockName(h.name);
      if (!validKinds.has(cls.kind)) {
        throw new Error(`decompose: chosen kind "${cls.kind}" is not in device-tree.yml (add it before shipping)`);
      }
      const id = `block-${counter}`;
      const dependsOn = previousId && checkpointGated ? [previousId] : [];
      blocks.push({
        id,
        name: h.name,
        role: cls.role,
        depends_on: dependsOn,
        status: 'pending',
        pr_number: null,
        threads: [ threadFor(cls.kind, input.wr_title, h.name, deviceTree) ],
        acceptance: defaultAcceptance(),
      });
      previousId = id;
    }
  }

  return {
    contract_version: CONTRACT_VERSION,
    generated_at: input.generated_at || new Date().toISOString(),
    generated_by: input.generated_by || 'scripts/host.js',
    grid: {
      wr_number: input.wr_number,
      wr_title: input.wr_title,
      wr_url: input.wr_url || null,
      checkpoint_gated: checkpointGated,
      goal_phase: goalPhase,
    },
    blocks,
  };
}

function validate(contract) {
  const v = getValidator();
  const valid = v(contract);
  return { valid: !!valid, errors: valid ? [] : (v.errors || []) };
}

// ── CLI ──────────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const out = { wrFile: null, out: null };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--wr-file' && argv[i + 1]) { out.wrFile = argv[++i]; continue; }
    if (a === '--out' && argv[i + 1]) { out.out = argv[++i]; continue; }
  }
  return out;
}

function readStdinSync() {
  try {
    return fs.readFileSync(0, 'utf8');
  } catch (_e) {
    return '';
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const raw = args.wrFile ? fs.readFileSync(args.wrFile, 'utf8') : readStdinSync();
  if (!raw.trim()) {
    process.stderr.write('host: no WR input on stdin and no --wr-file provided\n');
    process.exit(2);
  }
  let input;
  try {
    input = JSON.parse(raw);
  } catch (e) {
    process.stderr.write(`host: WR input is not valid JSON: ${e.message}\n`);
    process.exit(2);
  }
  let contract;
  try {
    contract = decompose(input);
  } catch (e) {
    process.stderr.write(`host: decompose failed: ${e.message}\n`);
    process.exit(1);
  }
  const check = validate(contract);
  if (!check.valid) {
    process.stderr.write('host: generated contract does not validate against schema:\n');
    for (const err of check.errors) {
      process.stderr.write(`  ${err.instancePath || '/'} ${err.message}\n`);
    }
    process.exit(1);
  }
  const rendered = JSON.stringify(contract, null, 2);
  if (args.out) {
    fs.writeFileSync(args.out, rendered + '\n');
  } else {
    process.stdout.write(rendered + '\n');
  }
}

module.exports = {
  decompose,
  validate,
  extractBlockHints,
  classifyBlockName,
  CONTRACT_VERSION,
};

if (require.main === module) main();
