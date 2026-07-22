# Spectrum Blueprint — Read-Through

**Source:** uncited infographic (Drive).
**Method:** every claim tagged `[PROVEN]` / `[EMERGING]` / `[SPECULATIVE]`. Tags reflect **claim standing**, not literature verification — no citations are fabricated. Speculative material is **kept, not deleted**, for reading and research.

---

## Load-bearing (informs shipped gates)

- `[PROVEN]` Blue light (~450–495 nm) suppresses melatonin at evening exposure. Basis for the `ocular/circadian` shard priority.
- `[PROVEN]` PWM flicker below ~100 Hz is detectable by a nontrivial minority and can trigger headache/migraine in susceptible individuals. Basis for the `FLICKER` triage tag.
- `[PROVEN]` UV-A/UV-B thresholds for erythema and photokeratitis are well-characterized (ICNIRP). Basis for `HARM` escalation on any UV-adjacent delta.
- `[EMERGING]` Red/near-IR (~630–850 nm) photobiomodulation shows dose-dependent effects on mitochondrial cytochrome-c-oxidase in vitro and in some clinical trials. Dose engine treats these as **bounded suggestions**, not prescriptions.
- `[EMERGING]` Melanopic lux (α-opic metric, CIE S 026) as a better predictor of non-visual effects than photopic lux. Adopted in the dashboard's advisory column.

## Aspirational (kept for research, NOT wired to gates)

- `[SPECULATIVE]` Specific-wavelength "resonance" claims for organ systems beyond eye/skin/circadian.
- `[SPECULATIVE]` Quantified longevity or cognitive-enhancement effects from ambient lighting choices.
- `[SPECULATIVE]` "Full-spectrum" as a health category distinct from CRI/TM-30 metrics.
- `[SPECULATIVE]` Coupling of visible-light exposure to non-photic endpoints (metabolic rate, mood at clinical thresholds) without controlled-trial support.

## BLANK — claims present in the infographic that could not be assessed

> Reserved. Populate only with evidence from an API-returned source (per WR-4200: a fabricated citation is a P0 incident). Do not fill from memory.

- [ ] _blank_
- [ ] _blank_
- [ ] _blank_

---

## Reading discipline

1. `[SPECULATIVE]` items are **read material**. They do not gate product behavior.
2. Promotion from `[SPECULATIVE]` → `[EMERGING]` requires a Crossref/NCBI hit surfaced by `tools/harvest.py` (URL from API response, never constructed).
3. Promotion from `[EMERGING]` → `[PROVEN]` requires multiple independent trials or a standards-body citation (ICNIRP, CIE, IEC).
4. Demotion is allowed and expected. A quiet day is a success.

## What this file is not

- Not a literature review.
- Not a source of citations.
- Not a substitute for the harvest pipeline output.

It is a **reading map** for the infographic, with claim-standing tags so the reader knows which paragraphs to trust and which to enjoy.
