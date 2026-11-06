# Search and Sourcing Standard

How agents and researchers find, verify, license, and store sources. It combines
Audrey's search lessons from the Tărtăria book research with the Linear A fleet's
data rules. It applies to all research work in this repo.

Related: `docs/PROVENANCE_STANDARD.md`, `docs/SEARCH_RESEARCH_ENGINE.md`,
`products/rnd-research-fleet/standards/SEARCH_EVALUATION.md` (which measures
search quality; this standard covers how to source).

---

## 1. Query construction

- Search for strings that appear in the target paper and almost nowhere else:
  lab codes (e.g. `"5 RoAMS"`), journal names, feature or inscription numbers.
  Avoid topic words.
- Linear A: use exact-string queries, e.g. `"HT 117"`, `"AB 81"`, `"KU-RO"`.
- Use native diacritics (e.g. `Tărtăria`, `Petrești`, `Tăblița`), because journals
  index that way.
- Run a series of query variants, from most specific to most general.

## 2. Finding sources

- Best move: open an author's profile (e.g. Academia.edu) and read down their
  uploads. Many authors upload nearly everything.
- Linear A scholars to read down: Younger, Salgarella, Davis, Petrakis, Schoep.
- Read each paper's bibliography, including "forthcoming" items. That is how
  hard-to-find citations turn up.
- Prefer the original source over aggregators.
- Recognize dead-end source bundles (e.g. off-region material) and log them as
  dead ends.

## 3. Verifying sources

- Check every link before reporting it, and drop 404s.
- When a database (e.g. XRONOS) differs from the primary paper, trust the paper
  and log the drift.
- Record what a paper does NOT state (e.g. sample material) as a methodological gap.
- Grade evidence: **A** = confirmed against the primary paper.
- Checking a downloaded file:
  - Verify the title, authors, and year.
  - Flag off-topic files, and flag duplicates by comparing hashes.
  - Flag synthetic material inside documents.
- Retry timeouts on the next run rather than skipping them.

## 4. Data integrity

- Use real, attested data only. Never use simulated or synthetic data.
- Nulls come only from shuffles of the real corpus or from real control languages.
- Hypotheses go in staging and are preregistered before testing.
- Log rejected results.

## 5. Licensing and storage

- Check the license before storing anything. Treat unclear licenses as
  reference-only.

| Source | License status | Rule |
| --- | --- | --- |
| GORILA | EFA-owned, no-derivatives | Never store scans |
| RILA-S1 | EFA-owned, no-derivatives | Never store scans |
| SigLA | Non-commercial | Non-commercial use only |
| lineara.xyz | No license | Reference-only; license request filed |

- Hash every ingested file and record a receipt for it, with a license sidecar.

## 6. Paid access

- Audrey's Academia Pro login in the shared browser is for her own research
  reading only.
- Do not redistribute downloaded PDFs.
