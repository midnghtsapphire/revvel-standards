/**
 * Shared types for the Perplexity (pplx-api) skills integration.
 *
 * Perplexity's chat UI surfaces "skills" during reasoning. On the API these map to:
 *  1. Built-in tools (web_search, fetch_url, etc.) — server-side
 *  2. MCP tools — remote Model Context Protocol servers
 *  3. Custom functions — client-executed JSON-schema tools
 *
 * See RESEARCH.md and docs at https://docs.perplexity.ai
 */

export type SkillCategory =
  | "builtin"
  | "mcp"
  | "custom"
  | "revvel";

export type SkillId =
  | "web_search"
  | "fetch_url"
  | "finance_search"
  | "people_search"
  | "sandbox"
  | "bom_lookup"
  | "skill_classify"
  | "repo_context"
  | string;

export interface SkillDefinition {
  id: SkillId;
  name: string;
  description: string;
  category: SkillCategory;
  /** OpenAI-compatible tool schema when exposed to the Agent API */
  parameters?: Record<string, unknown>;
  /** Whether this skill runs server-side at Perplexity vs locally */
  execution: "remote" | "local";
  /** Rough cost signal for operators */
  costHint?: string;
  /** Good-fit use cases */
  goodFor?: string[];
  /** Anti-patterns */
  badFor?: string[];
}

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  name?: string;
  tool_call_id?: string;
}

export interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export interface SkillInvocation {
  skillId: SkillId;
  category: SkillCategory;
  arguments: Record<string, unknown>;
  callId?: string;
  status: "requested" | "running" | "completed" | "failed";
  result?: unknown;
  error?: string;
  durationMs?: number;
}

export interface ParsedPerplexityResponse {
  id?: string;
  model?: string;
  content: string;
  citations: string[];
  toolCalls: ToolCall[];
  skillInvocations: SkillInvocation[];
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  raw: unknown;
  mode: "live" | "mock";
}

export interface ChatRequestBody {
  messages: ChatMessage[];
  model?: string;
  /** Skill ids to expose (custom/local). Built-ins are always available remotely when live. */
  skills?: SkillId[];
  temperature?: number;
  max_tokens?: number;
  /** Prefer mock even if key is present */
  mock?: boolean;
  /** Return search/citation grounding when supported */
  return_citations?: boolean;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAt: number;
  retryAfterMs?: number;
}

export interface LogEntry {
  ts: string;
  level: "debug" | "info" | "warn" | "error";
  event: string;
  requestId?: string;
  durationMs?: number;
  meta?: Record<string, unknown>;
}

export interface BomItem {
  id: string;
  name: string;
  category: string;
  provider: string;
  status: "active" | "recommended" | "evaluate" | "skip";
  freeTier: boolean;
  costNote: string;
  skillsFit: SkillId[];
  notes: string;
}

export interface MonitorSnapshot {
  uptimeMs: number;
  totalRequests: number;
  liveRequests: number;
  mockRequests: number;
  errorCount: number;
  rateLimitedCount: number;
  avgLatencyMs: number;
  lastError?: string;
  skillHits: Record<string, number>;
}
