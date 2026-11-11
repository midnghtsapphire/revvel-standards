# Policy-of-Thoughts engine

CPU engine for work request #18341. It sits beside the linear lane fan-out in `scripts/research-engine.js`. The fan-out stays the default. Set `RESEARCH_STRATEGY=pot` to opt in.

The method write-up and the GPU budget estimate are in [docs/research/pot-research-engine.md](../../docs/research/pot-research-engine.md). The play-by-play is in [LEDGER.md](./LEDGER.md).

## Run

```bash
node --test tests/pot-research.test.js
node scripts/pot-research/benchmark.js
```

`benchmark.js` prints `status: NOT_MEASURED` and `quality_delta: null`. That is the honest output. The committed fixture is a 6-prompt search rubric, not a labeled acceptance set, so the script does not score linear fan-out against PoT.

`RESEARCH_STRATEGY=pot` with no `potReward` has no quality signal. Every terminal scores 0, so the chosen order is the first seeded sample for that query (`potTrace.rewardConfigured` is false). The same query repeats the same order. It is not a claim that the sample beat the linear fan-out. Lane calls still run together, and the same retry loop as the linear fan-out still runs unless `dryRun` is set. Pass `potReward` when a caller has a real value for a path.

## What to check if a run fails

- `Unknown research strategy` means `RESEARCH_STRATEGY` is not `linear` or `pot`. Unset it to get the linear fan-out back.
- `Base weights hash changed` means something wrote the frozen vector. Stop. Do not continue with that process.
- `This adapter was discarded` means a caller kept the per-problem adapter and used it on the next problem. Open a new adapter.
- A paid model call still goes through `callOpenRouter` in `scripts/research-engine.js`, which consults the spend gate. This directory does not add a provider call.

`benchmark.js` also validates `products/rnd-research-fleet/eval/fixtures/research-gold-v1.jsonl` and prints `gold_count`, `gold_shortfall` and per-source counts. It does not score either strategy. See `products/rnd-research-fleet/eval/fixtures/RESEARCH_GOLD_V1.md` for provenance, what is public, and how to attach the private rows.
