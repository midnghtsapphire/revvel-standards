# Graph Prompting — Context Selection Standard

Closes WR #18336.

## Idea
The repo is a knowledge graph: files ↔ symbols ↔ WRs ↔ agents. Instead of
stuffing the prompt with everything, select the **top-k most relevant nodes**
by graph proximity to the task.

## Algorithm (reference: scripts/graph_context_selector.py)
1. Build graph: files as nodes; edges = imports, path proximity, co-edit history.
2. Seed = files/symbols named in the WR title+body.
3. Personalized PageRank from the seed; take top-k under a token budget.
4. Emit a context pack (path + first N lines) for the agent prompt.

## Rules
- Token budget default 6,000. Overflow → summarize leaves, never truncate the seed.
- Context pack is logged to `artifacts/context/<wr>.json` for replay/audit.
