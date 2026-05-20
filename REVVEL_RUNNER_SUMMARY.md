# Revvel Runner Summary

## The Gap Addressed
Historically, Revvel operated primarily as a standards and goals engine. While the orchestrator effectively managed project states, evaluated requirements, and tracked $10M revenue goals, the process frequently stopped at "reporting" without actually shipping an artifact. The missing layer was **runners that finish the thing**.

## The Execution OS
Revvel is now configured as a personal automated execution OS, utilizing a separation of concerns:

1. **Orchestrator**: Owns the state (`state.json`), goals, stats, routing, and determining the next step. It explicitly preserves existing revenue goals without deleting them.
2. **Engines**: Evaluate decisions, determine what must be built, and prepare the requirements (e.g., BOMs).
3. **Runners**: The last-mile executors. They interact directly with external platforms (GitHub, Vercel, Supabase, Zapier, Make, n8n, Gumloop) to create, deploy, and verify the physical artifacts.

## Procurement BOM Safety
To avoid opaque failures, if a runner encounters missing credentials or API access (e.g., n8n, Zapier MCP, Compulife API), it immediately produces a **Procurement BOM**, returning control to the user with an explicit shopping list of required accounts or keys.
