# GitHub request playbook (NotebookLM + prompts/)

Use this when the owner files a GitHub issue/PR and you want grounded answers
from the prompt knowledge pack.

## Default repo

`midnghtsapphire/revvel-standards` unless the issue names another repo.

## Suggested NotebookLM prompts

1. `Which system prompts should I load for an MCP + CLI change?`
2. `What is the process to add a new LLM combo?`
3. `List all vendors in the system_prompts_leaks inventory and file counts.`
4. `Draft a sub-agent handoff envelope for issue N.`

## Agent-side composition

Prefer loading ids from `prompts/catalog.json` over freeform paste:

| Signal | Prompt id |
| --- | --- |
| any owner GitHub request | `sp.github-requests` |
| deep reasoning | `sp.thought-process` |
| memory writes | `sp.memory` |
| recurring failures | `sp.learning` |
| APIs | `sp.api` |
| scripts/gh | `sp.cli` |
| MCP | `sp.mcp` |
| skills | `sp.skills` |
| tools | `sp.tools` |
| orchestration | `sp.sub-agents` |

## Ladder

Default: `combo.github-request-default`  
Research-heavy prompt work: `combo.prompt-engineering-research`
