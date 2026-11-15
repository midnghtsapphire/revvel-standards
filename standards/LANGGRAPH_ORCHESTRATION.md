# LangGraph Orchestration Standard

Closes WR #18337.

## Why
WR lifecycle (claim → research → write → lint → package → PR → merge) is a
directed graph with retries and human gates. LangGraph gives us checkpointed,
resumable state machines instead of shell-script glue.

## Canonical Graph (WR lifecycle)
```
intake → claim → [research?] → build → lint → package → pr → merge → close
           ↑________retry loop (max 2)________↓ (on lint fail)
```
- **Checkpointer:** SQLite (`langgraph.checkpoint.sqlite`) at `artifacts/lg/checkpoints.db`
  so a crashed run resumes mid-graph.
- **Human gate node:** interrupts before `merge` when repo has `requires-human` label.
- Reference: `scripts/langgraph_orchestrator.py` — runs the WR lifecycle for one WR number.

## Rules
1. One graph per lifecycle; nodes are pure functions over a typed state dict.
2. Every node writes to the state, never to globals.
3. LLM nodes route through OpenRouter (`LLM_API_KEY`), model from `config/models.json`.
