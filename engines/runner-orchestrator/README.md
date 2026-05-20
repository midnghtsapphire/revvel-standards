# Revvel Runner Orchestrator

The Runner Orchestrator is the state-machine and heart of the execution OS.

## Role & Responsibilities

1. **Reads `state.json`**: Evaluates the current state of a given project.
2. **Finds the next incomplete step**: Checks the `"steps"` mapping to see what remains pending.
3. **Runs the correct engine**: Dispatches the specific engine (e.g., `bom-engine`, `build-app-engine`) needed for the current step.
4. **Writes results back**: Updates the project's `state.json` and artifact outputs.
5. **Maintains Goal & Stat Authority**: Explicitly preserves revenue goals (e.g., $10M goal) and statistical metrics without deleting or overwriting them with generic placeholders.

It stops safely if it needs explicit human approval, or if runners require missing access/APIs (triggering the procurement BOM flow).
