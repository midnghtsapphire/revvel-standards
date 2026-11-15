# Grok API Navigator (`grokapi`)

Revvel's specialist for **xAI API integration, demo tests, and diagnosis**. Canonical handle: `grokapi`. Registry aliases: `grok-api`, `xai-api`, `grok-demo`, `grok-test`. The main agent implements registration in `scripts/openrouter-personas.js`.

## Invoke through the existing workflow

Use the recommended command form once the registry entry is available:

```text
/persona grokapi Review the Grok API demo's streaming parser and run offline tests only.
/persona grokapi Diagnose a Grok 401 using redacted logs; do not make live requests.
/persona grokapi Check Grok JSON schema validation and function calling against the recorded evidence.
/persona grokapi Plan an authorized X search or vision test; identify what remains untested.
```

Include the repository/path, desired artifact, redacted error, constraints, and whether live billable requests are authorized. Never include an API key.

The shortcut parser can resolve `/grokapi` locally, but the GitHub workflow filter does **not** trigger on that shortcut alone. Use `/persona grokapi <task>`; no workflow changes are required.

Natural-language trigger words are **dispatch metadata, not automatic GitHub event activation**. Metadata is provider-specific: `Grok API`, `xAI API`, `XAI_API_KEY`, `api.x.ai`, `grok-4.7`, `xai-sdk`, or Grok paired with streaming, JSON schema, function calling, web/X search, vision, or 401/429. Generic `api`, `auth`, `token`, standalone `Grok`, and **Groq** do not qualify.

## What it does—and does not do

The persona uses the existing **OpenRouter-routed `repo_surgery` runtime**. Its specialty is Grok/xAI; invocation does not make Grok the executing model or directly call xAI.

Reference code: private [grok-api-demo](https://github.com/midnghtsapphire/grok-api-demo), intended draft PR branch `feat/tested-grok-demo-2026-11-12`. Original live checks cover discovery, chat, Responses, streaming, JSON, function calling, and web search. X search and vision remain untested live; voice/media are not implemented. The original six offline tests passed, but this documentation task's rerun was blocked by missing `jsonschema`.

See [PROFILE.md](PROFILE.md) for responsibilities, security, and diagnosis; [HANDOFF.md](HANDOFF.md) for exact evidence and integration boundaries.
