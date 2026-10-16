# MCP_TOOL_TEMPLATE.md — New Tool Skeleton

**Standard:** AGENT_INTERFACE.md v1.0
**Use:** Copy this template for every new agent-callable tool. Fill all sections. Gate fails on missing pieces (AI-002, AI-003, AI-004).

---

## CHECKLIST (complete before PR)

- [ ] Backing API procedure exists (R3 — if not, that's a separate PR first)
- [ ] Input schema defined (no `z.any()`)
- [ ] Output schema defined (no `z.any()` / `z.unknown()`)
- [ ] Scope declared: read | write | admin
- [ ] Auth check lives in the backing procedure, not only the tool (R5, write/admin)
- [ ] Registry entry added to `tools.registry.json`
- [ ] Test stub created (unauthorized path required for write/admin)
- [ ] Zero business logic in tool layer (R3 / AI-007)

---

## 1. TOOL DEFINITION

```ts
// mcp/tools/<tool_name>.ts
import { z } from "zod";
import { api } from "../api-client"; // typed tRPC client — never drizzle/mysql2 (AI-001)

export const <ToolName>Input = z.object({
  // REQUIRED — describe every field
  // example: id: z.string().describe("Item ID"),
});

export const <ToolName>Output = z.object({
  // REQUIRED — never z.any() (AI-006)
});

export const <tool_name> = {
  name: "<tool_name>",                       // must match registry entry exactly
  description: "<one sentence: what it does, when an agent should call it>",
  inputSchema: <ToolName>Input,
  outputSchema: <ToolName>Output,
  scope: "<read|write|admin>",
  handler: async (input: z.infer<typeof <ToolName>Input>) => {
    // THIN ADAPTER ONLY (R3):
    // 1. (optional) scope/auth pre-check
    // 2. call the one backing procedure
    // 3. return result
    // NO branching, NO query building, NO transformation beyond serialization
    return api.<router>.<procedure>(input);
  },
};
```

---

## 2. REGISTRY ENTRY

Append to `tools.registry.json`:

```json
{
  "name": "<tool_name>",
  "schema": "mcp/tools/<tool_name>.ts#<ToolName>Input",
  "endpoint": "<router>.<procedure>",
  "scope": "<read|write|admin>",
  "added": "<YYYY-MM-DD>",
  "test": "tests/tools/<tool_name>.spec.ts"
}
```

---

## 3. TEST STUB

```ts
// tests/tools/<tool_name>.spec.ts
import { describe, it, expect } from "vitest";
import { <tool_name>, <ToolName>Input, <ToolName>Output } from "../../mcp/tools/<tool_name>";

describe("<tool_name>", () => {
  it("accepts valid input", () => {
    expect(() => <ToolName>Input.parse({ /* valid example */ })).not.toThrow();
  });

  it("rejects invalid input", () => {
    expect(() => <ToolName>Input.parse({ /* invalid example */ })).toThrow();
  });

  it("output matches declared schema", async () => {
    const result = await <tool_name>.handler({ /* valid example */ });
    expect(() => <ToolName>Output.parse(result)).not.toThrow();
  });

  // REQUIRED for scope: write | admin (R5)
  it.skipIf(<tool_name>.scope === "read")("rejects unauthorized caller", async () => {
    // call backing procedure without auth context — expect throw
  });
});
```

---

## 4. PR DESCRIPTION BLOCK

Paste into the PR body so the bot council can verify (prosecution-first):

```md
### Agent Interface Compliance
- Tool: `<tool_name>` | Scope: `<scope>`
- Backing procedure: `<router>.<procedure>` (pre-existing: yes/no — if no, link the API PR)
- Registry: entry added ✅
- Schemas: input ✅ output ✅ (no z.any)
- Test: `tests/tools/<tool_name>.spec.ts` ✅
- Tool-layer logic: none beyond auth ✅
```

---

## NAMING CONVENTIONS

- Tool name: `snake_case`, verb_noun — `get_threat_feed`, `create_listing`, `score_evidence`
- Scope defaults to `read`; escalate only with justification in PR body
- One tool per file, file name = tool name

---

**REVVEL/UPREV:** copy, fill, ship. The skeleton is the standard.
