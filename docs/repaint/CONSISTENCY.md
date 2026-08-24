# Voice consistency contract

The product promise is one sentence: **change a word, keep the singer.**

Everything here exists to protect that sentence. If a repaired span sounds like
a slightly different vocalist, the tool is worthless — a user would rather
regenerate the whole track than ship a song with a patched-in stranger on one
line. This is the primary technical risk of the entire product, which is why it
is a named deliverable rather than an implementation note.

## What must not change

ACE-Step's output is a function of the seed *and* the full conditioning. Change
any of the following between the source render and a later edit, and the voice
moves:

`prompt`, `audio_duration`, `infer_step`, `guidance_scale`, `scheduler_type`,
`cfg_type`, `omega_scale`, `guidance_interval`, `guidance_interval_decay`,
`min_guidance_scale`, `use_erg_tag`, `use_erg_lyric`, `use_erg_diffusion`,
`guidance_scale_text`, `guidance_scale_lyric`, `lora_name_or_path`,
`lora_weight`

These are enumerated in `CONDITIONING_FIELDS` in `packages/repaint_core/core.py`
and enforced by `Conditioning.assert_matches`, which raises
`ConditioningMismatch` rather than warning. A warning would be logged and
ignored; the failure it describes is silent and expensive, so it has to stop the
run.

## The two seeds

ACE-Step takes `manual_seeds` and `retake_seeds` separately, and this is the
single sharpest edge in the whole integration:

```python
"manual_seeds": [conditioning.seed],
"retake_seeds": [conditioning.seed],   # <- easy to forget, and fatal
```

Leave `retake_seeds` unset and the pipeline draws a fresh one. The edit will
still "work" — audio comes back, the word is correct, nothing errors — but the
repainted span is sampled from a different trajectory and the timbre drifts.
This is the archetypal failure of this product category: a bug that produces
plausible output and is only caught by listening. `TestSeedPinning` in
`tests/test_repaint_core.py` locks both.

## Span widening is lossy, so it is recorded

The model accepts repaint bounds in whole seconds. A user drawing a 0.4 s mask
around one word gets widened outward — floor the start, ceil the end — because
rounding inward would leave part of the defect in the track.

The consequence: **more audio is regenerated than the user selected.** Both the
requested span and the widened bounds are written into every receipt
(`span_s` vs `repaint_bounds_s`) so the gap is auditable rather than invisible.

Sub-second masking is the main open question the spike answers. If the narrowest
usable mask turns out to be wider than ~2 s, "fix one word" is not honestly a
feature — the tool is regenerating phrases and calling them words. That is why
`MAX_USABLE_MASK_S` is a hard gate criterion in `scripts/spike/run_spike.py`.

## Undo is replay

Sessions store receipts, not audio. Any state of the track is rebuilt from the
source render plus the edit list, which is why every receipt carries its own
seed and full conditioning. Two properties follow:

- An edit history is portable and diffable; it is text.
- A session recorded today reproduces byte-identically later **only** if the
  checkpoint is unchanged. Model version therefore belongs in the session as
  soon as we pin one — tracked as an open item, not solved here.

## How drift gets measured

Speaker-embedding cosine similarity between the original span and the repaired
span, in `packages/repaint_core/metrics.py`. Two deliberate choices:

- `voice_similarity` returns `None` when no embedding backend is installed,
  rather than falling back to a cheaper proxy. The spike then reports
  `INCONCLUSIVE`, never `PASS`. A number that looks like a measurement but is
  not one is worse than an admitted gap.
- Embeddings should be taken from **vocal stems**, not the full mix. On a dense
  arrangement the embedding largely describes the instrumental bed, and the
  metric quietly stops measuring the thing it is named after.
