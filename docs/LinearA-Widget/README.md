# Linear A widget

Two instruments for the Minoan structural-epigraphy simulation. Same weights. Different arithmetic.

| File | What it does |
| --- | --- |
| [index.html](./index.html) | Both widgets, one set of sliders. Opens in a browser. |
| [FORMULAS.md](./FORMULAS.md) | Whether the formula produces 87 / 64 / 78, and what the readings actually are. |
| [verify.mjs](./verify.mjs) | `node verify.mjs`. Fails if the defaults ever match the essay scores. |

The essay percentages are not the output of the script that was supposed to compute them. Linear A is unread. This is a model check, not a decipherment.

Repository already existed: `midnghtsapphire/revvel-standards`. Nothing new was created.

## Linear A structural loop (added 2026-11-07)

`verify.mjs` now also carries a deterministic **hypothesis-ledger loop**, gated
behind a flag so the bare `node verify.mjs` model-check is unchanged:

```bash
node verify.mjs --linear-a          # run the whole ledger
node verify.mjs --linear-a --iter 3 # stop after N hypotheses
```

Each run proposes falsifiable rules about a small seed of **attested** Linear A
sequences and records `SURVIVES` / `KILLED` / `UNRESOLVABLE` with the evidence.
It does **not** invent readings — a logged kill (e.g. `TE-KI-TO-NE` is Linear B,
not Linear A; `*301` has no agreed value) is the product. It stays a method
harness, not a decipherment. The seed is a sample, not the corpus; real work
needs [SigLA](https://sigla.phis.me/) / GORILA ingestion, which is the next step.

### Auto-run (DISABLED — not installed)

A scheduled runner is intentionally **left dormant**: it is NOT committed as a
`.github/workflows/` file, so nothing runs on its own. To turn "auto" on later,
copy the recipe below into a real workflow file. It only runs the loop and
prints the ledger — it never deletes or creates repo files.

<!--
# .github/workflows/linear-a-loop.yml  (DORMANT — paste out to enable)
# name: Linear A loop
# on:
#   workflow_dispatch: {}
#   schedule:
#     - cron: "17 9 * * 1"   # Mondays; jittered minute per CRON_REQUIREMENTS.md
# permissions:
#   contents: read
# jobs:
#   loop:
#     runs-on: ubuntu-latest
#     steps:
#       - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2
#       - uses: actions/setup-node@39370e3970a6d050c480ffad4ff0ed4d3fdee5af # v4.1.0
#         with: { node-version: "20" }
#       - run: node docs/LinearA-Widget/verify.mjs --linear-a
-->

Why dormant and not live: an auto-loop against this tiny seed would just reprint
the same ledger on a schedule and burn CI for no new information. It earns a
schedule once the SigLA/GORILA corpus is ingested and each run can test the next
hypothesis against real data. Enabling it before then is cost with no signal.
