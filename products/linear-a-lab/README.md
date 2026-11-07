# Linear A Lab

**Goal: decipher Linear A.** A license-clean machine-readable corpus
(GORILA-GE), a deterministic evidence/prosecution layer, and a
test → deconstruct → prosecute → fix loop driven by local models in LM Studio.

- Architecture: [BLUEPRINT.md](./BLUEPRINT.md)
- Strategy: [BLUEOCEAN.md](./BLUEOCEAN.md)
- Play-by-play: [LEDGER.md](./LEDGER.md)
- Sources & licensing: [Library/README.md](./Library/README.md)

## Quick start

Requires Python 3.12+ (`py -3` on Windows). No third-party dependencies.

```bash
py -3 -m unittest discover -s tests   # 22 tests, offline
py -3 run_decipher.py audit           # KU-RO arithmetic audit (22 docs)
py -3 run_decipher.py top 20          # most frequent corpus words
py -3 run_decipher.py evidence KU-RO  # evidence pack for one word
```

The full loop needs LM Studio serving on `http://localhost:1234/v1`
(override with `GORILA_LMSTUDIO_URL`) with any chat model loaded:

```bash
py -3 run_decipher.py case KU-RO --rounds 3 --out case_KU-RO.json
```

## Honesty clause

Linear A is undeciphered. This lab grades *hypotheses about document
function* with falsifiable gates; it does not claim translations. Any output
that reads like a translation is graded C until a gate says otherwise.

## Rebuilding the corpus

`gorila_ge/data/gorila_ge_corpus.json` is committed. To regenerate from a
fact dump (see Library/README.md for provenance):

```bash
py -3 -m gorila_ge.convert <facts.json> [out.json]
```
