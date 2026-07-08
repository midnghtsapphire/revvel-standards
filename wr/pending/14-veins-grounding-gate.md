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

## Acceptance spec: the owner's own S-MOS guardrails

VSPR (Vascular-Sheaf Policy Repair) is the OWNER'S original architecture;
V.E.I.N.S. is her combination of VSPR with a Perplexity-style work-memory
brain (EmoBank). The "VSPR Swarm Metacognitive Operating System (S-MOS)
Master Prompt" on her Drive (folder: VSPR) defines the guardrails this WR
must implement — treat its §4 as the acceptance spec verbatim:

1. **Anti-Oscillation Limit**: halt after K>=5 failed compile/logic checks
   or K>=3 attempts without reliability improvement; produce a diagnostic
   report; escalate to the human-on-the-loop channel. (Maps to item 3.)
2. **Strict sandboxing**: every self-modification validated in an isolated
   runtime; `write_patch` runs tests and AUTO-ROLLS-BACK on failure.
   (Maps to item 1 — the fleet merged patches that did not even compile.)
3. **Log-poisoning protection**: never ingest unsanitized issue/log text
   into prompts; instruction-shaped strings quarantine the source. (Feeds
   the security fleet WR, member 1: prompt-injection sentinel.)
4. **No deletions without audit** — already partially embodied in
   standards/COMMENT-DONT-DELETE.md.
5. **Layer 6 memory**: RBT (Roses/Buds/Thorns) appraisals + EmoBank
   affective telemetry appended to Learnings.md with the CLAUDE.md index
   updated — the repo has Learnings.md + CLAUDE.md but no RBT structure
   and no EmoBank; add both to the ledger format.

Note: S-MOS Layer 2's complexity-tier routing (simple / reasoning /
deep_search over OpenRouter) is the ancestor of `.github/agent-models.yml`
`routing_tree` (2026-07-08) — the tree should cite S-MOS as its source.

## Context

Companion artifacts on the owner's Drive: veins_core_simulation.py,
test_veins_integration.py, "Pre-Deployment Integration and Verification
Suite" PDF — use them as the reference implementation for the sheaf
Laplacian convergence and the verification suite shape. The repo's BIOME
crew (docs/biome/) is the right substrate: it is real, running, and
credit-free; it just needs correctness sections, not only liveness.
