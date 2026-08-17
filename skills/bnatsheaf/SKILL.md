# Skill: bnatsheaf — Knowledge Sheaf Consistency (H¹ ≈ 0)

**Version:** 1.1.0
**Status:** Active
**Standard:** `standards/BNAT_SHEAF_STANDARD.md`
**Docs:** `docs/bnatsheaf/README.md` · `docs/bnatsheaf/SHEAF_COHOMOLOGY_PROOFS.md` · `docs/bnatsheaf/PERSISTENT_HOMOLOGY_TOOLS.md`
**Tests:** `tests/bnatsheaf.test.js` · `tests/bnatsheaf-cohomology-proofs.test.js`
**App:** `products/bnat-sheaf-observatory/`

## When to load this skill

Load whenever a task involves: knowledge sheaf, sheaf consistency, H¹,
Laplacian energy, persistent homology, barcodes, imprint-at-spawn, MOTU,
BNAT, learning-file writes, BIOME status obstruction reporting, cohomology
proofs, or topological fingerprints.

## The rule you inherit

Every agent instantiation restricts from the global knowledge sheaf and
verifies **H¹ ≈ 0** before starting work. Every Learn / learning-file write
is followed by a consistency check. Persistent obstructions are killed or
escalated — never silently glued. Core path is credit-free (no Ripser/GUDHI).

## Commands

```bash
# 1. Imprint-at-spawn (run before starting work; non-zero exit = do not start)
node scripts/bnatsheaf/cli.js imprint_agent --agent <your-worker-name>

# 2. After any learning-file write: assert E(x) < ε
node scripts/bnatsheaf/cli.js consistency_check --epsilon 1e-9

# 3. Monitor persistent H¹ bars (kill or escalate any reported bar)
node scripts/bnatsheaf/cli.js ph_monitor --min-lifetime 0.5

# 4. Rank-nullity H⁰/H¹ summary (executable proofs)
node scripts/bnatsheaf/cli.js cohomology

# 5. Topological fingerprint companion (BIOME schema untouched)
node scripts/bnatsheaf/cli.js fingerprint --out docs/biome/bnat-fingerprint.json
```

All commands read `docs/biome/biome-status.json` (override with
`--status <path>`), are read-only over the feed, and exit 0 only when the
postcondition holds.

## Escalation

If `consistency_check`, `ph_monitor`, or `fingerprint` fails and the
transition patch in the JSON output cannot be applied immediately: open a
WR-BLOCKER issue, label `lifecycle:stuck` + `needs-human`, attach the
obstruction JSON. Do not relax epsilon; do not delete edges; do not add
Ripser/GUDHI as a required dependency to silence the gate.

## Programmatic use

```js
const { CellularSheaf, sheafFromBiomeStatus } = require('./scripts/bnatsheaf/sheaf');
const { computeCohomology } = require('./scripts/bnatsheaf/cohomology');
const { computeBarcodes } = require('./scripts/bnatsheaf/persistence');
const { topologicalFingerprint } = require('./scripts/bnatsheaf/fingerprint');
const { consistencyCheck, imprintAgent, phMonitor } = require('./scripts/bnatsheaf/cli');
```
