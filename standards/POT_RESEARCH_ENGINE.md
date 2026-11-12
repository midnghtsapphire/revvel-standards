# PoT Research Engine — MCTS + GRPO Standard

Closes WR #18341.

## Architecture
- **PoT (Process of Thought):** research is a *tree* of reasoning steps, not a
  single chain. Each node = a sub-question with evidence.
- **MCTS** explores the tree: selection (UCT), expansion (LLM proposes sub-questions),
  simulation (fast answer + self-score), backpropagation (score up the path).
- **GRPO** trains the policy: for each node, sample G candidate continuations,
  score them with a rubric, normalize within the group (group-relative advantage),
  and reinforce the best. No value model needed.

## Flow
```
seed question → MCTS(expand N=4, depth=3) → best path
             → GRPO(group=4 candidates per node) → policy update
             → report.md with evidence graph
```
Reference: `scripts/pot_research_engine.py` — offline-capable skeleton with
OpenRouter hooks (`LLM_API_KEY`). Budget guard: max 64 LLM calls per run.
