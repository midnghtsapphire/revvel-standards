# [WR] Hail Release Pipeline — generative-audio QA + release standard (PR 1)

**Series:** WR-HAIL-RELEASE-PIPELINE
**PR title (Conventional Commits):** `feat(releases): Hail release pipeline standard + generative-audio QA gate`

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

digital-product

## Assign To / Decision Team

orchestrator

## Summary

Stand up a repeatable pipeline that takes a release from concept → generated
audio → artifact QA → repair → master → distribution metadata, under a single
artist identity. Establishes the **Hail** release standard as a governed asset
class in `revvel-standards`, with the operational repo split out as
`revvel-releases`.

## Objective

Music releases are currently ad-hoc: three competing artist names
(`audrey evans`, `revvel hail`, `hailstorm`), no fixed generation parameters,
no defined QA gate between "AI generated a track" and "track is shippable,"
and no metadata standard. This WR makes the pipeline deterministic and
repeatable so each subsequent release is marginal-cost, not a fresh project.

### Deliverables

1. **`docs/releases/RELEASE_STANDARD.md`** — the governing standard: identity
   lock (one artist name), naming rules for release vs. track vs. imprint,
   required metadata fields (ISRC, UPC, credits, AI-disclosure), and the
   canonical folder layout for a release.
2. **`docs/releases/GENERATIVE_AUDIO_QA.md`** — the artifact QA gate. Defines
   the artifact taxonomy (transient glitch, broadband burst, feedback-like
   resonance, spectral/temporal/phase discontinuity, granular warble, codec
   artifact), the **intentionality test** (an event is a defect only if it is
   contextually unjustified — pedal distortion, tape saturation, breath, and
   fret noise are NOT defects), and the repair-vs-regenerate decision rule.
3. **`docs/releases/PROMPT_STANDARD.md`** — the generation prompt contract:
   the style-prompt formula (`[Era] + [Sub-genre] + [Instruments] +
   [Production texture] + [Mood] + [BPM] + [Key]`), structure-tag conventions
   (`[Verse]` / `[Chorus]` / `[Bridge]` on their own lines), phonetic-respell
   rules for pronunciation control, and the locked per-release style prompt so
   every track on a record is sonically consistent.
4. **`docs/releases/REPAIR_RUNBOOK.md`** — the BandLab-specific repair
   procedures with an explicit tool-capability boundary (BandLab has region
   split/fade, parameter automation, and Splitter stem separation; it has NO
   spectral editor, so spectral-repair-class defects must be routed to
   regeneration or an external tool).
5. **`schemas/release-metadata.schema.json`** — machine-validatable schema for
   a release manifest, so distribution metadata is linted, not hand-typed.
6. **`scripts/releases/validate-release.mjs`** + tests — CI check that a
   release folder satisfies the schema and the QA gate has a recorded verdict.
7. **`wr/WR-HAIL-RELEASE-PIPELINE.md`** — this file.
8. **`wr/memory/learnings-hail-pipeline.md`** — learning record.

### Identity decision (blocking input required)

The three existing names must collapse to one primary artist identity before
any distribution metadata is written; re-registering an artist profile after
release is expensive and splits streaming history. Recommendation recorded in
`RELEASE_STANDARD.md`; final call is the owner's.

### Constraints

- Additive only — no changes to existing `oaudrey/` or `products/` behavior.
- Conventional Commits title style.
- No real credentials; generator API keys go to `.env.example` + Vault comment
  only.
- The QA gate must be **preserve-by-default**: when intentionality is
  uncertain, flag the region, do not auto-repair.

## Required Bundle

Implementation code, tests, docs, schema, and workflow wiring. Secrets by name
only via `.env.example` + Vault comment.

## Definition of Done

- `npm test` passes 100%
- `npm run workflows:validate` reports 0 invalid
- `anti-scaffolding-enforcer.yml` passes
- PR title follows Conventional Commits
- All eight deliverables present
- `validate-release.mjs` rejects a release manifest missing required metadata
- QA doc includes the intentionality test and the tool-capability boundary
- No existing product paths modified

## Do Not Under-Scope

Do not defer any explicitly requested item to a follow-up PR. If a piece is
truly infeasible in one iteration, open a WR-BLOCKER issue (label:
`wr-blocker`) and reference it in the PR body — never silently drop it.

## Explicit Exclusions

- Actual audio generation, mixing, or mastering of any specific track. This WR
  ships the **standard and the gate**, not a record.
- Distributor account setup and any spend.
- Trademark clearance filing (flagged as a downstream dependency, not done here).

## Delivery Shape

One PR preferred, split only if blocked

## Sellable Artifact Bundle

Indirect. The pipeline itself is the asset: it converts each future release
from a bespoke project into a templated run. The productizable spin-out is the
**Generative Audio QA gate** — an artifact-detection + repair-decision standard
that is genre-agnostic and applies to any AI-generated audio.

## Purchase Validation (functions-as-purchased)

N/A for PR 1 — no purchased artifact in this scope.

## Expected Scope

Standard + QA gate + prompt contract + repair runbook + schema + validator +
tests. No audio produced.

## Validation Expectations

`npm test` and `npm run workflows:validate` green. Regression tests assert:
required doc files exist; schema rejects manifests missing ISRC/UPC/credits/
AI-disclosure; QA doc contains the intentionality test; repair runbook states
the BandLab capability boundary.

## Blocker Rule

If any part of the Required Bundle cannot be completed in one iteration, open a
WR-BLOCKER issue (label: `wr-blocker`) naming the missing capability,
credential, or human action, and reference it from the PR body. Do NOT silently
drop scope.

## Acknowledgements

- [x] This WR defines a bundled outcome, not just a minimum acceptable patch.
- [x] Explicitly requested secondary items should not be silently deferred.
- [x] If the PR is partial, the blocker must be documented.
- [x] The PR should reflect the WR's required bundle and definition of done.
- [x] After implementation, open a PR and continue the loop.

## Mission Alignment

Maps to **Focus Area 3 — automated product pipeline**. This WR does not claim
direct revenue in Phase 1. Its justification is marginal-cost repeatability:
the gate and schema are reused by every subsequent release, and the QA gate is
independently productizable. If the research engine scores Phase-1 revenue
impact as insufficient, reshape toward the standalone **Generative Audio QA**
product rather than rejecting the pipeline work.

## Related paths

| Deliverable | Path |
| --- | --- |
| Release standard | `docs/releases/RELEASE_STANDARD.md` |
| QA gate | `docs/releases/GENERATIVE_AUDIO_QA.md` |
| Prompt contract | `docs/releases/PROMPT_STANDARD.md` |
| Repair runbook | `docs/releases/REPAIR_RUNBOOK.md` |
| Metadata schema | `schemas/release-metadata.schema.json` |
| Validator | `scripts/releases/validate-release.mjs` |
| This WR | `wr/WR-HAIL-RELEASE-PIPELINE.md` |
| Learning record | `wr/memory/learnings-hail-pipeline.md` |
| Operational repo (split) | `midnghtsapphire/revvel-releases` |
