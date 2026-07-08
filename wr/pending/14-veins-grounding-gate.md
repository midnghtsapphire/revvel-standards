# [WR] VEINS grounding gate — stop fake-sheaf healing (verified sections or no glue)

## Output Type

internal-script-automation

## Objective

The owner's V.E.I.N.S. research (Drive: "The Cognitive Architecture for
Self-Healing Agent Networks") predicts exactly the failure the fleet has
been living. Its "Speculative Hallucination & Rule-Poisoning" section:
the system "begins optimizing for hallucinated successes — generating and
validating code modifications that pass its own synthetic evaluations but
slowly drift away from correctness." Observed in this repo 2026-07-08:
six merge-mangled sites shipped while gates were red; Ship Quality Check
is an LLM vibe-scan of the diff that never runs the test suite and said
"PASS — Ready to ship" over a broken pipeline for weeks.

The doc's own prescribed safeguards are the spec. Implement them:

1. **Bi-directional Proof & Grounding Gate (CuP = 100%)**: no agent patch
   deploys until it compiles in sandbox AND the real test suite passes.
   Concretely: ship-quality.yml must consume the actual `npm test` result
   (and the compile gates) — an LLM opinion may WARN, never PASS.
   auto-merge / auto-approve-clean-prs must require the same.
2. **Sheaf obstruction reporting**: biome-sheaf currently glues worker
   liveness into a global "healthy" — liveness is not correctness. Add
   verifier sections (suite state, script compile checks, generate-wr
   smoke run) as sheaf stalks; when any local section conflicts, the
   global section must show the obstruction (overall: degraded), never
   glue over it. A sheaf that always produces a global section is not a
   sheaf — it is a rubber stamp.
3. **Convergence Judge with rollback**: when the same component is
   "fixed" 3+ times without the verifier flipping green (cyclic
   oscillation), freeze the lane: stop accepting more auto-patches for
   that component, escalate lifecycle:stuck + needs-human with the
   failure history attached. (veins-intake-dedup escalation is the seed;
   extend it to PR-level fix loops.)
4. **Immunological recall**: before any self-heal lane generates a fix,
   it must query learnings.md for a prior validated cure for the same
   normalized failure signature and reuse it (the doc's cached "monomer
   patch" / 70% ledger hit rate). Misses get appended after validation.

## Definition of Done

- Ship Quality can no longer say PASS while `npm test` fails (seeded test)
- biome-status shows degraded when a seeded compile-break exists, and the
  break is named in the feed
- A looping fix (3x same component, still red) freezes and escalates
  instead of patching a fourth time
- Self-heal prompts include the learnings.md recall step

## Context

Companion artifacts on the owner's Drive: veins_core_simulation.py,
test_veins_integration.py, "Pre-Deployment Integration and Verification
Suite" PDF — use them as the reference implementation for the sheaf
Laplacian convergence and the verification suite shape. The repo's BIOME
crew (docs/biome/) is the right substrate: it is real, running, and
credit-free; it just needs correctness sections, not only liveness.
