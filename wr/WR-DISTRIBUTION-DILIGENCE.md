# [WR] Distribution diligence — white-label vendors + DDEX AI disclosure (PR 1)

**Series:** WR-DISTRIBUTION-DILIGENCE
**PR title (Conventional Commits):** `docs(distribution): white-label vendor diligence + DDEX AI disclosure standard`

## Output Type (required)

research-report

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

Decide whether to become a distributor, on evidence rather than appetite. Ships
the vendor diligence framework, the DDEX AI-disclosure requirement, and the
catalog-separation rule that keeps an enforcement action against our own
high-volume AI output from destroying a distribution business.

Costs phone calls, not a contract.

## Objective

Becoming a distributor requires six things: DSP access (direct contracts or
Merlin membership), a DDEX delivery pipeline, royalty accounting, metadata
validation, fraud protection, and client support. Building direct is a
multi-year effort and the DSPs are largely closed to new aggregators, so
white-label is the only honest entry path.

Every credible white-label vendor (SonoSuite, Revelator, FUGA, LabelGrid,
Audicient) is quote-based, enterprise-sales-gated, and publishes no pricing.
This WR produces the diligence needed to make those calls productive and to
compare answers on a fixed rubric instead of on sales energy.

### Deliverables

1. **`docs/distribution/WHITE_LABEL_DILIGENCE.md`** — the vendor rubric. The
   disqualifying question first: **does the vendor hold direct DSP supply-chain
   status, or are they sub-distributing through another aggregator?**
   Sub-sub-distribution stacks latency, failure points, and revenue leakage, and
   vendors do not volunteer it. Then: ERN versions spoken (4.3 and 3.8.2 per
   DSP), Merlin access, royalty accounting model, takedown/permanence terms,
   AI-content policy, and exit terms (who owns the catalog relationship if we
   leave).
2. **`docs/distribution/DDEX_AI_DISCLOSURE.md`** — as of March 2026 Spotify is
   rolling out standardized DDEX AI disclosures, with distributors submitting
   AI-use data in credits. Any distributor we operate must implement this. Not
   optional, and it is a build requirement rather than a policy page.
3. **`docs/distribution/ENFORCEMENT_SEPARATION.md`** — the rule that protects
   the business. See "Catalog separation" below.
4. **`schemas/release-metadata.schema.json`** — extend with AI-disclosure fields
   and an owned-ISRC registrant code, so disclosure is structurally required at
   the metadata layer rather than remembered per release.
5. **`docs/distribution/HIT_PREDICTION_ASSESSMENT.md`** — the written decision
   *not* to ship a popularity predictor, with the evidence. Recorded so the idea
   does not get re-proposed every quarter.
6. **`wr/WR-DISTRIBUTION-DILIGENCE.md`** — this file.
7. **`wr/memory/learnings-distribution.md`** — learning record.

### Catalog separation (the load-bearing constraint)

Spotify removed over 75 million tracks as spam in a single year. Enforcement
targets mass uploads, duplicates, metadata SEO manipulation, and artificially
short tracks, escalating to monetization blocks and **distributor bans**.
Permissive distributors that wave through bulk AI catalogs draw the hardest
scrutiny, and their legitimate clients inherit the suspicion.

Our own roster is high-volume AI-generated music. Routing it through a
distributor we own creates a single point of failure where the volume strategy
can terminate the distribution business — losing supply-chain status is not
losing a release, it is losing the company.

**Rule: our own catalog ships through an established third-party distributor.
The distribution business we operate does not carry it.** This is a structural
constraint on the architecture, not a guideline.

### Hit prediction — explicitly not built

The request that prompted this WR included hit-song-prediction research. It is
not being implemented, for three reasons that belong in the record:

- **The data source is gone.** Spotify deprecated the `audio_features` and
  `audio_analysis` endpoints on 2024-11-27 — the 13-field vector (danceability,
  energy, valence, acousticness, tempo, key) the entire literature depends on.
  No replacement as of 2026.
- **The literature does not replicate.** Pachet & Roy's *Hit Song Science Is Not
  Yet a Science* remains the standing position. The 2023 paper claiming 97%
  accuracy contained data leakage; corrected, it performed barely above random.
- **The cited paper argues against the use case in its own abstract**, warning
  musicians not to be influenced by algorithmic recommendation.

Shipping a popularity score would directly contradict the credibility position
this business depends on.

**What is kept instead:** local feature extraction (Essentia) on audio we own,
used for **QA rather than prediction** — verifying a repaint did not shift key,
tempo, or loudness. This strengthens `docs/repaint/CONSISTENCY.md`. And one
mechanism-backed songwriting finding worth applying in generation prompts:
repetitive lyrics increase processing fluency and correlate with market success
(Nunes, Ordanini & Valsesia, *J. Consumer Psychology*, 2015).

### Constraints

- Diligence only. **No vendor contract, no spend, no commitment** in this WR.
- Additive; no changes to `packages/repaint_core/` behavior.
- Vendor claims recorded as claims, with the date and the person who said it.

## Required Bundle

Docs, schema extension, and tests asserting the schema rejects a release
manifest lacking AI disclosure.

## Definition of Done

- `npm test` passes 100%
- `npm run workflows:validate` reports 0 invalid
- PR title follows Conventional Commits
- All seven deliverables present
- Schema **rejects** a manifest with no AI-disclosure block
- Diligence doc leads with the direct-vs-sub-distribution question
- Enforcement doc states catalog separation as a hard rule

## Do Not Under-Scope

Do not defer any explicitly requested item to a follow-up PR. If a piece is
truly infeasible in one iteration, open a WR-BLOCKER issue (label:
`wr-blocker`) and reference it in the PR body — never silently drop it.

## Explicit Exclusions

- Signing with any white-label vendor.
- Building the DDEX delivery pipeline itself (blocked on vendor choice).
- Royalty accounting implementation.
- Any hit-prediction or popularity-scoring model — permanently out of scope,
  see `HIT_PREDICTION_ASSESSMENT.md`.

## Delivery Shape

One PR preferred, split only if blocked

## Sellable Artifact Bundle

Positioning, not a product yet: **the distributor that handles AI correctly** —
full DDEX AI disclosure, provenance tracking, and artifact QA at intake. In 2026
the DSPs are actively hunting for exactly that and almost nobody offers it. The
repaint editor is the front end; this WR establishes whether the back end is
reachable.

## Purchase Validation (functions-as-purchased)

N/A — diligence phase, nothing sold.

## Expected Scope

Vendor rubric, AI-disclosure standard, enforcement separation rule, schema
extension, negative decision record. No contracts, no pipeline.

## Validation Expectations

`npm test` green. Regression tests assert the schema rejects manifests missing
AI disclosure, and accepts a manifest carrying an owned ISRC registrant code.

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

**Focus Area 3 — automated product pipeline.** Distribution is a low-margin
volume business; it does not pay off on our own catalog and is not justified as
a way to escape a subscription fee. It is justified only as a service business
with a differentiated compliance position. This WR is the cheap test of whether
that position is reachable before any money is committed.

## Owner decisions this WR unblocks

| Decision | Depends on |
| --- | --- |
| Buy the RIAA ISRC registrant code ($95, one-time) | Nothing — recommended regardless |
| Which distributor carries our own catalog | Permanence terms; BandLab Max artist-name limit is unconfirmed |
| Whether to pursue white-label at all | Vendor call outcomes against the rubric |

## Related paths

| Deliverable | Path |
| --- | --- |
| Vendor rubric | `docs/distribution/WHITE_LABEL_DILIGENCE.md` |
| AI disclosure standard | `docs/distribution/DDEX_AI_DISCLOSURE.md` |
| Enforcement separation | `docs/distribution/ENFORCEMENT_SEPARATION.md` |
| Negative decision record | `docs/distribution/HIT_PREDICTION_ASSESSMENT.md` |
| Metadata schema | `schemas/release-metadata.schema.json` |
| This WR | `wr/WR-DISTRIBUTION-DILIGENCE.md` |
| Learning record | `wr/memory/learnings-distribution.md` |
| Consistency contract (strengthened) | `docs/repaint/CONSISTENCY.md` |
