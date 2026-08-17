# [WR] Grok XAI needs write permissions - triage it should have it and complete phase 2 of sheaf memory improvement

## Output Type (required)

production-app

## PDF pipeline batch

None

## Research Mode

None

## Delivery Mode

None

## Lifecycle Mode

None

## Commercial Mode

None

## Assign To / Decision Team

None

## Summary

N/A

## Objective

PR1 problem_statement (ready for create_pull_request_with_copilot once write is restored)
Title: docs(bnatsheaf): MOTU BNAT Knowledge Sheaf standard + dual-language master prompt
Problem statement:
Create the documentation and standard foundation for the MOTU BNAT Knowledge Sheaf. Add directory docs/bnatsheaf/ and the following files:

docs/bnatsheaf/README.md — overview of the knowledge sheaf, explicit link to the living example scripts/biome/sheaf.js + docs/biome/biome-status.json, and the imprint-at-spawn rule
docs/bnatsheaf/BNAT_SHEAF_STANDARD.md — formal definitions: cellular sheaf, restriction maps, Sheaf Laplacian energy $ E(x) $, $ H^1 $ obstruction, persistent homology barcodes, dual embedding (algebraic + chemistry/cognitive), and the hard Controller rule that no WR assignment or high-blast PR is allowed while $ E(x) > \varepsilon $
docs/bnatsheaf/MOTU_MASTER_PROMPT.md — the full MOTU Visiting Controller system prompt (sections: Identity, Pre-engagement gate, Multi-fleet hygiene, BNAT core, Knowledge Sheaf, Neural Sheaf Diffusion + Persistent Homology, Dual modes, WR/PR + SAYG, Speed-demon algorithms, Output discipline). Use dual formal + cognitive/chemical language throughout
A short learning file recording that this WR was opened and the geometric invariant is now part of the SSOT
Also land wr/WR-MOTU-BNAT-SHEAF.md with the full WR body above
Update .env.example with XAI_API_KEY= / GROK_API_KEY= placeholders only (no real secrets) and a short comment pointing to Vault

Constraints:

Do not modify existing BIOME scripts or behavior yet
Conventional Commits title style
KaTeX-friendly math notation
Preserve identity hygiene language from AGENTS.md and VISITING_AGENTS.md
Explicitly reference and strengthen companion WR wr/pending/14-veins-grounding-gate.md (obstruction reporting, verifier sections)
Everything additive relative to the current BIOME sheaf

This is PR 1 of the WR-MOTU-BNAT-SHEAF series

## Required Bundle

N/A

## Definition of Done

N/A

## Do Not Under-Scope

N/A

## Explicit Exclusions

N/A

## Delivery Shape

None

## Sellable Artifact Bundle

N/A

## Purchase Validation (functions-as-purchased)

N/A

## Expected Scope

N/A

## Validation Expectations

N/A

## Blocker Rule

N/A

## Acknowledgements

- [x] This WR defines a bundled outcome, not just a minimum acceptable patch
- [x] Explicitly requested secondary items should not be silently deferred
- [x] If the PR is partial, the blocker must be documented
- [x] The PR should reflect the WR's required bundle and definition of done
- [x] After implementation, open a PR and continue the loop (reset routing labels / trigger downstream workflows) instead of stopping at the issue
