# AGENT_INTERFACE.md — Agent Access Standard

**Status:** ACTIVE
**Version:** 1.0
**Applies to:** All MIDNGHTSAPPHIRE repos with agent-callable surfaces (GrowlingEyes, Neurooz, Recovery Methods, deep-research, fleet agents)
**Enforced by:** `wr-rules/agent-interface.rules.mjs` (wr-lint gate)

---

## PRINCIPLE

Agents consume typed tools over stable contracts. Agents never replace, bypass, or reinterpret the API layer. One prompt-shaped endpoint deciding what to do with the database is prohibited — non-deterministic, untestable, unauditable.

**Skeleton-first applies:** a repo may have zero tools (empty room acceptable), but if any agent touches the repo, this structure must exist (nonexistent structure is not).

---

## RULES

### R1 — Typed tools only
Every agent-callable surface MUST be one of:
- An MCP tool with declared input/output schema
- A tRPC procedure with Zod validation

No exceptions. No "smart" endpoints that accept freeform prompts and route internally.

### R2 — No raw data access from agent paths
Agent code paths MUST NOT import:
- `drizzle-orm` / Drizzle client instances
- `mysql2` / raw connection pools
- Direct filesystem access to data directories

All data access goes through the tool layer.

### R3 — 1:1 mapping, zero new logic
Every MCP tool maps to exactly one existing API procedure. The tool layer is a thin adapter:
- ✅ Schema validation, auth scope check, call procedure, return result
- ❌ Business logic, query construction, conditional routing, data transformation beyond serialization

If a tool needs logic that doesn't exist in the API, the API gets the procedure first (separate PR), then the tool wraps it.

### R4 — Registry is the source of truth
Every repo with agent access maintains `tools.registry.json` at repo root:

```json
{
  "version": "1.0",
  "tools": [
    {
      "name": "tool_name",
      "schema": "path/to/schema.ts#ExportName",
      "endpoint": "router.procedure",
      "scope": "read | write | admin",
      "added": "YYYY-MM-DD",
      "test": "path/to/test.spec.ts"
    }
  ]
}
```

A tool not in the registry does not exist. Lint flags any tool definition or internal fetch not registered.

### R5 — Scope declaration mandatory
Every tool declares `read`, `write`, or `admin`. Write/admin tools require:
- Auth check inside the backing procedure (not only the tool layer)
- A test exercising the unauthorized path

### R6 — Schema completeness
Every tool MUST declare both input AND output schemas. Output `z.any()` / `z.unknown()` fails the gate.

---

## LINT CHECKS (agent-interface.rules.mjs)

| ID | Check | Severity |
|----|-------|----------|
| AI-001 | Agent dir imports drizzle/mysql2 directly | BLOCK |
| AI-002 | MCP tool missing input or output schema | BLOCK |
| AI-003 | Tool defined but absent from tools.registry.json | BLOCK |
| AI-004 | Registry entry missing scope or test path | BLOCK |
| AI-005 | Internal fetch from agent path to unregistered endpoint | BLOCK |
| AI-006 | Output schema is z.any()/z.unknown() | WARN → BLOCK after 2026-08-01 |
| AI-007 | Tool layer contains conditional/business logic (>1 branch beyond auth) | WARN |

---

## BOT COUNCIL DIRECTIVE

Append to all reviewer prompts (CodeRabbit, Jules, PandaOps, OpenRouter reviewer, Copilot, Roo, AntiGravity):

> REJECT any PR that grants agent code access to data, databases, or internal endpoints outside tools.registry.json. REJECT any PR adding a freeform-prompt endpoint that internally routes to data operations. Prosecution-first: assume violation until the registry entry, schema, and test are shown.

---

## ADOPTION (additive, no rewrites)

1. Drop this file into revvel-standards root
2. Add `agent-interface.rules.mjs` to wr-rules/
3. Add empty `tools.registry.json` (`{"version":"1.0","tools":[]}`) to each repo with agent access
4. Register existing tools as touched — no retroactive sweep required; gate catches them on next PR
5. Append council directive to reviewer prompts

Existing endpoints, routers, and agents untouched. The gate only constrains what's added going forward.

---

**REVVEL/UPREV:** one upward rev, max velocity. This standard is the rev.
