# promptfoo

**BLUF:** The repo already ships templates/cicd/prompt-eval.yml for promptfoo, and the stack is Node. Priority **high**, effort **low**, loop **Deterministic**.

| Field | Value |
| --- | --- |
| Category | `evals` |
| Kind | eval + red-team CLI (Node) |
| License | MIT |
| Priority | high |
| Effort to adopt | low |
| Loop (llms.txt) | Deterministic |
| Accessed | 2026-10-26 |

## What it is

Node CLI for declarative prompt, agent and RAG tests with deterministic assertions (equals, contains, regex, is-json, JSON schema, JavaScript) plus model-graded checks. It has Ollama and OpenRouter providers.

## Why it fits revvel-standards

The repo already ships templates/cicd/prompt-eval.yml for promptfoo, and the stack is Node. Drift found: that template's header says it uses 'Claude Sonnet 4 via OpenRouter as primary model', but MODEL_CONFIG.md denylists the Sonnet family. Re-point it to allowed profiles or to the Ollama provider on a self-hosted runner.

## Determinism notes

Deterministic assertions (is-json, regex, schema) are exact. Model-graded assertions are not, so use them only as soft signals or with a jury.

## How to adopt

1. Fix prompt-eval.yml's model to an allowed profile.
2. Add schema assertions that reuse schemas/*.schema.json.
3. Run a local-lane suite via the Ollama provider on a self-hosted runner.

## Sources

- <https://github.com/promptfoo/promptfoo>
- <https://www.promptfoo.dev/docs/intro/>
- <https://www.promptfoo.dev/docs/providers/ollama/>
- <https://www.promptfoo.dev/docs/providers/openrouter/>
