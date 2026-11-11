<!--
Status: unverified AI-chat output, collected 2026-11-10. Not run. AI answers are leads, not sources.
-->

# Daily sweep loop

From the 2026-11-10 chat paste. Not run. AI answers are leads, not sources.

Suggested loop:

1. Run `cdx()` + `cc_query()` + `mementos()` for target domains and keywords (`datdas`, `merlini`, `sigla`, `lineara`, `linear a`, `cretan hieroglyph`, `danube script`, `vinča`).
2. Insert new rows into `resources` with status `found`.
3. Deduplicate via `content_hash`; fetch promising pages; mark `acquired` / `analyzed`; log everything in `notes`.
4. Weekly: run the `analysis/` scripts on new DatDas or SigLA rows; push results and plots; feed summaries to an LLM with the task prompts.

This loop has not been scheduled or executed here. Analysis scripts must not be run on Linear A corpus data without a preregistered hypothesis via CorpusBot / Fleet-Orchestrator. Sign runs between dividers are sequences, not words.

A later DeepSeek paste recast the same loop as the mermaid workflow in the pack README, wiring `wayback_sweep.py`, `commoncrawl_sweep.py`, and `prehistory_scraper.py` into an index database and then into an LLM. That workflow is also not run.
