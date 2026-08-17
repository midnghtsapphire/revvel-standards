# How to load the Revvel prompt pack into NotebookLM

Click-by-click for a human operator.

## Success looks like

NotebookLM notebook named **Revvel Prompt Knowledge** with sources covering:

- all `prompts/internal/**/SYSTEM_PROMPT.md` files
- concepts + LLM combos
- the full `system_prompts_leaks` inventory (file or URL sources)
- this guides folder

## Steps

1. Open your browser and go to <https://notebooklm.google.com/>.
2. Sign in with the Google account that should own the notebook.
3. Click **New notebook**.
4. Name it `Revvel Prompt Knowledge`.
5. Click **Add source**.
6. Choose **Upload** and select files from your local clone:
   - everything under `prompts/internal/`
   - everything under `prompts/concepts/`
   - everything under `prompts/llm-combos/`
   - `prompts/processes/ADD_CONCEPT_LLM_COMBO.md`
   - `prompts/external/system_prompts_leaks/INVENTORY.md`
   - `prompts/external/system_prompts_leaks/INDEX.json`
   - `process/prompt-knowledge-repo.md`
   - `docs/notebooklm/guides/*.md`
7. Optional: **Add source → Website/URL** and paste high-value
   `source_url` values from `docs/notebooklm/sources/SOURCES.json`
   (filter JSON client-side by `"kind": "external-url"` if the UI is slow —
   do not delete entries from the manifest itself).
8. Wait until NotebookLM finishes processing sources (each source shows ready).
9. Ask a test question:  
   `Summarize the github-requests system prompt and list LLM combo github-request-default models.`
10. Success: the answer cites the internal system prompt and the combo file.

## Refresh after repo changes

```bash
node scripts/prompt-knowledge-repo.js export-notebooklm
```

Then in NotebookLM: remove stale sources if paths moved, and re-upload changed files.
