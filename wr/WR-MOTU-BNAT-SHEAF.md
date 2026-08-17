# [WR] MOTU BNAT Knowledge Sheaf — standard foundation (PR 1)

**Issue:** [#16900](https://github.com/midnghtsapphire/revvel-standards/issues/16900)  
**Series:** WR-MOTU-BNAT-SHEAF  
**PR title (Conventional Commits):** `docs(bnatsheaf): MOTU BNAT Knowledge Sheaf standard + dual-language master prompt`

## Output Type (required)

production-app

## PDF pipeline batch

Not applicable

## Research Mode

deepresearch

## Delivery Mode

build-direct

## Lifecycle Mode

new-build

## Commercial Mode

saas-app

## Assign To / Decision Team

orchestrator

## Summary

Grok XAI needs write permissions — triage it should have it and complete
phase 2 of sheaf memory improvement. This WR lands **PR 1**: the MOTU BNAT
Knowledge Sheaf documentation and standard foundation (dual-language master
prompt, formal sheaf definitions, learning record, env placeholders).

## Objective

Create the documentation and standard foundation for the MOTU BNAT Knowledge
Sheaf. Add directory `docs/bnatsheaf/` and the following files:

1. **`docs/bnatsheaf/README.md`** — overview of the knowledge sheaf, explicit
   link to the living example `scripts/biome/sheaf.js` +
   `docs/biome/biome-status.json`, and the imprint-at-spawn rule.
2. **`docs/bnatsheaf/BNAT_SHEAF_STANDARD.md`** — formal definitions: cellular
   sheaf, restriction maps, Sheaf Laplacian energy $E(x)$, $H^1$ obstruction,
   persistent homology barcodes, dual embedding (algebraic +
   chemistry/cognitive), and the hard Controller rule that no WR assignment
   or high-blast PR is allowed while $E(x) > \varepsilon$.
3. **`docs/bnatsheaf/MOTU_MASTER_PROMPT.md`** — the full MOTU Visiting
   Controller system prompt (sections: Identity, Pre-engagement gate,
   Multi-fleet hygiene, BNAT core, Knowledge Sheaf, Neural Sheaf Diffusion +
   Persistent Homology, Dual modes, WR/PR + SAYG, Speed-demon algorithms,
   Output discipline). Use dual formal + cognitive/chemical language
   throughout.
4. **A short learning file** recording that this WR was opened and the
   geometric invariant is now part of the SSOT
   (`wr/memory/learnings-bnat-sheaf.md`).
5. **`wr/WR-MOTU-BNAT-SHEAF.md`** — this file; full WR body.
6. **`.env.example`** — `XAI_API_KEY=` / `GROK_API_KEY=` placeholders only
   (no real secrets) and a short comment pointing to Vault
   (`revvel/shared/llm/xai`).

### Constraints

- Do **not** modify existing BIOME scripts or behavior yet.
- Conventional Commits title style.
- KaTeX-friendly math notation.
- Preserve identity hygiene language from `AGENTS.md` and
  `VISITING_AGENTS.md`.
- Explicitly reference and strengthen companion WR
  `wr/pending/14-veins-grounding-gate.md` (obstruction reporting, verifier
  sections).
- Everything additive relative to the current BIOME sheaf.

This is **PR 1** of the WR-MOTU-BNAT-SHEAF series.

## Required Bundle

Implementation code, tests, docs updates required to describe or explain the
change, and workflow wiring where relevant. If secrets are required, add
their names (not values) to secrets documentation via the standard path
(`.env.example` + Vault comment; `docs/bom/SECRETS_BOM.md` / connections
registry as applicable).

## Definition of Done

- `npm test` passes 100%
- `npm run workflows:validate` reports 0 invalid
- `anti-scaffolding-enforcer.yml` passes
- PR title follows Conventional Commits
- New files documented where relevant
- All six deliverables above present with required content
- BIOME scripts untouched

## Do Not Under-Scope

Do not defer any explicitly requested item to a follow-up PR. If a piece is
truly infeasible in one iteration, open a WR-BLOCKER issue (label:
`wr-blocker`) and reference it in the PR body — never silently drop it.

## Explicit Exclusions

N/A — no items are explicitly out of scope for this WR. (BIOME *behavior*
changes remain deferred by the additive constraint; documentation and
standard foundation are in scope.)

## Delivery Shape

One PR preferred, split only if blocked

## Sellable Artifact Bundle

N/A — not a sellable artifact for this Output Type.

## Purchase Validation (functions-as-purchased)

N/A — not a purchased artifact for this Output Type.

## Expected Scope

Documentation + standard foundation + regression tests for the MOTU BNAT
Knowledge Sheaf (PR 1). Living BIOME example linked, not rewritten.

## Validation Expectations

`npm test` and `npm run workflows:validate` must be green. Docs package
regression tests assert required files and key phrases (imprint-at-spawn,
$E(x)$, $H^1$, VEINS companion, ten MOTU prompt sections, XAI/GROK
placeholders).

## Blocker Rule

If any part of the Required Bundle cannot be completed in one iteration, open
a WR-BLOCKER issue (label: `wr-blocker`) that names the missing capability,
credential, or human action, and reference it from the PR body. Do NOT
silently drop scope.

## Acknowledgements

- [x] This WR defines a bundled outcome, not just a minimum acceptable patch.
- [x] Explicitly requested secondary items should not be silently deferred.
- [x] If the PR is partial, the blocker must be documented.
- [x] The PR should reflect the WR's required bundle and definition of done.
- [x] After implementation, open a PR and continue the loop (reset routing
      labels / trigger downstream workflows) instead of stopping at the issue.

## Related paths

| Deliverable | Path |
| --- | --- |
| Overview | `docs/bnatsheaf/README.md` |
| Formal standard | `docs/bnatsheaf/BNAT_SHEAF_STANDARD.md` |
| Master prompt | `docs/bnatsheaf/MOTU_MASTER_PROMPT.md` |
| Learning record | `wr/memory/learnings-bnat-sheaf.md` |
| This WR | `wr/WR-MOTU-BNAT-SHEAF.md` |
| Env placeholders | `.env.example` |
| VEINS companion | `wr/pending/14-veins-grounding-gate.md` |
| Living BIOME glue | `scripts/biome/sheaf.js` |
| Living BIOME feed | `docs/biome/biome-status.json` |
