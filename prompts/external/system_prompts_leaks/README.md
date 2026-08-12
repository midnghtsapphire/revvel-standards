# External source — system_prompts_leaks

Upstream: <https://github.com/asgeirtj/system_prompts_leaks>

## What is committed here

| File | Purpose |
| --- | --- |
| `INDEX.json` | Full unfiltered structural index (every blob path + source/raw URL) |
| `INVENTORY.md` | Human-readable path list grouped by vendor |
| `README.md` | This file |
| `cache/` | Optional local body cache (**gitignored**) |

## Why bodies are not bulk-committed

The upstream tree is large and third-party. The knowledge repo keeps a
**complete index** (no path censoring) and fetches bodies on demand:

```bash
node scripts/prompt-knowledge-repo.js refresh-external --source system_prompts_leaks
node scripts/prompt-knowledge-repo.js fetch-external --source system_prompts_leaks --path "Anthropic/Claude Code/agents/Plan.md"
```

Use cached or upstream bodies as **reference patterns** when authoring
revvel-owned prompts under `prompts/internal/**`.
