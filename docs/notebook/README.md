# notebook — research source

Raw material that originated from **NotebookLM (Google) — grounded notebooks (up to ~300 sources) and their generated outputs**. Drop transcripts, exports,
generated drafts, screenshots, and data here — one subfolder per project or
topic.

## Conventions

- Treat everything here as **unverified** until checked against a primary
  source. It is input, not a standard.
- When you compile across sources into a real project, do the compilation in
  `docs/research-drafts/<topic>/` and cite these files in that topic's
  `sources.md`.
- No secrets or credentials. Nothing load-bearing — promote finished work to its
  real home (a `docs/*_STANDARD.md`, a product under `products/`, or a
  workflow) and leave a pointer behind.

## Curated prompt pack (NotebookLM re-import)

For the **prompt knowledge repository** pack (system prompts, concepts, LLM
combos, unfiltered `system_prompts_leaks` inventory), use
[`docs/notebooklm/`](../notebooklm/README.md) and
`node scripts/prompt-knowledge-repo.js export-notebooklm`.
