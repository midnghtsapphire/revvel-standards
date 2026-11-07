# Linear A Lab — Blue Ocean

Per CLAUDE.md's prime directive, every product defends its revenue surface.
This one creates uncontested space instead of fighting over existing demand.

## The red ocean (what everyone else fights over)

- Academic databases (SigLA, defunct Younger pages): free, non-commercial,
  grant-funded, no API, no tests, no reproducibility guarantees.
- Decipherment claims: a century of unfalsifiable papers ("Linear A is
  Luwian/Semitic/Proto-Greek") with no shared evaluation harness.
- NLP-for-ancient-scripts papers: one-off models, dead repos, data you
  cannot legally reuse.

## The blue ocean (what nobody sells)

**A falsification engine for undeciphered scripts.** Not "we deciphered it" —
"here is the court where your decipherment goes on trial, with deterministic
gates, a license-clean corpus, and a reproducible verdict."

### Eliminate
- Image redistribution (EFA copyright risk) — text facts only.
- Cloud inference costs — LM Studio local loop, $0 marginal.
- Trust-me scholarship — every verdict carries its gate scores.

### Reduce
- Corpus access friction: one JSON file, one schema, typed tokens.
- Claim-to-test latency: minutes in the loop, not years in review.

### Raise
- Falsifiability: arithmetic audits that need zero language assumptions.
- Reproducibility: 22 tests, stdlib-only, runs on a laptop.

### Create
- **Hypothesis grading (A/B/C)** as a product primitive.
- **Prosecution-as-a-service**: submit a claim, get a verdict file.
- A corpus engine (GORILA-GE) that can ingest *any* undeciphered script:
  Linear A today; Cretan hieroglyphic, Cypro-Minoan, rongorongo next —
  same schema, same gates, same loop.

## Revenue surfaces (maps to prime directive)

1. **POLAR.SH funding surface**: "Adopt a tablet" / sponsor a nightly docket
   run; sponsors' names on the findings ledger. Open-core: corpus + gates
   free, batch docket and multi-script engine behind sponsorship.
2. **Automated product pipeline**: the findings ledger renders to a
   "State of Linear A" PDF/booklet (existing Gumroad pipeline in
   `products/`), regenerated whenever grades change.
3. **OSINT tooling adjacency**: the prosecutor pattern (deterministic gates +
   adversarial LLM + graded verdicts) is the same engine as claim
   verification in OSINT work — shared library, two markets.

## Moat

The moat is not the data (facts are free). It is the **harness**: the only
test-covered, license-clean, locally-runnable trial court for script
hypotheses — and the graded findings ledger it accumulates. Every nightly run
deepens a dataset of adjudicated hypotheses nobody else has.
