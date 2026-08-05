# Skill: bnatsheaf — Knowledge Sheaf Consistency (H¹ ≈ 0)

**Version:** 1.0.0
**Status:** Active
**Standard:** `standards/BNAT_SHEAF_STANDARD.md`
**Docs:** `docs/bnatsheaf/README.md` · `docs/bnatsheaf/MOTU_MASTER_PROMPT.md`
**Tests:** `tests/bnatsheaf.test.js`

## When to load this skill

Load whenever a task involves: knowledge sheaf, sheaf consistency, H¹,
Laplacian energy, persistent homology, barcodes, imprint-at-spawn, MOTU,
BNAT, learning-file writes, or BIOME status obstruction reporting.

## The rule you inherit

Every agent instantiation restricts from the global knowledge sheaf and
verifies **H¹ ≈ 0** before starting work. Every Learn / learning-file write
is followed by a consistency check. Persistent obstructions are killed or
escalated — never silently glued.

## Commands

```bash
# 1. Imprint-at-spawn (run before starting work; non-zero exit = do not start)
node scripts/bnatsheaf/cli.js imprint_agent --agent <your-worker-name>

# 2. After any learning-file write: assert E(x) < ε
node scripts/bnatsheaf/cli.js consistency_check --epsilon 1e-9

# 3. Monitor persistent H¹ bars (kill or escalate any reported bar)
node scripts/bnatsheaf/cli.js ph_monitor --min-lifetime 0.5
```

All commands read `docs/biome/biome-status.json` (override with
`--status <path>`), are read-only over the feed, and exit 0 only when the
postcondition holds.

## Escalation

If `consistency_check` or `ph_monitor` fails and the transition patch in
the JSON output cannot be applied immediately: open a WR-BLOCKER issue,
label `lifecycle:stuck` + `needs-human`, attach the obstruction JSON.
Do not relax epsilon; do not delete edges.

## Programmatic use

```js
const { CellularSheaf, sheafFromBiomeStatus } = require('./scripts/bnatsheaf/sheaf');
const { computeBarcodes } = require('./scripts/bnatsheaf/persistence');
const { consistencyCheck, imprintAgent, phMonitor } = require('./scripts/bnatsheaf/cli');
```
