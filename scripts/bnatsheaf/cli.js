#!/usr/bin/env node
'use strict';

/**
 * BNAT sheaf test harness / CLI — the enforcement surface for H¹ ≈ 0.
 *
 * Commands (all read-only over the BIOME feed; strictly additive):
 *
 *   node scripts/bnatsheaf/cli.js consistency_check [--epsilon 1e-9] [--status <path>]
 *       Build the sheaf from docs/biome/biome-status.json, compute the
 *       Laplacian energy E(x), and report H¹ obstructions. Exit 0 iff
 *       E(x) < epsilon — the postcondition, not process completion
 *       (CLAUDE.md gotcha #6). Run after any Learn / learning-file write.
 *
 *   node scripts/bnatsheaf/cli.js imprint_agent --agent <name> [--status <path>]
 *       Imprint-at-spawn: restrict the global knowledge sheaf to the agent's
 *       stalk and verify H¹ ≈ 0 across the whole sheaf BEFORE the agent
 *       starts work. Exit non-zero when the restriction is inconsistent —
 *       the agent must not start.
 *
 *   node scripts/bnatsheaf/cli.js ph_monitor [--min-lifetime 0] [--status <path>]
 *       Persistent-homology monitor: compute H⁰/H¹ barcodes over the BIOME
 *       filtration and list long-lived H¹ bars. Exit non-zero when any
 *       long-lived H¹ bar exists (must be killed or escalated, never
 *       silently glued).
 *
 *   node scripts/bnatsheaf/cli.js fingerprint [--status <path>] [--out <path>]
 *       Compute the topological fingerprint (dim_H0, dim_H1, rank_delta,
 *       energy, long-lived H¹ bars) and optionally write it to
 *       docs/biome/bnat-fingerprint.json (companion file — BIOME schema
 *       untouched). Exit 0 iff the sheaf is consistent (E(x) < ε).
 *
 *   node scripts/bnatsheaf/cli.js cohomology [--status <path>]
 *       Rank-nullity H⁰/H¹ summary of the BIOME sheaf (proof surface).
 *
 * Fallback / what to check if it fails:
 *   - Missing docs/biome/biome-status.json → exit 2 with a named error
 *     (BIOME feed not generated yet; run biome-sheaf.yml or scripts/biome/sheaf.js).
 *   - JSON parse errors are reported verbatim; never swallowed.
 */

const fs = require('fs');
const path = require('path');
const { sheafFromBiomeStatus } = require('./sheaf');
const { barcodesFromBiomeStatus } = require('./persistence');
const { topologicalFingerprint } = require('./fingerprint');
const { computeCohomology } = require('./cohomology');

const DEFAULT_STATUS = path.join(__dirname, '..', '..', 'docs', 'biome', 'biome-status.json');
const DEFAULT_FINGERPRINT = path.join(
  __dirname,
  '..',
  '..',
  'docs',
  'biome',
  'bnat-fingerprint.json'
);

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      args[a.slice(2)] = argv[i + 1];
      i++;
    } else {
      args._.push(a);
    }
  }
  return args;
}

function loadStatus(statusPath) {
  const p = statusPath || DEFAULT_STATUS;
  if (!fs.existsSync(p)) {
    throw new Error(`BIOME status feed not found at ${p} — run scripts/biome/sheaf.js (or biome-sheaf.yml) first`);
  }
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

/** consistency_check core, pure over a status object. */
function consistencyCheck(status, epsilon = 1e-9) {
  const sheaf = sheafFromBiomeStatus(status);
  const energy = sheaf.laplacianEnergy();
  const obstructions = sheaf.h1Obstructions(epsilon);
  return {
    energy,
    epsilon,
    consistent: energy < epsilon,
    obstructions,
  };
}

/** imprint_agent core: restriction of the global sheaf to one agent stalk. */
function imprintAgent(status, agentName, epsilon = 1e-9) {
  const sheaf = sheafFromBiomeStatus(status);
  const global = consistencyCheck(status, epsilon);
  const stalk = sheaf.stalks[agentName];
  const known = stalk !== undefined;
  return {
    agent: agentName,
    known,
    // Restriction: the agent's local section pulled from the global sheaf.
    restriction: known ? stalk.slice() : null,
    globalEnergy: global.energy,
    h1ApproxZero: global.consistent,
    // Imprint succeeds only when the global sheaf is consistent — an agent
    // must never be spawned from a sheaf carrying an unresolved obstruction.
    imprinted: known && global.consistent,
    obstructions: global.obstructions,
  };
}

/**
 * ph_monitor core: barcodes over the BIOME filtration. Graph H¹ bars never
 * die on their own (no 2-cells fill cycles), so every bar is immortal —
 * "long-lived" is measured by BIRTH ENERGY: a bar born at weight ≥ minBirth
 * encodes that much sustained disagreement and must be killed or escalated.
 * Bars born at 0 are topology-only cycles with perfect agreement (harmless).
 */
function phMonitor(status, minBirth = 0) {
  const barcodes = barcodesFromBiomeStatus(status);
  const threshold = Number(minBirth);
  const persistent = barcodes.h1.filter((b) => b.birth >= threshold && b.birth > 0);
  return { barcodes, minBirth: threshold, persistentH1: persistent };
}

function main(argv) {
  const args = parseArgs(argv);
  const command = args._[0];
  let status;
  try {
    status = loadStatus(args.status);
  } catch (err) {
    console.error(`bnatsheaf: ${err.message}`);
    return 2;
  }

  if (command === 'consistency_check') {
    const result = consistencyCheck(status, Number(args.epsilon || 1e-9));
    console.log(JSON.stringify(result, null, 2));
    return result.consistent ? 0 : 1;
  }
  if (command === 'imprint_agent') {
    if (!args.agent) {
      console.error('bnatsheaf: imprint_agent requires --agent <name>');
      return 2;
    }
    const result = imprintAgent(status, args.agent, Number(args.epsilon || 1e-9));
    console.log(JSON.stringify(result, null, 2));
    return result.imprinted ? 0 : 1;
  }
  if (command === 'ph_monitor') {
    const result = phMonitor(status, args['min-lifetime'] || 0);
    console.log(JSON.stringify(result, null, 2));
    return result.persistentH1.length === 0 ? 0 : 1;
  }
  if (command === 'fingerprint') {
    const fp = topologicalFingerprint(status, {
      epsilon: Number(args.epsilon || 1e-9),
      minLifetime: Number(args['min-lifetime'] || 0.5),
    });
    console.log(JSON.stringify(fp, null, 2));
    const outPath = args.out || DEFAULT_FINGERPRINT;
    if (args.out !== undefined || args.write === '1' || args.write === 'true') {
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(outPath, `${JSON.stringify(fp, null, 2)}\n`);
    }
    return fp.consistent ? 0 : 1;
  }
  if (command === 'cohomology') {
    const sheaf = sheafFromBiomeStatus(status);
    const coh = computeCohomology(sheaf, { epsilon: Number(args.epsilon || 1e-9) });
    console.log(JSON.stringify(coh, null, 2));
    return coh.inH0 ? 0 : 1;
  }
  console.error(
    'Usage: cli.js <consistency_check|imprint_agent|ph_monitor|fingerprint|cohomology> [--status <path>] [--epsilon <e>] [--agent <name>] [--min-lifetime <t>] [--out <path>]'
  );
  return 2;
}

if (require.main === module) {
  process.exitCode = main(process.argv.slice(2));
}

module.exports = {
  parseArgs,
  loadStatus,
  consistencyCheck,
  imprintAgent,
  phMonitor,
  main,
  DEFAULT_STATUS,
  DEFAULT_FINGERPRINT,
  topologicalFingerprint,
  computeCohomology,
};
