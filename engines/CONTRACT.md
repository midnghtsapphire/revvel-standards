# Revvel Engine & Runner Contract

## Orchestrator
* **Role**: Owns goals, state, routing, and stats.
* **Responsibilities**:
  * Reads `state.json`.
  * Finds the next incomplete step.
  * Runs the correct engine.
  * Writes results back.
  * Maintains the $10M revenue goal and stat authority (goals are sacred and never deleted or overwritten with generic placeholders).

## Engines
* **Role**: Decide or perform a step.
* **Responsibilities**:
  * Return execution receipts and artifacts.
  * Do not simply describe an artifact; produce it or call the runner to produce it.

## Runners
* **Role**: Actually use platforms and tools to create the artifact.
* **Responsibilities**:
  * Target platforms include: GitHub, Vercel, Supabase, Zapier, Make, n8n, Gumloop, CLI tools, browser automation, or APIs.
  * **Missing Access Rule**: If a runner cannot execute because an API, account, connector, or credential is missing, it must create a **procurement BOM** giving the exact thing to buy/connect and where to store the credential, instead of stopping vaguely.
