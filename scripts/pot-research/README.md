# Policy-of-Thoughts engine

CPU engine for work request #18341. It sits beside the linear lane fan-out in `scripts/research-engine.js`. The fan-out stays the default. Set `RESEARCH_STRATEGY=pot` to opt in.

The method write-up and the GPU budget estimate are in [docs/research/pot-research-engine.md](../../docs/research/pot-research-engine.md). The play-by-play is in [LEDGER.md](./LEDGER.md).

## Run

```bash
node --test tests/pot-research.test.js
node scripts/pot-research/benchmark.js
```

`benchmark.js` prints `status: NOT_MEASURED` and `quality_delta: null`. That is the honest output. The committed fixture is a 6-prompt search rubric, not a labeled acceptance set, so the script does not score linear fan-out against PoT.

## What to check if a run fails

- `Unknown research strategy` means `RESEARCH_STRATEGY` is not `linear` or `pot`. Unset it to get the linear fan-out back.
- `Base weights hash changed` means something wrote the frozen vector. Stop. Do not continue with that process.
- `This adapter was discarded` means a caller kept the per-problem adapter and used it on the next problem. Open a new adapter.
- A paid model call still goes through `callOpenRouter` in `scripts/research-engine.js`, which consults the spend gate. This directory does not add a provider call.
