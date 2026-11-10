# Linear A Lab — Blueprint

One goal: **decipher Linear A** — and until that day, be the best instrumented,
most honest machine for trying. Everything below is built and running; this is
a description, not a wish list.

## The problem

Linear A (Crete, ~1800–1450 BC) is undeciphered. The canonical corpus, GORILA
(Godart & Olivier, *Recueil des inscriptions en linéaire A*, 5 vols,
1976–1985), is print-only and copyright École française d'Athènes. The main
digital derivatives either have no license (lineara.xyz explorer code), are
non-commercial (SigLA, CC BY-NC-SA per third-party reports), or are offline
(John Younger's KU pages no longer resolve). There is no license-clean,
machine-readable, test-covered corpus an autonomous pipeline can build on.

## The answer: three layers

```text
┌───────────────────────────────────────────────────────────┐
│ 3. LOOP      test → deconstruct → prosecute → fix         │
│    pipeline/loop.py + LM Studio (local, $0/token)         │
├───────────────────────────────────────────────────────────┤
│ 2. EVIDENCE  deterministic statistics + prosecution gates │
│    pipeline/stats.py, pipeline/prosecutor.py              │
├───────────────────────────────────────────────────────────┤
│ 1. GORILA-GE license-clean typed corpus, 1,711 docs       │
│    gorila_ge/ (schema gorila-ge/1)                        │
└───────────────────────────────────────────────────────────┘
```

### Layer 1 — GORILA-GE (the "own GORILA")

A corpus engine that regenerates GORILA's *function* from non-copyrightable
facts: inscription ids, typed sign sequences, numerals, find-places, ceramic
phases. Source data path: lineara.xyz's `LinearAInscriptions.js`, whose
author placed it under an explicit public-domain dedication (SQLite-style
"author disclaims copyright" blessing, verified 2026-11-07); underlying sign
sequences are uncopyrightable facts of 3,500-year-old artifacts. EFA's rights
attach to GORILA's photographs and facsimile drawings — we carry **no
images**, text facts only.

- `gorila_ge/signs.py` — Unicode Linear A facts, fraction values, logogram
  inventory, structurally established function words.
- `gorila_ge/corpus.py` — schema `gorila-ge/1`: typed token stream (`word`,
  `logo`, `num`, `frac`, `div`, `nl`) with line structure preserved;
  dataclass API (`Inscription.lines()`, `Line.numeric_total()`).
- `gorila_ge/convert.py` — rebuilds `data/gorila_ge_corpus.json` (1,711
  inscriptions, 246 KB) from a fact dump. Deterministic; rerunnable against
  any future source (SigLA export, own OCR of tablets, user-keyed GORILA).

### Layer 2 — Evidence and prosecution (deterministic court)

The LLM never decides anything. Falsifiable, reproducible statistics do:

- **Arithmetic audit** (`stats.kuro_checks`): on ledger tablets the word
  KU-RO heads a line whose numeral should equal the sum of the contiguous
  entry block above. 22 documents are auditable; 8 sum exactly; the audit
  independently reproduces the discrepancies scholarship knows about (HT 13
  off by +½, HT 9a by −¾). This is decipherment-grade evidence computed with
  zero language assumptions.
- **Evidence packs** (`stats.evidence_pack`): frequency, rank, site
  distribution, followed-by profile, line position, sampled contexts.
- **Prosecution gates** (`prosecutor.py`): attestation (hapax = fail),
  cross-site (toponyms localize, function words travel), numeral affinity,
  arithmetic (the killer gate for "total"-type claims, ±1 unit klasmatogram
  tolerance). Verdict = mean gate score → grade A/B/C.

### Layer 3 — The loop (LM Studio)

`pipeline/loop.py` runs the case law: the model states a hypothesis (TEST),
the corpus is measured (DECONSTRUCT), gates + an adversarial LLM prosecutor
attack it (PROSECUTE), and failed hypotheses must be revised or conceded
(FIX), up to N rounds. `pipeline/lmstudio.py` is a stdlib-only
OpenAI-compatible client (default `http://localhost:1234/v1`, override
`GORILA_LMSTUDIO_URL`); `pick_model()` auto-selects the first loaded
non-embedding model. Local models mean a $0 marginal cost loop that can run
all night under `/loop` or a cron.

First live run (2026-11-07, gemma-3-4b): round 1 claimed KU-RO is a toponym;
the prosecutor called it fatal; round 2 retreated to "formulaic expression";
gates held it at grade B. The scripted tests show the true claim ("marks the
total of the entries") passes the arithmetic gate — a stronger model on the
reasoning lane (MODEL_CONFIG.md) graduates it to A.

## Interfaces

```bash
py -3 run_decipher.py audit                  # KU-RO arithmetic audit
py -3 run_decipher.py top 20                 # frequency table
py -3 run_decipher.py evidence KU-RO         # evidence pack (JSON)
py -3 run_decipher.py case KU-RO --rounds 3  # full loop via LM Studio
py -3 -m unittest discover -s tests          # 22 tests, no network needed
```

## Roadmap (next WRs)

1. **WR: batch docket** — run cases for the top-50 words nightly; write graded
   findings to a `FINDINGS.md` ledger (A/B/C), diff against the previous run.
2. **WR: Linear B anchor layer** — homomorphic sign-value transfer table
   (AB numbering) as a hypothesis *generator*, prosecuted like any other claim.
3. **WR: bigger court** — route hypothesis/fix to the reasoning lane and keep
   the prosecutor local, per MODEL_CONFIG.md lanes.
4. **WR: corpus ingestors** — a SigLA cross-check comparator (private, non-redistributed) and a
   user-keyed GORILA entry form, both normalizing into `gorila-ge/1`.
5. **Graduation**: if the lab needs its own release cadence or licensing, move
   to `midnghtsapphire/linear-a-lab` per PRODUCT_INCUBATION_STANDARD (record
   in `wr/memory/decisions.jsonl`).
