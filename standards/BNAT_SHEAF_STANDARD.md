# BNAT Sheaf Standard

**Version:** 1.0.0
**Status:** Active (WR-16893)
**Scope:** All Revvel agents, fleets, and workflows that read or write the
knowledge sheaf (learning files, BIOME sections, agent state).

## Purpose

Elevate the BIOME sheaf from *metaphor* (liveness gluing) to *mathematics*
(obstruction reporting). Companion to
`wr/pending/14-veins-grounding-gate.md`: a sheaf that always produces a
global section is a rubber stamp, not a sheaf.

## The invariant

1. **H¹ ≈ 0 hard rule.** After any Learn / learning-file write, the sheaf
   Laplacian energy must satisfy `E(x) < ε` (default ε = 1e-9). Enforced by
   `node scripts/bnatsheaf/cli.js consistency_check`.
2. **Imprint-at-spawn.** Every agent instantiation restricts from the
   global knowledge sheaf and verifies H¹ ≈ 0 BEFORE starting work:
   `node scripts/bnatsheaf/cli.js imprint_agent --agent <name>`. A non-zero
   exit blocks the spawn.
3. **No silent gluing.** Long-lived H¹ bars (positive-birth barcodes from
   `ph_monitor`) must be killed (resolved via their transition patch) or
   escalated (`lifecycle:stuck` + `needs-human`) — never ignored.
4. **Strictly additive.** The BIOME feed (`scripts/biome/sheaf.js`,
   `docs/biome/biome-status.json`) is never modified by this layer; BNAT is
   read-only over it.
5. **Exit codes are postconditions.** Every harness command exits 0 only
   when the mathematical postcondition holds (CLAUDE.md gotcha #6).

## Architecture

| Layer | File | Responsibility |
| --- | --- | --- |
| Core sheaf | `scripts/bnatsheaf/sheaf.js` | Cellular sheaf, restriction maps, E(x), H¹ obstruction + transition patches |
| Cohomology | `scripts/bnatsheaf/cohomology.js` | Coboundary δ, rank-nullity, dim H⁰/H¹, energy characterization |
| Persistence | `scripts/bnatsheaf/persistence.js` | Filtration, H⁰/H¹ barcodes (union-find, elder rule), long-lived-bar detection |
| TDA adapters | `scripts/bnatsheaf/tda_adapters.js` | Optional Ripser/GUDHI probes; always falls back to native |
| NSD (offline) | `scripts/bnatsheaf/nsd.js` | Discrete Neural Sheaf Diffusion; learnable diagonal restrictions |
| Fingerprint | `scripts/bnatsheaf/fingerprint.js` | `{dim_H0, dim_H1, rank_delta, energy, long_lived_h1}` companion record |
| Harness | `scripts/bnatsheaf/cli.js` | `consistency_check`, `imprint_agent`, `ph_monitor`, `fingerprint`, `cohomology` |
| Tests | `tests/bnatsheaf.test.js`, `tests/bnatsheaf-cohomology-proofs.test.js` | Unit, integration, property, executable proofs |
| Skill | `skills/bnatsheaf/SKILL.md` | Imprints the invariant into every agent instantiation |
| Observatory | `products/bnat-sheaf-observatory/` | Interactive proof table + live energy SaaS surface |
| Docs | `docs/bnatsheaf/` | README, proofs, PH tools survey, MOTU prompt, NSD follow-on |

## Topological fingerprint (additive companion)

BNAT never mutates the BIOME writer. The fingerprint is a **companion file**:

```bash
node scripts/bnatsheaf/cli.js fingerprint --out docs/biome/bnat-fingerprint.json
```

Schema `bnat-fingerprint/v1` carries `dim_H0`, `dim_H1`, `rank_delta`,
`energy`, `long_lived_h1`, and `consistent`. Monitors may also call
`attachFingerprint(status)` in memory without touching disk.

## Language decision

The originating WR sketched a pure-Python module. The repository's test
gate, CI, and the BIOME sheaf are Node; the implementation is therefore
pure dependency-free JavaScript so `npm test` enforces the invariant on
every PR with zero new toolchain. The mathematics (Hansen–Ghrist cellular
sheaf Laplacians) is unchanged by the language.

## Escalation ladder for persistent obstructions

1. `ph_monitor` exits non-zero → CI turns red (obstruction is named in the
   JSON output: edge, birth energy, transition patch).
2. Apply the transition patch (align the disagreeing sections) OR
3. Open a WR-BLOCKER issue naming the edge and attach the barcode; label
   `lifecycle:stuck` + `needs-human`.
4. It is a policy violation to relax ε or delete the edge to make the
   check pass.

## Secrets

MOTU Lead (Grok) API access: `XAI_API_KEY` (alias `GROK_API_KEY`).
Vault path: `revvel/shared/llm/xai`. Names documented in `.env.example`;
GitHub Actions inject them as environment variables via the standard
`secrets:` → `env:` pattern used by other agent workflows. No bidirectional
protocol required.
