import type { SkillCategory, SkillDefinition, SkillId } from "../types";

/**
 * Canonical skill registry.
 *
 * Maps what users see as "skills" in Perplexity's chat thought process to the
 * three Agent API tool families + Revvel-local skills (BOM, classify, repo).
 *
 * Sources (confidence labeled):
 *  - Perplexity Agent API tools docs (official) — built-in + custom functions + MCP
 *  - wr/pplx-api-research.md — internal synthesis
 *  - docs/Universal-BOM_List/API_REGISTRY_BOM.md — BOM skill data
 */
export const SKILL_REGISTRY: SkillDefinition[] = [
  {
    id: "web_search",
    name: "Web Search",
    description:
      "Server-side live web search with citations. Primary grounding tool.",
    category: "builtin",
    execution: "remote",
    costHint: "~$2.50 / 1k invocations (plus model tokens)",
    goodFor: [
      "Fresh factual research",
      "Competitor scans",
      "Citation-backed answers",
    ],
    badFor: [
      "Private/internal data",
      "High-volume bulk scraping",
      "Deterministic unit-test fixtures",
    ],
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query" },
      },
      required: ["query"],
    },
  },
  {
    id: "fetch_url",
    name: "Fetch URL",
    description: "Fetch and summarize a specific URL server-side.",
    category: "builtin",
    execution: "remote",
    costHint: "Bundled with tool budget / tokens",
    goodFor: ["Deep-dive a known source", "Release notes / docs"],
    badFor: ["Auth-walled pages", "Binary downloads"],
    parameters: {
      type: "object",
      properties: {
        url: { type: "string" },
      },
      required: ["url"],
    },
  },
  {
    id: "finance_search",
    name: "Finance Search",
    description: "Specialized finance/markets search tool.",
    category: "builtin",
    execution: "remote",
    costHint: "Tool invocation + tokens",
    goodFor: ["Ticker / market research", "Filings summaries"],
    badFor: ["Trading execution", "Regulated investment advice"],
  },
  {
    id: "people_search",
    name: "People Search",
    description: "People / public-profile oriented search.",
    category: "builtin",
    execution: "remote",
    costHint: "Tool invocation + tokens",
    goodFor: ["Public figure backgrounders", "Conference speaker research"],
    badFor: ["Doxxing", "Private PII collection"],
  },
  {
    id: "sandbox",
    name: "Code Sandbox",
    description: "Remote code execution sandbox for analysis snippets.",
    category: "builtin",
    execution: "remote",
    costHint: "Higher latency; token + compute",
    goodFor: ["Quick calculations", "Data transforms"],
    badFor: ["Secrets in code", "Long-running jobs"],
  },
  {
    id: "mcp",
    name: "MCP Bridge",
    description:
      "Connect a remote Model Context Protocol server; model discovers its tools.",
    category: "mcp",
    execution: "remote",
    costHint: "No per-call MCP fee; model tokens still apply",
    goodFor: ["Enterprise tool meshes", "Shared agent tool servers"],
    badFor: ["Untrusted MCP endpoints", "Latency-critical paths"],
    parameters: {
      type: "object",
      properties: {
        server_url: { type: "string" },
        tool_name: { type: "string" },
      },
    },
  },
  {
    id: "bom_lookup",
    name: "BOM Lookup",
    description:
      "Local Revvel skill: look up APIs/tools in the Universal BOM registry for fit, cost, and status.",
    category: "revvel",
    execution: "local",
    costHint: "Free (local)",
    goodFor: [
      "Choosing an API before provisioning keys",
      "Cost comparisons",
      "Skills ↔ BOM mapping",
    ],
    badFor: ["Live pricing (static snapshot)"],
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Name or category to search" },
        category: { type: "string" },
      },
      required: ["query"],
    },
  },
  {
    id: "skill_classify",
    name: "Skill Classifier",
    description:
      "Local skill: classify free-text into skill categories (builtin/mcp/custom/revvel).",
    category: "revvel",
    execution: "local",
    costHint: "Free (local)",
    goodFor: ["Telemetry", "Routing prompts to the right tool family"],
    badFor: ["Semantic intent beyond keyword match"],
    parameters: {
      type: "object",
      properties: {
        text: { type: "string" },
      },
      required: ["text"],
    },
  },
  {
    id: "repo_context",
    name: "Repo Context",
    description:
      "Local skill: return high-level Revvel integration guidance for pplx-api.",
    category: "revvel",
    execution: "local",
    costHint: "Free (local)",
    goodFor: ["Onboarding agents", "Operator runbooks"],
    badFor: ["Live git state"],
  },
];

const BY_ID = new Map(SKILL_REGISTRY.map((s) => [s.id, s]));

export function listSkills(filter?: {
  category?: SkillCategory;
  execution?: "remote" | "local";
}): SkillDefinition[] {
  return SKILL_REGISTRY.filter((s) => {
    if (filter?.category && s.category !== filter.category) return false;
    if (filter?.execution && s.execution !== filter.execution) return false;
    return true;
  });
}

export function getSkill(id: SkillId): SkillDefinition | undefined {
  return BY_ID.get(id);
}

export function classifySkill(idOrName: string): {
  id: SkillId;
  category: SkillCategory;
  known: boolean;
} {
  const normalized = idOrName.trim().toLowerCase().replace(/\s+/g, "_");
  const known = BY_ID.get(normalized);
  if (known) {
    return { id: known.id, category: known.category, known: true };
  }
  if (normalized.startsWith("mcp_") || normalized.includes("mcp")) {
    return { id: normalized, category: "mcp", known: false };
  }
  if (
    normalized.startsWith("bom") ||
    normalized.startsWith("revvel") ||
    normalized === "skill_classify"
  ) {
    return { id: normalized, category: "revvel", known: false };
  }
  // Unknown custom function from the model
  return { id: normalized, category: "custom", known: false };
}

/** Convert registry entries to Agent API / chat tools payload. */
export function skillsToToolSchemas(ids?: SkillId[]): Array<Record<string, unknown>> {
  const selected = ids?.length
    ? SKILL_REGISTRY.filter((s) => ids.includes(s.id))
    : SKILL_REGISTRY.filter((s) => s.execution === "local");

  return selected
    .filter((s) => s.parameters)
    .map((s) => ({
      type: "function",
      function: {
        name: s.id,
        description: s.description,
        parameters: s.parameters,
      },
    }));
}
