import type { BomItem, SkillId } from "./types";

/**
 * Curated Bill of Materials slice for pplx-api decisioning.
 * Mirrors docs/Universal-BOM_List/API_REGISTRY_BOM.md — keep in sync when
 * provisioning status changes.
 */
export const BOM_ITEMS: BomItem[] = [
  {
    id: "perplexity-api",
    name: "Perplexity API (Sonar / Agent)",
    category: "ai-llm",
    provider: "Perplexity AI",
    status: "recommended",
    freeTier: false,
    costNote:
      "Pay-per-token + tool invocations (web_search ~$2.50/1k). No free tier on official API.",
    skillsFit: [
      "web_search",
      "fetch_url",
      "finance_search",
      "people_search",
      "sandbox",
      "mcp",
    ],
    notes:
      "Best for citation-backed research and Agent tools/skills. Pair with no-key lane for free research fallback.",
  },
  {
    id: "perplexity-nokey",
    name: "Perplexity no-key bridge (helallao/perplexity-ai)",
    category: "ai-llm",
    provider: "Community fork",
    status: "active",
    freeTier: true,
    costNote: "$0 — anonymous Labs/Web; brittle under rate limits",
    skillsFit: ["web_search"],
    notes:
      "Used by scripts/perplexity-research-issue.js. Not for production SaaS SLAs.",
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    category: "ai-llm",
    provider: "OpenRouter",
    status: "active",
    freeTier: false,
    costNote: "Funded key required even for :free models",
    skillsFit: ["web_search", "skill_classify"],
    notes: "Primary automation router; perplexity/sonar-pro available as backup.",
  },
  {
    id: "brave-search",
    name: "Brave Search API",
    category: "search",
    provider: "Brave",
    status: "recommended",
    freeTier: true,
    costNote: "2k queries/mo free; then ~$3/1k",
    skillsFit: ["web_search"],
    notes: "FOSS-friendly alternative when you need raw SERP without LLM markup.",
  },
  {
    id: "tavily",
    name: "Tavily API",
    category: "search",
    provider: "Tavily",
    status: "recommended",
    freeTier: true,
    costNote: "~1k queries/mo free",
    skillsFit: ["web_search", "fetch_url"],
    notes: "Agent-optimized search; good LangChain/LlamaIndex fit.",
  },
  {
    id: "serper",
    name: "Serper API",
    category: "search",
    provider: "Serper.dev",
    status: "recommended",
    freeTier: true,
    costNote: "2.5k free then low $/query",
    skillsFit: ["web_search"],
    notes: "Google results via API; cheap bulk research.",
  },
  {
    id: "anthropic",
    name: "Anthropic Claude API",
    category: "ai-llm",
    provider: "Anthropic",
    status: "evaluate",
    freeTier: false,
    costNote: "$3–75/M tokens depending on model",
    skillsFit: ["sandbox", "skill_classify"],
    notes: "Strong reasoning; no native web_search — pair with Tavily/Brave.",
  },
  {
    id: "openai",
    name: "OpenAI API",
    category: "ai-llm",
    provider: "OpenAI",
    status: "active",
    freeTier: false,
    costNote: "$0.15–30/M tokens",
    skillsFit: ["sandbox", "skill_classify"],
    notes: "Tool calling mature; web grounding requires separate browse tools.",
  },
  {
    id: "groq",
    name: "Groq API",
    category: "ai-llm",
    provider: "Groq",
    status: "recommended",
    freeTier: true,
    costNote: "Free tier rate-limited; paid very cheap",
    skillsFit: ["skill_classify"],
    notes: "Latency king; not citation-native.",
  },
  {
    id: "exa",
    name: "Exa API",
    category: "search",
    provider: "Exa.ai",
    status: "evaluate",
    freeTier: true,
    costNote: "Credits then ~$0.01+/search",
    skillsFit: ["web_search", "fetch_url"],
    notes: "Neural/semantic search for RAG corpora.",
  },
];

export function getBomMatches(query: string, category?: string): BomItem[] {
  const q = query.trim().toLowerCase();
  return BOM_ITEMS.filter((item) => {
    if (category && item.category !== category.toLowerCase()) return false;
    if (!q) return true;
    const hay = [
      item.id,
      item.name,
      item.provider,
      item.category,
      item.notes,
      item.costNote,
      ...item.skillsFit,
    ]
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });
}

export function bomForSkill(skillId: SkillId): BomItem[] {
  return BOM_ITEMS.filter((item) => item.skillsFit.includes(skillId));
}

export function listBomCategories(): string[] {
  return [...new Set(BOM_ITEMS.map((i) => i.category))].sort();
}
