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

<!--
RETIRED 2026-11-06 at the owner's instruction (Audrey Evans). Commented out in
place, NOT deleted and NOT retyped, per AGENTS.md OWNER RULE 2 ("NEVER delete
files, code, docs, or rules") and OWNER RULE 4 ("to retire something, COMMENT IT
OUT in place with a dated note").

WHY THE WHOLE TABLE IS WRAPPED AND NOT JUST THE TWO ROWS: the two superseded
"Never store scans" rows sit in the MIDDLE of this table. An HTML comment placed
between table rows ends the table, so commenting only those two rows in place
would have split the table and left the rows below it rendering as loose text.
Wrapping the whole block keeps every original line exactly where it was, byte for
byte, and the corrected table below renders normally. Nothing here is deleted and
nothing is retyped.

WHAT CHANGED: the GORILA and RILA-S1 rule "Never store scans" was superseded by
the owner on 2026-11-02 ("ya i am allowing scans"). The superseded item is
recorded as SUPERSEDED, not deleted, in the Tartaria book repo. The lineara.xyz
row carries forward unchanged from the retirement earlier today.

The lines that follow, to the closing marker, are the original table:
| Source | License status | Rule |
| --- | --- | --- |
| GORILA | EFA-owned, no-derivatives | Never store scans |
| RILA-S1 | EFA-owned, no-derivatives | Never store scans |
| SigLA | Non-commercial | Non-commercial use only |
| lineara.xyz | No license | Reference-only. Licence-request status UNRESOLVED as of 2026-11-06 - see the note below this table. Do not assume one is in train and do not send one. |
-->

| Source | License status | Rule |
| --- | --- | --- |
| GORILA | EFA-owned, no-derivatives | Scans MAY be stored - owner decision, Audrey Evans, 2026-11-02 08:34 MST. The no-derivatives status in the middle column is UNCHANGED: this permits local storage only, not redistribution or publication. |
| RILA-S1 | EFA-owned, no-derivatives | Scans MAY be stored - owner decision, Audrey Evans, 2026-11-02 08:34 MST. The no-derivatives status in the middle column is UNCHANGED: this permits local storage only, not redistribution or publication. |
| SigLA | Non-commercial | Non-commercial use only |
| lineara.xyz | No license | Reference-only. Licence-request status UNRESOLVED as of 2026-11-06 - see the note below this table. Do not assume one is in train and do not send one. |

> **"Never store scans" was superseded on 2026-11-02 and is retired here on
> 2026-11-06.** The owner decided scans may be stored (Audrey Evans, 2026-11-02
> 08:34 MST). The original rule is kept verbatim in the HTML comment above, and
> the superseded item is recorded as superseded rather than deleted in the
> Tartaria book repo. **The licence status is not changed by this:** GORILA and
> RILA-S1 remain EFA-owned and no-derivatives, so this permits local storage
> only. It does not authorise redistributing or publishing scans or anything
> derived from them, and it is not a judgement about what those licences allow.

<!--
RETIRED 2026-11-06 at the owner's instruction (Audrey Evans). Commented out in
place, NOT deleted, per AGENTS.md OWNER RULE 2 ("NEVER delete files, code, docs,
or rules") and OWNER RULE 4 ("to retire something, COMMENT IT OUT in place with a
dated note"). The single line that follows is the original row, preserved byte for
byte:
| lineara.xyz | No license | Reference-only; license request filed |
Reason it was retired: "license request filed" is contradicted by three other
records in this project that say NOT SENT. Which reading is true is NOT decided
here. See the visible note below the table.
-->

> **lineara.xyz licence status is UNRESOLVED, recorded 2026-11-06.** The retired
> row in this file read "license request filed" (kept verbatim in the HTML comment
> above). Three other records in this project state the request was **NOT SENT**:
> `bootstrap/SOURCES.tsv` and `publishing/PUBLISHING_PLAN.md` in the Tartaria book
> repo, and `docs/DATA_SOURCES.md` in linear-a. The upstream repository
> (`github.com/mwenge/lineara.xyz`) has not been checked by anyone, so which
> reading is correct is **still open and is not settled by this edit**. Until the
> owner resolves it: treat lineara.xyz as reference-only with no licence, assume no
> request is in train, and send none. Logged as an open conflict in the Tartaria
> repo at `bootstrap/LICENCE-CONFLICT-2026-11-06.md`.

- Hash every ingested file and record a receipt for it, with a license sidecar.

## 6. Paid access

- Audrey's Academia Pro login in the shared browser is for her own research
  reading only.
- Do not redistribute downloaded PDFs.
