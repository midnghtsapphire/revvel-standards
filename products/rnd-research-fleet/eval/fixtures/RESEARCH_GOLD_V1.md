# research-gold-v1: provenance and gaps

Work request: #18341 (PoT research engine). This set is the labeled research
examples that the +20-30% acceptance criterion depends on. It is **not yet
large enough**: the dependency is 100 or more, and this version holds fewer.
Run `node scripts/pot-research/benchmark.js` for the live count and shortfall.

## What qualifies

An example is kept only if it comes from existing research and the source
records a decided answer. Nothing is written by hand and nothing is
synthetic.

- The **question** is a fixed template wrapped around text copied from the
  source (a claim, a hypothesis, an "as printed" quotation). The template is in
  `eval/build-research-gold.js`, tagged on each row as `question_form`.
- The **reference answer** is source text: the verdict, the recorded test
  result, or the checked original.
- Rows whose source says Unverified, `[VERIFY]`, Plausible, Partly confirmed,
  Open, Not reconciled, or "not a settled resolution" are skipped. So are
  ledger rows the ledger itself marks as conflicted or re-tiered.
- `difficulty` is `null` on every row because no source states one.
- Skipped rows and the reason for each are in `research-gold-v1.skipped.json`.

## Row fields

`id`, `question`, `reference_answer`, `source_repo`, `source_path`,
`source_sha` (commit of the source repo's main branch when read),
`source_blob_sha` (git blob of the file at that commit), `source_locator`,
`source_url`, `domain`, `difficulty`, `question_form`, `label`, `caveat`,
`visibility`, `question_sha256`, `reference_sha256`.

## Public rows and private rows

This repository is public. `linear-a` and `tartaria-tablets` are private, and
`linear-a` carries a PRIVATE_DATA_NOTICE: its contents must never be
redistributed or published. So rows from those repos are committed as
provenance and hashes only (`visibility: private`, `question` and
`reference_answer` null). Rows from public sources carry their text.

To score with the private rows, rebuild their text from files you can read:

```bash
node products/rnd-research-fleet/eval/build-research-gold.js \
  --sources /path/to/pinned-files \
  --private /path/outside/the/repo/research-gold-v1.private.jsonl \
  --verify products/rnd-research-fleet/eval/fixtures/research-gold-v1.jsonl
RESEARCH_GOLD_FULLTEXT=/path/outside/the/repo/research-gold-v1.private.jsonl \
  node scripts/pot-research/benchmark.js
```

`--sources` holds each file at `<repo>/<path>`. The builder refuses any file
whose git blob SHA differs from the pinned one, `--verify` confirms the
rebuilt public fixture is byte-identical, and the benchmark checks every
attached text against the committed hashes. Keep the private file out of git.

## Count by source (this version)

| Source repo | Visibility | Rows | Kind |
| --- | --- | --- | --- |
| midnghtsapphire/linear-a | private | 8 | ledger hypotheses with a recorded test result |
| midnghtsapphire/linear-a | private | 2 | wine-report claim check, Confirmed or Wrong |
| midnghtsapphire/tartaria-tablets | private | 3 | errata entries with status Settled |
| midnghtsapphire/tartaria-tablets | private | 5 | draft-sweep claims marked Correct |
| midnghtsapphire/risingaloha | public | 5 | published fact-check verdicts |

## Sources examined that gave nothing

- `midnghtsapphire/searchcrew-library` (canonical): the default branch holds
  only a one-line README.
- `midnghtsapphire/searchcrew-libraries` (backup): the repository is empty.
- `revvel-standards` `wr/issues`, `docs/research-engine`, `docs/research`:
  these are plans, briefs and rankings. None records a verified answer.
- `linear-a` `docs/findings/INDEX.md` "X-" rows: labelled exploratory and not
  preregistered, so left out.

## Where the other examples are

These sources hold more settled answers, but each is prose that needs a
question written to hide the answer. That is curation, not extraction, so it
is not done here:

- `tartaria-tablets` `imports/2026-11-04-caresse/Tartaria/verify-resolutions.md`
  (RESOLVED and CONFIRMED sections, about 40).
- `tartaria-tablets` `proofy/editorial/VERIFY-CLOSURES-2026-11-04.md`.
- `tartaria-tablets` errata entries with status HARD and the later appended
  entries, which use a different layout.

Adding them, or a set the owner already holds, is how this version reaches 100.

## What this set does not do

It scores nothing. `benchmark.js` still prints `status: NOT_MEASURED` and
`quality_delta: null`. A real run of linear fan-out and PoT over at least 100
of these examples is still required, and any paid run needs the owner's
approval first.
