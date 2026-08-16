# Concept — Uncensored inventory

**Id:** `concept.uncensored-inventory`

## Summary

Catalogs and external indexes list **every** discovered path and vendor. Entries
are not dropped for tone, vendor, or topic. Body storage policy (by-url vs
cached) is separate from inventory completeness.

## Practice

- `prompts/external/system_prompts_leaks/INDEX.json` is the full tree index.
- `refresh-external` rebuilds the index from upstream without filtering paths.
- Internal authoring still follows repo security rules (no secrets, no CSAM, etc.).
  "Uncensored inventory" is about **not hiding what exists in the index**, not
  about violating law or injecting secrets.
