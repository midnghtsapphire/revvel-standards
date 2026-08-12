# LLM combo — GitHub request default

**Id:** `combo.github-request-default`

## Models (ladder)

1. `openrouter/auto` — cheap capable default via OpenRouter
2. `anthropic/claude-sonnet-4` — deep implementation
3. `openai/gpt-4.1-mini` — fast patch lane
4. `perplexity/sonar` — research / keyless-leaning citation lane

## System prompts to load

- `sp.github-requests`
- `sp.thought-process`
- `sp.sub-agents`

## Use when

Owner-filed issues/PRs that need triage, implementation, and a research fallback.
