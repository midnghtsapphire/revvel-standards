# Spectrum Blueprint — Read-Through

**Source:** uncited infographic (Drive). Tags below assess **claim-standing** (how well-supported the claim is in the general literature the author is familiar with), not a formal literature verification. **No citations are fabricated.** Where the infographic makes a numeric claim without a source, the claim is tagged `[SPECULATIVE]` regardless of whether it is plausible.

Legend:

- `[PROVEN]` — widely replicated, textbook-level.
- `[EMERGING]` — supported by recent primary literature but not yet consensus.
- `[SPECULATIVE]` — plausible-sounding but unverified in this document; retained for reading/research, **not** for operational use.

---

## Load-bearing (what the Photon Bench actually acts on)

1. **Blue light (~440–490 nm) suppresses melatonin at night.** `[PROVEN]`
2. **Red / near-IR (~630–850 nm) penetrates tissue more deeply than shorter wavelengths.** `[PROVEN]`
3. **Photic flicker in the 3–70 Hz band can trigger seizures in susceptible individuals.** `[PROVEN]` — this is the basis of the FLICKER gate.
4. **UV-B (~295–315 nm) drives cutaneous vitamin-D3 synthesis.** `[PROVEN]`
5. **Direct retinal exposure to sub-400 nm or high-irradiance sources causes photochemical damage.** `[PROVEN]` — basis of the OCULAR gate.

## Aspirational (retained for research, not operational)

6. **Specific narrowband wavelengths (e.g. 670 nm) improve mitochondrial function in aged retina.** `[EMERGING]` — small RCTs exist; effect size and durability disputed.
7. **Green light (~525 nm) reduces migraine severity.** `[EMERGING]` — one prominent trial; not yet replicated at scale.
8. **Photobiomodulation improves cognitive performance in healthy adults.** `[SPECULATIVE]` — mixed literature, high risk of publication bias.
9. **Specific circadian "dose" curves (lux-hours) predict individual sleep latency.** `[SPECULATIVE]` — population averages exist; individual prediction is weak.
10. **Infrared sauna exposure produces cardiovascular benefits equivalent to moderate exercise.** `[SPECULATIVE]` — observational only; confounded.

## BLANK

Claims in the infographic that are not evaluable from the infographic alone (no numbers, no mechanism, no falsifiable prediction) are listed here and **not** tagged. They remain in the source for reference but are excluded from any operational path:

- "Full-spectrum light restores natural rhythm."
- "Certain frequencies harmonize cellular water."
- "Sunlight is the original medicine."

---

## Note on retention

Speculative material is **kept, not deleted**. The Photon Bench operator may read speculative claims for research direction, but the dashboard, dose engine, and harvest pipeline act only on `[PROVEN]` claims and the two gates that derive from them (FLICKER, OCULAR).
