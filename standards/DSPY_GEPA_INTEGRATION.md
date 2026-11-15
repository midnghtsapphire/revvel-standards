# DSPy + GEPA Prompt Optimization Standard

Closes WR #18338.

## What
DSPy modules declare *what* (signature), not *how* (prompt). GEPA
(Genetic-Pareto) evolves prompts against a scored eval set and keeps the
Pareto frontier (quality × cost).

## Pipeline
1. Signature per agent task in `prompts/signatures.py`.
2. Eval set per agent in `evals/<agent>.jsonl` (input → expected rubric).
3. `scripts/gepa_optimize.py --agent scribe` runs GEPA, writes the winning
   prompt to `prompts/optimized/<agent>.md`, and appends scores to
   `artifacts/gepa/scores.jsonl`.
4. Optimized prompts ship via PR — never silently hot-swapped.

## Budget
Default 20 rollouts/agent/run (~$0.40 on OpenRouter mid-tier). Raise only
when the eval set grows past 50 cases.
