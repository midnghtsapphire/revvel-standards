# Process — Add concepts, LLM combos, metadata, and folders

This is the **only** supported growth path for the prompt knowledge repository.
Do not invent parallel trees.

## Preconditions

```bash
node scripts/prompt-knowledge-repo.js validate
```

Must exit 0.

## Add a concept

```bash
node scripts/prompt-knowledge-repo.js add-concept \
  --id concept.my-name \
  --name "My name" \
  --summary "One sentence" \
  --related sp.thought-process,sp.memory
```

Creates `prompts/concepts/<slug>.md` and registers it in `catalog.json`.

## Add an LLM combo

```bash
node scripts/prompt-knowledge-repo.js add-llm-combo \
  --id combo.my-ladder \
  --name "My ladder" \
  --models "openrouter/auto,anthropic/claude-sonnet-4" \
  --use-when "When to pick this ladder" \
  --system-prompts sp.github-requests,sp.cli
```

Creates `prompts/llm-combos/<slug>.md` and registers it.

## Add internal or external folder

```bash
node scripts/prompt-knowledge-repo.js add-folder --scope internal --name my-lane
node scripts/prompt-knowledge-repo.js add-folder --scope external --name my-source
```

Creates the folder, a stub `README.md` (external) or `SYSTEM_PROMPT.md`
(internal), and a catalog folder entry.

## Add metadata

```bash
node scripts/prompt-knowledge-repo.js add-metadata --key team --value revvel
```

Writes/merges `prompts/metadata/catalog-meta.json` and mirrors into
`catalog.json#metadata`.

## Refresh external index (unfiltered)

```bash
node scripts/prompt-knowledge-repo.js refresh-external --source system_prompts_leaks
```

Rebuilds `INDEX.json` + `INVENTORY.md` from GitHub API with **no path filtering**.

## NotebookLM export

```bash
node scripts/prompt-knowledge-repo.js export-notebooklm
```

Refreshes `docs/notebooklm/sources/SOURCES.json` and the pack README list.

## Definition of done for an extension PR

- [ ] `validate` exits 0
- [ ] New files linked from `catalog.json`
- [ ] `tests/prompt-knowledge-repo.test.js` still passes
- [ ] Conventional commit message
- [ ] No secrets committed
