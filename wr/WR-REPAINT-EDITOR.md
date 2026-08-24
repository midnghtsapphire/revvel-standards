# [WR] Masked-repaint song editor — ACE-Step spike + word-level edit UI (PR 1)

**Series:** WR-REPAINT-EDITOR
**PR title (Conventional Commits):** `feat(repaint): ACE-Step evaluation spike + masked-repaint editor core`

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

Build the editing surface that generative music tools are missing: click a word
in a song, type its replacement, get it re-sung in the same voice, melody, and
mix. Same interaction removes artifacts — select a region, hit Remove.

Descript proved the UX for **speech** (Regenerate / Overdub). ACE-Step ships the
model capability for **song** (masked repainting + flow-edit lyric editing,
Apache-2.0). Nobody has joined them. This WR joins them.

## Objective

Both user problems — "fix one word" and "kill this one-second artifact" — are
the same primitive: **masked repaint over a time span with fixed conditioning**.
Word-fix passes new lyrics into the mask; artifact-removal passes the original
lyrics unchanged. Build the primitive once; both features fall out.

### Deliverables

1. **`docs/repaint/SPIKE_REPORT.md`** — ACE-Step evaluation against a written
   pass/fail bar, run before any UI work. Measures: repaint seam audibility,
   voice-identity drift across an edit, minimum viable mask width, wall-clock
   per edit on rented GPU, cost per edit. **Explicit kill criteria** — if voice
   drift exceeds the bar, this WR stops here and reports, rather than proceeding
   to build UI on an unusable core.
2. **`packages/repaint-core/`** — model adapter exposing one operation:
   `repaint({ audio, maskStart, maskEnd, lyrics?, seed, conditioning })`.
   Model-agnostic interface; ACE-Step is the first implementation, DiffRhythm 2
   and YuE are alternate backends behind the same contract.
3. **`packages/repaint-core/align/`** — forced-alignment pass producing
   word-level timestamps, so the UI knows which span holds which word. This is
   a required component, not a freebie.
4. **`apps/editor/`** — the surface: waveform + lyrics aligned to time. Click a
   word → type replacement → repaint that span. Drag-select a region → Remove →
   repaint with unchanged lyrics. Nothing else ships in PR 1.
5. **`docs/repaint/CONSISTENCY.md`** — the seed/conditioning contract that keeps
   a repaired span sounding like the same singer. Named as its own deliverable
   because it is the primary technical risk, not an implementation detail.
6. **`schemas/repaint-session.schema.json`** — session format: source audio ref,
   edit history, per-edit seed and conditioning, so every edit is reproducible
   and undoable.
7. **`wr/WR-REPAINT-EDITOR.md`** — this file.
8. **`wr/memory/learnings-repaint.md`** — learning record.

### Constraints

- Spike gate first. No UI work merges before `SPIKE_REPORT.md` records a pass.
- Backend behind an interface — do not couple the editor to ACE-Step internals.
- Additive; no changes to existing `products/` or `oaudrey/` paths.
- GPU credentials by name only: `.env.example` + Vault comment.
- **Training-data rule:** any LoRA fine-tune in this or later PRs uses only
  audio the owner holds rights to. Third-party catalog training is out of scope
  permanently, not deferred.

## Required Bundle

Implementation code, tests, docs, schema, and workflow wiring. Secrets by name
only via `.env.example` + Vault comment.

## Definition of Done

- `npm test` passes 100%
- `npm run workflows:validate` reports 0 invalid
- `anti-scaffolding-enforcer.yml` passes
- PR title follows Conventional Commits
- All eight deliverables present
- `SPIKE_REPORT.md` records measured numbers against the stated bar — not prose
- Editor performs a word replacement end-to-end on a real generated track
- Editor performs an artifact removal end-to-end using the same code path
- Repaint calls are reproducible from the session schema alone

## Do Not Under-Scope

Do not defer any explicitly requested item to a follow-up PR. If a piece is
truly infeasible in one iteration, open a WR-BLOCKER issue (label:
`wr-blocker`) and reference it in the PR body — never silently drop it.

## Explicit Exclusions

- Avatar video generation. Downstream WR; hosted API (Hedra) when it lands.
- Full song generation UI (prompt → new track). The editor is the wedge; the
  generator is commodity and can wrap the same core later.
- Model training or fine-tuning of any kind.
- Billing, accounts, multi-tenancy.

## Delivery Shape

One PR preferred, split only if blocked

## Sellable Artifact Bundle

The editor is the sellable product. Positioning: **the missing edit layer for
AI music** — sold to people who already generate with Suno, Udio, or Donna and
have no way to fix one word without regenerating the whole track. Wedge is
narrow and the pain is acute, which is what makes it sellable early.

## Purchase Validation (functions-as-purchased)

PR 1 ships no purchase flow. Validation for this WR is functional: a user can
complete both edit types on a real track. Purchase validation attaches to the
follow-up packaging WR.

## Expected Scope

Spike + core primitive + alignment + minimal editor + consistency contract +
schema + tests. No video, no generator UI, no training.

## Validation Expectations

`npm test` and `npm run workflows:validate` green. Regression tests assert:
repaint adapter honors mask boundaries; identical seed plus identical
conditioning yields identical output; session schema round-trips an edit
history; alignment returns per-word spans for a known fixture.

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

**Focus Area 3 — automated product pipeline.** This is a SaaS product with a
narrow wedge and an existing, identifiable buyer population (anyone shipping AI
music today). It clears the PRIME DIRECTIVE gate on its own merits rather than
by argument.

Sequencing note: `WR-HAIL-RELEASE-PIPELINE` becomes **downstream** of this WR —
the owner's own releases are the first production use of this editor, which
makes the release pipeline a dogfooding channel rather than a competing effort.

## Open decisions (not blocking PR 1)

| Decision | Owner | Blocks |
| --- | --- | --- |
| Product name | owner | packaging WR, not this one |
| Artist name (one syllable; see naming analysis) | owner | release metadata, not this one |
| Hosted vs. self-hosted GPU at launch | orchestrator | pricing WR |

## Related paths

| Deliverable | Path |
| --- | --- |
| Spike report | `docs/repaint/SPIKE_REPORT.md` |
| Consistency contract | `docs/repaint/CONSISTENCY.md` |
| Core primitive | `packages/repaint-core/` |
| Alignment | `packages/repaint-core/align/` |
| Editor app | `apps/editor/` |
| Session schema | `schemas/repaint-session.schema.json` |
| This WR | `wr/WR-REPAINT-EDITOR.md` |
| Learning record | `wr/memory/learnings-repaint.md` |
| Downstream WR | `wr/WR-HAIL-RELEASE-PIPELINE.md` |
