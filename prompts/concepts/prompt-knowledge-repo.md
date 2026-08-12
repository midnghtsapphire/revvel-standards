# Concept — Prompt Knowledge Repository

**Id:** `concept.prompt-knowledge-repo`

## Summary

A single extensible tree (`prompts/`) plus NotebookLM pack (`docs/notebooklm/`)
that holds internal system prompts, external source indexes, concepts, LLM
combos, and free-form metadata for owner GitHub requests.

## Why

Without one catalog, agents invent parallel prompt folders, lose provenance, and
cannot feed NotebookLM consistently. Issue #16419 required a durable home and a
process to grow it.

## Operations

Use `node scripts/prompt-knowledge-repo.js` to validate and extend. Never create
a second top-level prompt store.
